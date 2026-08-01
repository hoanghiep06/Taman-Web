import io
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db
from models import User, ShiftSetting, Shift
from schemas import ShiftSettingResponse, ShiftSettingUpdate, RoleType
from core.dependencies import PermissionChecker, get_current_user
from services.backup_service import execute_database_dump
from services.drive_service import (
    upload_db_backup_to_drive,
    list_db_backups_from_drive,
    cleanup_old_db_backups
)
from services.shift_service import check_and_sync_shift_jit

router = APIRouter(prefix="/api/admin/system", tags=["7. [Admin Tối Cao] Cấu Hình & Sao Lưu Hệ Thống"])

admin_only = PermissionChecker([RoleType.Admin])
management_only = PermissionChecker([RoleType.Admin, RoleType.Manager])

# =========================================================================
# 1. BẢO TRÌ & SAO LƯU CLOUD (ADMIN ONLY)
# =========================================================================
@router.get(
    "/backup/list",
    summary="[Admin] Danh sách bản sao lưu DB trên Google Drive",
    description="Truy vấn danh sách các bản backup `.sql` hiện có trên thư mục /backup Cloud Drive."
)
def get_backup_list_on_cloud(current_user: User = Depends(admin_only)):
    try:
        backups = list_db_backups_from_drive()
        return {"status": "Success", "total_backups": len(backups), "backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn Drive: {str(e)}")



@router.post(
    "/backup/manual-run",
    summary="[Admin] Kích hoạt Sao lưu Database thủ công ngay lập tức",
    description="Dump file dữ liệu `.sql`, đẩy lên Drive khẩn cấp và áp dụng chính sách giữ đúng 4 bản sao lưu mới nhất."
)
def trigger_manual_backup(current_user: User = Depends(admin_only)):
    try:
        sql_bytes = execute_database_dump()
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"TamAn_Manual_Backup_{timestamp_str}.sql"

        drive_link = upload_db_backup_to_drive(file_bytes=sql_bytes, filename=filename)
        cleanup_old_db_backups(keep_count=4)

        return {
            "status": "Success",
            "message": "Sao lưu thủ công cấp tốc thành công!",
            "drive_url": drive_link
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Thất bại khi sao lưu: {str(e)}")


# =========================================================================
# 2. QUẢN LÝ CẤU HÌNH THỜI GIAN CA TRỰC
# =========================================================================
@router.get(
    "/settings/shifts",
    response_model=ShiftSettingResponse,
    summary="[Quản lý] Xem cấu hình thời gian ca trực",
    description="Trả về khung giờ ca Sáng và ca Tối đang áp dụng trong hệ thống."
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
    summary="[Admin] Cập nhật thời gian ca trực & Đồng bộ Scheduler ngầm",
    description="""
    **Thay đổi giờ bắt đầu/kết thúc ca Sáng & Ca Tối:**
    - Hỗ trợ ca Tối vắt qua đêm (VD: `morning_start: '08:00'`, `morning_end: '19:00'`, `evening_start: '20:00'`, `evening_end: '07:00'`).
    - Tự động cập nhật Job Cronjob trong APScheduler ngầm mà không cần restart server.
    """
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

    # Can thiệp Scheduler ngầm
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
    summary="[Quản lý] Kích hoạt cưỡng chế đồng bộ Ca Trực (JIT Sync)",
    description="Kiểm tra ca mồ côi quá hạn, chốt sổ ca cũ và mở ca mới đúng ngày/giờ live."
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

    