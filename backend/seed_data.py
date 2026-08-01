# seed_data.py
import os
import sys
import datetime
from pathlib import Path
from datetime import date, timedelta
from passlib.context import CryptContext

PROJECT_ROOT = Path(__file__).resolve().parents[0]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import SessionLocal, engine
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# =========================================================================
# HÀM TRỢ LÝ: ĐẢM BẢO LUÔN CÓ TÀI KHOẢN DÙ DB CŨ HAY MỚI
# =========================================================================
def get_or_create_user(db, username, full_name, role, facility_id=None):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        user = models.User(
            username=username,
            password_hash=pwd_context.hash("123456"),
            full_name=full_name,
            role=role,
            facility_id=facility_id,
            must_change_password=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def seed_everything():
    print("⏳ Bắt đầu nạp dữ liệu mẫu toàn diện cho Viện Dưỡng Lão Tâm An...")
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. CƠ SỞ (FACILITY) & PHÂN KHU (ZONE)
        fac1 = db.query(models.Facility).filter(models.Facility.name.like("%Thủ Đức%")).first()
        if not fac1:
            fac1 = models.Facility(name="Cơ sở 1 - Thủ Đức", address="123 Đặng Văn Bi, P. Bình Thọ, TP. Thủ Đức")
            fac2 = models.Facility(name="Cơ sở 2 - Quận 7", address="456 Nguyễn Thị Thập, Quận 7")
            db.add_all([fac1, fac2])
            db.commit()
            print("✅ 1. Đã khởi tạo Cơ sở mẫu.")

        zone_a = db.query(models.Zone).filter(models.Zone.name.like("%Khu A%")).first()
        zone_b = db.query(models.Zone).filter(models.Zone.name.like("%Khu B%")).first()
        if not zone_a:
            zone_a = models.Zone(facility_id=fac1.id, name="Khu A - Chăm Sóc Đặc Biệt", description="Hạn chế vận động")
            zone_b = models.Zone(facility_id=fac1.id, name="Khu B - Tiêu Chuẩn", description="Sinh hoạt chung")
            db.add_all([zone_a, zone_b])
            db.commit()
            print("✅ 2. Đã chia Phân khu (Zone A, B).")

        # 2. TÀI KHOẢN THEO 9 ROLES TỰ ĐỘNG BÙ (CHỐNG LỖI NONE TYPE)
        admin = get_or_create_user(db, "admin", "Quản Trị Viên Tối Cao", "Admin")
        manager = get_or_create_user(db, "manager01", "Trần Văn Quản Lý", "Manager", fac1.id)
        doctor = get_or_create_user(db, "doctor01", "BS. Nguyễn Minh Đức", "Doctor", fac1.id)
        coordinator = get_or_create_user(db, "coordinator01", "Lê Anh Thư (ĐIỀU PHỐI)", "Coordinator", fac1.id)
        caregiver = get_or_create_user(db, "caregiver01", "Đình Điều Điều (NVCS)", "Caregiver", fac1.id)
        print("✅ 3. Đã rà soát & đảm bảo đầy đủ Tài khoản các Vai Trò.")

        # Cấu hình ca trực
        if db.query(models.ShiftSetting).count() == 0:
            shift_setting = models.ShiftSetting(morning_start="08:00", morning_end="19:00", evening_start="20:00", evening_end="07:00")
            db.add(shift_setting)
            db.commit()
            print("✅ 4. Đã lập cấu hình ca trực chuẩn.")

        # 3. PHÒNG ỐC (ROOMS)
        r101 = db.query(models.Room).filter(models.Room.room_number == "P.101").first()
        r102 = db.query(models.Room).filter(models.Room.room_number == "P.102").first()
        if not r101:
            r101 = models.Room(zone_id=zone_a.id, room_number="P.101", description="Phòng 2 giường đặc biệt")
            r102 = models.Room(zone_id=zone_a.id, room_number="P.102", description="Phòng 2 giường đặc biệt")
            db.add_all([r101, r102])
            db.commit()
            print("✅ 5. Đã khởi tạo Phòng mẫu.")

        # 4. NGƯỜI CAO TUỔI (ELDERS)
        cu_long = db.query(models.Elder).filter(models.Elder.full_name.like("%Long%")).first()
        cu_mai = db.query(models.Elder).filter(models.Elder.full_name.like("%Mai%")).first()
        if not cu_long:
            cu_long = models.Elder(
                full_name="Cụ Nguyễn Văn Long", room_id=r101.id, gender="Nam",
                last_weight_date=date.today() - timedelta(days=35)
            )
            cu_mai = models.Elder(
                full_name="Cụ Lê Thị Mai", room_id=r101.id, gender="Nữ",
                last_weight_date=date.today() - timedelta(days=10)
            )
            db.add_all([cu_long, cu_mai])
            db.commit()
            print("✅ 6. Đã tiếp nhận các Cụ vào phòng.")

        # Seed Hồ sơ sức khỏe y tế
        if db.query(models.ElderHealthProfile).count() == 0:
            profiles = [
                models.ElderHealthProfile(elder_id=cu_long.id, has_stroke=True, stroke_describe="Tai biến nhẹ"),
                models.ElderHealthProfile(elder_id=cu_mai.id, has_fall=True, fall_describe="Té ngã khớp hông")
            ]
            db.add_all(profiles)
            db.commit()

        # 5. TÀI SẢN / TƯ TRANG
        if db.query(models.Asset).count() == 0:
            assets = [
                models.Asset(asset_name="Xe lăn điện Yuwell", room_id=r101.id, elder_id=cu_long.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Máy trợ thính", room_id=r101.id, elder_id=cu_mai.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Cốc uống nước", room_id=r101.id, elder_id=cu_long.id, requires_inspection=False, status="Active"),
            ]
            db.add_all(assets)
            db.commit()
            print("✅ 7. Đã nạp danh mục Tư trang.")

        # 6. SINH HIỆU (VITALS), CÂN NẶNG & TOA THUỐC
        if db.query(models.VitalSignRecord).count() == 0:
            vitals = [
                models.VitalSignRecord(
                    elder_id=cu_long.id, measured_by=caregiver.id, shift_type="Sang",
                    bp_systolic=165, bp_diastolic=95, pulse=88, spo2=93.5, temperature=37.8,
                    notes="Cụ ho nhẹ, thở hơi mệt", is_abnormal=True
                )
            ]
            db.add_all(vitals)
            db.commit()
            print("✅ 8. Đã ghi nhận Sinh hiệu buổi sáng (Có cờ đỏ).")

        if db.query(models.WeightRecord).count() == 0:
            weights = [models.WeightRecord(elder_id=cu_long.id, measured_by=caregiver.id, weight=56.5, measured_month="2026-06", notes="Cân tháng 6")]
            db.add_all(weights)
            db.commit()

        if db.query(models.TreatmentDiary).count() == 0:
            diary = models.TreatmentDiary(elder_id=cu_long.id, event_type="Báo cáo ca trực (ĐP)", content="Cụ bỏ bữa trưa.", created_by=coordinator.id)
            db.add(diary)
            db.commit()

        # 7. KÍCH HOẠT CA TRỰC LIVE
        current_hour = datetime.datetime.now().hour
        stype = "Sang" if (8 <= current_hour < 19) else "Toi"
        
        existing_shift = db.query(models.Shift).filter(models.Shift.shift_date == date.today(), models.Shift.shift_type == stype).first()
        if not existing_shift:
            test_shift = models.Shift(shift_date=date.today(), shift_type=stype, status="Open")
            db.add(test_shift)
            db.commit()
            print(f"⚡ 9. Đã kích hoạt CA TRỰC LIVE: Ngày [{date.today()}] - Ca [{stype}].")
        else:
            existing_shift.status = "Open"
            db.commit()
            print(f"⚡ 9. Ca trực LIVE [{stype}] hôm nay đã sẵn sàng ở trạng thái Open.")

        print("\n🎉 HỆ THỐNG ĐÃ SẴN SÀNG 100%! Không còn sợ lỗi thiếu Data cũ.")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi trong quá trình đổ dữ liệu mẫu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_everything()