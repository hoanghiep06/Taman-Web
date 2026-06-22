# services/shift_service.py
from sqlalchemy.orm import Session
from models import Shift, Asset, InspectionLog, ShiftSummary, Room, ShiftSetting
from services.email_service import send_alert_email
import logging
from datetime import date, datetime, time, timedelta
import pytz

def auto_close_and_check_missing_assets(db: Session):
    # 1. Tìm ca đang Open
    shift = db.query(Shift).filter(Shift.status == "Open").first()
    if not shift:
        logging.info("Không có ca trực nào đang mở để chốt.")
        return

    # 2. Đổi trạng thái ca
    shift.status = "Submitted"

    # 3. Lấy thông tin tài sản (Kèm phòng)
    active_assets = db.query(Asset, Room.room_number).join(Room).filter(Asset.status == "Active").all()
    active_asset_ids = {asset.id for asset, _ in active_assets}

    # Lập từ điển (Dict) tra cứu nhanh thông tin tài sản
    asset_dict = {
        asset.id: {"name": asset.asset_name, "room_number": room_number} 
        for asset, room_number in active_assets
    }

    # 4. Kéo các log mới nhất của ca này
    latest_logs = db.query(InspectionLog).filter(
        InspectionLog.shift_id == shift.id,
        InspectionLog.is_latest == True
    ).all()

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

    # 5. Phân loại tài sản bị bỏ sót
    missing_asset_ids = list(active_asset_ids - inspected_ids)
    missing_assets_info = [
        {"name": asset_dict[a_id]["name"], "room_number": asset_dict[a_id]["room_number"]} 
        for a_id in missing_asset_ids
    ]

    # 6. Lưu Snapshot vào Dashboard DB
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
    db.commit()

    # 7. Gửi Email ngay lập tức nếu có sự cố
    if summary.missing_count > 0 or summary.lost_count > 0:
        try:
            send_alert_email(shift.shift_date, shift.shift_type, missing_assets_info, lost_assets_info)
            summary.is_email_sent = True
            db.commit()
        except Exception as e:
            logging.error(f"Hệ thống đã lưu cảnh báo vào DB nhưng gửi Mail thất bại: {e}")



def auto_open_shift(db: Session, shift_type: str):
    """
    Hàm chạy ngầm: Tự động tạo và mở phiên ca trực mới (Sáng / Tối) cho ngày hôm nay
    """

    today = date.today()

    # Kiểm tra ca trực hôm đó được khởi tạo chưa 
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
    m_start_str = setting.morning_start if (setting and setting.morning_start) else "04:00"
    m_end_str = setting.morning_end if (setting and setting.morning_end) else "13:00"
    e_start_str = setting.evening_start if (setting and setting.evening_start) else "14:00"
    e_end_str = setting.evening_end if (setting and setting.evening_end) else "23:00"
    
    try:
        m_start = time.fromisoformat(m_start_str)
        m_end = time.fromisoformat(m_end_str)
        e_start = time.fromisoformat(e_start_str)
        e_end = time.fromisoformat(e_end_str)
    except Exception as parse_err:
        m_start, m_end = time(4, 0), time(13, 0)
        e_start, e_end = time(14, 0), time(23, 0)

    shift_type = None
    shift_date = current_date

    if m_start <= current_time <= m_end:
        shift_type = "Sang"
        shift_date = current_date
    else:
        if e_start > e_end: # Khung giờ tối vắt qua đêm
            if current_time >= e_start or current_time <= e_end:
                shift_type = "Toi"
                if current_time <= e_end:
                    shift_date = current_date - timedelta(days=1)
        else:
            if e_start <= current_time <= e_end:
                shift_type = "Toi"
                shift_date = current_date

    if not shift_type:
        return

    # 🔴 ĐOẠN TỐI ƯU HIỆU NĂNG: Kiểm tra xem ca trực hiện tại trong DB đã đúng chưa
    # Nếu đúng rồi thì kết thúc luôn, không chạy vòng lặp while True phía dưới gây tốn I/O CSDL
    active_shift = db.query(Shift).filter(Shift.status == "Open").first()
    if active_shift and active_shift.shift_date == shift_date and active_shift.shift_type == shift_type:
        return # Khớp hoàn toàn -> Bỏ qua an toàn!

    # 3. LUỒNG QUÉT DỌN LIÊN HOÀN CÁC CA CŨ BỊ BỎ QUÊN
    while True:
        old_shift = db.query(Shift).filter(
            Shift.status == "Open",
            (Shift.shift_date < shift_date) | 
            ((Shift.shift_date == shift_date) & (Shift.shift_type != shift_type))
        ).first()
        
        if not old_shift:
            break
        
        logging.warning(f"[JIT SHIFT]: Phát hiện ca cũ quá hạn chưa đóng: {old_shift.shift_date} [{old_shift.shift_type}]. Tiến hành chốt sổ...")
        auto_close_and_check_missing_assets(db)

    # 4. TỰ ĐỘNG KHỞI TẠO HOẶC ĐỒNG BỘ PHIÊN CA HIỆN TẠI
    current_shift = db.query(Shift).filter(
        Shift.shift_date == shift_date,
        Shift.shift_type == shift_type
    ).first()

    if not current_shift:
        current_shift = Shift(shift_date=shift_date, shift_type=shift_type, status="Open")
        db.add(current_shift)
        db.commit()
        logging.info(f"[JIT SHIFT SUCCESS]: Mở phiên ca trực mới thành công: {shift_date} [{shift_type}]")