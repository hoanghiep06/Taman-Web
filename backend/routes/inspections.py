import json
import pytz
import logging
import time as time_module
import uuid
import io
from PIL import Image, ExifTags
from datetime import datetime, timedelta, timezone, time
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter, Depends, HTTPException, status, UploadFile, 
    File, Form, BackgroundTasks, Request, Query, Response
)
from jose import jwt, JWTError
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from pillow_heif import register_heif_opener

from database import get_db, SessionLocal
from models import (
    User, Shift, Room, Zone, Asset, InspectionLog, 
    Nonce, AuditLog, Elder, ShiftSetting, Facility
)
from schemas import AssetMissingRequest, RoleType, RoomPatrolProgressResponse
from core.config import settings
from core.dependencies import get_current_user, require_care_team, PermissionChecker
from core.security import ALGORITHM
from core.limiter import limiter
from core.constants import (
    DELAY_SECONDS, MAX_RETRY, UPLOAD_IMG_EXPIRE_TIMES, 
    MAX_SIZE_MB, TIME_WATCH_IMG, TIME_DELAY_SUBMIT, DAY_OF_RESEEING
)
from services.image_service import process_and_compress_image
from services.drive_service import (
    upload_image_to_drive, extract_file_id_from_url, download_file_bytes_from_drive
)
from services.email_service import send_realtime_missing_alert

register_heif_opener()

tz = ZoneInfo("Asia/Ho_Chi_Minh")

router = APIRouter(prefix="/api/inspections", tags=["6. [NVCS / Đi Tuần] Trực Ca & Kiểm Kê Tư Trang"])


# =========================================================================
# HELPER: TỰ ĐỘNG LẤY DOMAIN PUBLIC (DÙNG CHO CLOUD / LAN / LOCALHOST)
# =========================================================================
def resolve_public_base_url(request: Request) -> str:
    """
    Tự động lấy đúng domain public mà client đang gọi vào,
    không cần cấu hình thủ công PUBLIC_API_URL.
    """
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")

    scheme = forwarded_proto or request.url.scheme
    host = forwarded_host or request.headers.get("host") or request.url.netloc

    return f"{scheme}://{host}"


def validate_live_camera_image(file_contents: bytes, max_size_mb: int = 15):
    """Kiểm tra chữ ký tệp tin (JPEG/PNG/HEIC iPhone) và chống DoS."""
    if len(file_contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Dung lượng ảnh quá lớn (> {max_size_mb}MB)")

    header = file_contents[:12]
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG')
    is_heic = len(header) >= 12 and header[4:12] in (b'ftypheic', b'ftypmif1', b'ftypmsf1', b'ftyphevc')

    if not (is_jpeg or is_png or is_heic):
        raise HTTPException(status_code=400, detail="Định dạng không hỗ trợ. Chỉ chấp nhận JPG, PNG, HEIC từ camera.")


# =========================================================================
# WORKER NGẦM XỬ LÝ ẢNH (COMPRESS, WATERMARK, UPLOAD DRIVE)
# =========================================================================
def image_processing_worker(
    file_contents: bytes,
    log_ids: list,
    user_full_name: str,
    room_number: str,
    asset_names: list,
    facility_name: str
):
    """
    Worker ngầm chịu lỗi tốt: Nén ảnh, đóng dấu Watermark và upload lên Google Drive.
    Tự động thử lại tối đa 3 lần nếu đứt mạng. Thành công -> 'Xanh', Thất bại -> 'Loi_Upload'.
    """
    db: Session = SessionLocal()
    max_retries = MAX_RETRY
    delay_seconds = DELAY_SECONDS
    image_url = None

    try:
        logging.info(f"WORKER: Đang xử lý ảnh ngầm cho Log IDs: {log_ids}...")
        processed_image_bytes = process_and_compress_image(file_contents, user_full_name)

        tz_vn = pytz.timezone('Asia/Ho_Chi_Minh')
        now_local = datetime.now(tz_vn)
        current_date = now_local.date()
        current_time = now_local.time()

        setting = db.query(ShiftSetting).first()
        m_start_str = setting.morning_start if (setting and setting.morning_start) else "08:00"
        m_end_str = setting.morning_end if (setting and setting.morning_end) else "19:00"
        e_start_str = setting.evening_start if (setting and setting.evening_start) else "20:00"
        e_end_str = setting.evening_end if (setting and setting.evening_end) else "07:00"

        try:
            m_start, m_end = time.fromisoformat(m_start_str), time.fromisoformat(m_end_str)
            e_start, e_end = time.fromisoformat(e_start_str), time.fromisoformat(e_end_str)
        except Exception:
            m_start, m_end = time(8, 0), time(19, 0)
            e_start, e_end = time(20, 0), time(7, 0)

        def is_time_in_range(start: time, end: time, current: time) -> bool:
            if start <= end:
                return start <= current <= end
            else:
                return current >= start or current <= end

        shift_type_str = "Sang"
        shift_date_str = str(current_date)

        if is_time_in_range(m_start, m_end, current_time):
            shift_type_str = "Sang"
            if m_start > m_end and current_time <= m_end:
                shift_date_str = str(current_date - timedelta(days=1))
        elif is_time_in_range(e_start, e_end, current_time):
            shift_type_str = "Toi"
            if e_start > e_end and current_time <= e_end:
                shift_date_str = str(current_date - timedelta(days=1))
        else:
            first_log = db.query(InspectionLog).filter(InspectionLog.id == log_ids[0]).first()
            if first_log and first_log.shift_id:
                shift_obj = db.query(Shift).filter(Shift.id == first_log.shift_id).first()
                if shift_obj:
                    shift_date_str = str(shift_obj.shift_date)
                    shift_type_str = shift_obj.shift_type

        # RETRY UPLOAD GOOGLE DRIVE
        for attempt in range(max_retries):
            try:
                image_url = upload_image_to_drive(
                    file_bytes=processed_image_bytes,
                    facility_name=facility_name,
                    shift_date=shift_date_str,
                    shift_type=shift_type_str,
                    room_number=room_number,
                    asset_names=asset_names
                )
                break
            except Exception as drive_err:
                logging.warning(f"[WORKER RETRY]: Lần thử {attempt + 1} thất bại do: {drive_err}")
                if attempt < max_retries - 1:
                    time_module.sleep(delay_seconds)
                else:
                    raise drive_err

        db.query(InspectionLog).filter(InspectionLog.id.in_(log_ids)).update({
            "status": "Xanh",
            "image_url": image_url
        }, synchronize_session=False)
        db.commit()
        logging.info(f"[WORKER SUCCESS]: Log IDs {log_ids} đã hoàn tất -> XANH!")

    except Exception as final_err:
        db.rollback()
        logging.error(f"[WORKER FATAL_ERROR]: {final_err}")
        db.query(InspectionLog).filter(InspectionLog.id.in_(log_ids)).update({
            "status": "Loi_Upload"
        }, synchronize_session=False)
        db.commit()
    finally:
        db.close()


# =========================================================================
# 1. MÀN HÌNH SẢNH: CẤP DANH SÁCH PHÒNG KÈM TIẾN ĐỘ ĐI TUẦN LIVE
# =========================================================================
@router.get(
    "/rooms",
    response_model=List[RoomPatrolProgressResponse],
    summary="[NVCS] Danh sách phòng & Tiến độ đi tuần live",
    description="""
    **Dành cho Frontend vẽ màn hình Sảnh Đi Tuần của App NVCS:**
    - Trả về danh sách các Phòng thuộc Cơ sở của NVCS đang trực.
    - Hỗ trợ lọc theo `zone_id` (Khu A, Khu B...) hoặc `facility_id` (Admin/Manager).
    - Tính toán chi tiết tiến độ live: % nước ngập, số đồ bắt buộc, số đồ đã kiểm, trạng thái hoàn tất.
    """
)
def get_patrol_rooms_progress(
    facility_id: Optional[int] = Query(None, description="Lọc theo ID Cơ sở (Dành cho Admin/Manager)"),
    zone_id: Optional[int] = Query(None, description="Lọc theo Phân khu (Khu A, Khu B...)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Room).options(joinedload(Room.zone).joinedload(Zone.facility))

    # 1. Phân quyền đa cơ sở linh hoạt
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.join(Zone).filter(Zone.facility_id == target_facility_id)

    if zone_id:
        query = query.filter(Room.zone_id == zone_id)

    rooms = query.order_by(Room.room_number).all()
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()

    results = []
    for room in rooms:
        zone_obj = room.zone
        facility_obj = zone_obj.facility if zone_obj else None

        # 2. Lấy toàn bộ danh mục tài sản Active trong phòng
        assets = db.query(Asset).filter(Asset.room_id == room.id, Asset.status == "Active").all()
        
        total_assets = len(assets)
        required_assets = [a for a in assets if a.requires_inspection]
        optional_assets = [a for a in assets if not a.requires_inspection]

        total_required = len(required_assets)
        total_optional = len(optional_assets)
        required_asset_ids = set(a.id for a in required_assets)

        # 3. Đếm số món đồ BẮT BUỘC đã kiểm kê trong ca hiện tại
        inspected_count = 0
        if shift and total_required > 0:
            logs = db.query(InspectionLog).filter(
                InspectionLog.shift_id == shift.id,
                InspectionLog.asset_id.in_(list(required_asset_ids)),
                InspectionLog.is_latest == True,
                InspectionLog.status.in_(["Xanh", "Vang", "Success", "Missing"])
            ).all()

            inspected_count = len(set(l.asset_id for l in logs))

        uninspected_count = max(0, total_required - inspected_count)

        # 4. Tính % tiến độ và trạng thái hoàn thành
        if total_required > 0:
            progress_pct = min(100.0, round((inspected_count / total_required) * 100, 1))
            is_completed = (inspected_count >= total_required)
        else:
            progress_pct = 100.0
            is_completed = True

        # 5. Đóng gói đầy đủ các trường khớp 100% với Schema
        results.append(
            RoomPatrolProgressResponse(
                room_id=room.id,
                room_number=room.room_number,
                description=room.description,
                zone_id=zone_obj.id if zone_obj else 0,
                zone_name=zone_obj.name if zone_obj else "N/A",
                facility_id=facility_obj.id if facility_obj else 0,
                facility_name=facility_obj.name if facility_obj else "N/A",
                total_assets=total_assets,
                total_required_inspection=total_required,
                total_optional_inspection=total_optional,
                inspected_count=inspected_count,
                uninspected_count=uninspected_count,
                progress_percentage=progress_pct,
                is_completed=is_completed
            )
        )

    return results


# =========================================================================
# 2. MÀN HÌNH BÊN TRONG PHÒNG: LẤY MÓN ĐỒ CẦN CHỤP CHIA THEO CỤ
# =========================================================================
@router.get(
    "/rooms/{room_id}/assets",
    summary="[NVCS] Lấy danh sách đồ đạc trong phòng để chụp ảnh",
    description="""
    **Dành cho Frontend khi NVCS chọn bước vào 1 Phòng:**
    - Trả về danh sách tất cả các món tư trang cần chụp ảnh (`requires_inspection == True`).
    - Gom nhóm đồ đạc gắn đích danh với từng Cụ (hoặc đồ dùng chung của phòng).
    """
)
def get_assets_for_patrol_by_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = db.query(Room).options(joinedload(Room.zone).joinedload(Zone.facility)).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng này!")

    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()

    assets = db.query(Asset).options(joinedload(Asset.elder)).filter(
        Asset.room_id == room.id,
        Asset.status == "Active",
        Asset.requires_inspection == True
    ).order_by(Asset.elder_id, Asset.asset_name).all()

    log_dict = {}
    tz_vn = pytz.timezone('Asia/Ho_Chi_Minh')

    if shift and assets:
        asset_ids = [a.id for a in assets]
        latest_logs = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id.in_(asset_ids),
            InspectionLog.is_latest == True
        ).all()
        log_dict = {log.asset_id: log for log in latest_logs}

    assets_list = []
    for asset in assets:
        log = log_dict.get(asset.id)
        current_status = log.status if log else "Unchecked"
        inspected_at = log.created_at.astimezone(tz_vn).strftime("%H:%M:%S") if (log and log.created_at) else None

        assets_list.append({
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "elder_id": asset.elder_id,
            "elder_name": asset.elder.full_name if asset.elder else "Tài sản chung của phòng",
            "current_status": current_status,
            "inspected_at": inspected_at,
            "log_id": log.id if log else None,
            "note": log.note if log else None
        })

    zone_obj = room.zone
    return {
        "room_info": {
            "room_id": room.id,
            "room_number": room.room_number,
            "zone_name": zone_obj.name if zone_obj else "N/A",
            "facility_name": zone_obj.facility.name if (zone_obj and zone_obj.facility) else "N/A"
        },
        "total_assets": len(assets),
        "inspected_count": len(log_dict),
        "assets": assets_list
    }


# =========================================================================
# 3. XIN MÃ NONCE BẢO MẬT 1 LẦN TRƯỚC BẬT CAMERA
# =========================================================================
@router.post(
    "/request-nonce",
    status_code=status.HTTP_201_CREATED,
    summary="[Bảo mật] Xin mã Nonce dùng 1 lần trước khi chụp ảnh"
)
@limiter.limit("10/minute")
def request_checkin_nonce(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client_ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    client_ua = request.headers.get("user-agent", "Unknown Device")
    expiration_time = datetime.now(timezone.utc) + timedelta(minutes=UPLOAD_IMG_EXPIRE_TIMES)

    new_nonce = Nonce(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=client_ua,
        expires_at=expiration_time,
        used=False
    )
    db.add(new_nonce)

    audit_record = AuditLog(
        actor_id=current_user.id,
        action="REQUEST_NONCE",
        target_id=new_nonce.id,
        ip_address=client_ip,
        payload=str({"username": current_user.username, "expires_at": expiration_time.isoformat()})
    )
    db.add(audit_record)
    db.commit()

    return {
        "nonce": new_nonce.id,
        "expires_in_seconds": UPLOAD_IMG_EXPIRE_TIMES * 60,
        "message": f"Mã bảo mật kích hoạt thành công (Hết hạn trong {UPLOAD_IMG_EXPIRE_TIMES} phút)."
    }


# =========================================================================
# 4. NỘP ẢNH CỦA NVCS (UPLOAD MULTI ASSETS)
# =========================================================================
@router.post(
    "/upload-multi",
    status_code=status.HTTP_202_ACCEPTED,
    summary="[NVCS] Nộp ảnh chụp kiểm kê tư trang"
)
async def upload_multi_assets_image(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Binary file ảnh chụp từ camera"),
    asset_ids_str: str = Form(..., description="Mảng ID tư trang dạng JSON string, VD: '[1, 2]'"),
    nonce_id: str = Form(..., description="Mã Nonce nhận từ /request-nonce"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Xác thực Mã Nonce
    nonce_record = db.query(Nonce).filter(
        Nonce.id == nonce_id,
        Nonce.user_id == current_user.id,
        Nonce.used == False
    ).first()

    if not nonce_record:
        raise HTTPException(status_code=403, detail="Mã bảo mật (Nonce) không hợp lệ hoặc đã sử dụng!")

    expires_at_utc = nonce_record.expires_at.replace(tzinfo=timezone.utc) if nonce_record.expires_at.tzinfo is None else nonce_record.expires_at.astimezone(timezone.utc)
    if expires_at_utc < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Mã bảo mật đã hết hạn, vui lòng tắt camera mở lại.")

    nonce_record.used = True
    db.flush()

    # 2. Validate File
    file_contents = await file.read()
    validate_live_camera_image(file_contents=file_contents, max_size_mb=MAX_SIZE_MB)

    # 3. Parse Asset IDs
    try:
        asset_ids = json.loads(asset_ids_str.strip())
        if not isinstance(asset_ids, list) or len(asset_ids) == 0:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng mảng asset_ids_str không hợp lệ!")

    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào đang mở!")

    asset_items = db.query(Asset, Elder.full_name).outerjoin(Elder, Asset.elder_id == Elder.id).filter(Asset.id.in_(asset_ids)).all()
    if len(asset_items) != len(asset_ids):
        raise HTTPException(status_code=404, detail="Có ID tài sản không tồn tại trên hệ thống!")

    drive_asset_names = [f"{asset.asset_name}_{elder_name}" if elder_name else asset.asset_name for asset, elder_name in asset_items]

    # 4. Anti-spam Rate Limit
    current_time_utc = datetime.now(timezone.utc)
    for asset, _ in asset_items:
        latest_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset.id,
            InspectionLog.is_latest == True
        ).first()

        if latest_log:
            log_time_utc = latest_log.created_at.replace(tzinfo=timezone.utc) if latest_log.created_at.tzinfo is None else latest_log.created_at.astimezone(timezone.utc)
            time_passed = current_time_utc - log_time_utc
            if time_passed < timedelta(seconds=TIME_DELAY_SUBMIT):
                seconds_left = int(TIME_DELAY_SUBMIT - time_passed.total_seconds())
                raise HTTPException(status_code=400, detail=f"Tài sản '{asset.asset_name}' vừa chụp. Vui lòng đợi {seconds_left}s.")

    first_asset = asset_items[0][0]
    room = db.query(Room).options(
        joinedload(Room.zone).joinedload(Zone.facility)
    ).filter(Room.id == first_asset.room_id).first()

    room_number = room.room_number if room else "Chung"

    facility_name = "Chưa_Xác_Định"
    if room and getattr(room, "zone", None) and getattr(room.zone, "facility", None):
        facility_name = room.zone.facility.name

    created_log_ids = []
    for asset_id in asset_ids:
        old_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset_id,
            InspectionLog.is_latest == True
        ).first()

        new_version = old_log.version + 1 if old_log else 1
        if old_log:
            old_log.is_latest = False

        new_log = InspectionLog(
            shift_id=shift.id,
            user_id=current_user.id,
            asset_id=asset_id,
            status="Dang_Xu_Ly",
            image_url=None,
            version=new_version,
            is_latest=True,
            nonce_id=nonce_id
        )
        db.add(new_log)
        db.flush()
        created_log_ids.append(new_log.id)

    db.commit()

    background_tasks.add_task(
        image_processing_worker,
        file_contents=file_contents,
        log_ids=created_log_ids,
        user_full_name=current_user.full_name,
        room_number=room_number,
        asset_names=drive_asset_names,
        facility_name=facility_name
    )

    return {
        "status": "Processing",
        "message": f"Đã tiếp nhận ảnh kiểm kê cho {len(asset_ids)} món đồ.",
        "tracking_log_ids": created_log_ids
    }


# =========================================================================
# 5. LUỒNG BÁO MẤT (MISSING FLOW - MÀU VÀNG)
# =========================================================================
@router.post(
    "/report-missing",
    status_code=status.HTTP_201_CREATED,
    summary="[NVCS] Báo mất đồ đạc không tìm thấy trong phòng"
)
def report_missing_asset(
    payload: AssetMissingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản!")

    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Chưa có ca trực nào đang mở!")

    if not payload.note.strip():
        raise HTTPException(status_code=400, detail="Bắt buộc phải nhập lý do báo mất!")

    old_log = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.asset_id == payload.asset_id,
        InspectionLog.is_latest == True
    ).first()

    new_version = old_log.version + 1 if old_log else 1
    if old_log:
        old_log.is_latest = False

    new_log = InspectionLog(
        shift_id=shift.id,
        user_id=current_user.id,
        asset_id=payload.asset_id,
        status="Vang",
        note=payload.note.strip(),
        image_url=None,
        version=new_version,
        is_latest=True
    )
    db.add(new_log)
    db.commit()

    room = db.query(Room).filter(Room.id == asset.room_id).first()
    background_tasks.add_task(
        send_realtime_missing_alert,
        asset_name=asset.asset_name,
        room_number=room.room_number if room else "Chung",
        note=payload.note.strip(),
        reporter_name=current_user.full_name,
        shift_type=shift.shift_type
    )

    return {"message": f"Đã ghi nhận báo mất cho tài sản '{asset.asset_name}'."}


# =========================================================================
# 6. MÀN HÌNH THEO DÕI TIẾN ĐỘ TỔNG CA TRỰC (SHIFT PROGRESS)
# =========================================================================
@router.get(
    "/shift-progress",
    summary="[Tổng quan] Xem tiến độ đi tuần của ca trực live",
    description="Gom nhóm toàn bộ danh mục tài sản kèm thông tin Cơ sở & Phân khu theo 5 trạng thái kiểm kê trong ca."
)
def get_shift_progress(
    facility_id: Optional[int] = Query(None, description="Lọc theo ID Cơ sở (Dành cho Admin/Manager)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào đang mở.")

    # Phân quyền đa cơ sở linh hoạt
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id

    # Join thêm Zone & Facility để lấy đầy đủ ngữ cảnh địa điểm của từng món đồ
    query = db.query(
        Asset, 
        Room.room_number, 
        Zone.name.label("zone_name"),
        Facility.id.label("facility_id"),
        Facility.name.label("facility_name"),
        Elder.full_name.label("elder_name")
    ).\
        join(Room, Asset.room_id == Room.id).\
        join(Zone, Room.zone_id == Zone.id).\
        join(Facility, Zone.facility_id == Facility.id).\
        outerjoin(Elder, Asset.elder_id == Elder.id).\
        filter(Asset.status == "Active", Asset.requires_inspection == True)

    if target_facility_id is not None:
        query = query.filter(Zone.facility_id == target_facility_id)

    active_assets = query.all()

    # Lấy các log kiểm kê mới nhất trong ca live
    latest_logs = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.is_latest == True
    ).all()

    log_dict = {log.asset_id: log for log in latest_logs}

    checked, reported_missing, processing, failed_upload, unchecked = [], [], [], [], []

    for asset, room_number, zone_name, f_id, f_name, elder_name in active_assets:
        log = log_dict.get(asset.id)
        
        # Đóng gói thông tin món đồ kèm Cơ sở và Phân khu
        asset_info = {
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "room_number": room_number,
            "zone_name": zone_name,
            "facility_id": f_id,
            "facility_name": f_name,
            "elder_name": elder_name if elder_name else "Tài sản chung của phòng"
        }

        if log:
            log_time_str = log.created_at.astimezone(tz).strftime("%H:%M:%S") if log.created_at else None

            if log.status == "Xanh":
                checked.append({**asset_info, "log_id": log.id, "inspected_at": log_time_str})
            elif log.status == "Vang":
                reported_missing.append({**asset_info, "log_id": log.id, "note": log.note, "inspected_at": log_time_str})
            elif log.status == "Dang_Xu_Ly":
                processing.append({**asset_info, "log_id": log.id, "status_text": "Đang nén & upload...", "inspected_at": log_time_str})
            elif log.status == "Loi_Upload":
                failed_upload.append({**asset_info, "log_id": log.id, "status_text": "Lỗi upload. Bấm chụp lại!", "inspected_at": log_time_str})
        else:
            unchecked.append(asset_info)

    return {
        "shift_info": {
            "id": shift.id, 
            "shift_date": str(shift.shift_date), 
            "shift_type": shift.shift_type
        },
        "summary": {
            "total_assets": len(active_assets),
            "checked_count": len(checked),
            "missing_count": len(reported_missing),
            "processing_count": len(processing),
            "failed_upload_count": len(failed_upload),
            "unchecked_count": len(unchecked)
        },
        "checked": checked,
        "reported_missing": reported_missing,
        "processing": processing,
        "failed_upload": failed_upload,
        "unchecked": unchecked
    }

# =========================================================================
# 7. XEM ẢNH MINH CHỨNG (LINK BẢO MẬT TẠM THỜI 15 PHÚT)
# =========================================================================
@router.get(
    "/logs/{log_id}/image",
    summary="Lấy link xem ảnh tạm thời 15 phút",
    description="Tạo một Token ký số JWT tạm thời có thời hạn 15 phút. Người nhận nhấp vào link không cần đăng nhập vẫn xem được ảnh minh chứng."
)
def get_inspection_image(
    log_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(InspectionLog).filter(InspectionLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm kê này!")

    if log.status == "Dang_Xu_Ly":
        raise HTTPException(
            status_code=400, 
            detail="Ảnh đang trong quá trình nén và đẩy lên Google Drive. Vui lòng đợi vài giây và thử lại!"
        )

    if log.status == "Loi_Upload":
        raise HTTPException(
            status_code=400, 
            detail="Quá trình upload ảnh bị lỗi. Vui lòng chọn tài sản và chụp lại!"
        )

    if not log.image_url:
        raise HTTPException(status_code=404, detail="Bản ghi kiểm kê này không có hình ảnh đính kèm!")

    expiration = datetime.now(timezone.utc) + timedelta(minutes=TIME_WATCH_IMG)
    token_payload = {"log_id": log.id, "exp": expiration}
    signed_token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=ALGORITHM)

    base_url = resolve_public_base_url(request).rstrip("/")
    temporary_url = f"{base_url}/api/inspections/public-view/{signed_token}"

    return {
        "shareable_url": temporary_url,
        "expires_in_seconds": TIME_WATCH_IMG * 60
    }


@router.get(
    "/public-view/{token}",
    summary="[Public] Stream ảnh minh chứng công khai",
    description="Endpoint mở hoàn toàn (Không cần Bearer Token) dùng để trả về binary ảnh từ Google Drive về thẻ <img> trên giao diện Web/Mobile."
)
def public_stream_inspection_image(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        log_id = payload.get("log_id")
        if not log_id: 
            raise ValueError()
    except JWTError:
        raise HTTPException(status_code=403, detail="Đường dẫn xem ảnh đã hết hạn hoặc không hợp lệ!")

    log = db.query(InspectionLog).filter(InspectionLog.id == log_id).first()
    if not log or not log.image_url:
        raise HTTPException(status_code=404, detail="Hình ảnh không tồn tại trên hệ thống!")

    file_id = extract_file_id_from_url(log.image_url)
    if not file_id:
        raise HTTPException(
            status_code=400, 
            detail="Liên kết ảnh không tồn tại trên Google Drive thực tế."
        )

    try:
        image_bytes = download_file_bytes_from_drive(file_id)
        
        return Response(
            content=image_bytes, 
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        logging.error(f"[STREAM IMAGE ERROR]: Lỗi tải ảnh Drive (file_id={file_id}): {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Không thể kết nối Google Drive để tải ảnh: {str(e)}"
        )


# =========================================================================
# 8. TRA CỨU LỊCH SỬ ĐI TUẦN DÀI HẠN (PHÂN TRANG & BỘ LỌC)
# =========================================================================
@router.get(
    "/history",
    summary="[Tra cứu] Lịch sử đi tuần kiểm kê dài hạn",
    description="Lịch sử tổng hợp qua nhiều ca: NVCS chỉ xem vết do chính mình chụp, Manager/Admin xem toàn bộ hệ thống."
)
def get_inspection_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    facility_id: Optional[int] = Query(None, description="Lọc theo ID Cơ sở (Dành cho Admin)"),
    room_number: Optional[str] = Query(None, description="Lọc theo Số phòng"),
    status_filter: Optional[str] = Query(None, description="Lọc trạng thái: 'Xanh', 'Vang', 'Loi_Upload'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        InspectionLog, Asset.asset_name, Room.room_number, User.full_name, Shift.shift_date, Shift.shift_type
    ).join(Asset, InspectionLog.asset_id == Asset.id)\
     .join(Room, Asset.room_id == Room.id)\
     .join(Zone, Room.zone_id == Zone.id)\
     .join(User, InspectionLog.user_id == User.id)\
     .join(Shift, InspectionLog.shift_id == Shift.id)

    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.filter(Zone.facility_id == target_facility_id)

    if current_user.role == RoleType.Caregiver:
        query = query.filter(InspectionLog.user_id == current_user.id)

    if room_number:
        query = query.filter(Room.room_number == room_number)
    if status_filter:
        query = query.filter(InspectionLog.status == status_filter)

    query = query.order_by(InspectionLog.created_at.desc())
    total_count = query.count()
    offset = (page - 1) * size
    records = query.offset(offset).limit(size).all()

    result_list = []
    for log, asset_name, r_num, user_name, s_date, s_type in records:
        log_time_str = log.created_at.astimezone(tz).strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None
        result_list.append({
            "log_id": log.id,
            "shift_date": str(s_date),
            "shift_type": s_type,
            "room_number": r_num,
            "asset_id": log.asset_id,
            "asset_name": asset_name,
            "status": log.status,
            "note": log.note,
            "version": log.version,
            "operator_name": user_name,
            "inspected_at": log_time_str
        })

    return {
        "pagination": {
            "total_records": total_count,
            "current_page": page,
            "page_size": size,
            "total_pages": (total_count + size - 1) // size
        },
        "history_data": result_list
    }


# =========================================================================
# 9. LẤY NGẪU NHIÊN ẢNH KIỂM KÊ TRONG CA ĐỂ AUDIT (ĐA CƠ SỞ LINH ĐỘNG)
# =========================================================================
@router.get(
    "/random-images",
    summary="[Admin/Manager] Lấy ngẫu nhiên ảnh kiểm kê trong ca để Audit",
    description="""
    **ENDPOINT AUDIT ẢNH NGẪU NHIÊN TRONG CA TRỰC LIVE:**
    - Lấy ngẫu nhiên `limit` ảnh chụp hợp lệ (`status == 'Xanh'`, `is_latest == True`) trong ca trực đang mở.
    - **Linh động Đa cơ sở:**
      + NVCS / Quản lý cơ sở: Luôn tự động giới hạn trong cơ sở của mình.
      + Admin / Bác sĩ: Mặc định lấy ngẫu nhiên TOÀN VIỆN (nếu `facility_id` là null), hoặc lọc theo từng Cơ sở mong muốn[cite: 3].
    - **Tự động sinh URL:** Trả về `shareable_url` (JWT 15 phút) sẵn sàng hiển thị trên thẻ <img>.
    """
)
def get_random_inspection_images(
    request: Request,
    limit: int = Query(8, ge=1, le=30, description="Số lượng ảnh ngẫu nhiên cần lấy (1 - 30)"),
    facility_id: Optional[int] = Query(None, description="Lọc theo ID Cơ sở (Dành cho Admin/Manager Toàn Viện)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Tìm Ca trực Live đang mở (Shift.status == 'Open')
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        return []

    # 2. Base Query ảnh kiểm kê hợp lệ kèm thông tin Cụ / Phòng / Phân khu / Cơ sở
    query = db.query(
        InspectionLog.id.label("log_id"),
        InspectionLog.image_url,
        InspectionLog.note,
        Asset.asset_name,
        Elder.full_name.label("elder_name"),
        Room.room_number,
        Zone.name.label("zone_name"),
        Facility.id.label("facility_id"),
        Facility.name.label("facility_name"),
        User.full_name.label("inspected_by"),
        InspectionLog.created_at
    ).join(Asset, InspectionLog.asset_id == Asset.id)\
     .outerjoin(Elder, Asset.elder_id == Elder.id)\
     .join(Room, Asset.room_id == Room.id)\
     .join(Zone, Room.zone_id == Zone.id)\
     .join(Facility, Zone.facility_id == Facility.id)\
     .join(User, InspectionLog.user_id == User.id)\
     .filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.status == "Xanh",
        InspectionLog.image_url.isnot(None),
        InspectionLog.is_latest == True
     )

    # 3. Phân quyền đa cơ sở linh hoạt
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.filter(Facility.id == target_facility_id)

    # 4. Lấy ngẫu nhiên theo số lượng limit
    logs = query.order_by(func.random()).limit(limit).all()

    # 5. Đóng gói Response kèm JWT Public Stream URL cho từng ảnh
    base_url = resolve_public_base_url(request).rstrip("/")
    expiration = datetime.now(timezone.utc) + timedelta(minutes=TIME_WATCH_IMG)
    results = []

    for item in logs:
        token_payload = {"log_id": item.log_id, "exp": expiration}
        signed_token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=ALGORITHM)
        temporary_url = f"{base_url}/api/inspections/public-view/{signed_token}"

        log_time_str = item.created_at.astimezone(tz).strftime("%H:%M:%S") if item.created_at else None

        results.append({
            "log_id": item.log_id,
            "asset_name": item.asset_name,
            "elder_name": item.elder_name or "Tài sản chung của phòng",
            "room_number": item.room_number,
            "zone_name": item.zone_name,
            "facility_id": item.facility_id,
            "facility_name": item.facility_name,
            "inspected_by": item.inspected_by,
            "inspected_at": log_time_str,
            "note": item.note,
            "shareable_url": temporary_url 
        })

    return results