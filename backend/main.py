# main.py
from fastapi import FastAPI
from backend.routes import rooms
from routes import auth, admin_entities, admin_users, users, admin_history, inspections, admin_settings, assets, admin_data
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

# ==========================================
# CẤU HÌNH LIFESPAN (VÒNG ĐỜI APP CHUẨN CLOUD-READY)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[SYSTEM]: Đang kiểm tra trạng thái hạ tầng hệ thống...")
    
    # BƯỚC 1: Tự động quét và dựng cấu trúc bảng
    models.Base.metadata.create_all(bind=engine)

    # BƯỚC 2: Tự động Seed dữ liệu hệ thống
    db = Session(bind=engine)
    try:
        admin_exists = db.query(User).filter(User.role == "Admin").first()
        if not admin_exists:
            print("[SYSTEM - WARN]: Không tìm thấy tài khoản quản trị viên. Tiến hành kích hoạt cơ chế Auto-Seed...")
            admin_user = User(
                username="admin",
                password_hash="$2b$12$BkuMuDdAXXUcoCq53kiIyefOaOc9skmU5btdY.WHcQAUUZ3cWsn1m",
                full_name="Quản Trị Viên Hệ Thống",
                role="Admin",
                is_active=True,
                must_change_password=True
            )
            db.add(admin_user)
            db.commit()
            print("[SYSTEM - SUCCESS]: Đã tạo thành công tài khoản admin mặc định: admin / 123456")
        
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

        # 🌟 CẢI TIẾN CHIẾN LƯỢC: CHẠY ĐỒNG BỘ JIT CẤP TỐC NGAY KHI RENDER WAKE UP
        try:
            from services.shift_service import check_and_sync_shift_jit
            check_and_sync_shift_jit(db)
            print("[SYSTEM - JIT SUCCESS]: Đã thực hiện rà soát, bù đắp ca trực live chuẩn xác tại thời điểm Startup.")
        except Exception as jit_startup_err:
            print(f"[SYSTEM - JIT CRITICAL ERROR]: Thất bại khi đồng bộ ca trực lúc khởi động: {str(jit_startup_err)}")

    except Exception as e:
        db.rollback()
        print(f"[SYSTEM - FATAL ERROR]: Lỗi nghiêm trọng khi thiết lập dữ liệu gốc: {str(e)}")
    finally:
        db.close() 

    # Khởi động bộ lập lịch ngầm (Chạy dự phòng khi server thức)
    active_scheduler = init_scheduler()
    app.state.scheduler = active_scheduler

    yield

    active_scheduler.shutdown()
    print(f"[SYSTEM]: Đã tắt toàn bộ hệ thống ngầm")
        

app = FastAPI(title="Tâm An Inventory API", docs_url="/docs", lifespan=lifespan)

# NGÂN CHẶN SPAM ĐĂNG NHẬP & XIN NONCE
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# API PING AWAKE BACKEND
@app.get("/api/health", tags=["System: Awake Gác Cổng"])
def system_health_awake_check():
    return {
        "status": "online",
        "message": "Hệ thống quản trị Tâm An đã sẵn sàng tiếp nhận nghiệp vụ.",
        "server_time": datetime.now().isoformat()
    }

# ĐĂNG KÝ CÁC ROUTERS
app.include_router(auth.router, prefix="/api")
app.include_router(users.router_me, prefix="/api")
app.include_router(admin_users.router_users, prefix="/api")
app.include_router(admin_entities.router_elders, prefix="/api")
app.include_router(admin_entities.router_assets, prefix="/api")
app.include_router(admin_entities.router_backup, prefix='/api')
app.include_router(admin_history.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(admin_data.router, prefix="/api") 
app.include_router(inspections.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(admin_settings.router, prefix="/api")