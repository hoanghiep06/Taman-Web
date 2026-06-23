# routes/inspections.py
import json
import pytz
import logging
import time as time_module
import uuid
import io
from PIL import Image, ExifTags


from datetime import datetime, timedelta, timezone, time
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse # Trả luồng ảnh thô
from jose import jwt, JWTError # Mã hóa link drive
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import User, Shift, Room, Asset, InspectionLog, Nonce, AuditLog, Elder, ShiftSetting
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

from pillow_heif import register_heif_opener
register_heif_opener()

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

        # 🌟 2. XỬ LÝ PHẦN THỜI GIAN ĐỘNG THEO SETTING CỦA DATABASE (CHỐNG LỆCH TIMEZONE CLOUD)
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        now_local = datetime.now(tz)
        current_date = now_local.date()
        current_time = now_local.time()

        # Truy vấn khung giờ cấu hình thực tế từ CSDL
        setting = db.query(ShiftSetting).first()
        m_start_str = setting.morning_start if (setting and setting.morning_start) else "03:00"
        m_end_str = setting.morning_end if (setting and setting.morning_end) else "11:00"
        e_start_str = setting.evening_start if (setting and setting.evening_start) else "14:00"
        e_end_str = setting.evening_end if (setting and setting.evening_end) else "21:00"
        
        try:
            m_start = time.fromisoformat(m_start_str)
            m_end = time.fromisoformat(m_end_str)
            e_start = time.fromisoformat(e_start_str)
            e_end = time.fromisoformat(e_end_str)
        except Exception:
            m_start, m_end = time(3, 0), time(11, 0)
            e_start, e_end = time(14, 0), time(21, 0)

        # Hàm trợ lý kiểm tra khung giờ (Hỗ trợ cả ca trực vắt qua đêm nửa đêm)
        def is_time_in_range(start: time, end: time, current: time) -> bool:
            if start <= end:
                return start <= current <= end
            return current >= start or current <= end

        # Thiết lập giá trị mặc định phòng hộ
        shift_type_str = "Sang"
        shift_date_str = str(current_date)

        # So khớp thời gian thực tế chạy Worker với cấu hình để xác định phân hệ ca trực
        if is_time_in_range(m_start, m_end, current_time):
            shift_type_str = "Sang"
            if m_start > m_end and current_time <= m_end:
                shift_date_str = str(current_date - timedelta(days=1))
        elif is_time_in_range(e_start, e_end, current_time):
            shift_type_str = "Toi"
            if e_start > e_end and current_time <= e_end:
                shift_date_str = str(current_date - timedelta(days=1))
        else:
            # HỘ VỆ ĐẶC BIỆT: Nếu ảnh được xử lý trễ vào khung giờ giải lao giữa 2 ca,
            # Bốc ngược lại dữ liệu ca trực của log gốc để lấy Ngày và Loại ca chính xác 100%
            first_log = db.query(InspectionLog).filter(InspectionLog.id == log_ids[0]).first()
            if first_log and first_log.shift_id:
                shift_obj = db.query(Shift).filter(Shift.id == first_log.shift_id).first()
                if shift_obj:
                    shift_date_str = str(shift_obj.shift_date)
                    shift_type_str = shift_obj.shift_type

        # 3. RETRY Khi gọi API mạng ngoài (Google Drive API)
        for attempt in range(max_retries):
            try:
                logging.info(f"WORKER: Tiến hành upload Drive lần {attempt + 1}/{max_retries}...")
                image_url = upload_image_to_drive(
                    file_bytes=processed_image_bytes, 
                    shift_date=shift_date_str,
                    shift_type=shift_type_str,
                    room_number=room_number,
                    asset_names=asset_names  # 🌟 Dùng trực tiếp mảng tên đã được chuẩn hóa NCT từ ngoài đưa vô
                )
                break # Upload lên Google Drive thành công, thoát khỏi vòng lặp thử lại
            except Exception as drive_err:
                logging.warning(f"[WORKER WARNING]: Lần thử {attempt + 1} thất bại do: {drive_err}")
                if attempt < max_retries - 1:
                    time_module.sleep(delay_seconds)
                else:
                    raise drive_err # Quá số lần thử tối đa, đẩy lỗi lên khối catch tổng
        
        # 4. Nếu thành công: Cập nhật trạng thái sang màu Xanh và ghi nhận Link Drive
        db.query(InspectionLog).filter(InspectionLog.id.in_(log_ids)).update({
            "status": "Xanh",
            "image_url": image_url
        }, synchronize_session=False)
        db.commit()
        logging.info(f"[WORKER SUCCESS]: Toàn bộ bản ghi {log_ids} đã hoàn tất và nhảy sang màu XANH!") 
    
    except Exception as final_err:
        db.rollback() 
        logging.error(f"[WORKER FATAL_ERROR]: Đã thử lại {max_retries} lần nhưng upload Drive vẫn thất bại: {final_err}")

        # 5. Khi thất bại: Đánh dấu lỗi để FE hiển thị nút chụp lại cho nhân viên
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
def validate_live_camera_image(file_contents: bytes, max_size_mb: int = 10):
    # 1. Chống DoS: Giới hạn dung lượng
    if len(file_contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dung lượng ảnh quá lớn, vui lòng giảm độ phân giải xuống dưới {max_size_mb} MB"
        )
    
    # 2. Ép cấu trúc chữ ký tệp (Hỗ trợ thêm HEIC/HEIF của iPhone)
    header = file_contents[:12]
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG')
    
    # Chữ ký của file HEIC thường nằm từ byte thứ 4 đến byte thứ 11 là 'ftypheic' hoặc 'ftypmif1'
    is_heic = len(header) >= 12 and header[4:12] in (b'ftypheic', b'ftypmif1', b'ftypmsf1', b'ftyphevc')

    if not (is_jpeg or is_png or is_heic):
        logging.error(f"[VALIDATION FAILED]: Sai chữ ký tệp. Header nhận được: {header}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng tệp tin không được hỗ trợ. Hệ thống chỉ chấp nhận ảnh PNG, JPEG hoặc HEIC trực tiếp từ camera."
        )
    
    try:
        image = Image.open(io.BytesIO(file_contents))
        exif_data = image._getexif()

        # Nếu không có EXIF, có 2 khả năng: Chụp bằng app bên thứ 3 hoặc Frontend làm mất EXIF khi nén/resize
        if not exif_data:
            logging.error("[VALIDATION FAILED]: Ảnh không có dữ liệu EXIF. Có thể Frontend đã làm mất EXIF khi nén ảnh.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Từ chối nhận ảnh. Bạn phải chụp trực tiếp từ Camera (Dữ liệu cấu trúc ảnh gốc bị thiếu)."
            )
        
        exif = {ExifTags.TAGS.get(tag, tag): value for tag, value in exif_data.items()}

        # 3. Kiểm tra vết thiết bị phần cứng
        if "Make" not in exif and "Model" not in exif and "Software" not in exif:
            logging.error(f"[VALIDATION FAILED]: EXIF tồn tại nhưng không có Make/Model. Thẻ EXIF tìm thấy: {list(exif.keys())}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh không hợp lệ, không tìm thấy vết định danh cho phần cứng camera thiết bị."
            )
        
        # 4. Kiểm tra thời gian chụp
        photo_time_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if not photo_time_str:
            logging.error("[VALIDATION FAILED]: Không tìm thấy thẻ DateTimeOriginal/DateTime trong EXIF.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xác định thời gian chụp thực tế từ bức ảnh này."
            )
        
        try:
            photo_time = datetime.strptime(photo_time_str, "%Y:%m:%d %H:%M:%S")
        except ValueError:
            # Sửa lỗi một số dòng máy ghi format thời gian kèm chuỗi lạ
            logging.error(f"[VALIDATION FAILED]: Định dạng thời gian EXIF lạ: {photo_time_str}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cấu trúc thời gian của ảnh không hợp lệ."
            )

        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        photo_time = tz.localize(photo_time)
        now_tz = datetime.now(tz)

        time_diff = now_tz - photo_time

        # Nới lỏng thời gian cho phép lệch lên 5 phút (Đề phòng điện thoại chạy nhanh hơn server)
        # Giả định UPLOAD_IMG_EXPIRE_TIMES của bạn là khoảng 5-10 phút
        UPLOAD_IMG_EXPIRE_TIMES = 10 
        
        if time_diff > timedelta(minutes=UPLOAD_IMG_EXPIRE_TIMES) or time_diff < timedelta(minutes=-5):
            logging.error(f"[VALIDATION FAILED]: Thời gian chụp không hợp lệ. Thời gian ảnh: {photo_time} | Hiện tại: {now_tz} | Lệch: {time_diff}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh chụp đã quá hạn hoặc thời gian trên điện thoại không đồng bộ với máy chủ. Vui lòng chụp lại."
            )
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        logging.exception("[VALIDATION CRASH]: Lỗi hệ thống khi phân tích cấu trúc ảnh")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cấu trúc tệp tin ảnh bị lỗi hoặc không thể phân tích dữ liệu bảo mật. Chi tiết: {str(e)}"
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

    # Lấy IP thật qua Proxy một cách đồng bộ
    real_client_ip = request.headers.get("x-forwarded-for")
    if real_client_ip:
        real_client_ip = real_client_ip.split(",")[0].strip()
    else:
        real_client_ip = client_ip

    # 1. KIỂM TRA ĐIỀU KIỆN 1: Xác thực mã Nonce
    nonce_record = db.query(Nonce).filter(
        Nonce.id == nonce_id,
        Nonce.user_id == current_user.id,
        Nonce.used == False
    ).first()

    if not nonce_record:
        logging.warning(f"[SECURITY ALERT]: Không tìm thấy mã Nonce '{nonce_id}' hoặc đã bị sử dụng! IP: {real_client_ip}")
        attack_log = AuditLog(
            actor_id=current_user.id,
            action="ATTACK_DEVICE_INVALID_NONCE",
            target_id=nonce_id,
            ip_address=real_client_ip,
            payload=f"Tài khoản {current_user.username} cố tình nộp ảnh bằng mã Nonce không hợp lệ."
        )
        db.add(attack_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã bảo mật (Nonce) không hợp lệ hoặc phiên làm việc đã hết hạn."
        )
    
    # 2. KIỂM TRA ĐIỀU KIỆN 2: Ép toàn bộ về trục chuẩn UTC để so sánh thời gian hết hạn
    expires_at_utc = nonce_record.expires_at
    if expires_at_utc.tzinfo is None:
        expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)
    else:
        expires_at_utc = expires_at_utc.astimezone(timezone.utc)

    current_time_utc = datetime.now(timezone.utc)

    if expires_at_utc < current_time_utc:
        logging.warning(f"[SECURITY ALERT]: Mã Nonce '{nonce_id}' hết hạn! Hết hạn: {expires_at_utc} | Hiện tại: {current_time_utc}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã bảo mật hết hạn, vui lòng tắt camera và mở lại."
        )
    
    # 3. KIỂM TRA ĐIỀU KIỆN 3: Ghi nhận dịch chuyển mạng (chỉ Audit log, không chặn)
    if nonce_record.ip_address != real_client_ip or nonce_record.user_agent != client_ua:
        logging.info(
            f"[NETWORK MOBILITY]: Thiết bị dịch chuyển mạng nhẹ:\n"
            f"  -> Lúc xin mã: IP={nonce_record.ip_address} | UA={nonce_record.user_agent}\n"
            f"  -> Lúc nộp ảnh: IP={real_client_ip} | UA={client_ua}"
        )
    
    # Đánh dấu hủy mã ngay lập tức (Chống trùng lặp request / Double submit từ iPhone)
    nonce_record.used = True
    db.flush()

    # 4. VALIDATE FILE & HỖ TRỢ XỬ LÝ KHẨN CẤP LỖI FILE
    try:
        file_contents = await file.read()
        validate_live_camera_image(file_contents=file_contents, max_size_mb=MAX_SIZE_MB)
    except HTTPException as http_err:
        # Cho phép các lỗi HTTPException được định nghĩa chi tiết từ hàm validate đi thẳng về Client
        raise http_err
    except Exception as e:
        # Chỉ bắt các lỗi hệ thống bất ngờ (Ví dụ: Đứt kết nối đọc luồng bytes của file)
        logging.error(f"[CRITICAL FILE ERROR]: Lỗi đọc file thô hệ thống: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Hệ thống không thể đọc tệp tin truyền lên. Vui lòng thử lại."
        )

    # PARSE DANH SÁCH ASSET IDS
    try:
        asset_ids = json.loads(asset_ids_str.strip())
        if not isinstance(asset_ids, list) or len(asset_ids) == 0:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng mảng asset_ids_str không hợp lệ")

    # Lấy ca trực
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    if not shift:
        raise HTTPException(status_code=400, detail="Hiện tại chưa có ca trực nào được mở trên hệ thống")

    # Kiểm tra tính tồn tại của tài sản
    asset_items = db.query(Asset, Elder.full_name).outerjoin(Elder, Asset.elder_id == Elder.id).filter(Asset.id.in_(asset_ids)).all()
    if len(asset_items) != len(asset_ids):
        raise HTTPException(status_code=404, detail="Có chứa ID tài sản không tồn tại trên hệ thống")

    drive_asset_names = [f"{asset.asset_name}_{elder_name}" if elder_name else asset.asset_name for asset, elder_name in asset_items]

    # 5. CHỐNG SPAM (RATE LIMIT) - ĐÃ SỬA AN TOÀN TUYỆT ĐỐI THEO TRỤC UTC
    for asset, _ in asset_items:
        latest_log = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id == asset.id,
            InspectionLog.is_latest == True
        ).first()
        
        if latest_log:
            # Ép thời gian DB về UTC để tính toán không bị ảnh hưởng bởi timezone của Docker/Hệ điều hành
            log_time_utc = latest_log.created_at
            if log_time_utc.tzinfo is None:
                log_time_utc = log_time_utc.replace(tzinfo=timezone.utc)
            else:
                log_time_utc = log_time_utc.astimezone(timezone.utc)
            
            time_passed = current_time_utc - log_time_utc
            
            if time_passed < timedelta(seconds=TIME_DELAY_SUBMIT):
                seconds_left = int(TIME_DELAY_SUBMIT - time_passed.total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tài sản '{asset.asset_name}' vừa được chụp cách đây ít lâu. Vui lòng đợi thêm {seconds_left} giây."
                )

    # Xác định số phòng
    first_asset = asset_items[0][0]
    room = db.query(Room).filter(Room.id == first_asset.room_id).first()
    room_number = room.room_number if room else "Chung"

    # Tạo bản ghi log mới
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
    
    success_audit = AuditLog(
        actor_id=current_user.id,
        action="CHECKIN_REQUEST_ACCEPTED",
        target_id=str(asset_ids),
        ip_address=real_client_ip,
        payload=str({"tracking_logs": created_log_ids, "nonce_used": nonce_id})
    )
    db.add(success_audit)
    db.commit()

    # Đẩy vào Worker xử lý ngầm
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
        "message": f"Đã tiếp nhận yêu cầu kiểm kê cho {len(asset_ids)} tài sản.",
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

    # 3. 🔴 ĐÃ SỬA CẨN THẬN: Kéo thêm trường tên NCT bằng cơ chế kết nối ngoài để chống mất mát dữ liệu tài sản chung
    active_assets = db.query(Asset, Room.room_number, Elder.full_name).\
        join(Room, Asset.room_id == Room.id).\
        outerjoin(Elder, Asset.elder_id == Elder.id).\
        filter(Asset.status == "Active").all()
    
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

    # 5. 🔴 ĐÃ SỬA CẨN THẬN: Cập nhật vòng lặp lấy thêm elder_name từ câu lệnh SQL ở trên
    for asset, room_number, elder_name in active_assets:
        log = log_dict.get(asset.id)
        asset_info = {
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "room_number": room_number,
            "elder_name": elder_name if elder_name else "Tài sản chung của phòng" # Tự động tạo nhãn nếu tài sản không thuộc cụ nào
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
    
