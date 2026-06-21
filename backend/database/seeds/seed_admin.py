import os
import sys
from pathlib import Path
from passlib.context import CryptContext

# Đảm bảo Python có thể import package backend khi chạy trực tiếp
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import engine, SessionLocal
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_admin():
    db = SessionLocal()
    try:
        # Kiểm tra xem đã có admin chưa
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            hashed_pw = pwd_context.hash("123456")
            new_admin = User(
                username="admin", 
                password_hash=hashed_pw, 
                full_name="Quản trị viên", 
                role="Admin"
            )
            db.add(new_admin)
            db.commit()
            print("✅ Đã tạo tài khoản admin thành công!")
        else:
            print("ℹ️ Tài khoản admin đã tồn tại.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()