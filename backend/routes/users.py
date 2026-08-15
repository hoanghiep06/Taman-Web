import io
from zoneinfo import ZoneInfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from openpyxl import load_workbook

from database import get_db
from models import User, LoginLog, InspectionLog, AuditLog, Asset, Room, Shift, Facility
from schemas import (
    UserCreate, UserResponse, RoleType, UserUpdate, 
    BulkActionRequest, BulkLockRequest, UserResetPassword
)
from core.security import get_password_hash
from core.dependencies import get_current_user, require_management

router = APIRouter(prefix="/api/admin/users", tags=["2. [Admin/Manager] Quản lý Tài Khoản"])

ROOT_ADMIN_ID = 1  # ID của tài khoản Admin Gốc (Super Admin) cao nhất

def is_root_admin(user: User) -> bool:
    """Kiểm tra xem user hiện tại có phải là Tài khoản Quản trị viên Gốc hay không"""
    return user.role == RoleType.Admin and user.id == ROOT_ADMIN_ID


# =========================================================================
# 1. DANH SÁCH TÀI KHOẢN (SEARCH, FILTER & ẨN ADMIN ĐỐI VỚI MANAGER)
# =========================================================================
@router.get("", response_model=List[UserResponse])
def get_all_users(
    search: Optional[str] = Query(None, description="Tìm theo họ tên, username hoặc số điện thoại"),
    role: Optional[RoleType] = Query(None, description="Lọc theo vai trò (Role)"),
    facility_id: Optional[int] = Query(None, description="Lọc theo cơ sở làm việc"),
    is_active: Optional[bool] = Query(None, description="Lọc theo trạng thái Hoạt động / Đã khóa"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """
    Lấy danh sách người dùng hỗ trợ phân quyền & UI:
    - Manager: Tự động ẩn hoàn toàn tài khoản role Admin.
    - Hỗ trợ Search nhanh để gắn trực tiếp vào ô tìm kiếm trên Header bảng.
    - Trả về kèm facility_name để frontend render Badge cơ sở mượt mà.
    """
    query = db.query(User).options(joinedload(User.facility))

    # 1. Manager tuyệt đối không xem được danh sách tài khoản Admin
    if current_user.role == RoleType.Manager:
        query = query.filter(User.role != RoleType.Admin)

    # 2. Tìm kiếm đa năng (Tên, SĐT, Username)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.phone_number.ilike(search_pattern)
            )
        )

    # 3. Bộ lọc nâng cao
    if role:
        query = query.filter(User.role == role)
    if facility_id is not None:
        query = query.filter(User.facility_id == facility_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.id.desc()).all()

    # Format dữ liệu đầu ra
    results = []
    for u in users:
        fac_name = u.facility.name if (hasattr(u, 'facility') and u.facility) else None
        results.append(
            UserResponse(
                id=u.id,
                username=u.username,
                full_name=u.full_name,
                phone_number=u.phone_number,
                role=u.role,
                facility_id=u.facility_id,
                facility_name=fac_name,
                is_active=u.is_active,
                must_change_password=getattr(u, 'must_change_password', False),
                created_at=u.created_at
            )
        )

    return results


# =========================================================================
# 2. TẠO TÀI KHOẢN MỚI
# =========================================================================
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên đăng nhập đã tồn tại")

    if current_user.role == RoleType.Manager and user_in.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager không có quyền tạo tài khoản Admin")

    assigned_facility = user_in.facility_id or current_user.facility_id

    new_user = User(
        username=user_in.username.strip(),
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip() if user_in.full_name else None,
        role=user_in.role,
        facility_id=assigned_facility,
        phone_number=user_in.phone_number.strip() if user_in.phone_number else None,
        is_active=user_in.is_active,
        must_change_password=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    fac = db.query(Facility).filter(Facility.id == new_user.facility_id).first() if new_user.facility_id else None

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        phone_number=new_user.phone_number,
        role=new_user.role,
        facility_id=new_user.facility_id,
        facility_name=fac.name if fac else None,
        is_active=new_user.is_active,
        must_change_password=new_user.must_change_password,
        created_at=new_user.created_at
    )


# =========================================================================
# 3. CẬP NHẬT THÔNG TIN TÀI KHOẢN (VAI TRÒ, CƠ SỞ, HỌ TÊN, SĐT)
# =========================================================================
@router.put("/{user_id}", response_model=UserResponse)
def update_user_info(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản người dùng")

    # Manager không được sửa tài khoản Admin hoặc gán quyền Admin cho ai đó
    if current_user.role == RoleType.Manager:
        if user.role == RoleType.Admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager không có quyền chỉnh sửa tài khoản Admin")
        if payload.role == RoleType.Admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager không thể gán quyền Admin")

    # Không thể tự hạ quyền hoặc tự khóa tài khoản của chính mình
    if user.id == current_user.id:
        if payload.is_active is not None and not payload.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản của chính mình")
        if payload.role is not None and payload.role != current_user.role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự thay đổi vai trò của chính mình")

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone_number is not None:
        user.phone_number = payload.phone_number.strip()
    if payload.role is not None:
        user.role = payload.role
    if payload.facility_id is not None:
        user.facility_id = payload.facility_id
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    fac = db.query(Facility).filter(Facility.id == user.facility_id).first() if user.facility_id else None

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        facility_id=user.facility_id,
        facility_name=fac.name if fac else None,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        created_at=user.created_at
    )


# =========================================================================
# 4. KHÓA / MỞ KHÓA TỪNG TÀI KHOẢN (TOGGLE LOCK)
# =========================================================================
@router.put("/{user_id}/toggle-lock", response_model=UserResponse)
def toggle_lock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản của chính mình")

    # Bảo vệ tài khoản Admin Gốc
    if user.id == ROOT_ADMIN_ID:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản Quản trị viên Gốc không thể bị khóa")

    # Manager không được khóa tài khoản Admin
    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền khóa tài khoản Admin")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    fac = db.query(Facility).filter(Facility.id == user.facility_id).first() if user.facility_id else None

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        facility_id=user.facility_id,
        facility_name=fac.name if fac else None,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        created_at=user.created_at
    )


# =========================================================================
# 5. KHÓA / MỞ KHÓA HÀNG LOẠT (BULK LOCK/UNLOCK)
# =========================================================================
@router.post("/bulk-lock", status_code=status.HTTP_200_OK)
def bulk_lock_users(
    payload: BulkLockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    if not payload.user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh sách ID rỗng")

    # Loại trừ tài khoản chính mình và Admin Gốc khi khóa
    target_ids = [uid for uid in payload.user_ids if uid != current_user.id and uid != ROOT_ADMIN_ID]

    query = db.query(User).filter(User.id.in_(target_ids))

    # Manager không thể khóa Admin
    if current_user.role == RoleType.Manager:
        query = query.filter(User.role != RoleType.Admin)

    updated_count = query.update({User.is_active: payload.is_active}, synchronize_session=False)
    db.commit()

    return {
        "status": "Success",
        "action": "lock" if not payload.is_active else "unlock",
        "affected_count": updated_count
    }


# =========================================================================
# 6. XÓA TÀI KHOẢN ĐƠN LẺ & HÀNG LOẠT (CHỈ ROOT ADMIN ĐƯỢC XÓA ADMIN KHÁC)
# =========================================================================
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự xóa tài khoản của chính mình")

    # 1. Tài khoản Admin Gốc (ID=1) tuyệt đối không ai được xóa
    if user.id == ROOT_ADMIN_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Tài khoản Quản trị viên Gốc (Super Admin) được bảo vệ, không thể bị xóa"
        )

    # 2. Xóa tài khoản Admin: CHỈ DUY NHẤT Admin Gốc mới có quyền xóa Admin khác
    if user.role == RoleType.Admin:
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Chỉ có Tài khoản Quản trị viên Gốc (Super Admin) mới có quyền xóa các tài khoản Admin khác"
            )

    # 3. Manager không thể xóa Admin
    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager không được phép xóa tài khoản Admin")

    db.delete(user)
    db.commit()


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_users(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """
    Xóa hàng loạt tài khoản:
    - Loại trừ tài khoản đang đăng nhập và tài khoản Gốc (ID=1).
    - Nếu người gọi KHÔNG PHẢI là Admin Gốc: Tự động loại trừ toàn bộ tài khoản Admin.
    """
    if not payload.user_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh sách ID rỗng")

    query = db.query(User).filter(
        User.id.in_(payload.user_ids),
        User.id != current_user.id,
        User.id != ROOT_ADMIN_ID
    )

    # Nếu không phải Admin Gốc -> Tuyệt đối không xóa bất cứ Admin nào
    if not is_root_admin(current_user):
        query = query.filter(User.role != RoleType.Admin)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()

    return {
        "status": "Success",
        "deleted_count": deleted_count
    }


# =========================================================================
# 7. TIỆN ÍCH UX/UI: RESET MẬT KHẨU NHANH CHO NHÂN VIÊN
# =========================================================================
@router.put("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_staff_password(
    user_id: int,
    payload: Optional[UserResetPassword] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """
    Tiện ích Quản lý cấp lại mật khẩu nhanh khi nhân viên quên:
    - Mặc định: Reset về chính username/SĐT của tài khoản đó.
    - Đặt must_change_password = True để yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager không có quyền reset mật khẩu Admin")

    default_new_pwd = payload.new_password if (payload and payload.new_password) else user.username
    user.password_hash = get_password_hash(default_new_pwd)
    user.must_change_password = True

    db.commit()

    return {
        "status": "Success",
        "message": f"Đã đặt lại mật khẩu cho tài khoản {user.username} thành công.",
        "default_password": default_new_pwd if (not payload or not payload.new_password) else "******"
    }


# =========================================================================
# 8. IMPORT EXCEL & LỊCH SỬ TỔNG HỢP CỦA NHÂN VIÊN
# =========================================================================
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
                    role=RoleType.Caregiver,
                    facility_id=current_user.facility_id,
                    phone_number=phone_str,
                    is_active=True,
                    must_change_password=True
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin nhân viên")

    # Manager không được xem lịch sử của Admin
    if current_user.role == RoleType.Manager and user.role == RoleType.Admin:
        raise HTTPException(status_code=403, detail="Manager không có quyền xem thông tin của Admin")

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
            "phone_number": user.phone_number,
            "role": user.role,
            "is_active": user.is_active
        },
        "login_history": login_history,
        "inspection_history": inspection_history
    }