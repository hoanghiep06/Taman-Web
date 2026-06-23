import random 
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional 
from jose import jwt
from database import get_db
from datetime import date, timedelta, timezone, datetime
from models import User, InspectionLog, Shift, ShiftSummary, Asset, Room, LoginLog, Elder, ShiftSetting
from schemas import StaffHistoryResponse, DashboardResponse, LoginLogResponse
from core.dependencies import get_privileged_user
from core.config import settings
from core.security import ALGORITHM
import pytz

tz_vn = pytz.timezone('Asia/Ho_Chi_Minh')

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



# =========================================================================
# 4. API: BÁO CÁO BẤT THƯỜNG CỦA MỘT CA ĐÍCH DANH (Đã chuyển từ inspections sang)
# =========================================================================
@router.get("/shifts/missing-report")
def get_shift_missing_anomaly_report(
    shift_id: Optional[int] = Query(None, description="Tra cứu đích danh bằng ID ca trực"),
    shift_date: Optional[str] = Query(None, description="Tra cứu theo ngày (Định dạng: YYYY-MM-DD)"),
    shift_type: Optional[str] = Query(None, description="Tra cứu theo loại ca ('Sang' hoặc 'Toi')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    """
    ENDPOINT BÁO CÁO BẤT THƯỜNG CA TRỰC:
    - Mặc định: Tự động bốc ca trực đang Open hiện tại.
    - Có tham số: Tra cứu ngược lịch sử bất kỳ ca trực nào trong quá khứ.
    """
    from models import Elder, ShiftSetting
    
    shift = None
    if shift_id:
        shift = db.query(Shift).filter(Shift.id == shift_id).first()
    elif shift_date and shift_type:
        try:
            parsed_date = date.fromisoformat(shift_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Vui lòng sử youthful YYYY-MM-DD")
        shift = db.query(Shift).filter(Shift.shift_date == parsed_date, Shift.shift_type == shift_type).first()
    else:
        shift = db.query(Shift).filter(Shift.status == "Open").order_by(desc(Shift.created_at)).first()
        if not shift:
            shift = db.query(Shift).order_by(desc(Shift.created_at)).first()

    if not shift:
        raise HTTPException(status_code=404, detail="Hệ thống chưa ghi nhận ca trực nào khớp với điều kiện.")

    active_assets = db.query(Asset, Room.room_number, Elder.full_name).\
        join(Room, Asset.room_id == Room.id).\
        outerjoin(Elder, Asset.elder_id == Elder.id).\
        filter(Asset.status == "Active").all()

    latest_logs = db.query(InspectionLog, User.full_name).\
        join(User, InspectionLog.user_id == User.id).\
        filter(InspectionLog.shift_id == shift.id, InspectionLog.is_latest == True).all()

    log_map = {log.asset_id: (log, user_name) for log, user_name in latest_logs}

    anomaly_items = []
    checked_count = 0
    reported_missing_count = 0
    unchecked_count = 0
    others_count = 0

    for asset, room_number, elder_name in active_assets:
        log_data = log_map.get(asset.id)
        asset_base_info = {
            "asset_id": asset.id,
            "asset_name": asset.asset_name,
            "room_number": room_number,
            "elder_name": elder_name if elder_name else "Tài sản chung của phòng",
        }

        if log_data:
            log, operator_name = log_data
            log_time_str = log.created_at.astimezone(tz_vn).strftime("%H:%M:%S") if log.created_at else None

            if log.status == "Xanh":
                checked_count += 1
            elif log.status == "Vang":
                reported_missing_count += 1
                anomaly_items.append({
                    **asset_base_info,
                    "anomaly_type": "Báo Mất (Vắng)",
                    "note": log.note if log.note else "Không có ghi chú lý do.",
                    "reporter_name": operator_name,
                    "inspected_at": log_time_str
                })
            else:
                others_count += 1
        else:
            unchecked_count += 1
            anomaly_items.append({
                **asset_base_info,
                "anomaly_type": "Bỏ Sót (Chưa kiểm kê)",
                "note": "Nhân viên đi tuần chưa quét qua món đồ này.",
                "reporter_name": "N/A",
                "inspected_at": None
            })

    return {
        "shift_info": {
            "shift_id": shift.id,
            "shift_date": str(shift.shift_date),
            "shift_type": shift.shift_type,
            "status": shift.status
        },
        "statistics": {
            "total_assets": len(active_assets),
            "checked_count": checked_count,
            "reported_missing_count": reported_missing_count,
            "unchecked_count": unchecked_count,
            "others_pending_count": others_count
        },
        "anomaly_items": anomaly_items
    }


# =========================================================================
# 5. API: TRA CỨU LỊCH SỬ TẤT CẢ CÁC CA TRỰC ĐÃ CHỐT SỔ (PHÂN TRANG CÔNG NGHIỆP)
# =========================================================================
@router.get("/shifts/history")
def get_historical_shifts_report(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    target_date: Optional[str] = Query(None, description="Lọc theo ngày (YYYY-MM-DD)"),
    shift_type: Optional[str] = Query(None, description="Lọc theo phiên: 'Sang' hoặc 'Toi'"),  # NEW
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    query = db.query(ShiftSummary, Shift).join(Shift, ShiftSummary.shift_id == Shift.id)
 
    if target_date:
        try:
            parsed_date = date.fromisoformat(target_date)
            query = query.filter(Shift.shift_date == parsed_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày không đúng YYYY-MM-DD")
 
    # NEW: filter theo phiên ca
    if shift_type and shift_type in ("Sang", "Toi"):
        query = query.filter(Shift.shift_type == shift_type)
 
    query = query.order_by(desc(ShiftSummary.created_at))
 
    total_records = query.count()
    offset = (page - 1) * size
    recent_summaries = query.offset(offset).limit(size).all()
 
    shifts_history_list = []
    for summary, shift in recent_summaries:
        shifts_history_list.append({
            "shift_id": shift.id,
            "shift_date": str(shift.shift_date),
            "shift_type": shift.shift_type,
            "status": shift.status,
            # CHANGE: Trả về datetime đầy đủ thay vì chỉ format string 
            # FE sẽ tự slice [11:16] để lấy HH:MM
            "created_at": summary.created_at.astimezone(tz_vn).strftime("%Y-%m-%d %H:%M:%S") if summary.created_at else None,
            "statistics": {
                "total_assets": summary.total_assets,
                "checked_count": summary.inspected_count,
                "reported_missing_count": summary.lost_count,
                "unchecked_count": summary.missing_count,
                "is_email_sent": summary.is_email_sent,   # đã có sẵn, FE dùng được ngay
            }
        })
 
    return {
        "pagination": {
            "total_records": total_records,
            "current_page": page,
            "page_size": size,
            "total_pages": (total_records + size - 1) // size
        },
        "shifts_data": shifts_history_list
    }



# =========================================================================
# 6. API: RANDOM AUDIT HÌNH ẢNH KIỂM KÊ TRONG CA (DÀNH CHO MANAGER)
# =========================================================================
@router.get("/shifts/random-audit")
def get_random_inspection_images_for_audit(
    request: Request,
    # 🌟 ĐIỂM SỬA 1: Đổi từ mặc định = 5 thành Optional và mặc định = None
    limit: Optional[int] = Query(None, ge=1, description="Số lượng ảnh muốn lấy. Nếu trống, mặc định lấy TOÀN BỘ (MAX) ảnh của ca"),
    shift_id: Optional[int] = Query(None, description="ID ca trực muốn kiểm tra"),
    shift_date: Optional[str] = Query(None, description="Ngày ca trực muốn kiểm tra (YYYY-MM-DD)"),
    shift_type: Optional[str] = Query(None, description="Loại ca cần kiểm tra ('Sang' hoặc 'Toi')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    """
    ENDPOINT KIỂM TRA NGẪU NHIÊN HÌNH ẢNH (RANDOM SAMPLING AUDIT):
    - 🌟 ĐÃ CẢI TIẾN: Nếu không truyền 'limit', hệ thống tự động bốc TOÀN BỘ ảnh (Max) của ca đó.
    - Giải quyết triệt để bài toán 1 ảnh chứa nhiều vật phẩm thông qua gom nhóm dữ liệu.
    """

    # 1. LOGIC ĐỊNH VỊ PHIÊN CA TRỰC
    shift = None
    if shift_id:
        shift = db.query(Shift).filter(Shift.id == shift_id).first()
    elif shift_date and shift_type:
        try:
            parsed_date = date.fromisoformat(shift_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ (YYYY-MM-DD)")
        shift = db.query(Shift).filter(Shift.shift_date == parsed_date, Shift.shift_type == shift_type).first()
    else:
        shift = db.query(Shift).filter(Shift.status == "Open").order_by(desc(Shift.created_at)).first()
        if not shift:
            shift = db.query(Shift).order_by(desc(Shift.created_at)).first()

    if not shift:
        raise HTTPException(status_code=404, detail="Hệ thống trống, chưa ghi nhận ca trực nào.")

    # 2. TRUY VẤN TOÀN BỘ CÁC LOGS ĐÃ KIỂM KÊ THÀNH CÔNG (XANH) CỦA CA ĐÓ
    records = db.query(
        InspectionLog, Asset.asset_name, Room.room_number, Elder.full_name, User.full_name
    ).join(Asset, InspectionLog.asset_id == Asset.id)\
     .join(Room, Asset.room_id == Room.id)\
     .outerjoin(Elder, Asset.elder_id == Elder.id)\
     .join(User, InspectionLog.user_id == User.id)\
     .filter(
         InspectionLog.shift_id == shift.id,
         InspectionLog.status == "Xanh",
         InspectionLog.image_url.isnot(None),
         InspectionLog.is_latest == True
     ).all()

    if not records:
        return {
            "shift_info": {
                "shift_id": shift.id,
                "shift_date": str(shift.shift_date),
                "shift_type": shift.shift_type
            },
            "total_unique_images_found": 0,
            "audit_samples": []
        }

    # 3. THUẬT TOÁN GOM NHÓM THEO IMAGE_URL (1 ẢNH - NHIỀU ĐỒ VẬT)
    image_groups = {}
    for log, asset_name, room_number, elder_name, operator_name in records:
        img_url = log.image_url
        if img_url not in image_groups:
            image_groups[img_url] = {
                "room_number": room_number,
                "operator_name": operator_name,
                "inspected_at": log.created_at.astimezone(tz_vn).strftime("%H:%M:%S") if log.created_at else None,
                "permanent_drive_url": img_url,
                "associated_log_ids": [],
                "items": []
            }
        image_groups[img_url]["associated_log_ids"].append(log.id)
        image_groups[img_url]["items"].append({
            "asset_name": asset_name,
            "elder_name": elder_name if elder_name else "Tài sản chung"
        })

    unique_images_list = list(image_groups.values())
    total_unique_images = len(unique_images_list)

    # 🌟 ĐIỂM SỬA 2: XỬ LÝ LOGIC MẶC ĐỊNH MÙA MAX
    # Nếu client không truyền tham số limit lên, mặc định gán limit = tổng số ảnh hiện có (Max)
    if limit is None:
        limit = total_unique_images

    # Giới hạn số lượng random tối đa bằng chính dung lượng ảnh thực tế
    actual_limit = min(limit, total_unique_images)

    # Thực hiện thuật toán bốc thăm ngẫu nhiên
    sampled_audits = random.sample(unique_images_list, actual_limit) if actual_limit > 0 else []

    # 5. SINH LINK BẢO MẬT XEM TẠM THỜI 15 PHÚT
    base_url = str(request.base_url).rstrip("/")
    secret_key = getattr(settings, "JWT_SECRET", getattr(settings, "SECRET_KEY", "TamAn_Fallback_Secret_Key"))
    from jose import jwt

    for sample in sampled_audits:
        primary_log_id = sample["associated_log_ids"][0]
        expiration_timestamp = int((datetime.now(timezone.utc) + timedelta(minutes=15)).timestamp())
        
        token_payload = {
            "log_id": primary_log_id,
            "exp": expiration_timestamp
        }
        
        signed_image_token = jwt.encode(token_payload, secret_key, algorithm=ALGORITHM)
        sample["temporary_shareable_url"] = f"{base_url}/api/inspections/public-view/{signed_image_token}"

    return {
        "shift_info": {
            "shift_id": shift.id,
            "shift_date": str(shift.shift_date),
            "shift_type": shift.shift_type,
            "status": shift.status
        },
        "total_unique_images_found": total_unique_images,
        "requested_limit": limit if limit != total_unique_images else "Max (All)",
        "actual_sampled_count": actual_limit,
        "audit_samples": sampled_audits
    }