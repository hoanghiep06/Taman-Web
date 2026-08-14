# seed_data.py
import os
import sys
from pathlib import Path
from datetime import date, datetime, timedelta
from passlib.context import CryptContext

PROJECT_ROOT = Path(__file__).resolve().parents[0]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import SessionLocal, engine
import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    print("⏳ Đang nạp hệ sinh thái dữ liệu mẫu chuẩn hóa cho Viện Dưỡng Lão Tâm An...")
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Mốc thời gian neo cố định: 08:00 AM ngày 08/08/2026
    ANCHOR_DATE = date(2026, 8, 8)
    
    try:
        # =========================================================================
        # 1. CƠ SỞ (FACILITY) & PHÂN KHU (ZONE: KHU A, KHU B, KHU C)
        # =========================================================================
        fac1 = db.query(models.Facility).filter(models.Facility.name.like("%Thủ Đức%")).first()
        fac2 = db.query(models.Facility).filter(models.Facility.name.like("%Bình Chánh%")).first()

        if not fac1:
            fac1 = models.Facility(name="CS 1 - Thủ Đức", address="123 Đặng Văn Bi, P. Bình Thọ, TP. Thủ Đức")
            fac2 = models.Facility(name="CS 2 - Bình Chánh", address="789 Quốc Lộ 50, Bình Chánh, TP.HCM")
            db.add_all([fac1, fac2])
            db.commit()
            db.refresh(fac1)
            db.refresh(fac2)
            print("✅ 1. Khởi tạo 2 Cơ sở (CS 1 - Thủ Đức & CS 2 - Bình Chánh).")

        # Tạo Phân khu chuẩn "A", "B", "C"
        if db.query(models.Zone).count() == 0:
            zones = [
                # Cơ sở 1 - Thủ Đức
                models.Zone(facility_id=fac1.id, name="A", description="Khu chăm sóc đặc biệt"),
                models.Zone(facility_id=fac1.id, name="B", description="Khu tiêu chuẩn"),
                models.Zone(facility_id=fac1.id, name="C", description="Khu phục hồi chức năng"),
                # Cơ sở 2 - Bình Chánh
                models.Zone(facility_id=fac2.id, name="A", description="Khu điều dưỡng cao cấp"),
                models.Zone(facility_id=fac2.id, name="B", description="Khu sinh hoạt chung"),
            ]
            db.add_all(zones)
            db.commit()
            print("✅ 2. Khởi tạo các Phân khu chuẩn (Khu A, Khu B, Khu C).")

        z1_a = db.query(models.Zone).filter(models.Zone.facility_id == fac1.id, models.Zone.name == "A").first()
        z1_b = db.query(models.Zone).filter(models.Zone.facility_id == fac1.id, models.Zone.name == "B").first()
        z2_a = db.query(models.Zone).filter(models.Zone.facility_id == fac2.id, models.Zone.name == "A").first()
        z2_b = db.query(models.Zone).filter(models.Zone.facility_id == fac2.id, models.Zone.name == "B").first()

        # =========================================================================
        # 2. PHÒNG ỐC (ROOMS)
        # =========================================================================
        r101 = db.query(models.Room).filter(models.Room.room_number == "101").first()
        if not r101:
            rooms = [
                # Cơ sở 1 - Khu A & B
                models.Room(zone_id=z1_a.id, room_number="101", description="Phòng 2 Cụ - Đang ở đủ"),
                models.Room(zone_id=z1_a.id, room_number="102", description="Phòng 1 Cụ - Còn 1 giường trống"),
                models.Room(zone_id=z1_b.id, room_number="201", description="Phòng trống - Đang chờ tiếp nhận"),
                # Cơ sở 2 - Khu A & B
                models.Room(zone_id=z2_a.id, room_number="301", description="Phòng VIP 1 Cụ"),
                models.Room(zone_id=z2_b.id, room_number="401", description="Phòng tiêu chuẩn 2 Cụ"),
            ]
            db.add_all(rooms)
            db.commit()
            print("✅ 3. Khởi tạo danh sách Phòng mẫu.")

        r101 = db.query(models.Room).filter(models.Room.room_number == "101").first()
        r102 = db.query(models.Room).filter(models.Room.room_number == "102").first()
        r201 = db.query(models.Room).filter(models.Room.room_number == "201").first()
        r301 = db.query(models.Room).filter(models.Room.room_number == "301").first()
        r401 = db.query(models.Room).filter(models.Room.room_number == "401").first()

        # =========================================================================
        # 3. TÀI KHOẢN VAI TRÒ (USERS)
        # =========================================================================
        admin = get_or_create_user(db, "admin", "Quản Trị Viên Tối Cao", "Admin")
        doctor_all = get_or_create_user(db, "doctor01", "BS. Nguyễn Minh Đức (Toàn Viện)", "Doctor", facility_id=None)

        manager_cs1 = get_or_create_user(db, "manager01", "Trần Văn Quản Lý (CS1)", "Manager", fac1.id)
        coordinator_cs1 = get_or_create_user(db, "coordinator01", "Lê Anh Thư (ĐIỀU PHỐI CS1)", "Coordinator", fac1.id)
        caregiver_cs1 = get_or_create_user(db, "caregiver01", "Đình Điều Điều (NVCS CS1)", "Caregiver", fac1.id)

        manager_cs2 = get_or_create_user(db, "manager02", "Phạm Hoàng Quản Lý (CS2)", "Manager", fac2.id)
        coordinator_cs2 = get_or_create_user(db, "coordinator02", "Nguyễn Văn Điệp (ĐIỀU PHỐI CS2)", "Coordinator", fac2.id)
        caregiver_cs2 = get_or_create_user(db, "caregiver02", "Vũ Thị Trâm (NVCS CS2)", "Caregiver", fac2.id)

        if db.query(models.ShiftSetting).count() == 0:
            db.add(models.ShiftSetting(morning_start="08:00", morning_end="19:00", evening_start="20:00", evening_end="07:00"))
            db.commit()

        # =========================================================================
        # 4. NGƯỜI CAO TUỔI (ELDERS)
        # =========================================================================
        cu_long = db.query(models.Elder).filter(models.Elder.full_name.like("%Long%")).first()
        if not cu_long:
            elders = [
                models.Elder(
                    full_name="Cụ Nguyễn Văn Long", room_id=r101.id, gender="Nam",
                    date_of_birth=date(1945, 3, 20), admission_date=date(2025, 1, 10),
                    last_weight_date=date(2026, 7, 10)
                ),
                models.Elder(
                    full_name="Cụ Lê Thị Mai", room_id=r101.id, gender="Nữ",
                    date_of_birth=date(1950, 8, 15), admission_date=date(2025, 2, 1),
                    last_weight_date=date(2026, 7, 20)
                ),
                models.Elder(
                    full_name="Cụ Trần Bản Khánh", room_id=r102.id, gender="Nam",
                    date_of_birth=date(1942, 11, 5), admission_date=date(2025, 3, 12),
                    last_weight_date=date(2026, 8, 2)
                ),
                models.Elder(
                    full_name="Cụ Bùi Thị Hà", room_id=r301.id, gender="Nữ",
                    date_of_birth=date(1948, 5, 12), admission_date=date(2025, 4, 1),
                    last_weight_date=date(2026, 8, 5)
                ),
                models.Elder(
                    full_name="Cụ Phạm Quỳnh Như", room_id=r401.id, gender="Nữ",
                    date_of_birth=date(1952, 9, 30), admission_date=date(2026, 8, 1),
                    last_weight_date=None
                )
            ]
            db.add_all(elders)
            db.commit()
            print("✅ 4. Nạp danh sách các Cụ kèm phân bổ lịch cân thực tế.")

        cu_long = db.query(models.Elder).filter(models.Elder.full_name.like("%Long%")).first()
        cu_mai = db.query(models.Elder).filter(models.Elder.full_name.like("%Mai%")).first()
        cu_khanh = db.query(models.Elder).filter(models.Elder.full_name.like("%Khánh%")).first()
        cu_ha = db.query(models.Elder).filter(models.Elder.full_name.like("%Hà%")).first()
        cu_nhu = db.query(models.Elder).filter(models.Elder.full_name.like("%Như%")).first()

        # Hồ sơ y tế
        if db.query(models.ElderHealthProfile).count() == 0:
            profiles = [
                models.ElderHealthProfile(elder_id=cu_long.id, has_stroke=True, stroke_describe="Tai biến năm 2023", underlying_conditions="Tiểu đường, Huyết áp cao"),
                models.ElderHealthProfile(elder_id=cu_mai.id, has_fall=True, fall_describe="Té đau khớp hông năm 2024"),
                models.ElderHealthProfile(elder_id=cu_khanh.id, has_cardiovascular=True, cardiovascular_describe="Thiếu máu cơ tim")
            ]
            db.add_all(profiles)
            db.commit()

        # =========================================================================
        # 5. SINH HIỆU (VITALS)
        # =========================================================================
        if db.query(models.VitalSignRecord).count() == 0:
            vitals = [
                models.VitalSignRecord(elder_id=cu_long.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 6, 8, 30), shift_type="Sang", bp_systolic=130, bp_diastolic=85, pulse=78, spo2=97.0, temperature=36.6, is_abnormal=False),
                models.VitalSignRecord(elder_id=cu_khanh.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 6, 9, 00), shift_type="Sang", bp_systolic=145, bp_diastolic=90, pulse=85, spo2=94.0, temperature=37.6, notes="Cụ hơi sốt nhẹ", is_abnormal=True),
                models.VitalSignRecord(elder_id=cu_long.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 7, 8, 15), shift_type="Sang", bp_systolic=135, bp_diastolic=85, pulse=80, spo2=96.0, temperature=36.8, is_abnormal=False),
                models.VitalSignRecord(elder_id=cu_mai.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 7, 8, 30), shift_type="Sang", bp_systolic=120, bp_diastolic=80, pulse=72, spo2=98.0, temperature=36.5, is_abnormal=False),
                models.VitalSignRecord(
                    elder_id=cu_long.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 8, 7, 45), shift_type="Sang",
                    bp_systolic=165, bp_diastolic=98, pulse=92, spo2=93.0, temperature=38.2,
                    notes="Cụ ho nhiều, sốt cao, thở dốc", is_abnormal=True, is_edited=True, edited_at=datetime(2026, 8, 8, 8, 00)
                ),
                models.VitalSignRecord(
                    elder_id=cu_mai.id, measured_by=caregiver_cs1.id, measured_at=datetime(2026, 8, 8, 7, 50), shift_type="Sang",
                    bp_systolic=118, bp_diastolic=78, pulse=70, spo2=98.5, temperature=36.4, notes="Khỏe mạnh, ăn hết suất", is_abnormal=False
                ),
                models.VitalSignRecord(
                    elder_id=cu_ha.id, measured_by=caregiver_cs2.id, measured_at=datetime(2026, 8, 8, 8, 10), shift_type="Sang",
                    bp_systolic=125, bp_diastolic=82, pulse=76, spo2=97.5, temperature=36.6, notes="Sức khỏe bình thường", is_abnormal=False
                ),
                models.VitalSignRecord(
                    elder_id=cu_nhu.id, measured_by=caregiver_cs2.id, measured_at=datetime(2026, 8, 8, 8, 20), shift_type="Sang",
                    bp_systolic=150, bp_diastolic=95, pulse=88, spo2=92.5, temperature=37.9, notes="Mới vào viện, SpO2 hơi thấp", is_abnormal=True
                )
            ]
            db.add_all(vitals)
            db.commit()
            print("✅ 5. Ghi nhận Lịch sử Sinh hiệu theo từng ca.")

        if db.query(models.WeightRecord).count() == 0:
            weights = [
                models.WeightRecord(elder_id=cu_long.id, measured_by=caregiver_cs1.id, weight=56.5, measured_month="2026-07", measured_at=datetime(2026, 7, 10), notes="Cân tháng 7"),
                models.WeightRecord(elder_id=cu_mai.id, measured_by=caregiver_cs1.id, weight=48.0, measured_month="2026-07", measured_at=datetime(2026, 7, 20), notes="Cân tháng 7"),
                models.WeightRecord(elder_id=cu_khanh.id, measured_by=caregiver_cs1.id, weight=62.0, measured_month="2026-08", measured_at=datetime(2026, 8, 2), notes="Cân tháng 8"),
            ]
            db.add_all(weights)
            db.commit()

        # =========================================================================
        # 6. BÁO CÁO GIAO CA LỊCH SỬ & VẾT CHỈNH SỬA
        # =========================================================================
        if db.query(models.ShiftReport).count() == 0:
            reports = [
                models.ShiftReport(
                    facility_id=fac1.id, coordinator_id=coordinator_cs1.id, shift_date=date(2026, 8, 6), shift_type="Sang",
                    highlighted_issues="Cụ Khánh sốt nhẹ buổi trưa.", elder_descriptions="1. Cụ Khánh: Sốt nhẹ 37.6 độ C, đã uống panadol.", handover_notes="Ca tối theo dõi nhiệt độ Cụ Khánh."
                ),
                models.ShiftReport(
                    facility_id=fac1.id, coordinator_id=coordinator_cs1.id, shift_date=date(2026, 8, 7), shift_type="Sang",
                    highlighted_issues="Cụ Long bỏ ăn trưa.", elder_descriptions="1. Cụ Long: Bỏ 1/2 suất ăn trưa do mệt.", handover_notes="Nhắc NVCS cho Cụ uống sữa bổ sung."
                ),
                models.ShiftReport(
                    facility_id=fac1.id, coordinator_id=coordinator_cs1.id, shift_date=date(2026, 8, 7), shift_type="Toi",
                    highlighted_issues="Cụ Long ho hắng về đêm.", elder_descriptions="1. Cụ Long: Ho hắng nhẹ, SpO2 95%.\n2. Cụ Mai: Ngủ ngon.", handover_notes="Dặn ca sáng 08/08 đo SpO2 khẩn cấp cho Cụ Long."
                ),
                models.ShiftReport(
                    facility_id=fac2.id, coordinator_id=coordinator_cs2.id, shift_date=date(2026, 8, 7), shift_type="Sang",
                    highlighted_issues="Tiếp nhận Cụ Như vào phòng 401.", elder_descriptions="1. Cụ Như: Tinh thần tốt nhưng chưa đo cân nặng.", handover_notes="Xếp lịch đo cân nặng và kiểm tra chỉ số ban đầu."
                ),
                models.ShiftReport(
                    facility_id=fac2.id, coordinator_id=coordinator_cs2.id, shift_date=date(2026, 8, 7), shift_type="Toi",
                    highlighted_issues="Tình hình Cơ sở 2 ổn định.", elder_descriptions="1. Cụ Hà: Ngủ ngon.\n2. Cụ Như: Nghỉ ngơi tốt.", handover_notes="Bàn giao ca sáng 08/08 bình thường."
                )
            ]
            db.add_all(reports)
            db.commit()

            report_last = db.query(models.ShiftReport).filter(models.ShiftReport.shift_date == date(2026, 8, 7), models.ShiftReport.shift_type == "Toi").first()
            if report_last:
                audit = models.AuditLog(
                    actor_id=coordinator_cs1.id,
                    action="UPDATE_SHIFT_REPORT",
                    target_id=str(report_last.id).strip(),
                    ip_address="172.18.0.4",
                    created_at=datetime(2026, 8, 7, 23, 15),
                    payload='{"old": {"elder_descriptions": "1. Cụ Long ho nhẹ", "handover_notes": "Theo dõi"}, "new": {"elder_descriptions": "1. Cụ Long ho nhiều, SpO2 93%", "handover_notes": "Báo Bác sĩ"}}'
                )
                db.add(audit)
                db.commit()

            print("✅ 6. Khởi tạo Báo Cáo Giao Ca Lịch Sử kèm AuditLog.")

        # =========================================================================
        # 7. KÍCH HOẠT CA TRỰC LIVE SÁNG 08/08/2026
        # =========================================================================
        existing_shift = db.query(models.Shift).filter(models.Shift.shift_date == ANCHOR_DATE, models.Shift.shift_type == "Sang").first()
        if not existing_shift:
            existing_shift = models.Shift(shift_date=ANCHOR_DATE, shift_type="Sang", status="Open")
            db.add(existing_shift)
            db.commit()
            db.refresh(existing_shift)

        # =========================================================================
        # 8. QUẢN LÝ TÀI SẢN & TƯ TRANG (ASSETS) & NHẬT KÝ KIỂM KÊ PATROL
        # =========================================================================
        if db.query(models.Asset).count() == 0:
            assets = [
                # ---------------- PHÒNG 101 (CS1 - Khu A: Cụ Long, Cụ Mai) ----------------
                # Cụ Nguyễn Văn Long
                models.Asset(asset_name="Xe lăn điện Omron", room_id=r101.id, elder_id=cu_long.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Máy đo đường huyết Omron", room_id=r101.id, elder_id=cu_long.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Kính lão gọng titan", room_id=r101.id, elder_id=cu_long.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Dép xốp đi trong nhà", room_id=r101.id, elder_id=cu_long.id, requires_inspection=False, status="Active"),
                models.Asset(asset_name="Bàn chải đánh răng cá nhân", room_id=r101.id, elder_id=cu_long.id, requires_inspection=False, status="Active"),

                # Cụ Lê Thị Mai
                models.Asset(asset_name="Máy trợ thính Phonak", room_id=r101.id, elder_id=cu_mai.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Khung tập đi Inox", room_id=r101.id, elder_id=cu_mai.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Lược chải tóc gốm", room_id=r101.id, elder_id=cu_mai.id, requires_inspection=False, status="Active"),

                # Tài sản chung Phòng 101 (elder_id = None)
                models.Asset(asset_name="Tivi Samsung 43 inch", room_id=r101.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Tủ lạnh Panasonic 150L", room_id=r101.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Quạt hơi nước Kangtai", room_id=r101.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Bộ ấm trà gốm sứ", room_id=r101.id, elder_id=None, requires_inspection=False, status="Active"),

                # ---------------- PHÒNG 102 (CS1 - Khu A: Cụ Khánh) ----------------
                models.Asset(asset_name="Máy tạo Oxy họng cắm", room_id=r102.id, elder_id=cu_khanh.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Đồng hồ định vị GPS", room_id=r102.id, elder_id=cu_khanh.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Radio đài cassette nhỏ", room_id=r102.id, elder_id=cu_khanh.id, requires_inspection=False, status="Active"),
                # Tài sản chung Phòng 102
                models.Asset(asset_name="Điều hòa Daikin 12000 BTU", room_id=r102.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Thảm lau chân chống trượt", room_id=r102.id, elder_id=None, requires_inspection=False, status="Active"),

                # ---------------- PHÒNG 301 (CS2 - Khu A: Cụ Hà) ----------------
                models.Asset(asset_name="Xe đẩy tay gấp gọn", room_id=r301.id, elder_id=cu_ha.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Máy massage chân hồng ngoại", room_id=r301.id, elder_id=cu_ha.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Gối ôm thảo dược", room_id=r301.id, elder_id=cu_ha.id, requires_inspection=False, status="Active"),
                # Tài sản chung Phòng 301
                models.Asset(asset_name="Tivi Sony 50 inch VIP", room_id=r301.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Tủ lạnh LG Inverter 200L", room_id=r301.id, elder_id=None, requires_inspection=True, status="Active"),

                # ---------------- PHÒNG 401 (CS2 - Khu B: Cụ Như) ----------------
                models.Asset(asset_name="Đệm khí chống loét", room_id=r401.id, elder_id=cu_nhu.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Máy đo huyết áp bắp tay", room_id=r401.id, elder_id=cu_nhu.id, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Bộ quần áo pijama lụa", room_id=r401.id, elder_id=cu_nhu.id, requires_inspection=False, status="Active"),
                # Tài sản chung Phòng 401
                models.Asset(asset_name="Điều hòa Panasonic 9000 BTU", room_id=r401.id, elder_id=None, requires_inspection=True, status="Active"),
                models.Asset(asset_name="Đèn ngủ cảm ứng", room_id=r401.id, elder_id=None, requires_inspection=False, status="Active"),
            ]
            db.add_all(assets)
            db.commit()
            print("✅ 8a. Nạp 24 món Tài sản & Tư trang (có đồ kiểm & đồ không kiểm).")

        # Nạp bản ghi mẫu Đi tuần (Inspection Log) cho Ca hiện tại để hiệu ứng nước ngập % tiến độ hiển thị sinh động
        if db.query(models.InspectionLog).count() == 0 and existing_shift:
            # Lấy vài tài sản kiểm kê của Phòng 101
            asset_xelan = db.query(models.Asset).filter(models.Asset.asset_name.like("%Xe lăn%")).first()
            asset_mayduonghuyet = db.query(models.Asset).filter(models.Asset.asset_name.like("%đường huyết%")).first()
            asset_tivi101 = db.query(models.Asset).filter(models.Asset.asset_name.like("%Tivi Samsung%")).first()
            asset_trothinh = db.query(models.Asset).filter(models.Asset.asset_name.like("%trợ thính%")).first()

            inspection_logs = []
            if asset_xelan:
                inspection_logs.append(models.InspectionLog(
                    shift_id=existing_shift.id, user_id=caregiver_cs1.id, asset_id=asset_xelan.id,
                    status="Xanh", image_url="https://drive.google.com/sample_xelan.jpg", note="Xe lăn sạch sẽ, hoạt động tốt", version=1, is_latest=True
                ))
            if asset_mayduonghuyet:
                inspection_logs.append(models.InspectionLog(
                    shift_id=existing_shift.id, user_id=caregiver_cs1.id, asset_id=asset_mayduonghuyet.id,
                    status="Vang", image_url=None, note="Không tìm thấy trong hộc tủ, đã nhờ NVCS hỏi lại người thân", version=1, is_latest=True
                ))
            if asset_tivi101:
                inspection_logs.append(models.InspectionLog(
                    shift_id=existing_shift.id, user_id=caregiver_cs1.id, asset_id=asset_tivi101.id,
                    status="Xanh", image_url="https://drive.google.com/sample_tivi.jpg", note="Tivi hoạt động bình thường", version=1, is_latest=True
                ))

            if inspection_logs:
                db.add_all(inspection_logs)
                db.commit()
                print("✅ 8b. Nạp Nhật ký đi tuần mẫu (InspectionLogs) cho Ca hiện tại.")

        print("\n🎉 HỆ THỐNG ĐÃ NẠP XONG DATA MẪU CHUẨN HOÀN HẢO!")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi trong quá trình đổ dữ liệu mẫu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_everything()