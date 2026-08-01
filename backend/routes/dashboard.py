from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Shift, ShiftSummary, Asset, InspectionLog, LoginLog, User, Room, Zone
from schemas import DashboardResponse, LoginLogResponse, RoleType
from core.dependencies import PermissionChecker, get_current_user

router = APIRouter(prefix="/api/admin", tags=["8. [Admin/Manager] Dashboard & Audit Logs"])

management_only = PermissionChecker([RoleType.Admin, RoleType.Manager])


# =========================================================================
# 1. DASHBOARD QUẢN TRỊ CA TRỰC LIVE & SỰ CỐ GẦN ĐÂY
# =========================================================================
@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="[Quản lý] Báo cáo tổng quan Dashboard ca trực live",
    description="""
    **Dành cho Manager / Admin vẽ màn hình Tổng Quan Trung Tâm:**
    - Trả về phần trăm % tiến độ kiểm kê ca live, số tư trang báo mất, số tư trang chưa chụp.
    - Hỗ trợ phân quyền Đa Cơ Sở: Manager cơ sở nào chỉ xem thống kê của cơ sở đó.
    - Danh sách các sự cố báo mất trong các ca gần nhất (`recent_incidents`).
    """
)
def get_admin_dashboard(
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở (Admin/Manager Vùng)"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng ca trực cũ muốn lấy lịch sử"),
    db: Session = Depends(get_db),
    current_user: User = Depends(management_only)
):
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id

    # 1. Thống kê Ca Live đang Open
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
        # Lấy danh sách ID phòng thuộc Cơ sở cần xem
        asset_query = db.query(Asset).filter(Asset.status == "Active", Asset.requires_inspection == True)
        if target_facility_id is not None:
            asset_query = asset_query.join(Room).join(Zone).filter(Zone.facility_id == target_facility_id)

        total_active_assets = asset_query.count()

        # Lấy các log kiểm kê live của ca này
        log_query = db.query(InspectionLog).filter(
            InspectionLog.shift_id == open_shift.id,
            InspectionLog.is_latest == True
        )
        if target_facility_id is not None:
            log_query = log_query.join(Asset).join(Room).join(Zone).filter(Zone.facility_id == target_facility_id)

        latest_logs = log_query.all()

        inspected = len(latest_logs)
        lost = sum(1 for log in latest_logs if log.status == "Vang")
        missing = max(0, total_active_assets - inspected)
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

    # 2. Lịch sử Chốt Ca & Sự Cố từ SHIFT_SUMMARIES
    summary_query = db.query(ShiftSummary, Shift).join(Shift, ShiftSummary.shift_id == Shift.id)
    recent_summaries = summary_query.order_by(desc(ShiftSummary.created_at)).limit(limit).all()

    incidents_response = []
    for summary, shift in recent_summaries:
        incidents_response.append({
            "shift_id": shift.id,
            "shift_date": shift.shift_date,
            "shift_type": shift.shift_type,
            "total_assets": summary.total_assets,
            "inspected_count": summary.inspected_count,
            "missing_count": summary.missing_count,
            "lost_count": summary.lost_count,
            "is_email_sent": summary.is_email_sent,
            "created_at": summary.created_at
        })

    return {
        "current_shift": current_stats,
        "recent_incidents": incidents_response
    }


# =========================================================================
# 2. AUDIT LOGS - NHẬT KÝ ĐĂNG NHẬP
# =========================================================================
@router.get(
    "/audit/login-logs",
    response_model=List[LoginLogResponse],
    summary="[Quản lý] Tra cứu Nhật ký đăng nhập hệ thống",
    description="Tra cứu lịch sử truy cập của nhân viên (Thời gian, IP, Thiết bị) để kiểm soát an ninh."
)
def get_login_audit_logs(
    username: Optional[str] = Query(None, description="Lọc theo tên đăng nhập/sĐT nhân viên"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(management_only)
):
    query = db.query(
        LoginLog.id,
        LoginLog.user_id,
        LoginLog.login_time,
        LoginLog.ip_address,
        LoginLog.user_agent
    ).join(User, LoginLog.user_id == User.id)

    if current_user.facility_id is not None:
        query = query.filter(User.facility_id == current_user.facility_id)

    if username:
        query = query.filter(User.username.ilike(f"%{username}%"))

    return query.order_by(desc(LoginLog.login_time)).offset(skip).limit(limit).all()