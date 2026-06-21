# core/dependencies.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")
    
    # `sub` có thể được lưu là chuỗi trong token; ép kiểu về int để so sánh với User.id
    sub = payload.get("sub")
    try:
        user_id = int(sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại hoặc đã bị khóa")
    
    # ÉP BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU
    if user.must_change_password:
        CHANGING_PASSWORD_ENDPOINT = "/api/users/me/password"

        # Chuẩn hóa URL
        current_path = request.url.path.rstrip("/")

        if current_path != CHANGING_PASSWORD_ENDPOINT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản mới tạo, vui lòng đổi mật khẩu"
            )

    return user

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền Admin")
    return current_user

def get_privileged_user(current_user: User = Depends(get_current_user)) -> User:
    # Cho phép Admin và Manager truy cập
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền xem lịch sử công việc của người khác."
        )
    return current_user