# scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import SessionLocal
import models
import io
import pandas as pd

from services.shift_service import auto_close_and_check_missing_assets, auto_open_shift
from services.drive_service import (
    cleanup_old_drive_folders, 
    upload_backup_file_to_drive, 
    cleanup_old_db_backups, 
    upload_db_backup_to_drive
)
from services.backup_service import execute_database_dump, execute_database_restore
from core.constants import DEFAULT_SHIFT_SETTINGS
from datetime import datetime, timezone, timedelta

scheduler = BackgroundScheduler(timezone="Asia/Ho_Chi_Minh")

def scheduled_open_morning_shift():
    db = SessionLocal()
    try:
        auto_open_shift(db, "Sang")
    finally:
        db.close()

def scheduled_open_evening_shift():
    db = SessionLocal()
    try:
        auto_open_shift(db, "Toi")
    finally:
        db.close()

def scheduled_shift_closure():
    db = SessionLocal()
    try:
        print("Bắt đầu tiến trình rà soát và đóng ca tự động...")
        auto_close_and_check_missing_assets(db)
    finally:
        db.close()

def scheduled_drive_cleanup():
    # 🟡 ĐÃ SỬA: Nâng lên 7 ngày để trùng khớp với chu kỳ sống của nhật ký dưới DB, chống chết link ảnh
    print("Bắt đầu tiến trình dọn dẹp bộ nhớ Google Drive (xóa file ảnh đi tuần > 7 ngày)...")
    cleanup_old_drive_folders(days=7)

def scheduled_nonce_cleanup():
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        deleted_count = db.query(models.Nonce).filter(
            (models.Nonce.used == True) | (models.Nonce.expires_at < now_utc)
        ).delete(synchronize_session=False)
        db.commit()
        if deleted_count > 0:
            print(f"[SECURITY SYSTEM] Đã dọn {deleted_count} mã Nonce rác")
    except Exception as e:
        db.rollback()
        print(f"[SECURITY ERROR]: Gặp lỗi trong quá trình dọn Nonce: {str(e)}")
    finally:
        db.close()

# =========================================================================
# TÁC VỤ SIÊU BẢO TRÌ: GIẢI PHÓNG DUNG LƯỢNG CHO DATABASE CLOUD FREE
# =========================================================================
def scheduled_audit_log_archive_and_cleanup():
    """
    SIÊU TỐI ƯU HÓA DATABASE CLOUD FREE (ĐÃ VÁ TOÀN BỘ BUG):
    - Tách biệt Transaction: Lỗi phần nào chỉ rollback phần đó, không gây rác trùng lặp.
    - Outer Join + ID Filtering: Đảm bảo không bỏ sót dữ liệu mồ côi và chỉ xóa khi đã lên Drive thành công.
    - Nhất quán sao lưu: Lưu trữ cả LoginLog trước khi xả sạch bộ nhớ DB.
    """
    timestamp_now = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # ──── PHẦN 1: DỌN DẸP VÀ SAO LƯU AUDIT_LOGS ────
    db = SessionLocal()
    try:
        cutoff_time_audit = datetime.now(timezone.utc) - timedelta(days=3)
        old_logs = db.query(models.AuditLog).filter(models.AuditLog.created_at < cutoff_time_audit).all()
        if old_logs:
            log_list = [{
                "Mã Log": log.id, "Mã Nhân Viên": log.actor_id, "Hành Động": log.action,
                "Thực Thể Tác Động": log.target_id, "Địa Chỉ IP": log.ip_address,
                "Thời Gian Hệ Thống (UTC)": log.created_at.isoformat() if log.created_at else "",
                "Payload JSON": log.payload
            } for log in old_logs]
            df_audit = pd.DataFrame(log_list)
            output_audit = io.BytesIO()
            with pd.ExcelWriter(output_audit, engine='openpyxl') as writer:
                df_audit.to_excel(writer, sheet_name='AuditLogs', index=False)
            output_audit.seek(0)
            filename_audit = f"TamAn_AuditLog_Archive_{timestamp_now}.xlsx"
            upload_backup_file_to_drive(file_bytes=output_audit.getvalue(), filename=filename_audit)
            
            db.query(models.AuditLog).filter(models.AuditLog.created_at < cutoff_time_audit).delete(synchronize_session=False)
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã giải phóng thành công {len(old_logs)} dòng AuditLog.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE FATAL_ERROR - PHẦN 1]: Lỗi tiến trình AuditLog: {str(e)}")
    finally:
        db.close()

    # ──── 🔴 PHẦN 2: SAO LƯU VÀ PHÓNG THÍCH INSPECTION_LOGS (ĐÃ SỬA BUG CHÍ MẠNG) ────
    db = SessionLocal()
    try:
        cutoff_time_inspection = datetime.now(timezone.utc) - timedelta(days=7)
        
        # SỬA CHI TIẾT 1: Chuyển hoàn toàn sang .outerjoin() để giữ lại dữ liệu mồ côi khi xuất Excel
        old_inspections = db.query(
            models.InspectionLog, models.Asset.asset_name, models.Room.room_number,
            models.User.full_name, models.Shift.shift_date, models.Shift.shift_type
        ).outerjoin(models.Asset, models.InspectionLog.asset_id == models.Asset.id)\
         .outerjoin(models.Room, models.Asset.room_id == models.Room.id)\
         .outerjoin(models.User, models.InspectionLog.user_id == models.User.id)\
         .outerjoin(models.Shift, models.InspectionLog.shift_id == models.Shift.id)\
         .filter(models.InspectionLog.created_at < cutoff_time_inspection).all()

        if old_inspections:
            inspect_list = [{
                "Log ID": item[0].id, 
                "Ngày Ca Trực": str(item[4]) if item[4] else "N/A", 
                "Loại Ca": item[5] if item[5] else "N/A",
                "Số Phòng": item[2] if item[2] else "Phòng đã bị xóa", 
                "Tên Vật Tư": item[1] if item[1] else "Vật tư đã bị xóa", 
                "Nhân Viên": item[3] if item[3] else "Tài khoản đã bị xóa",
                "Trạng Thái": item[0].status, "Ghi Chú": item[0].note,
                "Version": item[0].version, "Drive Link": item[0].image_url,
                "Thời Gian (UTC)": item[0].created_at.isoformat() if item[0].created_at else ""
            } for item in old_inspections]
            
            df_inspect = pd.DataFrame(inspect_list)
            output_inspect = io.BytesIO()
            with pd.ExcelWriter(output_inspect, engine='openpyxl') as writer:
                df_inspect.to_excel(writer, sheet_name='NhậtKýĐiTuần', index=False)
            output_inspect.seek(0)
            filename_inspect = f"TamAn_InspectionLog_Archive_{timestamp_now}.xlsx"
            upload_backup_file_to_drive(file_bytes=output_inspect.getvalue(), filename=filename_inspect)
            
            # SỬA CHI TIẾT 2: Chỉ thực hiện xóa chính xác những mã ID đã được bốc vào file Excel thành công
            ids_to_delete = [item[0].id for item in old_inspections]
            deleted_inspect_count = db.query(models.InspectionLog).filter(
                models.InspectionLog.id.in_(ids_to_delete)
            ).delete(synchronize_session=False)
            
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã xóa sạch cứng vĩnh viễn {deleted_inspect_count} dòng trong bảng inspection_logs!")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE FATAL_ERROR - PHẦN 2]: Lỗi tiến trình InspectionLog: {str(e)}")
    finally:
        db.close()

    # ──── 🟡 PHẦN 3: SAO LƯU VÀ TRIỆT TIÊU LOGIN_LOGS (ĐÃ BỔ SUNG BACKUP NHẤT QUÁN) ────
    db = SessionLocal()
    try:
        cutoff_time_login = datetime.now(timezone.utc) - timedelta(days=7)
        old_logins = db.query(models.LoginLog).filter(models.LoginLog.login_time < cutoff_time_login).all()
        
        if old_logins:
            # Tiến hành tạo tệp lưu vết đăng nhập đẩy lên Drive /tmp trước khi xóa cứng
            login_list = [{
                "Mã Log": log.id,
                "Mã Nhân Viên (User ID)": log.user_id,
                "Thời Gian Đăng Nhập": log.login_time.isoformat() if log.login_time else "",
                "Địa Chỉ IP": log.ip_address,
                "Thiết Bị (User Agent)": log.user_agent
            } for log in old_logins]
            
            df_login = pd.DataFrame(login_list)
            output_login = io.BytesIO()
            with pd.ExcelWriter(output_login, engine='openpyxl') as writer:
                df_login.to_excel(writer, sheet_name='LoginLogs', index=False)
            output_login.seek(0)
            filename_login = f"TamAn_LoginLog_Archive_{timestamp_now}.xlsx"
            upload_backup_file_to_drive(file_bytes=output_login.getvalue(), filename=filename_login)

            deleted_login_count = db.query(models.LoginLog).filter(models.LoginLog.login_time < cutoff_time_login).delete(synchronize_session=False)
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã xóa sạch {deleted_login_count} dòng LoginLog cũ.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE FATAL_ERROR - PHẦN 3]: Lỗi tiến trình LoginLog: {str(e)}")
    finally:
        db.close()

    # ──── PHẦN 4 & 5: DỌN DẸP CA TRỰC VÀ TÀI SẢN ARCHIVED MỒ CÔI ────
    db = SessionLocal()
    try:
        # Xóa cứng ca trực cũ > 90 ngày
        cutoff_date_shift = (datetime.now() - timedelta(days=90)).date()
        deleted_shifts_count = db.query(models.Shift).filter(models.Shift.shift_date < cutoff_date_shift).delete(synchronize_session=False)
        
        # Xóa cứng vật tư Archived > 30 ngày
        cutoff_time_asset = datetime.now(timezone.utc) - timedelta(days=30)
        deleted_assets_count = db.query(models.Asset).filter(
            models.Asset.status == "Archived",
            models.Asset.created_at < cutoff_time_asset
        ).delete(synchronize_session=False)
        
        db.commit()
        if deleted_shifts_count > 0 or deleted_assets_count > 0:
            print(f"[💥 SUPER CLEANUP]: Đã giải phóng hoàn toàn {deleted_shifts_count} ca trực và {deleted_assets_count} tài sản Archived cũ khỏi DB live.")
        print("[MAINTENANCE COMPLETED]: Cơ sở dữ liệu đã đạt trạng thái tinh khiết tuyệt đối.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE FATAL_ERROR - PHẦN 4-5]: Lỗi giải phóng thực thể mồ côi: {str(e)}")
    finally:
        db.close()


def scheduled_database_backup_task():
    """
    Tác vụ định kỳ tự động hóa kết xuất bản dump SQL bảo mật (.sql), chuyển lên /backup Cloud
    và thực thi chính sách dọn dẹp thông minh giữ đúng 4 bản gần nhất.
    """
    try:
        print("[CRONJOB BACKUP]: Bắt đầu luồng tự động sao lưu Database lên Cloud...")
        sql_bytes = execute_database_dump()
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"TamAn_Production_DB_Backup_{timestamp_str}.sql"
        
        drive_link = upload_db_backup_to_drive(file_bytes=sql_bytes, filename=filename)
        print(f"[CRONJOB BACKUP SUCCESS]: Dữ liệu đã lưu trữ an toàn tại thư mục /backup. Link: {drive_link}")
        
        # ──── KÍCH HOẠT CHÍNH SÁCH GIỮ ĐÚNG 4 BẢN SAO LƯU GẦN NHẤT ĐỂ GIẢI PHÓNG CLOUD ────
        cleanup_old_db_backups(keep_count=4)
        
    except Exception as e:
        print(f"[CRONJOB BACKUP FATAL_ERROR]: Tiến trình tự động sao lưu thất bại: {str(e)}")


def init_scheduler():
    print("HỆ THỐNG: Đang nạp cấu hình thời gian ca trực...")
    db = SessionLocal()

    setting = db.query(models.ShiftSetting).first()
    if not setting:
        setting = models.ShiftSetting(**DEFAULT_SHIFT_SETTINGS)
        db.add(setting)
        db.commit()
    
    m_start_h, m_start_m = map(int, setting.morning_start.split(':'))
    m_end_h, m_end_m = map(int, setting.morning_end.split(':'))
    e_start_h, e_start_m = map(int, setting.evening_start.split(':'))
    e_end_h, e_end_m = map(int, setting.evening_end.split(':'))
    db.close()

    # Đăng ký các lịch trình chạy (Cron & Interval) kèm ID định danh
    scheduler.add_job(scheduled_open_morning_shift, 'cron', hour=m_start_h, minute=m_start_m, id='open_morning_task')
    scheduler.add_job(scheduled_shift_closure, 'cron', hour=m_end_h, minute=m_end_m, id='close_morning_task')

    scheduler.add_job(scheduled_open_evening_shift, 'cron', hour=e_start_h, minute=e_start_m, id='open_evening_task')
    scheduler.add_job(scheduled_shift_closure, 'cron', hour=e_end_h, minute=e_end_m, id='close_evening_task')

    # Dọn dẹp ảnh đi tuần cũ trong thư mục /ProveImage (Đã đồng bộ lên 7 ngày)
    scheduler.add_job(scheduled_drive_cleanup, 'cron', hour=2, minute=0, id='cleanup_drive_task')
    
    # Tự động dọn dẹp mã Nonce bảo mật định kỳ 5 phút một lần
    scheduler.add_job(scheduled_nonce_cleanup, 'interval', minutes=5, id='cleanup_nonce_task')

    # Tác vụ lưu trữ AuditLog lên /tmp và Purge sạch LoginLog rác định kỳ cách nhau 3 ngày
    scheduler.add_job(
        scheduled_audit_log_archive_and_cleanup,
        IntervalTrigger(days=3, start_date="2026-06-21 03:00:00"),
        id='archive_and_cleanup_audit_log_task',
        replace_existing=True
    )

    # Tác vụ kết xuất bản sao lưu thảm họa .sql lên /backup (Cách nhau 3 ngày, lệch giờ 30 phút để tránh nghẽn)
    scheduler.add_job(
        scheduled_database_backup_task,
        IntervalTrigger(days=3, start_date="2026-06-21 03:30:00"),
        id='database_backup_task',
        replace_existing=True
    )

    scheduler.start()
    print("[SYSTEM]: Kích hoạt công cụ Scheduler ngầm tối ưu dung lượng thành công.")
    return scheduler