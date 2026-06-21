# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, LoginLog, Shift, ShiftSetting # ĐBỔ SUNG: Khai báo thêm Model cấu hình giờ trực
from schemas import UserLogin, TokenResponse
from core.security import create_access_token
from core.limiter import limiter
from passlib.context import CryptContext
from core.constants import DEFAULT_SHIFT_SETTINGS
from datetime import datetime, time
import pytz

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_shift_or_error(db: Session):
    """
    Hàm kiểm tra thời gian máy chủ theo chuẩn UTC+7 để xác định ca trực.
    Đã sửa: Tự động truy vấn động từ DB mỗi khi gọi để chống cache và đồng bộ Admin.
    """
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_tz = datetime.now(tz)
    current_time = now_tz.time()
    current_date = now_tz.date()

    # 1. ĐỌC ĐỘNG TỪ DATABASE ĐỂ ĐỒNG BỘ VỚI TRANG QUẢN LÝ ADMIN
    setting = db.query(ShiftSetting).first()
    
    if setting:
        # Nếu đã có cấu hình cài đặt của Admin dưới DB
        m_start = time.fromisoformat(setting.morning_start)
        m_end = time.fromisoformat(setting.morning_end)
        e_start = time.fromisoformat(setting.evening_start)
        e_end = time.fromisoformat(setting.evening_end)
        m_start_str = setting.morning_start
        m_end_str = setting.morning_end
        e_start_str = setting.evening_start
        e_end_str = setting.evening_end
    else:
        # Phương án dự phòng (Fallback) nếu hệ thống mới tinh chưa có cấu hình trong DB
        m_start = time.fromisoformat(DEFAULT_SHIFT_SETTINGS["morning_start"])
        m_end = time.fromisoformat(DEFAULT_SHIFT_SETTINGS["morning_end"])
        e_start = time.fromisoformat(DEFAULT_SHIFT_SETTINGS["evening_start"])
        e_end = time.fromisoformat(DEFAULT_SHIFT_SETTINGS["evening_end"])
        m_start_str = DEFAULT_SHIFT_SETTINGS["morning_start"]
        m_end_str = DEFAULT_SHIFT_SETTINGS["morning_end"]
        e_start_str = DEFAULT_SHIFT_SETTINGS["evening_start"]
        e_end_str = DEFAULT_SHIFT_SETTINGS["evening_end"]

    # 2. SO SÁNH GIỜ LÀM VIỆC THỰC TẾ TRÊN RAM
    shift_type = None
    if m_start <= current_time <= m_end:
        shift_type = "Sang"
    elif e_start <= current_time <= e_end:
        shift_type = "Toi"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Hệ thống từ chối đăng nhập ngoài khung giờ làm việc "
                f"(Sáng: {m_start_str}-{m_end_str}, "
                f"Tối: {e_start_str}-{e_end_str})."
            )
        )

    # Tìm kiếm ca trực trong DB, nếu ngày hôm đó chưa có ai mở ca thì tự động tạo mới
    shift = db.query(Shift).filter(Shift.shift_date == current_date, Shift.shift_type == shift_type).first()
    if not shift:
        shift = Shift(shift_date=current_date, shift_type=shift_type, status="Open")
        db.add(shift)
        db.commit()
        db.refresh(shift)
        
    return shift

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

    # Ràng buộc kiểm tra ca trực đối với Nhân viên (Staff)
    shift_id = None
    if user.role == "Staff":
        current_shift = get_current_shift_or_error(db)
        shift_id = current_shift.id

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