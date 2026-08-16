# routes/system.py
import io
import logging
import threading
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, sessionmaker

from database import get_db, engine
from models import User, ShiftSetting, Shift
import models
from schemas import ShiftSettingResponse, ShiftSettingUpdate, RoleType
from core.dependencies import PermissionChecker
from services.backup_service import execute_database_dump, execute_database_restore
from services.drive_service import (
    upload_db_backup_to_drive,
    list_db_backups_from_drive,
    download_file_bytes_from_drive,
    cleanup_old_db_backups
)
from services.shift_service import check_and_sync_shift_jit

router = APIRouter(prefix="/api/admin/system", tags=["7. [Admin Tối Cao] Cấu Hình & Sao Lưu Hệ Thống"])

logger = logging.getLogger("backup_restore")
admin_only = PermissionChecker([RoleType.Admin])
management_only = PermissionChecker([RoleType.Admin, RoleType.Manager])

# Khóa chống xung đột: Không cho 2 admin cùng restore 1 thời điểm
_restore_lock = threading.Lock()


# =========================================================================
# 1. DANH SÁCH BẢN SAO LƯU TRÊN DRIVE
# =========================================================================
@router.get(
    "/backup/list",
    summary="[Admin] Danh sách bản sao lưu DB trên Google Drive",
    description="Lấy danh sách toàn bộ các file backup (.sql) hiện có trên Google Drive cùng dung lượng và thời gian tạo."
)
def get_backup_list_on_cloud(current_user: User = Depends(admin_only)):
    try:
        backups = list_db_backups_from_drive()
        return {
            "status": "Success",
            "total_backups": len(backups),
            "backups": backups
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn Drive: {str(e)}")


# =========================================================================
# 2. SAO LƯU THỦ CÔNG LÊN DRIVE
# =========================================================================
@router.post(
    "/backup/manual-run",
    summary="[Admin] Kích hoạt Sao lưu Database thủ công ngay lập tức",
    description="Tạo bản dump SQL của toàn bộ cơ sở dữ liệu hiện tại, đẩy lên Google Drive và giữ 4 bản mới nhất."
)
def trigger_manual_backup(current_user: User = Depends(admin_only)):
    try:
        sql_bytes = execute_database_dump()
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"TamAn_Manual_Backup_{timestamp_str}.sql"

        drive_link = upload_db_backup_to_drive(file_bytes=sql_bytes, filename=filename)
        cleanup_old_db_backups(keep_count=4)

        logger.info(f"[MANUAL BACKUP SUCCESS]: {filename} -> {drive_link}")
        return {
            "status": "Success",
            "message": "Sao lưu thủ công cơ sở dữ liệu thành công!",
            "drive_url": drive_link,
            "filename": filename
        }
    except Exception as e:
        logger.error(f"[MANUAL BACKUP ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Thất bại khi sao lưu: {str(e)}")


# =========================================================================
# 3. TẢI FILE BACKUP VỀ MÁY TÍNH
# =========================================================================
@router.get(
    "/backup/download/{file_id}",
    summary="[Admin] Tải trực tiếp file sao lưu (.sql) từ Drive về máy",
    description="Tải tệp tin sao lưu cơ sở dữ liệu từ Google Drive về máy tính cá nhân."
)
def download_backup_file(
    file_id: str,
    current_user: User = Depends(admin_only)
):
    try:
        file_bytes = download_file_bytes_from_drive(file_id)
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/sql",
            headers={"Content-Disposition": f"attachment; filename=backup_{file_id}.sql"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể tải file từ Drive: {str(e)}")


# =========================================================================
# 4. KHÔI PHỤC DATABASE (DISASTER RECOVERY)
# =========================================================================
@router.post(
    "/backup/restore",
    summary="[Admin] Khôi phục Database từ Google Drive ID hoặc File .sql",
    description="""
    **Quy trình Cứu hộ Dữ liệu An toàn Tuyệt đối:**
    1. Tiếp nhận nguồn khôi phục từ `drive_file_id` (trên Drive) hoặc upload tệp tin `file` (.sql).
    2. **Tạo Snapshot an toàn trước khi khôi phục** và đẩy lên Drive phòng ngừa rủi ro.
    3. Giải phóng Connection Pool tránh deadlock.
    4. Nạp dữ liệu SQL vào PostgreSQL trong 1 Transaction nguyên tử (All or Nothing).
    5. Tự động rà soát khung giờ và mở lại ca trực live tương ứng.
    """
)
def restore_database_system(
    drive_file_id: Optional[str] = Query(None, description="ID file .sql trên Google Drive để khôi phục"),
    file: Optional[UploadFile] = File(None, description="Hoặc đính kèm trực tiếp file .sql từ máy tính"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    if not _restore_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Đang có tiến trình khôi phục khác đang chạy, vui lòng chờ."
        )

    safety_drive_link = None
    try:
        sql_data_bytes = b""

        # Tình huống 1: Lấy file từ Google Drive
        if drive_file_id:
            logger.warning(f"[RECOVERY] Admin '{current_user.username}' khôi phục từ Drive ID: {drive_file_id}")
            sql_data_bytes = download_file_bytes_from_drive(drive_file_id)

        # Tình huống 2: Lấy file Upload từ Client
        elif file:
            if not file.filename.endswith('.sql'):
                raise HTTPException(status_code=400, detail="Chỉ chấp nhận tệp tin định dạng .sql!")
            logger.warning(f"[RECOVERY] Admin '{current_user.username}' khôi phục từ file upload: {file.filename}")
            sql_data_bytes = file.file.read()
        else:
            raise HTTPException(
                status_code=400,
                detail="Vui lòng cung cấp 'drive_file_id' hoặc đính kèm tệp tin 'file'."
            )

        if not sql_data_bytes:
            raise HTTPException(status_code=400, detail="Dữ liệu file phục hồi rỗng!")

        # BƯỚC AN TOÀN: Snapshot DB hiện tại trước khi ghi đè
        try:
            logger.warning("[RECOVERY] Đang tạo bản sao lưu an toàn trước khi khôi phục...")
            safety_bytes = execute_database_dump()
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            safety_filename = f"TamAn_PreRestoreSafety_{ts}.sql"
            safety_drive_link = upload_db_backup_to_drive(file_bytes=safety_bytes, filename=safety_filename)
            logger.info(f"[RECOVERY] Snapshot an toàn đã lưu tại: {safety_drive_link}")
        except Exception as safety_err:
            logger.error(f"[RECOVERY ABORTED] Không thể tạo bản sao lưu an toàn: {safety_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Đã hủy khôi phục vì không tạo được bản backup an toàn trước khi ghi đè: {safety_err}"
            )

        # GIẢI PHÓNG CONNECTION POOL
        db.close()
        engine.dispose()

        # THỰC THI RESTORE THÔ QUA PSQL
        execute_database_restore(sql_data_bytes)

        # ĐỒNG BỘ LẠI CA TRỰC LIVE SAU RESTORE
        FreshSession = sessionmaker(bind=engine)
        fallback_db = FreshSession()
        try:
            check_and_sync_shift_jit(fallback_db)
            logger.info("[RECOVERY SUCCESS]: Đã đồng bộ lại ca trực live sau khôi phục!")
        except Exception as sync_err:
            logger.error(f"[RECOVERY JIT SYNC ERROR]: {str(sync_err)}")
        finally:
            fallback_db.close()

        return {
            "status": "Success",
            "message": "Hệ thống đã được khôi phục thành công mỹ mãn!",
            "pre_restore_safety_backup_url": safety_drive_link
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RECOVERY FATAL ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khôi phục Database: {str(e)}")
    finally:
        _restore_lock.release()


# =========================================================================
# 5. CẤU HÌNH KHUNG GIỜ CA TRỰC (GIỮ NGUYÊN)
# =========================================================================
@router.get(
    "/settings/shifts",
    response_model=ShiftSettingResponse,
    summary="[Quản lý] Xem cấu hình thời gian ca trực"
)
def get_current_shift_times(
    db: Session = Depends(get_db),
    current_user: User = Depends(management_only)
):
    setting = db.query(ShiftSetting).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Chưa có bản cấu hình ca trực!")
    return setting


@router.put(
    "/settings/shifts",
    response_model=ShiftSettingResponse,
    summary="[Admin] Cập nhật thời gian ca trực & Đồng bộ Scheduler ngầm"
)
def update_shift_times(
    payload: ShiftSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    setting = db.query(ShiftSetting).first()
    if not setting:
        setting = ShiftSetting()
        db.add(setting)

    setting.morning_start = payload.morning_start
    setting.morning_end = payload.morning_end
    setting.evening_start = payload.evening_start
    setting.evening_end = payload.evening_end
    db.commit()

    try:
        scheduler = request.app.state.scheduler
        def update_cron_job(job_id, time_str):
            h, m = map(int, time_str.split(':'))
            scheduler.reschedule_job(job_id, trigger='cron', hour=h, minute=m)

        update_cron_job('open_morning_task', payload.morning_start)
        update_cron_job('close_morning_task', payload.morning_end)
        update_cron_job('open_evening_task', payload.evening_start)
        update_cron_job('close_evening_task', payload.evening_end)
    except Exception as e:
        logging.error(f"[SCHEDULER SYNC ERROR]: {str(e)}")

    return setting


@router.post(
    "/refresh-current-shift",
    summary="[Quản lý] Kích hoạt cưỡng chế đồng bộ Ca Trực (JIT Sync)"
)
def refresh_current_shift_manually(
    db: Session = Depends(get_db),
    current_user: User = Depends(management_only)
):
    try:
        check_and_sync_shift_jit(db)
        active_shift = db.query(Shift).filter(Shift.status == "Open").first()
        return {
            "status": "Success",
            "message": "Đã thực hiện rà soát và đồng bộ ca trực toàn hệ thống!",
            "details": {
                "active_shift_date": str(active_shift.shift_date) if active_shift else "N/A",
                "active_shift_type": active_shift.shift_type if active_shift else "None",
                "status": active_shift.status if active_shift else "No active shift"
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Thất bại khi làm mới ca trực: {str(e)}")