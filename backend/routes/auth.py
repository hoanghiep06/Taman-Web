# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, LoginLog, Shift, ShiftSetting, InspectionLog
from schemas import TokenResponse, UserResponse, PasswordChange, StaffHistoryResponse
from core.security import create_access_token, get_password_hash, verify_password
from core.dependencies import get_current_user
from core.limiter import limiter 
from services.shift_service import check_and_sync_shift_jit
import logging

router = APIRouter(prefix="/api/auth", tags=["1. [Xác thực] Đăng Nhập & Hồ Sơ Cá Nhân"])

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request, 
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên đăng nhập hoặc mật khẩu không đúng")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    # Kích hoạt đồng bộ JIT ca trực
    try:
        check_and_sync_shift_jit(db)
    except Exception as jit_err:
        db.rollback()
        logging.error(f"[JIT SHIFT FATAL_ERROR]: Lỗi tiến trình đồng bộ ca trực lúc đăng nhập: {str(jit_err)}")

    # Ghi nhận log đăng nhập
    log = LoginLog(
        user_id=user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", "Unknown")
    )
    db.add(log)
    db.commit()

    access_token = create_access_token(data={"sub": user.username, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer", 
        "role": user.role,
        "facility_id": user.facility_id,
        "must_change_password": user.must_change_password
    }


@router.get("/users/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/users/me/password")
def change_my_password(
    payload: PasswordChange, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu cũ không chính xác")

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    db.commit()

    return {"message": "Đổi mật khẩu thành công"}


@router.get("/users/me/history", response_model=list[StaffHistoryResponse])
def get_my_inspection_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(
            InspectionLog.id, 
            InspectionLog.asset_id, 
            InspectionLog.status, 
            InspectionLog.note,
            InspectionLog.created_at, 
            Shift.shift_date,
            Shift.shift_type
        )
        .join(Shift, InspectionLog.shift_id == Shift.id)
        .filter(InspectionLog.user_id == current_user.id)
        .order_by(InspectionLog.created_at.desc())
        .all()
    )