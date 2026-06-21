# backend/test_db.py
import sys
import os

# Thêm đường dẫn backend vào hệ thống để import được module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT NOW()"))
        print("✅ Kết nối DB thành công! Thời gian server:", result.fetchone()[0])
except Exception as e:
    print("❌ Lỗi kết nối:", e)