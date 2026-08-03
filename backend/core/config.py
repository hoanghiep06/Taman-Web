
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

class Settings:
    # ====================================================
    # CẤU HÌNH CƠ SỞ DỮ LIỆU (POSTGRESQL)
    # ====================================================
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASS: str = os.getenv("DB_PASS", "secretpassword")
    DB_NAME: str = os.getenv("DB_NAME", "postgres")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # ====================================================
    # CẤU HÌNH BẢO MẬT & XÁC THỰC (JWT)
    # ====================================================
    # Chuỗi secret tự tạo để mã hóa JWT (Dùng JWT_SECRET để khớp với file .env cũ của bạn)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "Super Web")
    SECRET_KEY: str = JWT_SECRET  # Alias để tương thích với dependencies.py
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 12)) # Mặc định 12 giờ

    # ====================================================
    # CẤU HÌNH HỆ THỐNG GỬI EMAIL THÔNG BÁO (SMTP GMAIL)
    # ====================================================
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_RECEIVERS: str = os.getenv("MAIL_RECEIVERS", "")

    # ====================================================
    # CẤU HÌNH KẾT NỐI KHÔNG GIAN LƯU TRỮ GOOGLE DRIVE (OAUTH 2.0)
    # ====================================================
    GOOGLE_DRIVE_ROOT_FOLDER_ID: str = os.getenv("GOOGLE_DRIVE_ROOT_FOLDER_ID", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "") # Dán chuỗi GOCSPX-... vào .env cho biến này!
    GOOGLE_REFRESH_TOKEN: str = os.getenv("GOOGLE_REFRESH_TOKEN", "")

# Khởi tạo đối tượng settings toàn cục
settings = Settings()