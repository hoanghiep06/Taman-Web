# models.py
import uuid
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Date, BigInteger, UniqueConstraint, CheckConstraint, Float, Numeric
from sqlalchemy.dialects.postgresql import ARRAY, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# =========================
# 1. Hệ thống cơ sở và khu vực
# =========================

class Facility(Base):
    __tablename__ = "facilities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    address = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now()) 

    zones = relationship("Zone", back_populates="facility", cascade="all, delete-orphan")
    users = relationship("User", back_populates="facility")
    inventory_items = relationship("InventoryItem", back_populates="facility", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)  # Vdu: Khu A, Khu B

    facility = relationship("Facility", back_populates="zones")
    rooms = relationship("Room", back_populates="zone", cascade="all, delete-orphan")
    description = Column(Text) 

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"))

    room_number = Column(String(20), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    zone = relationship("Zone", back_populates="rooms")
    elders = relationship("Elder", back_populates="room")
    assets = relationship("Asset", back_populates="room", cascade="all, delete-orphan")

# =========================
# 2. Người dùng và Quyền truy cập
# =========================

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('Admin', 'Manager', 'Doctor', 'Coordinator', 'Caregiver', 'Security', 'Kitchen', 'Janitor', 'Relative')", 
            name="check_user_role"
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True) # Admin/Manager/Doctor có thể Null để quản lý all
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    phone_number = Column(String(15))

    facility = relationship("Facility", back_populates="users")
    login_logs = relationship("LoginLog", back_populates="user")
    inspection_logs = relationship("InspectionLog", back_populates="user")
    inventory_transactions = relationship("InventoryTransaction", back_populates="user")
    shift_reports = relationship("ShiftReport", back_populates="coordinator")

class LoginLog(Base):
    __tablename__ = "login_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    login_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text)

    user = relationship("User", back_populates="login_logs")

# =========================
# 3. Quản lý NCT & Người thân 
# =========================

class Elder(Base):
    __tablename__ = "elders"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"))
    full_name = Column(String(100), nullable=False)
    photo_url = Column(Text)
    gender = Column(String(10))
    date_of_birth = Column(Date)
    admission_date = Column(Date)
    manager_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_weight_date = Column(Date, nullable=True)


    room = relationship("Room", back_populates="elders")
    assets = relationship("Asset", back_populates="elder")
    health_profile = relationship("ElderHealthProfile", back_populates="elder", uselist=False, cascade="all, delete-orphan")
    relatives = relationship("RelativeElder", back_populates="elder", cascade="all, delete-orphan")
    weight_records = relationship("WeightRecord", back_populates="elder", cascade="all, delete-orphan")

    contracts = relationship("Contract", back_populates="elder", cascade="all, delete-orphan")



class RelativeElder(Base):
    __tablename__ = "relative_elder"
    id = Column(Integer, primary_key=True, index=True)
    relative_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"))
    relationship_type = Column(String(50))
    is_approved = Column(Boolean, default=False)  # Manager Duyệt

    relative = relationship("User", foreign_keys=[relative_id])
    elder = relationship("Elder", back_populates="relatives")


class ElderHealthProfile(Base):
    __tablename__ = "elder_health_profiles"
    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"), unique=True)

    # Tiền sử phẫu thuật
    has_surgery = Column(Boolean, default=False, nullable=False) 
    surgery_describe = Column(Text, default=None, nullable=True) 

    # Tiền sử té ngã
    has_fall = Column(Boolean, default=False, nullable=False) 
    fall_describe = Column(Text, default=None, nullable=True) 
    
    # Tiền sử đột quỵ
    has_stroke = Column(Boolean, default=False, nullable=False) 
    stroke_describe = Column(Text, default=None, nullable=True) 
    
    # Tiền sử tim mạch
    has_cardiovascular = Column(Boolean, default=False, nullable=False) 
    cardiovascular_describe = Column(Text, default=None, nullable=True)

    # 3. Các thông tin sức khỏe mở rộng
    underlying_conditions = Column(Text, default=None, nullable=True)  # Bệnh nền khác (dạng tự do)
    doctor_notes = Column(Text, default=None, nullable=True) 

    drug_allergies = Column(ARRAY(String), default=list, nullable=False) 
    food_allergies = Column(ARRAY(String), default=list, nullable=False) 
    chronic_diseases = Column(ARRAY(String), default=list, nullable=False) 

    # 5. Thiết lập mối quan hệ ORM
    elder = relationship("Elder", back_populates="health_profile")

    # 6. Ràng buộc Logic (Database Level Constraints)
    # Đảm bảo tính toàn vẹn: Không cho phép nhập mô tả nếu người dùng chọn "Không" (False)
    __table_args__ = (
        CheckConstraint(
            "(has_surgery = TRUE) OR (has_surgery = FALSE AND surgery_describe IS NULL)",
            name="check_surgery_logic"
        ),
        CheckConstraint(
            "(has_fall = TRUE) OR (has_fall = FALSE AND fall_describe IS NULL)",
            name="check_fall_logic"
        ),
        CheckConstraint(
            "(has_stroke = TRUE) OR (has_stroke = FALSE AND stroke_describe IS NULL)",
            name="check_stroke_logic"
        ),
        CheckConstraint(
            "(has_cardiovascular = TRUE) OR (has_cardiovascular = FALSE AND cardiovascular_describe IS NULL)",
            name="check_cardiovascular_logic"
        ),
    )

# =========================
# 4. Chỉ số sinh hiệu & Toa thuốc
# =========================
class VitalSignRecord(Base):
    __tablename__ = "vital_sign_records"
    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"))
    measured_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    measured_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    shift_type = Column(String(20)) # Sáng/ tối

    bp_systolic = Column(Integer)
    bp_diastolic = Column(Integer)
    pulse = Column(Integer)
    spo2 = Column(Float)
    temperature = Column(Float)
    notes = Column(Text)
    is_abnormal = Column(Boolean, default=False)

    is_edited = Column(Boolean, default=False)
    edited_at = Column(TIMESTAMP(timezone=True), nullable=True)


class MedicineCategory(Base):
    __tablename__ = "medicine_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    medicines = relationship("Medicine", back_populates="category")


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        UniqueConstraint(
            "generic_name", "strength", "dosage_form",
            name="uq_medicine_identify"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    # Tên thuốc hiển thị / tên thương mại
    name = Column(String(200), nullable=False)

    # Tên dùng gợi ý quen thuộc
    generic_name = Column(String(200), nullable=True)
    strength = Column(String(100), nullable=True)  # Định lượng: 500mg
    unit = Column(String(50), nullable=False)   # Viên, gói, chai
    dosage_form = Column(String(100), nullable=True)
    category_id = Column(Integer, ForeignKey("medicine_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    route = Column(String(50), nullable=True)  # Uống, bôi, nhỏ mắt, tiêm...

    # active: được đề xuất; pending_review: chờ Doctor/Manager duyệt; inactive: ngừng dùng.
    status = Column(String(20), nullable=False, default="active")
    is_high_alert = Column(Boolean, nullable=False, default=False)
    storage_note = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(TIMESTAMP(timezone=True), nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    category = relationship("MedicineCategory", back_populates="medicines")
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    __table_args__ = (
        CheckConstraint("total_quantity >= 0", name="ck_item_quatity_positive"),
        CheckConstraint(
            "morning_dose >= 0 AND noon_dose >= 0 "
            "AND evening_dose >= 0 AND night_dose >= 0",
            name="ck_item_doses_positive"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(
        Integer,
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    medicine_id = Column(
        Integer,
        ForeignKey("medicines.id", ondelete="SET NULL"),
        nullable=True
    )

    medicine_name = Column(String(255), nullable=False)
    medicine_strength = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=False)

    total_quantity = Column(Numeric(10, 2), nullable=False, default=0)

    morning_dose = Column(Numeric(10, 2), nullable=False, default=0)
    noon_dose = Column(Numeric(10, 2), nullable=False, default=0)
    evening_dose = Column(Numeric(10, 2), nullable=False, default=0)
    night_dose = Column(Numeric(10, 2), nullable=False, default=0)

    route = Column(String(50), nullable=True)   # Uống, bôi, nhỏ mắt,...
    instructions = Column(Text, nullable=True)
    prn_condition = Column(Text, nullable=True)    # Điều kiện khi dùng: VD khi sốt > 39 độ

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine")




class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(
        Integer,
        ForeignKey("elders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    image_url = Column(Text)
    start_date = Column(Date, nullable=False)
    prescribed_by = Column(String(100))
    follow_up_date = Column(Date)
    is_active = Column(Boolean, default=True)

    prescribed_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    diagnosis = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    end_date = Column(Date, nullable=True)

    # active | stopped | completed | superseded | draft
    status = Column(String(20), nullable=False, default="draft")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    logs = relationship(
        "PrescriptionLog",
        back_populates="prescription",
        cascade="all, delete-orphan"
    )

    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan"
    )

    elder = relationship("Elder")
    prescribed_by_user = relationship("User")

class PrescriptionLog(Base):
    __tablename__ = "prescription_logs"
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"))
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    change_type = Column(String(50)) # Thêm, Ngưng, Đổi liều
    change_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    prescription = relationship("Prescription", back_populates="logs")


class TreatmentDiary(Base):
    __tablename__ = "treatment_diaries"
    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"))
    event_type = Column(String(50))
    content = Column(Text, nullable=False)
    image_url = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class WeightRecord(Base):
    __tablename__ = "weight_records"
    id = Column(Integer, primary_key=True, index=True)
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"), nullable=False)
    measured_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # NVCS thực hiện
    
    weight = Column(Float, nullable=False)              # Cân nặng (kg), VD: 52.5
    measured_month = Column(String(7), nullable=False)  # Định dạng YYYY-MM (VD: "2026-07")
    measured_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)                 # Ghi chú (nếu có)

    elder = relationship("Elder", back_populates="weight_records")
    staff = relationship("User")
    

# =========================
# 5. VẬN HÀNH: BÁO CÁO, KHO, BẾP, BẢO VỆ
# =========================

class ShiftReport(Base):
    # Điều phối tổng hợp để gửi lên cấp trên
    __tablename__ = "shift_reports"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"))
    coordinator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    shift_date = Column(Date, default=func.current_date())
    shift_type = Column(String(20))

    highlighted_issues = Column(Text)
    elder_descriptions = Column(Text)
    handover_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    coordinator = relationship("User", back_populates="shift_reports")
    facility = relationship("Facility")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    unit = Column(String(20))
    current_quantity = Column(Float, default=0)

    facility = relationship("Facility", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="item")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL")) # Xác định ai lấy
    transaction_type = Column(String(10)) # 'IN' hoặc 'OUT'
    quantity = Column(Float, nullable=False)
    note = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    item = relationship("InventoryItem", back_populates="transactions")
    user = relationship("User", back_populates="inventory_transactions")

class DailyMenu(Base):
    __tablename__ = "daily_menus"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"))
    menu_date = Column(Date, nullable=False)
    meal_type = Column(String(15))
    description = Column(Text)
    image_url = Column(Text)

class VisitorLog(Base):
    __tablename__ = "visitor_logs"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"))
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"))
    visitor_name = Column(String(100), nullable=False)
    check_in_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    image_url = Column(Text)

# ==========================================
# 6. LEGACY MVP1: QUẢN LÝ TƯ TRANG & HỆ THỐNG
# ==========================================

class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint("status IN ('Active', 'Archived')", name="check_asset_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String(150), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"))
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="SET NULL"))

    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)

    requires_inspection = Column(Boolean, default=True, nullable=False)

    status = Column(String(20), default='Active')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="assets")
    elder = relationship("Elder", back_populates="assets")
    inspection_logs = relationship("InspectionLog", back_populates="asset", cascade="all, delete-orphan")
    contract = relationship("Contract", back_populates="assets")

class Shift(Base):
    __tablename__ = "shifts"
    __table_args__ = (
        UniqueConstraint("shift_date", "shift_type", name="uq_shift_date_type"),
        CheckConstraint("shift_type IN ('Sang', 'Toi')", name="check_shift_type"),
        CheckConstraint("status IN ('Open', 'Submitted')", name="check_shift_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    shift_date = Column(Date, nullable=False, default=func.current_date())
    shift_type = Column(String(10), nullable=False)
    status = Column(String(20), default='Open')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    inspection_logs = relationship("InspectionLog", back_populates="shift", cascade="all, delete-orphan")

class Nonce(Base):
    __tablename__ = "nonces"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)

class InspectionLog(Base):
    __tablename__ = "inspection_logs"
    __table_args__ = (
        CheckConstraint("status IN ('Xanh', 'Vang', 'Dang_Xu_Ly', 'Loi_Upload')", name="check_inspection_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False)
    image_url = Column(Text)
    note = Column(Text)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    nonce_id = Column(String(36), ForeignKey("nonces.id", ondelete="SET NULL"), nullable=True)

    shift = relationship("Shift", back_populates="inspection_logs")
    user = relationship("User", back_populates="inspection_logs")
    asset = relationship("Asset", back_populates="inspection_logs")

class ShiftSummary(Base):
    __tablename__ = "shift_summaries"
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), unique=True)
    total_assets = Column(Integer, nullable=False)
    inspected_count = Column(Integer, nullable=False)
    missing_count = Column(Integer, nullable=False)
    lost_count = Column(Integer, nullable=False)
    missing_asset_ids = Column(ARRAY(Integer), default=[])
    lost_asset_ids = Column(ARRAY(Integer), default=[])
    is_email_sent = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class ShiftSetting(Base):
    __tablename__ = "shift_settings"
    id = Column(Integer, primary_key=True, default=1)
    morning_start = Column(String(5), nullable=False)
    morning_end = Column(String(5), nullable=False)
    evening_start = Column(String(5), nullable=False)
    evening_end = Column(String(5), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    target_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    payload = Column(Text, nullable=True)



# ==========================================
# 7. Quản lý hợp đồng 
# ==========================================
class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id", ondelete="CASCADE"))
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="CASCADE"))

    relative_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    contract_number = Column(String(50), unique=True, nullable=False)

    # Lưu trữ URL trên Drive 
    dossier_folder_id = Column(String(100), nullable=False)

    status = Column(String(20), default="Active") 
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    facility = relationship("Facility")
    elder = relationship("Elder", back_populates="contracts")
    relative = relationship("User")
    assets = relationship("Asset", back_populates="contract")
