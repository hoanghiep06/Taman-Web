from fastapi import FastAPI
from routes import auth, admin_entities, admin_users, users, admin_history, inspections, admin_settings, assets, admin_rooms, admin_data
from database import engine
import models
from contextlib import asynccontextmanager

from core.scheduler import init_scheduler
from core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

models.Base.metadata.create_all(bind=engine)


# ==========================================
# CẤU HÌNH LIFESPAN (VÒNG ĐỜI APP)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
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
