# backend/core/scheduler.py
import io
import pandas as pd
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from core.constants import DEFAULT_SHIFT_SETTINGS


from database import SessionLocal
import models
from services.shift_service import auto_close_and_check_missing_assets, auto_open_shift
from services.drive_service import (
    cleanup_old_drive_folders, 
    cleanup_old_db_backups, 
    upload_db_backup_to_drive
)
from services.backup_service import execute_database_dump

# Fallback khung giờ mới: Sáng 08:00 - 19:00 | Tối 20:00 - 07:00
DEFAULT_SHIFT_SETTINGS_NEW = DEFAULT_SHIFT_SETTINGS

scheduler = BackgroundScheduler(timezone="Asia/Ho_Chi_Minh")


# =========================================================================
# 1. CÁC TÁC VỤ ĐỒNG BỘ CA TRỰC TỰ ĐỘNG
# =========================================================================
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
        print("[CRONJOB SHIFT]: Bắt đầu tiến trình rà soát và đóng ca tự động...")
        auto_close_and_check_missing_assets(db)
        db.commit()
    finally:
        db.close()


# =========================================================================
# 2. DỌN DẸP ẢNH ĐI TUẦN TRÊN DRIVE (12:00 TRƯA - KHỦNG GIỜ NGHỈ NỔI)
# =========================================================================
def scheduled_drive_cleanup():
    """
    Tự động dọn dẹp các thư mục ảnh đi tuần InspectionImage cũ > 7 ngày.
    Chạy lúc 12:00 trưa hàng ngày (Thời gian nghỉ giữa ca Sáng và ca Tối).
    Bảo vệ tuyệt đối các thư mục Health, Prescriptions, Toa thuốc và Backup SQL!
    """
    print("[CRONJOB DRIVE]: Bắt đầu dọn dẹp ảnh đi tuần InspectionImage cũ > 7 ngày...")
    cleanup_old_drive_folders(days=7)


def scheduled_nonce_cleanup():
    """Xóa các mã Nonce đã dùng hoặc đã hết hạn định kỳ 5 phút/lần."""
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        deleted_count = db.query(models.Nonce).filter(
            (models.Nonce.used == True) | (models.Nonce.expires_at < now_utc)
        ).delete(synchronize_session=False)
        db.commit()
        if deleted_count > 0:
            print(f"[SECURITY SYSTEM]: Đã dọn dẹp {deleted_count} mã Nonce rác hết hạn.")
    except Exception as e:
        db.rollback()
        print(f"[SECURITY ERROR]: Lỗi tiến trình dọn Nonce: {str(e)}")
    finally:
        db.close()


# =========================================================================
# 3. TÁC VỤ BẢO TRÌ & GIẢI PHÓNG DUNG LƯỢNG DATABASE CLOUD FREE
# =========================================================================
def scheduled_audit_log_archive_and_cleanup():
    """
    TẬP TRUNG TỐI ƯU DATABASE CLOUD (MỖI 3 NGÀY CHẠY 1 LẦN):
    - Xuất Excel lưu vết AuditLog, InspectionLog cũ, LoginLog đẩy lên Cloud /tmp.
    - Xóa cứng các bản ghi rác để giữ DB PostgreSQL luôn nhẹ và dưới ngưỡng Free Tier.
    """
    timestamp_now = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # ──── PHẦN 1: DỌN DẸP AUDIT_LOGS (> 3 NGÀY) ────
    db = SessionLocal()
    try:
        cutoff_time_audit = datetime.now(timezone.utc) - timedelta(days=3)
        old_logs = db.query(models.AuditLog).filter(models.AuditLog.created_at < cutoff_time_audit).all()
        if old_logs:
            log_list = [{
                "Mã Log": log.id, "Mã Nhân Viên": log.actor_id, "Hành Động": log.action,
                "Thực Thể Tác Động": log.target_id, "Địa Chỉ IP": log.ip_address,
                "Thời Gian UTC": log.created_at.isoformat() if log.created_at else "",
                "Payload JSON": log.payload
            } for log in old_logs]
            
            df_audit = pd.DataFrame(log_list)
            output_audit = io.BytesIO()
            with pd.ExcelWriter(output_audit, engine='openpyxl') as writer:
                df_audit.to_excel(writer, sheet_name='AuditLogs', index=False)
            output_audit.seek(0)
            
            filename_audit = f"TamAn_AuditLog_Archive_{timestamp_now}.xlsx"
            upload_db_backup_to_drive(file_bytes=output_audit.getvalue(), filename=filename_audit)
            
            db.query(models.AuditLog).filter(models.AuditLog.created_at < cutoff_time_audit).delete(synchronize_session=False)
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã giải phóng {len(old_logs)} dòng AuditLog cũ.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE ERROR - AuditLog]: {str(e)}")
    finally:
        db.close()

    # ──── PHẦN 2: DỌN DẸP INSPECTION_LOGS (> 7 NGÀY) ────
    db = SessionLocal()
    try:
        cutoff_time_inspection = datetime.now(timezone.utc) - timedelta(days=7)
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
                "Số Phòng": item[2] if item[2] else "Đã xóa", 
                "Tên Vật Tư": item[1] if item[1] else "Đã xóa", 
                "Nhân Viên": item[3] if item[3] else "Đã xóa",
                "Trạng Thái": item[0].status, "Ghi Chú": item[0].note,
                "Version": item[0].version, "Drive Link": item[0].image_url,
                "Thời Gian UTC": item[0].created_at.isoformat() if item[0].created_at else ""
            } for item in old_inspections]
            
            df_inspect = pd.DataFrame(inspect_list)
            output_inspect = io.BytesIO()
            with pd.ExcelWriter(output_inspect, engine='openpyxl') as writer:
                df_inspect.to_excel(writer, sheet_name='NhậtKýĐiTuần', index=False)
            output_inspect.seek(0)
            
            filename_inspect = f"TamAn_InspectionLog_Archive_{timestamp_now}.xlsx"
            upload_db_backup_to_drive(file_bytes=output_inspect.getvalue(), filename=filename_inspect)
            
            ids_to_delete = [item[0].id for item in old_inspections]
            deleted_count = db.query(models.InspectionLog).filter(
                models.InspectionLog.id.in_(ids_to_delete)
            ).delete(synchronize_session=False)
            
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã giải phóng {deleted_count} dòng InspectionLog.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE ERROR - InspectionLog]: {str(e)}")
    finally:
        db.close()

    # ──── PHẦN 3: DỌN DẸP LOGIN_LOGS (> 7 NGÀY) ────
    db = SessionLocal()
    try:
        cutoff_time_login = datetime.now(timezone.utc) - timedelta(days=7)
        old_logins = db.query(models.LoginLog).filter(models.LoginLog.login_time < cutoff_time_login).all()
        
        if old_logins:
            login_list = [{
                "Mã Log": log.id,
                "Mã Nhân Viên": log.user_id,
                "Thời Gian Đăng Nhập": log.login_time.isoformat() if log.login_time else "",
                "Địa Chỉ IP": log.ip_address,
                "User Agent": log.user_agent
            } for log in old_logins]
            
            df_login = pd.DataFrame(login_list)
            output_login = io.BytesIO()
            with pd.ExcelWriter(output_login, engine='openpyxl') as writer:
                df_login.to_excel(writer, sheet_name='LoginLogs', index=False)
            output_login.seek(0)
            
            filename_login = f"TamAn_LoginLog_Archive_{timestamp_now}.xlsx"
            upload_db_backup_to_drive(file_bytes=output_login.getvalue(), filename=filename_login)

            deleted_login_count = db.query(models.LoginLog).filter(models.LoginLog.login_time < cutoff_time_login).delete(synchronize_session=False)
            db.commit()
            print(f"[DATABASE CLEANUP]: Đã giải phóng {deleted_login_count} dòng LoginLog.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE ERROR - LoginLog]: {str(e)}")
    finally:
        db.close()

    # ──── PHẦN 4 & 5: DỌN DẸP CA TRỰC CŨ (> 90 NGÀY) VÀ ASSET ARCHIVED (> 30 NGÀY) ────
    db = SessionLocal()
    try:
        cutoff_date_shift = (datetime.now() - timedelta(days=90)).date()
        deleted_shifts = db.query(models.Shift).filter(models.Shift.shift_date < cutoff_date_shift).delete(synchronize_session=False)
        
        cutoff_time_asset = datetime.now(timezone.utc) - timedelta(days=30)
        deleted_assets = db.query(models.Asset).filter(
            models.Asset.status == "Archived",
            models.Asset.created_at < cutoff_time_asset
        ).delete(synchronize_session=False)
        
        db.commit()
        if deleted_shifts > 0 or deleted_assets > 0:
            print(f"[SUPER CLEANUP]: Đã dọn {deleted_shifts} ca trực cũ và {deleted_assets} tài sản Archived.")
    except Exception as e:
        db.rollback()
        print(f"[MAINTENANCE ERROR - Purge]: {str(e)}")
    finally:
        db.close()


def scheduled_database_backup_task():
    """
    Tự động sao lưu Database thảm họa (.sql) lên /backup Cloud Drive
    và áp dụng chính sách giữ lại đúng 4 bản mới nhất.
    """
    try:
        print("[CRONJOB BACKUP]: Bắt đầu tiến trình sao lưu Database SQL thảm họa...")
        sql_bytes = execute_database_dump()
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"TamAn_Production_DB_Backup_{timestamp_str}.sql"
        
        drive_link = upload_db_backup_to_drive(file_bytes=sql_bytes, filename=filename)
        print(f"[CRONJOB BACKUP SUCCESS]: Đã sao lưu an toàn tại thư mục /backup: {drive_link}")
        
        # Giữ lại đúng 4 bản backup SQL mới nhất
        cleanup_old_db_backups(keep_count=4)
    except Exception as e:
        print(f"[CRONJOB BACKUP ERROR]: {str(e)}")


# =========================================================================
# 4. KHỞI TẠO VÀ ĐĂNG KÝ JOBS CHO APSCHEDULER
# =========================================================================
def init_scheduler():
    print("[SYSTEM]: Đang nạp cấu hình thời gian ca trực cho Scheduler ngầm...")
    db = SessionLocal()

    setting = db.query(models.ShiftSetting).first()
    if not setting:
        setting = models.ShiftSetting(**DEFAULT_SHIFT_SETTINGS_NEW)
        db.add(setting)
        db.commit()
    
    m_start_h, m_start_m = map(int, setting.morning_start.split(':'))
    m_end_h, m_end_m = map(int, setting.morning_end.split(':'))
    e_start_h, e_start_m = map(int, setting.evening_start.split(':'))
    e_end_h, e_end_m = map(int, setting.evening_end.split(':'))
    db.close()

    # Lịch Mở/Đóng ca Sáng & ca Tối (Theo cấu hình Database)
    scheduler.add_job(scheduled_open_morning_shift, 'cron', hour=m_start_h, minute=m_start_m, id='open_morning_task', replace_existing=True)
    scheduler.add_job(scheduled_shift_closure, 'cron', hour=m_end_h, minute=m_end_m, id='close_morning_task', replace_existing=True)

    scheduler.add_job(scheduled_open_evening_shift, 'cron', hour=e_start_h, minute=e_start_m, id='open_evening_task', replace_existing=True)
    scheduler.add_job(scheduled_shift_closure, 'cron', hour=e_end_h, minute=e_end_m, id='close_evening_task', replace_existing=True)

    # 🌟 ĐÃ ĐỔI: Dọn dẹp ảnh đi tuần InspectionImage cũ lúc 12:00 trưa hàng ngày (Giờ nghỉ giải lao)
    scheduler.add_job(scheduled_drive_cleanup, 'cron', hour=12, minute=0, id='cleanup_drive_task', replace_existing=True)
    
    # Dọn Nonce rác 5 phút/lần
    scheduler.add_job(scheduled_nonce_cleanup, 'interval', minutes=5, id='cleanup_nonce_task', replace_existing=True)

    # Xuất Excel dọn rác DB Cloud Free định kỳ 3 ngày/lần
    scheduler.add_job(
        scheduled_audit_log_archive_and_cleanup,
        IntervalTrigger(days=3),
        id='archive_and_cleanup_audit_log_task',
        replace_existing=True
    )

    # Backup Database SQL thảm họa định kỳ 3 ngày/lần (Lệch 30 phút chống nghẽn)
    scheduler.add_job(
        scheduled_database_backup_task,
        IntervalTrigger(days=3),
        id='database_backup_task',
        replace_existing=True
    )

    scheduler.start()
    print("[SYSTEM]: Kích hoạt Scheduler ngầm tối ưu dung lượng thành công!")
    return scheduler