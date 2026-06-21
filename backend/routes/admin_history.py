from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional 

from database import get_db
from models import User, InspectionLog, Shift, ShiftSummary, Asset, Room, LoginLog
from schemas import StaffHistoryResponse, DashboardResponse, LoginLogResponse
from core.dependencies import get_privileged_user


router = APIRouter(prefix="/admin", tags=["Admin Dashboard & History"])

# ==========================================
# 1. API: LỊCH SỬ NHÂN VIÊN
# ==========================================
@router.get("/staff-history/{user_id}", response_model=List[StaffHistoryResponse])
def get_staff_history(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_privileged_user)
):
    # Query join giữa InspectionLog và Shift để lấy ngày/ca
    logs = db.query(
        InspectionLog.id,
        InspectionLog.asset_id,
        InspectionLog.status,
        InspectionLog.note,
        InspectionLog.created_at,
        Shift.shift_date,
        Shift.shift_type
    ).join(Shift, InspectionLog.shift_id == Shift.id).filter(
        InspectionLog.user_id == user_id
    ).order_by(InspectionLog.created_at.desc()).all()
    
    if not logs:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử cho nhân viên này")

    return logs

# ==========================================
# 2. API: ADMIN DASHBOARD
# ==========================================

@router.get("/dashboard", response_model=DashboardResponse)
def get_admin_dashboard(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    """
    Lấy data tổng quan cho Admin Dashboard
    - Status ca trực hiện tại (%)
    - Lịch sử các ca gần nhất (Từ Shift_Summaries)
    """

    # Thống kê ca hiện tại
    open_shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()

    current_stats = {
        "status": "No Open Shift",
        "shift_type": None,
        "progress_percentage": 0.0,
        "total_assets": 0,
        "inspected_count": 0,
        "missing_items_count": 0,
        "lost_items_count": 0
    }

    if open_shift:
        total_active_assets = db.query(Asset).filter(Asset.status == "Active").count()

        latest_logs = db.query(InspectionLog).filter(
            InspectionLog.shift_id == open_shift.id,
            InspectionLog.is_latest == True
        ).all()

        inspected = len(latest_logs)
        lost = sum(1 for log in latest_logs if log.status == "Vang")
        missing = total_active_assets - inspected

        progress = round((inspected / total_active_assets * 100), 1) if total_active_assets > 0 else 0.0

        current_stats.update({
            "status": "In Progress",
            "shift_type": open_shift.shift_type,
            "progress_percentage": progress,
            "total_assets": total_active_assets,
            "inspected_count": inspected,
            "missing_items_count": missing,
            "lost_items_count": lost
        })


    # Lịch sử chốt ca từ SHIFT_SUMMARIES
    recent_summaries = db.query(ShiftSummary, Shift).join(
        Shift, ShiftSummary.shift_id == Shift.id
    ).order_by(desc(ShiftSummary.created_at)).limit(limit).all()

    all_asset_ids = set()
    for summary, _ in recent_summaries:
        if summary.missing_asset_ids:
            all_asset_ids.update(summary.missing_asset_ids)

        if summary.lost_asset_ids:
            all_asset_ids.update(summary.lost_asset_ids)

    asset_dict = {}
    if all_asset_ids:
        assets_info = db.query(Asset.id, Asset.asset_name, Room.room_number).outerjoin(
            Room, Asset.room_id == Room.id
        ).filter(Asset.id.in_(all_asset_ids)).all()

        for a_id, name, room_num in assets_info:
            asset_dict[a_id] = {
                "asset_id": a_id,
                "asset_name": name,
                "room_number": room_num if room_num else "Chung"
            }

    # Trả về data cho frontend
    incidents_response = []
    for summary, shift in recent_summaries:
        missing_details = [asset_dict[a_id] for a_id in (summary.missing_asset_ids or []) if a_id in asset_dict]
        lost_details = [asset_dict[a_id] for a_id in (summary.lost_asset_ids or []) if a_id in asset_dict]

        incidents_response.append({
            "shift_id": shift.id,
            "shift_date": shift.shift_date,
            "shift_type": shift.shift_type,
            "total_assets": summary.total_assets,
            "inspected_count": summary.inspected_count,
            "missing_count": summary.missing_count,
            "lost_count": summary.lost_count,
            "is_email_sent": summary.is_email_sent,
            "missing_assets_details": missing_details,
            "lost_assets_details": lost_details,
            "created_at": summary.created_at
        })

    return {
        "current_shift": current_stats,
        "recent_incidents": incidents_response
    }


# ==========================================
# 3. API: XEM LỊCH SỬ ĐĂNG NHẬP (ADMIN & MANAGER ONLY)
# ==========================================

@router.get("/audit/login-logs", response_model=List[LoginLogResponse])
def get_login_audit_logs(
    username: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    
    """
    Tra cứu lịch sử đăng nhập hệ thống để phát hiện các truy cập bất thường 
    từ IP lạ hoặc thiết bị lạ ngoài cơ sở. Chỉ Admin tối cao mới xem được.
    """

    if current_user.role not in ("Admin", "Manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền truy cập vào tính năng này"
        )
    
    query = db.query(
        LoginLog.id, 
        LoginLog.login_time,
        LoginLog.ip_address,
        LoginLog.user_agent,
        User.username,
        User.full_name
    ).join(User, LoginLog.user_id == User.id)


    # Bộ lọc tìm kiếm theo tài khoản nhân viên
    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))

    logs = query.order_by(desc(LoginLog.login_time)).offset(skip).limit(limit).all()

    return logs