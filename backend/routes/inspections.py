# routes/inspections.py
import json
import pytz
import logging
import time
import uuid
import io
from PIL import Image, ExifTags


from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse # Trả luồng ảnh thô
from jose import jwt, JWTError # Mã hóa link drive
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import User, Shift, Room, Asset, InspectionLog, Nonce, AuditLog
from core.config import settings
from core.dependencies import get_current_user
from core.security import ALGORITHM   # thuật mã hóa JWT
from core.limiter import limiter
from services.image_service import process_and_compress_image
from services.drive_service import upload_image_to_drive, extract_file_id_from_url, download_file_bytes_from_drive
from schemas import AssetMissingRequest
from services.email_service import send_realtime_missing_alert

from core.constants import DELAY_SECONDS, MAX_RETRY,  UPLOAD_IMG_EXPIRE_TIMES, MAX_SIZE_MB, TIME_WATCH_IMG, TIME_DELAY_SUBMIT, DAY_OF_RESEEING

from zoneinfo import ZoneInfo

# Khai báo biến tz cố định là múi giờ Việt Nam
tz = ZoneInfo("Asia/Ho_Chi_Minh")

router = APIRouter(prefix="/inspections", tags=["N nghiệp vụ Đi Tuần / Kiểm Kê"])


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
    Worker chạy ngầm chịu lỗi tốt: Tự động thử lại tối đa 3 lần nếu upload Drive lỗi.
    Thành công -> Chuyển sang 'Xanh'. Thất bại -> Chuyển sang 'Loi_Upload'.
    """

    db: Session = SessionLocal()
    max_retries = MAX_RETRY
    delay_seconds = DELAY_SECONDS
    image_url = None

    try:
        logging.info(f"WORKER: Đang xử lý ảnh ngầm cho các bản ghi Log ID: {log_ids}...")

        # 1. Tiến hành nén ảnh và đóng dấu Watermark (Thao tác trên Local RAM)
        processed_image_bytes = process_and_compress_image(file_contents, user_full_name)

        # 2. RETRY Khi gọi API mạng ngoài
        for attempt in range(max_retries):
            try:
                logging.info(f"WORKER: Tiến hành upload Drive lần {attempt + 1}/{max_retries}...")
                image_url = upload_image_to_drive(
                    file_bytes=processed_image_bytes, 
                    shift_date=str(datetime.now().date()),
                    shift_type="Sang" if datetime.now().hour < 12 else "Toi",
                    room_number=room_number,
                    asset_names=asset_names
                )
                break # Upload thành công
            except Exception as drive_err:
                logging.warning(f"[WORKER WARNING]: Lần thử {attempt + 1} thất bại do: {drive_err}")
                if attempt < max_retries - 1:
                    time.sleep(delay_seconds)
                else:
                    raise drive_err # Quá số lần thử
        
        # 3. Nếu thành công: Cập nhật status và lưu link ảnh thật
        db.query(InspectionLog).filter(InspectionLog.id.in_(log_ids)).update({
            "status": "Xanh",
            "image_url": image_url
        }, synchronize_session=False)
        db.commit()
        logging.info(f"[WORKER SUCCESS]: Toàn bộ bản ghi {log_ids} đã hoàn tất và nhảy sang màu XANH!") 
    
    except Exception as final_err:
        db.rollback() 
        logging.error(f"[WORKER FATAL_ERROR]: Đã thử lại {max_retries} lần nhưng upload Drive vẫn thất bại: {final_err}")

        # 4. Khi thất bại: Đánh dấu lỗi để FE báo cho nhân viên chụp lại
        db.query(InspectionLog).filter(InspectionLog.id.in_(log_ids)).update({
            "status": "Loi_Upload"
        }, synchronize_session=False)
        db.commit()
    
    finally:
        db.close()


# ====================================================
# API XIN CẤP MÃ NONCE DÙNG 1 LẦN 
# ====================================================
@router.post("/request-nonce", status_code=status.HTTP_201_CREATED)
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
    # Mạng của Client
    client_ip = request.client.host
    client_ua = request.headers.get("user-agent", "Unknown Device")

    # Thời gian hết hạn mã
    expiration_time = datetime.now(timezone.utc) + timedelta(minutes=UPLOAD_IMG_EXPIRE_TIMES) # = 5 trong file constants

    # Khởi tạo nonce mới
    new_nonce = Nonce(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        ip_address=client_ip,
        user_agent=client_ua,
        expires_at=expiration_time,
        used=False
    )
    db.add(new_nonce)

    # Ghi vết Audit - Xin cấp Nonce
    log_payload = {
        "requested_by_username": current_user.username,
        "ttl_minutes": UPLOAD_IMG_EXPIRE_TIMES,
        "expires_at": expiration_time.isoformat()
    }

    audit_record = AuditLog(
        actor_id=current_user.id,
        action="REQUEST_NONCE",
        target_id=new_nonce.id,
        ip_address=client_ip,
        payload=str(log_payload)
    )

    db.add(audit_record)

    db.commit()

    return {
        "nonce": new_nonce.id,
        "expires_in_seconds": UPLOAD_IMG_EXPIRE_TIMES * 60,
        "message": f"Mã bảo mật 1 lần được kích hoạt. Vui lòng nộp ảnh trong vòng {UPLOAD_IMG_EXPIRE_TIMES} phút"

    }


# ====================================================
# FILE VALIDATOR: KIỂM TRA ẢNH TRÊN CAMERA
# ====================================================
def validate_live_camera_image(file_contents: bytes, max_size_mb: int = MAX_SIZE_MB):
    """
    Chống DoS: Giới hạn Dung lượng thô
    Chống Web Shell: Ép cấu trúc chữ ký tệp (Buộc các file JPG, PNG)
    Ép buộc Live Camera: Quét metadata EXIF để detect upload ảnh cũ
    """
    if len(file_contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dung lượng ảnh quá lớn, vui lòng giảm độ phân giải xuống dưới {max_size_mb} MB"
        )
    
    header = file_contents[:4]
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG')

    if not (is_jpeg or is_png):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp tin không an toàn, không đúng file PNG, JPEG"
        )
    
    try:
        image = Image.open(io.BytesIO(file_contents))
        exif_data = image._getexif()

        if not exif_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Từ chối nhận ảnh, Bạn phải chụp trực tiếp từ Camera"
            )
        
        exif = {ExifTags.TAGS.get(tag, tag): value for tag, value in exif_data.items()}

        # Kiểm tra vết thiết bị phần cứng
        if "Make" not in exif and "Model" not in exif and "Software" not in exif:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh không hợp lệ, không tìm thấy vết định danh cho phần cứng camera thiết bị."
            )
        
        # Thời gian chụp 
        photo_time_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if not photo_time_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xác định thời gian chụp thực tế"
            )
        
        photo_time = datetime.strptime(photo_time_str, "%Y:%m:%d %H:%M:%S")
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        photo_time = tz.localize(photo_time)

        now_tz = datetime.now(tz)

        time_diff = now_tz - photo_time

        # Cho phép tối đa UPLOAD_IMG_EXPIRES_TIME
        if time_diff > timedelta(minutes=UPLOAD_IMG_EXPIRE_TIMES) or time_diff < timedelta(minutes=-1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng chụp lại ảnh trực tiếp"
            )
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cấu trúc tệp tin ảnh bị lỗi hoặc chứa mã thực thi không an toàn. Chi tiết: {str(e)}"
        )
        

    

# ====================================================
# API: NỘP ẢNH CỦA NHÂN VIÊN (HIỆN ĐẠI & TỐI ƯU CẤT C)
# ====================================================
@router.post("/upload-multi", status_code=status.HTTP_202_ACCEPTED)
async def upload_multi_assets_image(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    asset_ids_str: str = Form(..., description="Mảng ID các tài sản, ví dụ: [1,2]"),
    nonce_id: str = Form(..., description="Mã bảo mật dùng 1 lần được cấp từ camera"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client_ip = request.client.host
    client_ua = request.headers.get("user-agent", "Unknown Device")

    nonce_record = db.query(Nonce).filter(
        Nonce.id == nonce_id,
        Nonce.user_id == current_user.id,
        Nonce.used == False
    ).first()

    # KIỂM TRA ĐIỀU KIỆN 1: Có tìm thấy mã do điện thoại truyền lên hay không?
    if not nonce_record:
        # Ghi log cảnh báo trực tiếp ra bảng điều khiển Docker để bạn dễ debug
        logging.warning(f"[SECURITY ALERT]: Không tìm thấy mã Nonce mã '{nonce_id}' trong DB hoặc mã đã bị sử dụng từ trước!")
        
        attack_log = AuditLog(
            actor_id=current_user.id,
            action="ATTACK_DEVICED_INVALID_NONCE",
            target_id=nonce_id,
            ip_address=client_ip,
            payload=f"Tài khoản {current_user.username} cố tình nộp ảnh bằng mã Nonce không tồn tại hoặc đã bị hủy."
        )
        db.add(attack_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã bảo mật (Nonce) không hợp lệ hoặc phiên làm việc của bạn đã hết hạn."
        )
    
    # KIỂM TRA ĐIỀU KIỆN 2: Ép kiểu dữ liệu an toàn tuyệt đối chống lỗi lệch múi giờ Driver
    expires_at_utc = nonce_record.expires_at
    if expires_at_utc.tzinfo is None:
        # Nếu DB trả về dạng naive datetime, gán cứng múi giờ gốc của nó là UTC
        expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)
    else:
        # Nếu có múi giờ sẵn, ép đưa về trục chuẩn UTC
        expires_at_utc = expires_at_utc.astimezone(timezone.utc)

    current_time_utc = datetime.now(timezone.utc)

    if expires_at_utc < current_time_utc:
        # In ra màn hình Docker thời gian lệch để đối chiếu cấu trúc máy chủ
        logging.warning(f"[SECURITY ALERT]: Mã Nonce '{nonce_id}' bị hết hạn! Thời điểm hết hạn (UTC): {expires_at_utc} | Thời điểm nộp ảnh (UTC): {current_time_utc}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã bảo mật hết hạn, vui lòng tắt camera và mở lại để làm mới lại phiên kiểm tra"
        )
    
    # KIỂM TRA ĐIỀU KIỆN 3: Đối chiếu tính nhất quán của thiết bị đầu cuối
    real_client_ip = request.headers.get("x-forwarded-for")
    if real_client_ip:
        # Chuỗi X-Forwarded-For có thể dạng "IP_Thật, IP_Proxy", ta lấy phần tử đầu tiên
        real_client_ip = real_client_ip.split(",")[0].strip()
    else:
        real_client_ip = client_ip # Fallback về IP gốc nếu chạy ở local dev

    # 2. Hàng rào đối chiếu thông minh nới lỏng:
    # Do mã xác thực JWT và mã Nonce dùng 1 lần đã bảo mật tuyệt đối, ta chỉ ghi log
    # theo dõi biến động (Audit) chứ không chặn đứng dòng chạy để đảm bảo độ mượt cho Mobile 4G/WiFi.
    if nonce_record.ip_address != real_client_ip or nonce_record.user_agent != client_ua:
        logging.warning(
            f"[NETWORK MOBILITY INFO]: Thiết bị có sự dịch chuyển nhẹ mạng/thiết bị:\n"
            f"  -> Lúc xin mã: IP={nonce_record.ip_address} | UA={nonce_record.user_agent}\n"
            f"  -> Lúc nộp ảnh: IP={real_client_ip} | UA={client_ua}"
        )
    
    # Hủy mã NONCE khi vượt qua toàn bộ các hàng rào bảo mật thành công
    nonce_record.used = True
    db.flush()

    # FILE VALIDATOR & ĐỌC BYTES GIẢI PHÓNG CACHE
    file_contents = await file.read()
    validate_live_camera_image(file_contents=file_contents, max_size_mb=MAX_SIZE_MB)

    try:
        asset_ids = json.loads(asset_ids_str)
        if not isinstance(asset_ids, list) or len(asset_ids_str) == 0:
            raise ValueError()
    
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng mảng asset_ids_str không hợp lệ")


    # 2. Lấy ca trực Open hiện tại
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào được mở trên hệ thống")

    # 3. Lấy thông tin chi tiết của danh sách tài sản để kiểm tra tính hợp lệ và lấy tên đồ vật
    assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
    if len(assets) != len(asset_ids):
        raise HTTPException(status_code=404, detail="Có chứa ID tài sản không tồn tại trên hệ thống")

    # 4. CHỐNG SPAM: Vòng lặp kiểm tra thời gian khóa 1 phút (Rate Limit) cho từng tài sản
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_tz = datetime.now(tz)
    
    for asset in assets:
        latest_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset.id,
            InspectionLog.is_latest == True
        ).first()
        
        if latest_log:
            # Ép kiểu thời gian trong DB về đúng múi giờ UTC+7 để tính toán chính xác
            log_time = latest_log.created_at.astimezone(tz)
            time_passed = now_tz - log_time
            
            if time_passed < timedelta(seconds=TIME_DELAY_SUBMIT):
                seconds_left = int(TIME_DELAY_SUBMIT - time_passed.total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tài sản '{asset.asset_name}' (ID: {asset.id}) vừa mới được chụp cách đây chưa đầy {TIME_DELAY_SUBMIT} giây. Vui lòng đợi thêm {seconds_left} giây."
                )

    # 5. Xác định số phòng dựa vào phần tử đầu tiên để chia cây thư mục
    room = db.query(Room).filter(Room.id == assets[0].room_id).first()
    room_number = room.room_number if room else "Chung"

    # 6. Read bytes thật nhanh giải phóng bộ nhớ đệm
    asset_names = [a.asset_name for a in assets]

    # 7. Tạo trước bản ghi trạng thái "DANG_XU_LY" VÀ KHÓA VERSION CŨ 
    created_log_ids = []
    for asset_id in asset_ids:
        old_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset_id,
            InspectionLog.is_latest == True
        ).first()

        new_version = 1
        if old_log:
            new_version = old_log.version + 1
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
    
    # Ghi Audit khi tiếp nhận thành công
    success_audit = AuditLog(
        actor_id=current_user.id,
        action="CHECKIN_REQUEST_ACCEPTED",
        target_id=str(asset_ids),
        ip_address=client_ip,
        payload=str({"tracking_logs": created_log_ids, "nonce_used": nonce_id})
    )
    db.add(success_audit)
    db.commit()

    # 5. Đẩy vào WORKER chạy ngầm
    background_tasks.add_task(
        image_processing_worker,
        file_contents=file_contents,
        log_ids=created_log_ids,
        user_full_name=current_user.full_name,
        room_number=room_number,
        asset_names=asset_names
    )

    # Trả về phản hồi sau 0.1s, đẩy vào danh sách ID vừa tạo để FE tiện tracking 
    return {
        "status": "Processing",
        "message": f"Đã tiếp nhận yêu cầu kiểm kê cho {len(asset_ids)} tài sản. Tiến trình đang được xử lý ngầm.",
        "tracking_log_ids": created_log_ids
    }




# ==========================================
# API: LUỒNG BÁO MẤT (MISSING FLOW)
# ==========================================
@router.post("/report-missing", status_code=status.HTTP_201_CREATED)
def report_missing_asset(
    payload: AssetMissingRequest,
    background_tasks: BackgroundTasks, # Bổ sung BackgroundTasks để chạy ngầm
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Nhân viên báo mất đồ đạc không tìm thấy. 
    Hệ thống chuyển trạng thái sang màu Vàng, lưu lịch sử và bắn Email khẩn cấp ngầm.
    """
    # 1. Kiểm tra tài sản
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản này")

    # 2. Lấy phiên ca trực đang Open hiện tại
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào được mở trên hệ thống")

    if not payload.note.strip():
        raise HTTPException(status_code=400, detail="Bắt buộc phải nhập lý do/ghi chú ngắn khi báo mất tài sản")

    # 3. Đánh dấu bản ghi cũ thành False và lấy version hiện tại
    old_log = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.asset_id == payload.asset_id,
        InspectionLog.is_latest == True
    ).first()

    new_version = 1
    if old_log:
        new_version = old_log.version + 1
        old_log.is_latest = False

    # 4. Thêm bản ghi mới (Màu vàng)
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

    # 5. KÍCH HOẠT EMAIL KHẨN CẤP CHẠY NGẦM
    # Lấy thông tin phòng để email hiển thị rõ vị trí
    room = db.query(Room).filter(Room.id == asset.room_id).first()
    room_number = room.room_number if room else "Không xác định"

    # Đẩy tác vụ gửi email vào hàng đợi background, trả response ngay lập tức cho mobile app
    background_tasks.add_task(
        send_realtime_missing_alert,
        asset_name=asset.asset_name,
        room_number=room_number,
        note=payload.note.strip(),
        reporter_name=current_user.full_name,
        shift_type=shift.shift_type
    )

    return {
        "message": f"Đã ghi nhận báo mất cho tài sản '{asset.asset_name}'. Quản lý đã được thông báo.",
        "asset_id": payload.asset_id
    }

# ==========================================
# API: THEO DÕI TIẾN ĐỘ CA TRỰC HIỆN TẠI
# ==========================================
@router.get("/shift-progress")
def get_shift_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Tìm ca trực đang Open
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào đang mở.")

    # 2. Phân quyền truy cập
    if current_user.role == "Staff":
        # Staff phải có ít nhất 1 thao tác kiểm kê trong ca này mới được xem tiến độ tổng
        has_interacted = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.user_id == current_user.id
        ).first()
        
        if not has_interacted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa thực hiện kiểm kê tài sản nào trong ca này. Vui lòng cập nhật đồ đạc thuộc khu vực của bạn trước khi xem tiến độ tổng."
            )

    # 3. Kéo toàn bộ tài sản đang hoạt động và map với số phòng
    active_assets = db.query(Asset, Room.room_number).join(Room).filter(Asset.status == "Active").all()
    
    # 4. Kéo các log kiểm kê mới nhất của ca này
    latest_logs = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.is_latest == True
    ).all()

    # Chuyển logs thành dictionary để tra cứu nhanh O(1)
    log_dict = {log.asset_id: log for log in latest_logs}

    checked = []            # Trạng thái Xanh (Thành công)
    reported_missing = []   # Trạng thái Vàng (Báo mất)
    processing = []         # Trạng thái Xám (Đang xử lý ngầm)
    failed_upload = []      # Trạng thái Đỏ đậm (Lỗi upload cần nộp lại)
    unchecked = []          # Trạng thái Đỏ tươi (Chưa từng đụng vào)

    # 5. Phân loại tài sản
    for asset, room_number in active_assets:
        log = log_dict.get(asset.id)
        asset_info = {
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "room_number": room_number
        }

        if log:
            log_time_str = log.created_at.astimezone(tz).strftime("%H:%M:%S") if log.created_at else None

            if log.status == "Xanh":
                checked.append({
                    **asset_info,
                    "log_id": log.id,
                    "inspected_at": log_time_str
                    # Ẩn image_url để tối ưu băng thông
                })
            elif log.status == "Vang":
                reported_missing.append({
                    **asset_info, 
                    "log_id": log.id, 
                    "note": log.note,
                    "inspected_at": log_time_str
                })
            elif log.status == "Dang_Xu_Ly":
                processing.append({
                    **asset_info, 
                    "log_id": log.id,
                    "status_text": "Đang nén và upload ảnh...",
                    "inspected_at": log_time_str    
                })
            elif log.status == "Loi_Upload":
                failed_upload.append({
                    **asset_info, 
                    "log_id": log.id, 
                    "status_text": "Tải ảnh lỗi. Vui lòng bấm chụp lại!",
                    "inspected_at": log_time_str
                })
        else:
            unchecked.append(asset_info)

    return {
        "shift_info": {
            "id": shift.id,
            "shift_date": shift.shift_date,
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

# ==========================================
# API: LẤY ẢNH MINH CHỨNG (LAZY LOADING)
# ==========================================
@router.get("/logs/{log_id}/image")
def get_inspection_image(
    log_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Frontend gọi API này khi người dùng bấm vào xem chi tiết một tài sản đã kiểm kê (Xanh).
    Hệ thống trả về link mã hóa chạy tạm trong 15 phút, người nhận không cần tài khoản vẫn xem được.
    """
    log = db.query(InspectionLog).filter(InspectionLog.id == log_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi kiểm kê.")
    
    if not log.image_url:
        raise HTTPException(status_code=404, detail="Bản ghi này không có hình ảnh đính kèm (hoặc là báo mất).")
        
    if current_user.role == "Staff" and log.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem hình minh chứng của người khác"
        )
    
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now = datetime.now(tz)
    # log.created_at cần được đảm bảo là timezone-aware (thường đã được lưu dạng UTC/Aware)
    log_time = log.created_at.astimezone(tz)
    
    if now - log_time > timedelta(days=DAY_OF_RESEEING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Ảnh đã quá hạn truy cập (chỉ cho phép xem lại ảnh trong vòng {DAY_OF_RESEEING * 24} giờ)."
        )

    # 4. Kiểm tra link ảnh (nếu là báo mất thì không có ảnh)
    if not log.image_url:
        raise HTTPException(status_code=404, detail="Bản ghi này không có hình ảnh.")

    expiration = datetime.now(timezone.utc) + timedelta(minutes=TIME_WATCH_IMG)
    token_payload = {
        "log_id": log.id,
        "exp": expiration
    }

    # Ký số token bằng SECRET_KEY 
    signed_image_token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=ALGORITHM)

    base_url = str(request.base_url).rstrip("/")
    temporary_shareable_url = f"{base_url}/api/inspections/public-view/{signed_image_token}"

    return {
        "shareable_url": temporary_shareable_url,
        "expires_in_seconds": TIME_WATCH_IMG * 60,
        "image_url": log.image_url
    }



@router.get("/public-view/{token}")
def public_stream_inspection_image(token: str, db: Session = Depends(get_db)):
    """
    API mở hoàn toàn (Không yêu cầu Header Authorization Bearer).
    Được gọi trực tiếp từ link tạm thời 15 phút để hiển thị ảnh lên màn hình.
    """

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        log_id = payload.get("log_id")
        if not log_id:
            raise ValueError()
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đường dẫn hết hạn hoặc không hợp lệ"
        )
    
    log = db.query(InspectionLog).filter(InspectionLog.id == log_id).first()
    if not log or not log.image_url:
        raise HTTPException(status_code=404, detail="Hình ảnh không tồn tại trên hệ thống")
    
    # Tải ngầm từ Drive và Stream trực tiếp cho Client
    try:
        file_id = extract_file_id_from_url(log.image_url)
        if not file_id:
            raise Exception("Đường link lưu trữ bị lỗi cấu trúc")
        
        # Tải ngầm về RAM 
        image_raw_bytes = download_file_bytes_from_drive(file_id)

        # Trả về file ảnh để hiển thị
        return StreamingResponse(io.BytesIO(image_raw_bytes), media_type="image/jpeg")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi trích xuất từ dữ liệu bảo mật: {str(e)}"
        )
    


# =========================================================================
# API: TRA CỨU LỊCH SỬ ĐI TUẦN TỔNG HỢP (PHÂN QUYỀN VÀ PHÂN TRANG)
# =========================================================================
@router.get("/history")
def get_inspection_history(
    page: int = 1,
    size: int = 20,
    room_number: str = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    API tra cứu lịch sử kiểm kê tài sản dài hạn qua nhiều ca trực:
    - Staff (Nhân viên): Chỉ thấy lịch sử những món đồ do chính mình bấm chụp/báo mất.
    - Admin/Manager (Quản lý): Nhìn thấy toàn bộ lịch sử của tất cả nhân viên.
    Tích hợp bộ lọc theo phòng, theo trạng thái màu sắc và phân trang tự động.
    """
    # 1. Dựng khung Query Explicit Join để bốc tách dữ liệu sạch sẽ từ Database
    query = db.query(
        InspectionLog, 
        Asset.asset_name, 
        Room.room_number, 
        User.full_name, 
        Shift.shift_date, 
        Shift.shift_type
    ).join(Asset, InspectionLog.asset_id == Asset.id)\
     .join(Room, Asset.room_id == Room.id)\
     .join(User, InspectionLog.user_id == User.id)\
     .join(Shift, InspectionLog.shift_id == Shift.id)

    # 2. HÀNG RÀO PHÂN QUYỀN CHÍ MẠNG (ROLE-BASED FILTERING)
    if current_user.role == "Staff":
        # Khóa chặt: Nhân viên chỉ được xem vết lịch sử do chính mình tạo ra
        query = query.filter(InspectionLog.user_id == current_user.id)
    else:
        # Admin hoặc Manager được quyền xem toàn bộ hệ thống, không bị áp bộ lọc user_id
        pass

    # 3. KÍCH HOẠT CÁC BỘ LỌC NÂNG CAO (OPTIONAL FILTERS)
    if room_number:
        query = query.filter(Room.room_number == room_number)
        
    if status_filter:
        # Hỗ trợ lọc theo hệ màu: Xanh, Vang, Dang_Xu_Ly, Loi_Upload
        query = query.filter(InspectionLog.status == status_filter)

    # 4. SẮP XẾP: Luôn ưu tiên những hành động mới xảy ra đưa lên đầu (Lịch sử gần đây)
    query = query.order_by(InspectionLog.created_at.desc())

    # 5. PHÂN TRANG CÔNG NGHIỆP (PAGINATION) - Tránh kéo hàng vạn dòng làm treo Server
    total_count = query.count()
    offset = (page - 1) * size
    records = query.offset(offset).limit(size).all()

    # 6. ĐÓNG GÓI JSON TRẢ VỀ CHO FRONTEND DỄ VẼ GIAO DIỆN
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
            "status": log.status, # Xanh/Vang/Dang_Xu_Ly/Loi_Upload
            "note": log.note,
            "version": log.version,
            "is_latest": log.is_latest,
            "operator_name": user_name, # Ai là người làm hành động này
            "inspected_at": log_time_str # Thời gian thực bấm máy
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
    
