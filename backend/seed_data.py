# seed_data.py
import os
import sys
from pathlib import Path
from datetime import date
from passlib.context import CryptContext

PROJECT_ROOT = Path(__file__).resolve().parents[0]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import SessionLocal, engine
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_everything():
    # ĐẢM BẢO CHẮC CHẮN: Luôn quét và tạo cấu hình bảng mới nhất trước khi thực hiện truy vấn
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("⏳ Đang khởi tạo dữ liệu mẫu cho Tâm An Inventory...")

        # 1. SEED BAN ĐẦU: NGƯỜI DÙNG (USERS)
        if db.query(models.User).count() == 0:
            users = [
                # ÉP BUỘC ĐỔI MẬT KHẨU: Đặt mặc định must_change_password=True cho mọi tài khoản mẫu
                models.User(username="admin", password_hash=pwd_context.hash("123456"), full_name="Trưởng Cơ Sở (Admin)", role="Admin", must_change_password=True),
                models.User(username="manager01", password_hash=pwd_context.hash("123456"), full_name="Quản Lý Ca Trực", role="Manager", must_change_password=True),
                models.User(username="nv01", password_hash=pwd_context.hash("123456"), full_name="Đình Điều Điều (Staff)", role="Staff", must_change_password=True),
                models.User(username="nv02", password_hash=pwd_context.hash("123456"), full_name="Lê Thị Mai (Staff)", role="Staff", must_change_password=True),
            ]
            db.add_all(users)
            db.commit()
            print("✅ Đã tạo 4 tài khoản mẫu mang cờ [must_change_password=True] (Mật khẩu chung: 123456).")
        else:
            print("ℹ️ Dữ liệu người dùng đã tồn tại. Bỏ qua bước seed users.")

        # 2. SEED: PHÒNG (ROOMS)
        if db.query(models.Room).count() == 0:
            rooms = [
                models.Room(room_number="101", description="Phòng chăm sóc đặc biệt - Tầng 1"),
                models.Room(room_number="102", description="Phòng tiêu chuẩn - Tầng 1"),
                models.Room(room_number="201", description="Phòng dịch vụ cao cấp - Tầng 2"),
            ]
            db.add_all(rooms)
            db.commit()
            print("✅ Đã khởi tạo 3 phòng mẫu (101, 102, 201).")

        # Lấy id của các phòng vừa tạo để mapping
        r101 = db.query(models.Room).filter(models.Room.room_number == "101").first()
        r102 = db.query(models.Room).filter(models.Room.room_number == "102").first()

        # 3. SEED: CỤ GIÀ (ELDERS)
        if db.query(models.Elder).count() == 0:
            elders = [
                models.Elder(full_name="Cụ Nguyễn Văn Long", room_id=r101.id),
                models.Elder(full_name="Cụ Lê Thị Mai", room_id=r101.id),
                models.Elder(full_name="Cụ Trần Bản Kh kh", room_id=r102.id),
            ]
            db.add_all(elders)
            db.commit()
            print("✅ Đã đón 3 cụ vào danh sách quản lý.")

        # Lấy id các cụ để phân bổ tài sản cá nhân
        cu_long = db.query(models.Elder).filter(models.Elder.full_name == "Cụ Nguyễn Văn Long").first()
        cu_mai = db.query(models.Elder).filter(models.Elder.full_name == "Cụ Lê Thị Mai").first()
        cu_khanh = db.query(models.Elder).filter(models.Elder.full_name == "Cụ Trần Bản Kh kh").first()

        # 4. SEED: TÀI SẢN (ASSETS)
        if db.query(models.Asset).count() == 0:
            assets = [
                models.Asset(asset_name="Giường y tế nâng hạ điện", room_id=r101.id, elder_id=cu_long.id, status="Active"),
                models.Asset(asset_name="Tủ đầu giường gỗ", room_id=r101.id, elder_id=cu_long.id, status="Active"),
                models.Asset(asset_name="Máy trợ oxy Yuwell", room_id=r101.id, elder_id=cu_long.id, status="Active"),
                models.Asset(asset_name="Giường y tế tiêu chuẩn", room_id=r101.id, elder_id=cu_mai.id, status="Active"),
                models.Asset(asset_name="Hộp đựng thuốc cá nhân", room_id=r101.id, elder_id=cu_mai.id, status="Active"),
                models.Asset(asset_name="Quạt treo tường Senko", room_id=r102.id, elder_id=cu_khanh.id, status="Active"),
                models.Asset(asset_name="Bình thủy nước siêu tốc", room_id=r102.id, elder_id=cu_khanh.id, status="Active"),
            ]
            db.add_all(assets)
            db.commit()
            print("✅ Đã phân bổ danh mục tài sản chi tiết cho từng phòng và từng cụ.")

        # 5. ĐẶC CÁCH: TẠO SẴN 1 CA TRỰC MỞ (OPEN SHIFT) ĐỂ TEST UPLOAD ẢNH
        import datetime
        current_hour = datetime.datetime.now().hour
        stype = "Sang" if current_hour < 12 else "Toi"
        
        existing_shift = db.query(models.Shift).filter(
            models.Shift.shift_date == date.today(),
            models.Shift.shift_type == stype
        ).first()
        
        if not existing_shift:
            test_shift = models.Shift(shift_date=date.today(), shift_type=stype, status="Open")
            db.add(test_shift)
            db.commit()
            print(f"⚡ Đã tự động kích hoạt ca làm việc mở: Ngày [{date.today()}] - Ca [{stype}] để sẵn sàng test kiểm kê!")

        print("🎉 Toàn bộ dữ liệu đã được kiểm tra và nạp sạch sẽ vào Database!")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi trong quá trình đổ dữ liệu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_everything()