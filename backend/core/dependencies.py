# core/dependencies.py
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import RoleType
from core.security import decode_token
from core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đang bị khóa"
        )
    return user


class PermissionChecker:
    def __init__(self, allowed_roles: List[RoleType]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == RoleType.Admin:
            return current_user

        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối. Chỉ {[r.value for r in self.allowed_roles]}"
            )
        return current_user

# Định nghĩa sẵn nhóm quyền tái sử dụng
require_management = PermissionChecker([RoleType.Admin, RoleType.Manager])
require_medical_team = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator
])
require_care_team = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Coordinator, RoleType.Caregiver
])

require_logistics_team = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Kitchen, RoleType.Janitor, RoleType.Security
])
