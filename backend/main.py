# main.py
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import engine
import models
from models import User, ShiftSetting
from core.scheduler import init_scheduler
from core.limiter import limiter

# IMPORT CÁC ROUTERS ĐÃ ĐƯỢC ĐẦU TƯ CỦA BẠN
from routes import (
    auth,
    users,
    facilities,
    rooms,
    elders,
    health,
    assets,
    inspections,
    system,
    dashboard
)

# Cấu hình logging
logging.basicConfig(level=logging.INFO)


# ==========================================
# CẤU HÌNH LIFESPAN (VÒNG ĐỜI APP CLOUD-READY)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[SYSTEM]: Đang kiểm tra trạng thái hạ tầng hệ thống Viện Dưỡng Lão Tâm An...")
    
    # 1. Tự động quét và dựng cấu trúc các bảng trong DB
    models.Base.metadata.create_all(bind=engine)

    # 2. Tự động Seed dữ liệu hệ thống cơ bản
    db = Session(bind=engine)
    try:
        # Seed tài khoản Admin tối cao nếu chưa tồn tại
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if not admin_exists:
            print("[SYSTEM - WARN]: Chưa có tài khoản Admin. Tiến hành khởi tạo tài khoản quản trị...")
            admin_user = User(
                username="admin",
                password_hash="$2b$12$BkuMuDdAXXUcoCq53kiIyefOaOc9skmU5btdY.WHcQAUUZ3cWsn1m", # 123456
                full_name="Quản Trị Viên Tối Cao",
                role="Admin",
                is_active=True,
                must_change_password=True
            )
            db.add(admin_user)
            db.commit()
            print("[SYSTEM - SUCCESS]: Tạo tài khoản Admin mặc định thành công (admin / 123456).")
        
        # Seed cấu hình khung giờ ca trực chuẩn (Ca Sáng: 08:00-19:00 | Ca Tối: 20:00-07:00)
        setting_exists = db.query(ShiftSetting).first()
        if not setting_exists:
            print("[SYSTEM - WARN]: Khởi tạo cấu hình thời gian ca trực chuẩn...")
            default_setting = ShiftSetting(
                morning_start="08:00",
                morning_end="19:00",
                evening_start="20:00",
                evening_end="07:00"
            )
            db.add(default_setting)
            db.commit()
            print("[SYSTEM - SUCCESS]: Khung giờ ca trực đã được thiết lập thành công!")

        # 🌟 ĐỒNG BỘ CA TRỰC JIT TẠI THỜI ĐIỂM STARTUP (WAKE UP RENDER)
        try:
            from services.shift_service import check_and_sync_shift_jit
            check_and_sync_shift_jit(db)
            print("[SYSTEM - JIT SUCCESS]: Đã rà soát và đồng bộ ca trực live thành công!")
        except Exception as jit_err:
            print(f"[SYSTEM - JIT ERROR]: Lỗi đồng bộ ca trực khi khởi động: {str(jit_err)}")

    except Exception as e:
        db.rollback()
        print(f"[SYSTEM - FATAL ERROR]: Lỗi khởi tạo dữ liệu ban đầu: {str(e)}")
    finally:
        db.close()

    # 3. Kích hoạt Scheduler chạy ngầm
    active_scheduler = init_scheduler()
    app.state.scheduler = active_scheduler

    yield

    # Tắt ứng dụng
    active_scheduler.shutdown()
    print("[SYSTEM]: Hệ thống ngầm đã dừng an toàn.")


# ==========================================
# KHỞI TẠO DỰ ÁN FASTAPI
# ==========================================
app = FastAPI(
    title="Tâm An Nursing Home Management API",
    description="Hệ thống backend quản trị toàn diện Viện Dưỡng Lão Tâm An (Đi tuần tư trang, Y tế, Bệnh án, Đa cơ sở & Phân quyền)",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Cấu hình CORS cho phép Mobile App và Web Dashboard truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình SlowAPI Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ==========================================
# API PING / HEALTH CHECK
# ==========================================
@app.get("/health", tags=["0. System Health"])
def system_health_check():
    return {
        "status": "online",
        "system": "Viện Dưỡng Lão Tâm An System API",
        "server_time": datetime.now().isoformat()
    }


# ==========================================
# TÍCH HỢP TOÀN BỘ ROUTERS THEO CHUẨN DỰ ÁN
# ==========================================
app.include_router(auth.router)          # 1. Đăng nhập, Profile, Đổi pass
app.include_router(users.router)         # 2. Quản lý nhân viên & Phân quyền 9 Roles
app.include_router(facilities.router)    # 3. Quản lý Cơ sở & Phân khu (Zones)
app.include_router(rooms.router)         # 4. Quản lý Phòng ốc
app.include_router(elders.router)        # 5. Quản lý NCT & Bệnh án mở rộng
app.include_router(health.router)        # 6. Y tế (Sinh hiệu, Toa thuốc, Cân nặng, Giao ca, Dashboard Y tế)
app.include_router(assets.router)        # 7. Quản lý Danh mục Tư trang / Tài sản
app.include_router(inspections.router)   # 8. Nghiệp vụ Đi tuần, Chụp ảnh, Mã Nonce, Báo mất
app.include_router(system.router)        # 9. Quản trị hệ thống, Backup/Restore, Config Ca trực
app.include_router(dashboard.router)     # 10. Dashboard quản trị tổng quan & Audit logs