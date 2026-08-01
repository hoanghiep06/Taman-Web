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

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request, Query
from fastapi.responses import StreamingResponse
from jose import jwt, JWTError
from sqlalchemy.orm import Session, joinedload
from pillow_heif import register_heif_opener

from database import get_db, SessionLocal
from models import User, Shift, Room, Zone, Asset, InspectionLog, Nonce, AuditLog, Elder, ShiftSetting
from schemas import AssetMissingRequest, RoleType, RoomPatrolProgressResponse
from core.config import settings
from core.dependencies import get_current_user, require_care_team, PermissionChecker
from core.security import ALGORITHM
from core.limiter import limiter
from core.constants import DELAY_SECONDS, MAX_RETRY, UPLOAD_IMG_EXPIRE_TIMES, MAX_SIZE_MB, TIME_WATCH_IMG, TIME_DELAY_SUBMIT, DAY_OF_RESEEING
from services.image_service import process_and_compress_image
from services.drive_service import upload_image_to_drive, extract_file_id_from_url, download_file_bytes_from_drive
from services.email_service import send_realtime_missing_alert

register_heif_opener()

tz = ZoneInfo("Asia/Ho_Chi_Minh")

router = APIRouter(prefix="/api/inspections", tags=["6. [NVCS / Đi Tuần] Trực Ca & Kiểm Kê Tư Trang"])

# ====================================================
# WORKER NGẦM THÔNG MINH (CÓ RETRY LOGIC & TRACKING STATE)
# ====================================================
def image_processing_worker(
    file_contents: bytes,
    log_ids: list,
    user_full_name: str,
    room_number: str,
    asset_names: list
):
    """
    Worker ngầm chịu lỗi tốt: Nén ảnh, đóng dấu Watermark và upload lên Google Drive.
    Tự động thử lại tối đa 3 lần nếu đứt mạng. Thành công -> 'Xanh', Thất bại -> 'Loi_Upload'.
    Xử lý chuẩn xác Ca Tối vắt qua đêm (20:00 -> 07:00 hôm sau).
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

        # Truy vấn khung giờ thực tế từ Database (Sáng: 08:00 - 19:00, Tối: 20:00 - 07:00)
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

        # 🌟 HÀM TRỢ LÝ KIỂM TRA KHUNG GIỜ (HỖ TRỢ KHUNG GIỜ VẮT QUAN ĐÊM)
        def is_time_in_range(start: time, end: time, current: time) -> bool:
            if start <= end:
                return start <= current <= end
            else:
                # Xử lý khi start > end (VD: 20:00 tối tới 07:00 sáng hôm sau)
                return current >= start or current <= end

        shift_type_str = "Sang"
        shift_date_str = str(current_date)

        if is_time_in_range(m_start, m_end, current_time):
            shift_type_str = "Sang"
            if m_start > m_end and current_time <= m_end:
                shift_date_str = str(current_date - timedelta(days=1))
        elif is_time_in_range(e_start, e_end, current_time):
            shift_type_str = "Toi"
            # 🔥 NẾU CHỤP VÀO RẠNG SÁNG (VD: 02:00 sáng) -> LÙI NGÀY CA TRỰC VỀ HÔM QUA
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


def validate_live_camera_image(file_contents: bytes, max_size_mb: int = 15):
    """Kiểm tra chữ ký tệp tin (JPEG/PNG/HEIC iPhone) và chống DoS"""
    if len(file_contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Dung lượng ảnh quá lớn (> {max_size_mb}MB)")

    header = file_contents[:12]
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG')
    is_heic = len(header) >= 12 and header[4:12] in (b'ftypheic', b'ftypmif1', b'ftypmsf1', b'ftyphevc')

    if not (is_jpeg or is_png or is_heic):
        raise HTTPException(status_code=400, detail="Định dạng không hỗ trợ. Chỉ chấp nhận JPG, PNG, HEIC từ camera.")
    

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
    - Hỗ trợ lọc theo `zone_id` (Khu A, Khu B...).
    - **Tính toán tiến độ live:** `total_assets` (chỉ đếm món đồ `requires_inspection == True`), `inspected_count` (số đồ đã chụp trong ca), và cờ `is_completed` (True nếu hoàn thành 100% phòng).
    """
)
def get_patrol_rooms_progress(
    zone_id: Optional[int] = Query(None, description="Lọc theo Phân khu (Khu A, Khu B...)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Room).options(joinedload(Room.zone).joinedload(Zone.facility))

    if current_user.facility_id is not None:
        query = query.join(Zone).filter(Zone.facility_id == current_user.facility_id)

    if zone_id:
        query = query.filter(Room.zone_id == zone_id)

    rooms = query.order_by(Room.room_number).all()
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()

    results = []
    for room in rooms:
        zone_obj = room.zone
        facility_obj = zone_obj.facility if zone_obj else None

        # Chỉ đếm tư trang BẮT BUỘC KIỂM TRÀ (requires_inspection == True)
        total_assets = db.query(Asset).filter(
            Asset.room_id == room.id,
            Asset.status == "Active",
            Asset.requires_inspection == True
        ).count()

        inspected_count = 0
        if shift and total_assets > 0:
            room_asset_ids = db.query(Asset.id).filter(
                Asset.room_id == room.id,
                Asset.status == "Active",
                Asset.requires_inspection == True
            ).subquery()

            inspected_count = db.query(InspectionLog).filter(
                InspectionLog.shift_id == shift.id,
                InspectionLog.asset_id.in_(room_asset_ids),
                InspectionLog.is_latest == True
            ).count()

        is_completed = (total_assets > 0) and (inspected_count >= total_assets)

        results.append(
            RoomPatrolProgressResponse(
                room_id=room.id,
                room_number=room.room_number,
                description=room.description,
                zone_name=zone_obj.name if zone_obj else "N/A",
                facility_name=facility_obj.name if facility_obj else "N/A",
                total_assets=total_assets,
                inspected_count=inspected_count,
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
    - Trả về `current_status`: `Xanh` (Đã chụp), `Vang` (Báo mất), `Dang_Xu_Ly` (Đang nén/upload), `Loi_Upload` (Cần chụp lại), `Unchecked` (Chưa chụp).
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
    summary="[Bảo mật] Xin mã Nonce dùng 1 lần trước khi chụp ảnh",
    description="""
    **Frontend gọi API này khi NVCS bấm nút Bật Camera trên App:**
    - Sinh mã UUID ngầm gắn với IP và Thiết bị, có hiệu lực trong 5 phút.
    - Bắt buộc phải truyền `nonce_id` này vào Form khi gọi API `upload-multi`.
    """
)
@limiter.limit("10/minute")
def request_checkin_nonce(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    API Cấp mã 1 lần khi upload ảnh
    FE gọi API khi nhân viên kích hoạt máy ảnh trên thiết bị 
    Mã sinh ra trong 3p gắn với IP và thiết bị này
    """
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
    summary="[NVCS] Nộp ảnh chụp kiểm kê tư trang",
    description="""
    **NVCS chọn 1 hoặc nhiều món đồ (cùng nằm trong 1 góc chụp) -> Bấm Nộp ảnh:**
    - Truyền `file` (Binary ảnh), `asset_ids_str` (VD: `"[1, 2, 3]"`), và `nonce_id`.
    - Hệ thống vô hiệu mã Nonce lập tức (chống gửi trùng/double submit).
    - Tạo bản ghi `Dang_Xu_Ly` và đẩy Worker ngầm xử lý nén + đẩy Drive mà không làm treo App di động.
    """
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
    client_ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
    client_ua = request.headers.get("user-agent", "Unknown Device")

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
        if not isinstance(asset_ids, list) or len(asset_ids) == 0: raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng mảng asset_ids_str không hợp lệ!")

    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào đang mở!")

    asset_items = db.query(Asset, Elder.full_name).outerjoin(Elder, Asset.elder_id == Elder.id).filter(Asset.id.in_(asset_ids)).all()
    if len(asset_items) != len(asset_ids):
        raise HTTPException(status_code=404, detail="Có ID tài sản không tồn tại trên hệ thống!")

    drive_asset_names = [f"{asset.asset_name}_{elder_name}" if elder_name else asset.asset_name for asset, elder_name in asset_items]

    # 4. Anti-spam Rate Limit (Chống chụp liên tục cùng 1 món đồ)
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
    room = db.query(Room).filter(Room.id == first_asset.room_id).first()
    room_number = room.room_number if room else "Chung"

    created_log_ids = []
    for asset_id in asset_ids:
        old_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset_id,
            InspectionLog.is_latest == True
        ).first()

        new_version = old_log.version + 1 if old_log else 1
        if old_log: old_log.is_latest = False

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
        asset_names=drive_asset_names
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
    summary="[NVCS] Báo mất đồ đạc không tìm thấy trong phòng",
    description="Chuyển trạng thái tư trang sang **Vàng** (Báo mất), lưu lý do và gửi Email cảnh báo khẩn cấp cho Quản lý."
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
    if old_log: old_log.is_latest = False

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
    description="Gom nhóm toàn bộ danh mục tài sản theo 5 trạng thái: Xanh (Đã xong), Vàng (Báo mất), Xám (Đang xử lý), Đỏ đậm (Lỗi upload), Đỏ tươi (Chưa chụp)."
)
def get_shift_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào đang mở.")

    active_assets = db.query(Asset, Room.room_number, Elder.full_name).\
        join(Room, Asset.room_id == Room.id).\
        outerjoin(Elder, Asset.elder_id == Elder.id).\
        filter(Asset.status == "Active", Asset.requires_inspection == True).all()

    latest_logs = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.is_latest == True
    ).all()

    log_dict = {log.asset_id: log for log in latest_logs}

    checked, reported_missing, processing, failed_upload, unchecked = [], [], [], [], []

    for asset, room_number, elder_name in active_assets:
        log = log_dict.get(asset.id)
        asset_info = {
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "room_number": room_number,
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
        "shift_info": {"id": shift.id, "shift_date": str(shift.shift_date), "shift_type": shift.shift_type},
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
    if not log or not log.image_url:
        raise HTTPException(status_code=404, detail="Không tìm thấy hình ảnh đính kèm!")

    expiration = datetime.now(timezone.utc) + timedelta(minutes=TIME_WATCH_IMG)
    token_payload = {"log_id": log.id, "exp": expiration}
    signed_token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=ALGORITHM)

    base_url = str(request.base_url).rstrip("/")
    temporary_url = f"{base_url}/api/inspections/public-view/{signed_token}"

    return {
        "shareable_url": temporary_url,
        "expires_in_seconds": TIME_WATCH_IMG * 60,
        "image_url": log.image_url
    }


@router.get(
    "/public-view/{token}",
    summary="[Public] Stream ảnh minh chứng công khai",
    description="Endpoint mở hoàn toàn (Không cần Bearer Token) dùng để stream trực tiếp binary ảnh từ Google Drive về thẻ <img> trên giao diện Web/Mobile."
)
def public_stream_inspection_image(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        log_id = payload.get("log_id")
        if not log_id: raise ValueError()
    except JWTError:
        raise HTTPException(status_code=403, detail="Đường dẫn hết hạn hoặc không hợp lệ!")

    log = db.query(InspectionLog).filter(InspectionLog.id == log_id).first()
    if not log or not log.image_url:
        raise HTTPException(status_code=404, detail="Hình ảnh không tồn tại!")

    try:
        file_id = extract_file_id_from_url(log.image_url)
        image_bytes = download_file_bytes_from_drive(file_id)
        return StreamingResponse(io.BytesIO(image_bytes), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trích xuất ảnh bảo mật: {str(e)}")



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
    room_number: Optional[str] = Query(None, description="Lọc theo Số phòng"),
    status_filter: Optional[str] = Query(None, description="Lọc trạng thái: 'Xanh', 'Vang', 'Loi_Upload'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        InspectionLog, Asset.asset_name, Room.room_number, User.full_name, Shift.shift_date, Shift.shift_type
    ).join(Asset, InspectionLog.asset_id == Asset.id)\
     .join(Room, Asset.room_id == Room.id)\
     .join(User, InspectionLog.user_id == User.id)\
     .join(Shift, InspectionLog.shift_id == Shift.id)

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

