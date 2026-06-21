from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, ShiftSetting
from schemas import ShiftSettingResponse, ShiftSettingUpdate
from core.dependencies import get_privileged_user   # Kiểm tra quyền Admin, Manager

router = APIRouter(prefix="/admin/settings", tags=["Admin: Cấu hình hệ thống"])

@router.get("/shifts", response_model=ShiftSettingResponse)
def get_current_shift_times(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    
    setting = db.query(ShiftSetting).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản cấu hình giờ ")
    
    return setting


@router.put("/shifts", response_model=ShiftSettingResponse)
def update_shift_times(
    payload: ShiftSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    setting = db.query(ShiftSetting).first()
    if not setting:
        setting = ShiftSetting()
        db.add(setting)


    # Cập nhật dữ liệu mới vào DB vĩnh viễn
    setting.morning_start = payload.morning_start
    setting.morning_end = payload.morning_end
    setting.evening_start = payload.evening_start
    setting.evening_end = payload.evening_end

    db.commit()

    # Can thiệp vào Scheduler chạy ngầm để cập nhật lịch mới 
    scheduler = request.app.state.scheduler
    try:
        def update_cron_job(job_id, time_str):
            hour, minute = map(int, time_str.split(':'))
            scheduler.reschedule_job(job_id, trigger='cron', hour=hour, minute=minute)

        
        # Đổi lịch trực
        update_cron_job('open_morning_task', payload.morning_start)
        update_cron_job('close_morning_task', payload.morning_end)
        update_cron_job('open_evening_task', payload.evening_start)
        update_cron_job('close_evening_task', payload.evening_end)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Cập nhật DB thành công nhưng lỗi đồng bộ Scheduler. Vui lòng kiểm tra định dạng HH:MM. Chi tiết: {str(e)}"
        )

    return setting