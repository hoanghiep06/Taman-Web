from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, InspectionLog, Shift
from schemas import PasswordChange, UserResponse, StaffHistoryResponse
from core.dependencies import get_current_user
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router_me = APIRouter(
    prefix="/users/me",
    tags=["Cá nhân"],
    dependencies=[Depends(get_current_user)]
)

@router_me.get("", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router_me.put("/password", status_code=status.HTTP_200_OK)
def change_password(payload: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Xác thực mật khẩu cũ
    if not pwd_context.verify(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác")

    # Băm mật khẩu mới và lưu
    current_user.password_hash = pwd_context.hash(payload.new_password)

    # Cập nhật trạng thái đăng nhập lần đầu
    current_user.must_change_password = False
    
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}



# ====================================================
# LỊCH SỬ KIỂM KÊ CỦA CHÍNH TÔI 
# ====================================================
@router_me.get("/history", response_model=List[StaffHistoryResponse])
def get_my_inspection_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint tiện ích trên App di động: Cho phép chính nhân viên đang đăng nhập tự tra cứu 
    lại toàn bộ danh sách các tài sản mà mình đã từng kiểm kê (Xanh) hoặc báo mất (Vàng).
    """

    my_logs = db.query(
        InspectionLog.id, 
        InspectionLog.asset_id, 
        InspectionLog.status, 
        InspectionLog.note,
        InspectionLog.created_at,
        Shift.shift_date,
        Shift.shift_type
    ).join(Shift, InspectionLog.shift_id == Shift.id).filter(
        InspectionLog.user_id == current_user.id
    ).order_by(InspectionLog.created_at.desc()).all()

    return my_logs