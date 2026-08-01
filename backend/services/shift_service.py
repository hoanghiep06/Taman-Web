# services/shift_service.py
from sqlalchemy.orm import Session
from models import Shift, Asset, InspectionLog, ShiftSummary, Room, ShiftSetting
from services.email_service import send_alert_email
import logging
from datetime import date, datetime, time, timedelta
import pytz

def auto_close_and_check_missing_assets(db: Session, target_shift: Shift = None):
    """
    Chốt ca tự động: CHỈ TÍNH NHỮNG TÀI SẢN BẮT BUỘC KIỂM KÊ (requires_inspection == True).
    Tích hợp UPSERT chống UniqueViolation.
    """
    shift = target_shift if target_shift else db.query(Shift).filter(Shift.status == "Open").first()
    if not shift:
        logging.info("Không có ca trực nào đang mở để chốt.")
        return

    shift.status = "Submitted"
    db.flush() 

    # 🌟 CHỈ LẤY CÁC MÓN ĐỒ BẮT BUỘC KIỂM KÊ (requires_inspection == True)
    active_assets = db.query(Asset, Room.room_number)\
        .join(Room)\
        .filter(Asset.status == "Active", Asset.requires_inspection == True).all()

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

    summary = db.query(ShiftSummary).filter(ShiftSummary.shift_id == shift.id).first()

    if summary:
        summary.total_assets = len(active_assets)
        summary.inspected_count = len(inspected_ids)
        summary.missing_count = len(missing_asset_ids)
        summary.lost_count = len(lost_asset_ids)
        summary.missing_asset_ids = missing_asset_ids
        summary.lost_asset_ids = lost_asset_ids
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
        
    db.flush()

    if summary.missing_count > 0 or summary.lost_count > 0:
        try:
            send_alert_email(shift.shift_date, shift.shift_type, missing_assets_info, lost_assets_info)
            summary.is_email_sent = True
            db.flush()
        except Exception as e:
            logging.error(f"Gửi Mail cảnh báo chốt ca thất bại: {e}")


def auto_open_shift(db: Session, shift_type: str):
    """Tự động tạo ca trực mới theo ngày VN."""
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    today = datetime.now(tz).date()

    existing_shift = db.query(Shift).filter(
        Shift.shift_date == today, 
        Shift.shift_type == shift_type
    ).first()

    if not existing_shift:
        new_shift = Shift(shift_date=today, shift_type=shift_type, status="Open")
        db.add(new_shift)
        db.commit()
    else:
        if existing_shift.status != "Open":
            existing_shift.status = "Open"
            db.commit()


def check_and_sync_shift_jit(db: Session):
    """Đồng bộ ca trực live JIT (Hỗ trợ ca Tối vắt qua đêm từ 20:00 -> 07:00)."""
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_local = datetime.now(tz)
    current_date = now_local.date()
    current_time = now_local.time()

    setting = db.query(ShiftSetting).first()
    m_start_str = setting.morning_start if (setting and setting.morning_start) else "08:00"
    m_end_str = setting.morning_end if (setting and setting.morning_end) else "19:00"
    e_start_str = setting.evening_start if (setting and setting.evening_start) else "20:00"
    e_end_str = setting.evening_end if (setting and setting.evening_end) else "07:00"
    
    try:
        m_start = time.fromisoformat(m_start_str)
        m_end = time.fromisoformat(m_end_str)
        e_start = time.fromisoformat(e_start_str)
        e_end = time.fromisoformat(e_end_str)
    except Exception:
        m_start, m_end = time(8, 0), time(19, 0)
        e_start, e_end = time(20, 0), time(7, 0)

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

    # Đóng ca mồ côi
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
        
        try:
            with db.begin_nested():
                auto_close_and_check_missing_assets(db, target_shift=old_shift)
        except Exception as e:
            logging.error(f"[DEBUG JIT ERROR]: {str(e)}")
            break

    if not shift_type:
        db.commit()
        return

    try:
        with db.begin_nested():
            current_shift = db.query(Shift).filter(Shift.shift_date == shift_date, Shift.shift_type == shift_type).first()

            if not current_shift:
                current_shift = Shift(shift_date=shift_date, shift_type=shift_type, status="Open")
                db.add(current_shift)
                db.flush()
            else:
                if current_shift.status != "Open":
                    current_shift.status = "Open"
                    db.flush()
    except Exception:
        current_shift = db.query(Shift).filter(Shift.shift_date == shift_date, Shift.shift_type == shift_type).first()
        if current_shift and current_shift.status != "Open":
            current_shift.status = "Open"
                
    db.commit()