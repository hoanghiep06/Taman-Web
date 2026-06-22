from fastapi import FastAPI
from routes import auth, admin_entities, admin_users, users, admin_history, inspections, admin_settings, assets, admin_rooms, admin_data
from database import engine
import models
from contextlib import asynccontextmanager

from core.scheduler import init_scheduler
from core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


from sqlalchemy.orm import Session
from models import User, ShiftSetting

from datetime import datetime



# models.Base.metadata.create_all(bind=engine)


# ==========================================
# CẤU HÌNH LIFESPAN (VÒNG ĐỜI APP CHUẨN CLOUD-READY)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[SYSTEM]: Đang kiểm tra trạng thái hạ tầng hệ thống...")
    
    # BƯỚC 1: Tự động quét và dựng cấu trúc bảng (Chạy mượt cả Local và Cloud)
    models.Base.metadata.create_all(bind=engine)

    # BƯỚC 2: Cơ chế "Bọc giáp tầng cao" - Tự động Seed tài khoản Admin tối cao bằng ORM
    # Sử dụng kết nối trực tiếp từ engine để không phụ thuộc vào chu kỳ Request HTTP
    db = Session(bind=engine)
    try:
        # Kiểm tra xem hệ thống đã có tài khoản Admin nào chưa
        admin_exists = db.query(User).filter(User.role == "Admin").first()
        
        if not admin_exists:
            print("[SYSTEM - WARN]: Không tìm thấy tài khoản quản trị viên. Tiến hành kích hoạt cơ chế Auto-Seed...")
            admin_user = User(
                username="admin",
                # Hash mật khẩu an toàn của chuỗi "123456"
                password_hash="$2b$12$BkuMuDdAXXUcoCq53kiIyefOaOc9skmU5btdY.WHcQAUUZ3cWsn1m",
                full_name="Quản Trị Viên Hệ Thống",
                role="Admin",
                is_active=True,
                must_change_password=True
            )
            db.add(admin_user)
            db.commit()
            print("[SYSTEM - SUCCESS]: Đã tạo thành công tài khoản admin mặc định: admin / 123456")
        else:
            print("[SYSTEM - INFO]: Hệ thống đã có tài khoản quản trị viên bảo mật.")
        
        setting_exists = db.query(ShiftSetting).filter(ShiftSetting.id == 1).first()
        if not setting_exists:
            print("[SYSTEM - WARN]: Không tìm thấy cấu hình ca trực mặc định. Tiến hành Auto-Seed Khung Giờ...")
            default_setting = ShiftSetting(
                id=1,
                morning_start="04:00",
                morning_end="13:00",
                evening_start="14:00",
                evening_end="23:00"
            )
            db.add(default_setting)
            db.commit()
            print("[SYSTEM - SUCCESS]: Thiết lập thành công khung giờ ca trực gốc (Ca Sáng: 04:00 / Ca Tối: 14:00)")

    except Exception as e:
        db.rollback()
        print(f"[SYSTEM - FATAL ERROR]: Lỗi nghiêm trọng khi thiết lập dữ liệu gốc: {str(e)}")
    finally:
        db.close() # Đóng kết nối lập tức để giải phóng Pool cho các dịch vụ khác

    # Khởi động bộ lập lịch ngầm
    active_scheduler = init_scheduler()
    app.state.scheduler = active_scheduler

    yield

    active_scheduler.shutdown()
    print(f"[SYSTEM]: Đã tắt toàn bộ hệ thống ngầm")
        

app = FastAPI(title="Tâm An Inventory API", docs_url="/docs", lifespan=lifespan)

# ==========================================
# NGĂN CHẶN SPAM ĐĂNG NHẬP & XIN NONCE
# ==========================================
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ==========================================
# API PING AWAKE BACKEND
# ==========================================
@app.get("/api/health", tags=["System: Awake Gác Cổng"])
def system_health_awake_check():
    """
    API ĐÁNH THỨC SIÊU TỐC (Lightweight Wake-up Endpoint):
    Endpoint tối giản phản hồi trực tiếp từ RAM, không chạm DB, không sinh log rác.
    Phục vụ luồng kích hoạt sớm từ Frontend để phá vỡ hiệu ứng ngủ đông trên Render
    """
    return {
        "status": "online",
        "message": "Hệ thống quản trị Tâm An đã sẵn sàng tiếp nhận nghiệp vụ.",
        "server_time": datetime.now().isoformat()
    }


# ==========================================
# ĐĂNG KÝ CÁC ROUTERS
# ==========================================

# Cụm Auth & Cá nhân (Đổi mật khẩu)
app.include_router(auth.router, prefix="/api")
app.include_router(users.router_me, prefix="/api")

# Cụm Admin: Quản lý tài khoản nhân viên
app.include_router(admin_users.router_users, prefix="/api")

# Cụm Admin: Quản lý thực thể (NCT & Tài sản)
app.include_router(admin_entities.router_elders, prefix="/api")
app.include_router(admin_entities.router_assets, prefix="/api")

app.include_router(admin_entities.router_backup, prefix='/api')
# Cụm Admin: Quản lý & Theo dõi ca trực (MỚI BỔ SUNG)
app.include_router(admin_history.router, prefix="/api")

# Cụm Admin/Manager: Quản lý danh mục phòng
app.include_router(admin_rooms.router, prefix="/api")

# Cụm Admin/Manager
app.include_router(admin_data.router, prefix="/api") 

# Cụm Cá nhân: Upload ảnh
app.include_router(inspections.router, prefix="/api")

# Cụm Phân hệ đi tuần dành cho Nhân viên
app.include_router(assets.router, prefix="/api")

# Cài đặt giờ theo ca
app.include_router(admin_settings.router, prefix="/api")
