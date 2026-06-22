# services/shift_service.py
from sqlalchemy.orm import Session
from models import Shift, Asset, InspectionLog, ShiftSummary, Room, ShiftSetting
from services.email_service import send_alert_email
import logging
from datetime import date, datetime, time, timedelta
import pytz

def auto_close_and_check_missing_assets(db: Session, target_shift: Shift = None):
    """
    Đã vá lỗi triệt để: Nhận diện target_shift cụ thể và tích hợp cơ chế UPSERT 
    chống hoàn toàn lỗi UniqueViolation của bảng shift_summaries.
    """
    shift = target_shift if target_shift else db.query(Shift).filter(Shift.status == "Open").first()
    if not shift:
        logging.info("Không có ca trực nào đang mở để chốt.")
        return

    shift.status = "Submitted"
    db.flush() 

    active_assets = db.query(Asset, Room.room_number).join(Room).filter(Asset.status == "Active").all()
    active_asset_ids = {asset.id for asset, _ in active_assets}
    asset_dict = {asset.id: {"name": asset.asset_name, "room_number": room_number} for asset, room_number in active_assets}

    latest_logs = db.query(InspectionLog).filter(InspectionLog.shift_id == shift.id, InspectionLog.is_latest == True).all()
    inspected_ids = set()
    lost_asset_ids = []
    lost_assets_info = []

    for log in latest_logs:
        inspected_ids.add(log.asset_id)
        if log.status == "Vang" and log.asset_id in asset_dict:
            lost_asset_ids.append(log.asset_id)
            lost_assets_info.append({
                "name": asset_dict[log.asset_id]["name"],
                "room_number": asset_dict[log.asset_id]["room_number"],
                "note": log.note
            })

    missing_asset_ids = list(active_asset_ids - inspected_ids)
    missing_assets_info = [{"name": asset_dict[a_id]["name"], "room_number": asset_dict[a_id]["room_number"]} for a_id in missing_asset_ids]

    # 🌟 CƠ CHẾ UPSERT BẢO VỆ TUYỆT ĐỐI CHỐNG TRÙNG KHÓA (UNIQUE CONSTRAINT)
    summary = db.query(ShiftSummary).filter(ShiftSummary.shift_id == shift.id).first()

    if summary:
        summary.total_assets = len(active_assets)
        summary.inspected_count = len(inspected_ids)
        summary.missing_count = len(missing_asset_ids)
        summary.lost_count = len(lost_asset_ids)
        summary.missing_asset_ids = missing_asset_ids
        summary.lost_asset_ids = lost_asset_ids
        print(f"[DEBUG SUMMARY]: Đã cập nhật (Upsert) snapshot thành công cho ca trực ID: {shift.id}")
    else:
        summary = ShiftSummary(
            shift_id=shift.id,
            total_assets=len(active_assets),
            inspected_count=len(inspected_ids),
            missing_count=len(missing_asset_ids),
            lost_count=len(lost_asset_ids),
            missing_asset_ids=missing_asset_ids,
            lost_asset_ids=lost_asset_ids,
            is_email_sent=False
        )
        db.add(summary)
        print(f"[DEBUG SUMMARY]: Đã tạo mới (Insert) snapshot thành công cho ca trực ID: {shift.id}")
        
    db.flush() # 🌟 ĐỔI TỪ db.commit() THÀNH db.flush()

    if summary.missing_count > 0 or summary.lost_count > 0:
        try:
            send_alert_email(shift.shift_date, shift.shift_type, missing_assets_info, lost_assets_info)
            summary.is_email_sent = True
            db.flush() # 🌟 ĐỔI TỪ db.commit() THÀNH db.flush()
        except Exception as e:
            logging.error(f"Gửi Mail cảnh báo chốt ca thất bại: {e}")



def auto_open_shift(db: Session, shift_type: str):
    """
    Hàm chạy ngầm: Tự động tạo và mở phiên ca trực mới (Sáng / Tối) cho ngày hôm nay theo múi giờ VN
    """
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    today = datetime.now(tz).date()

    existing_shift = db.query(Shift).filter(
        Shift.shift_date == today, 
        Shift.shift_type == shift_type
    ).first()

    if not existing_shift:
        new_shift = Shift(
            shift_date=today, 
            shift_type=shift_type,
            status="Open"
        )
        db.add(new_shift)
        db.commit()
        logging.info(f"HỆ THỐNG: Đã tự động mở ca trực mới [{shift_type}] cho ngày {today}")
    else:
        if existing_shift.status != "Open":
            existing_shift.status = "Open"
            db.commit()
            logging.info(f"HỆ THỐNG: Đã khôi phục trạng thái mở cho ca [{shift_type}] ngày {today}")



def check_and_sync_shift_jit(db: Session):
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_local = datetime.now(tz)
    current_date = now_local.date()
    current_time = now_local.time()

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

    def is_time_in_range(start: time, end: time, current: time) -> bool:
        if start <= end:
            return start <= current <= end
        return current >= start or current <= end

    shift_type = None
    shift_date = current_date

    if is_time_in_range(m_start, m_end, current_time):
        shift_type = "Sang"
        if m_start > m_end and current_time <= m_end:
            shift_date = current_date - timedelta(days=1)
    elif is_time_in_range(e_start, e_end, current_time):
        shift_type = "Toi"
        if e_start > e_end and current_time <= e_end:
            shift_date = current_date - timedelta(days=1)

    # 🌟 1. LOGIC ĐÓNG CA TRỰC MỒ CÔI (LUÔN CHẠY BẤT KỂ KHUNG GIỜ NÀO)
    MAX_CLOSE_ITERATIONS = 5
    iterations = 0
    while iterations < MAX_CLOSE_ITERATIONS:
        iterations += 1
        old_shift = db.query(Shift).filter(
            Shift.status == "Open",
            (Shift.shift_date < shift_date) | 
            ((Shift.shift_date == shift_date) & (Shift.shift_type != shift_type))
        ).first()
        
        if not old_shift:
            break
        
        print(f"[DEBUG JIT]: Phát hiện ca cũ quá hạn chưa đóng: {old_shift.shift_date} [{old_shift.shift_type}]. Tiến hành chốt sổ...")
        
        # 🌟 VÁ LỖI BẪY NGẦM 1: Đưa try...except RA NGOÀI khối begin_nested() để Savepoint rollback chuẩn xác
        try:
            with db.begin_nested():
                auto_close_and_check_missing_assets(db, target_shift=old_shift)
        except Exception as e:
            print(f"[DEBUG JIT - LỖI ĐÓNG CA]: Chốt sổ lỗi (Đã tự động Rollback Savepoint): {str(e)}")
            break

    print(f"\n[DEBUG JIT]: Kết quả tính toán ca hiện tại: shift_type='{shift_type}' | shift_date='{shift_date}'")

    if not shift_type:
        print("[DEBUG JIT]: Hiện tại đang nằm trong giờ nghỉ giải lao giữa hai ca trực. Không mở ca mới.")
        db.commit()  # 🌟 VÁ LỖI: Đảm bảo các ca mồ côi vừa được chốt ở vòng lặp trên được LƯU VĨNH VIỄN vào DB!
        return
    

    # 🌟 2. ĐỒNG BỘ HOẶC KHÔI PHỤC TRẠNG THÁI CA HIỆN TẠI (CHỐNG CONCURRENCY RACE CONDITION)
    try:
        with db.begin_nested():
            current_shift = db.query(Shift).filter(Shift.shift_date == shift_date, Shift.shift_type == shift_type).first()

            if not current_shift:
                current_shift = Shift(shift_date=shift_date, shift_type=shift_type, status="Open")
                db.add(current_shift)
                db.flush() # 🌟 VÁ LỖI BẪY NGẦM 2: Ép sinh câu lệnh INSERT ngay tại đây để bắt UniqueViolation kịp thời
            else:
                if current_shift.status != "Open":
                    current_shift.status = "Open"
                    db.flush()
    except Exception:
        # Nếu dính UniqueViolation do luồng đăng nhập khác nhanh tay tạo trước nửa mili-giây, 
        # Savepoint tự hủy lệnh lỗi, ta truy vấn lại một cách an toàn ở tầng transaction cha:
        current_shift = db.query(Shift).filter(Shift.shift_date == shift_date, Shift.shift_type == shift_type).first()
        if current_shift and current_shift.status != "Open":
            current_shift.status = "Open"
                
    db.commit()