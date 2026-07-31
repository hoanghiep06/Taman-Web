import io
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from openpyxl import load_workbook

from typing import List
from database import get_db
from models import User, LoginLog, InspectionLog, AuditLog, Asset, Room, Shift
from schemas import UserCreate, UserResponse, RoleType
from core.security import get_password_hash
from core.dependencies import get_current_user, require_management

router= APIRouter(prefix="/api/admin/users", tags=["2. [Admin/Manager] Quản lý Tài Khoản"])

@router.get("", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    # Manager có thể lấy toàn bộ tài khoản theo bất cứ cơ sở nào

    query = db.query(User)
    return query.all()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    # Tạo tài khoản người dùng mới
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản đã tồn tại")

    if current_user.role == RoleType.Manager and user_in.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền tạo tài khoản admin")

    assigned_facility = user_in.facility_id or current_user.facility_id

    new_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        facility_id=assigned_facility,
        phone_number=user_in.phone_number,
        is_active=user_in.is_active
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}/toggle-lock", response_model=UserResponse)
def toggle_lock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    # Khóa / Mở tài khoản nhân viên
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể khóa tài khoản chính mình")

    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền khóa tài khoản Admin")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản của chính mình")

    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=403, detail="Manager không được phép xóa tài khoản Admin")

    db.delete(user)
    db.commit()


@router.post("/import-xlsx", status_code=status.HTTP_200_OK)
async def import_staff_from_xlsx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hệ thống chỉ chấp nhận file Excel (.xls hoặc .xlsx)")

    try:
        contents = await file.read()
        wb = load_workbook(io.BytesIO(contents), data_only=True)

        ws = wb.active

        inserted_count = 0
        updated_count = 0

        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or len(row) < 3 or row[1] is None or row[2] is None:
                continue

            full_name = str(row[1]).strip()
            phone_str = str(row[2]).strip().lstrip("'")
            if phone_str.isdigit() and len(phone_str) == 9:
                phone_str = "0" + phone_str

            if not full_name or not phone_str:
                continue

            existing_user = db.query(User).filter(User.username == phone_str).first()
            if existing_user:
                existing_user.full_name = full_name
                updated_count += 1
            else:
                new_user = User(
                    username=phone_str,
                    password_hash=get_password_hash(phone_str),
                    full_name=full_name,
                    role=RoleType.Caregiver, # Mặc định gán NVCS
                    facility_id=current_user.facility_id,
                    is_active=True
                )
                db.add(new_user)
                inserted_count += 1

        db.commit()
        return {
            "status": "Success",
            "summary": {
                "total_created": inserted_count,
                "total_updated": updated_count
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi đọc file Excel: {str(e)}")


@router.get("/{user_id}/comprehensive-history", status_code=status.HTTP_200_OK)
def get_user_comprehensive_history(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Tra cứu lịch sử tổng hợp của 1 nhân viên (Login, Đi tuần, Audit)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin nhân viên")

    tz = ZoneInfo("Asia/Ho_Chi_Minh")

    # 1. Lịch sử Đăng nhập
    login_logs = db.query(LoginLog).filter(LoginLog.user_id == user_id).order_by(LoginLog.login_time.desc()).limit(limit).all()
    login_history = [{
        "id": log.id,
        "login_at": log.login_time.astimezone(tz).strftime("%Y-%m-%d %H:%M:%S") if log.login_time else None,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent
    } for log in login_logs]

    # 2. Nhật ký đi tuần
    inspection_logs = (
        db.query(InspectionLog, Asset.asset_name, Room.room_number, Shift.shift_date, Shift.shift_type)
        .join(Asset, InspectionLog.asset_id == Asset.id)
        .join(Room, Asset.room_id == Room.id)
        .join(Shift, InspectionLog.shift_id == Shift.id)
        .filter(InspectionLog.user_id == user_id)
        .order_by(InspectionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    inspection_history = [{
        "log_id": log.id,
        "shift_date": str(s_date),
        "shift_type": s_type,
        "room_number": r_num,
        "asset_name": asset_name,
        "status": log.status,
        "note": log.note,
        "inspected_at": log.created_at.astimezone(tz).strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None
    } for log, asset_name, r_num, s_date, s_type in inspection_logs]

    return {
        "staff_info": {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role
        },
        "login_history": login_history,
        "inspection_history": inspection_history
    }
    