# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, LoginLog, Shift, ShiftSetting
from schemas import UserLogin, TokenResponse
from core.security import create_access_token
from core.limiter import limiter
from passlib.context import CryptContext
from services.shift_service import check_and_sync_shift_jit
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request, 
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == credentials.username).first()

    if not user or not pwd_context.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tên đăng nhập hoặc mật khẩu không đúng")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    # 1. KÍCH HOẠT ĐỒNG BỘ JIT DUY NHẤT LÀM NGUỒN CHÂN LÝ DỮ LIỆU
    try:
        check_and_sync_shift_jit(db)
    except Exception as jit_err:
        db.rollback()
        logging.error(f"[JIT SHIFT FATAL_ERROR]: Lỗi tiến trình đồng bộ ca trực lúc đăng nhập: {str(jit_err)}")

    shift_id = None
    if user.role == "Staff":
        # 2. TRUY VẤN TRỰC TIẾP CA ĐANG MỞ SAU KHI JIT ĐÃ CHẠY XONG
        active_shift = db.query(Shift).filter(Shift.status == "Open").first()
        
        if not active_shift:
            # Lấy cấu hình giờ để phản hồi thông báo lỗi chính xác lên UI thiết bị di động
            setting = db.query(ShiftSetting).first()
            m_start_str = setting.morning_start if (setting and setting.morning_start) else "04:00"
            m_end_str = setting.morning_end if (setting and setting.morning_end) else "13:00"
            e_start_str = setting.evening_start if (setting and setting.evening_start) else "14:00"
            e_end_str = setting.evening_end if (setting and setting.evening_end) else "23:00"
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Hệ thống từ chối đăng nhập ngoài khung giờ làm việc "
                    f"(Sáng: {m_start_str}-{m_end_str}, "
                    f"Tối: {e_start_str}-{e_end_str})."
                )
            )
        shift_id = active_shift.id

    # Ghi nhận logs hệ thống
    log = LoginLog(
        user_id=user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", "")
    )
    db.add(log)
    db.commit()

    # Đóng gói JWT
    token_data = {
        "sub": str(user.id), 
        "role": user.role,
        "must_change_password": user.must_change_password
    }
    if shift_id:
        token_data["shift_id"] = shift_id

    token = create_access_token(data=token_data)

    return {
        "access_token": token,
        "token_type": "bearer", 
        "role": user.role,
        "must_change_password": user.must_change_password
    }