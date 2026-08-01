# schemas.py
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime, date
from enum import Enum 


# ==========================================
# ENUMS & ROLE DEFINITION
# ==========================================
class RoleType(str, Enum):
    Admin = "Admin"
    Manager = "Manager"
    Doctor = "Doctor"
    Coordinator = "Coordinator"  # Điều phối
    Caregiver = "Caregiver"      # NVCS
    Security = "Security"        # Bảo vệ
    Kitchen = "Kitchen"          # Bếp
    Janitor = "Janitor"          # Tạp vụ
    Relative = "Relative"        # Người thân

class ShiftType(str, Enum):
    Sang = "Sang"
    Toi = "Toi"

class DocumentType(str, Enum):
    Phieu_Kham = "Phieu_Kham"
    Ket_Qua_Kham = "Ket_Qua_Kham"
    Xuat_Vien = "Xuat_Vien"
    Xet_Nghiem = "Xet_Nghiem"
    Chan_Doan_Hinh_Anh = "Chan_Doan_Hinh_Anh"


# ==========================================
# AUTH & USERS (Luồng Đăng nhập)
# ==========================================
class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: RoleType
    facility_id: Optional[int] = None
    must_change_password: bool

class UserBase(BaseModel):
    username: str
    full_name: str
    role: RoleType
    facility_id: Optional[int] = None
    phone_number: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class LoginLogResponse(BaseModel):
    id: int
    user_id: int
    login_time: datetime
    ip_address: str
    user_agent: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# HỆ THỐNG CƠ SỞ & PHÂN KHU (FACILITY & ZONE)
# ==========================================
class FacilityBase(BaseModel):
    name: str
    address: Optional[str] = None

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    id: int
    total_zones: int = 0
    total_rooms: int = 0
    total_elders: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ZoneBase(BaseModel):
    facility_id: int
    name: str
    description: Optional[str] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneResponse(ZoneBase):
    id: int
    facility_name: Optional[str] = None
    total_rooms: int = 0
    total_elders: int = 0
    total_inspection_assets: int = 0        # Tổng tư trang bắt buộc kiểm kê
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# THỰC THỂ: PHÒNG (ROOM)
# ==========================================
class RoomBase(BaseModel):
    zone_id: int
    room_number: str
    description: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    zone_name: Optional[str] = None
    facility_id: Optional[int] = None
    facility_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# NGƯỜI CAO TUỔI (ELDER) & HỒ SƠ Y TẾ
# ==========================================
class ElderBase(BaseModel):
    full_name: str
    room_id: Optional[int] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    admission_date: Optional[date] = None
    manager_notes: Optional[str] = None

class ElderCreate(ElderBase):
    pass

class ElderResponse(ElderBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Hồ sơ sức khỏe
class ElderHealthProfileBase(BaseModel):
    has_surgery: bool = False
    surgery_describe: Optional[str] = None
    has_fall: bool = False
    fall_describe: Optional[str] = None
    has_stroke: bool = False
    stroke_describe: Optional[str] = None
    has_cardiovascular: bool = False
    cardiovascular_describe: Optional[str] = None
    
    underlying_conditions: Optional[str] = None
    doctor_notes: Optional[str] = None
    drug_allergies: List[str] = []
    food_allergies: List[str] = []
    chronic_diseases: List[str] = []

class ElderHealthProfileUpdate(ElderHealthProfileBase):
    pass

class ElderHealthProfileResponse(ElderHealthProfileBase):
    id: int
    elder_id: int
    model_config = ConfigDict(from_attributes=True)


# Người thân liên kết
class RelativeElderLinkRequest(BaseModel):
    relative_id: int
    elder_id: int
    relationship_type: str

class RelativeElderResponse(BaseModel):
    id: int
    relative_id: int
    elder_id: int
    relationship_type: str
    is_approved: bool
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# THỰC THỂ: NGHIỆP VỤ Y TẾ (DẤU SINH HIỆU, THUỐC)
# ==========================================
class VitalSignCreate(BaseModel):
    elder_id: int
    shift_type: ShiftType
    bp_systolic: Optional[int] = Field(None, description="Huyết áp tâm thu")
    bp_diastolic: Optional[int] = Field(None, description="Huyết áp tâm trương")
    pulse: Optional[int] = Field(None, description="Mạch (lần/phút)")
    spo2: Optional[float] = Field(None, description="Chỉ số SpO2 (%)")
    temperature: Optional[float] = Field(None, description="Nhiệt độ (độ C)")
    notes: Optional[str] = None

class VitalSignResponse(VitalSignCreate):
    id: int
    measured_by: Optional[int]
    measured_at: datetime
    is_abnormal: bool
    model_config = ConfigDict(from_attributes=True)

class VitalSignUpdate(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    elder_id: int
    image_url: Optional[str] = None
    start_date: date
    prescribed_by: str
    follow_up_date: Optional[date] = None

class PrescriptionChangeLog(BaseModel):
    change_type: str
    change_notes: str

class PrescriptionResponse(BaseModel):
    id: int
    elder_id: int
    image_url: Optional[str]
    start_date: date
    prescribed_by: str
    follow_up_date: Optional[date]
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class TreatmentDiaryCreate(BaseModel):
    elder_id: int
    event_type: str
    content: str
    image_url: Optional[str] = None

class TreatmentDiaryResponse(BaseModel):
    id: int
    elder_id: int
    event_type: str
    content: str
    image_url: Optional[str] = None
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# QUẢN LÝ CÂN NẶNG HÀNG THÁNG (WEIGHT RECORDS)
# ==========================================
class WeightRecordBase(BaseModel):
    elder_id: int = Field(..., example=1, description="ID của Cụ già")
    weight: float = Field(..., gt=0, example=54.5, description="Cân nặng tính bằng kg (VD: 54.5)")
    notes: Optional[str] = Field(None, example="Cụ ăn uống tốt, thể trạng ổn định", description="Ghi chú thêm nếu có")

class WeightRecordCreate(WeightRecordBase):
    pass

class WeightRecordUpdate(BaseModel):
    weight: float = Field(..., gt=0, example=55.0, description="Cân nặng cập nhật (kg)")
    notes: Optional[str] = Field(None, description="Ghi chú điều chỉnh")

class WeightRecordResponse(WeightRecordBase):
    id: int
    measured_month: str = Field(..., example="2026-08", description="Tháng đo theo định dạng YYYY-MM")
    measured_by: Optional[int] = Field(None, description="ID nhân viên thực hiện đo")
    staff_name: Optional[str] = Field(None, example="Lê Anh Thư", description="Họ tên nhân viên/Y tế thực hiện")
    measured_at: datetime = Field(..., description="Thời gian bấm máy lưu bản ghi")

    model_config = ConfigDict(from_attributes=True)


class ElderWeightDueResponse(BaseModel):
    elder_id: int
    elder_name: str = Field(..., example="Nguyễn Văn A")
    room_number: Optional[str] = Field(None, example="Phòng 101")
    last_weight_date: Optional[date] = Field(None, example="2026-07-01", description="Ngày cân gần đây nhất")
    days_since_last_weight: Optional[int] = Field(None, example=31, description="Số ngày đã trôi qua kể từ lần cân gần nhất")
    is_overdue: bool = Field(True, description="True nếu đã >= 30 ngày chưa được cân (Cần ưu tiên cân hôm nay)")

    model_config = ConfigDict(from_attributes=True)

    
# ==========================================
# BÁO CÁO GIAO CA ĐIỀU PHỐI (STRUCTURED SHIFT REPORT)
# ==========================================
class ElderShiftNoteInput(BaseModel):
    elder_id: int
    note: str                               # VD: "Đi lại rất nhiều, bỏ ăn trưa + chiều"

class ShiftMedicalReportCreate(BaseModel):
    facility_id: int
    shift_date: date
    shift_type: ShiftType                   # Sang / Toi
    elder_events: List[ElderShiftNoteInput] = [] # Danh sách chọn từng Cụ và nhập ghi chú
    handover_notes: str                     # Hướng xử lý / Lưu ý chung cho ca sau

class ShiftMedicalReportResponse(BaseModel):
    id: int
    facility_id: int
    facility_name: Optional[str] = None
    reporter_id: Optional[int] = None
    reporter_name: Optional[str] = None
    shift_date: date
    shift_type: ShiftType
    formatted_elder_descriptions: str      # Đã tự động Format thành danh sách (1. B.Hà..., 2. M.Như...)
    handover_notes: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ElderHealthSummaryCard(BaseModel):
    elder_id: int
    elder_name: str
    room_number: str
    latest_vital_signs: Optional[VitalSignResponse] = None
    has_abnormal_vital: bool = False                      # Báo đỏ nếu SPO2 < 95, HA cao...
    active_prescription_url: Optional[str] = None         # Chỉ Bác sĩ/Manager/ĐP/NVCS xem được
    recent_diary_events: List[str] = []                   # Các ghi chú diễn biến do ĐP/NVCS gõ
    doctor_attention_reasons: List[str] = []              # Lý do chi tiết cảnh báo Bác sĩ


# ==========================================
# QUẢN LÝ VẬN HÀNH: BÁO CÁO, KHO, BẾP, BẢO VỆ
# ==========================================
class ShiftReportCreate(BaseModel):
    facility_id: int
    shift_date: date
    shift_type: ShiftType
    highlighted_issues: str
    elder_descriptions: Optional[str] = None
    handover_notes: Optional[str] = None

class ShiftReportResponse(ShiftReportCreate):
    id: int
    coordinator_id: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InventoryItemCreate(BaseModel):
    facility_id: int
    name: str
    unit: str

class InventoryTransactionCreate(BaseModel):
    item_id: int
    transaction_type: str
    quatity: float
    note: Optional[str] = None

class InventoryTransactionResponse(InventoryItemCreate):
    id: int
    user_id: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DailyMenuCreate(BaseModel):
    facility_id: int
    menu_date: date
    desciption: str
    image_url: Optional[str] = None

class VisitorLogCreate(BaseModel):
    facility_id: int
    elder_id: int
    visitor_name: str
    image_url: Optional[str] = None

class VisitorLogResponse(VisitorLogCreate):
    id: int
    check_in_time: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# QUẢN LÝ HỢP ĐỒNG (AUTOMATION)
# ==========================================
class ContractCreate(BaseModel):
    facility_id: int
    elder_id: int
    relative_id: Optional[int] = None
    contract_number: str
    dossier_folder_id: str
    start_date: date
    end_date: Optional[date] = None

class ContractResponse(ContractCreate):
    id: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# THỰC THỂ: TÀI SẢN (ASSET)
# ==========================================
class AssetBase(BaseModel):
    asset_name: str = Field(..., example="Xe lăn điện", description="Tên món tư trang/tài sản")
    room_id: int = Field(..., example=101, description="ID của Phòng lưu giữ tài sản")
    elder_id: Optional[int] = Field(None, example=5, description="ID Cụ già sở hữu (Để None nếu là tài sản chung của phòng)")
    contract_id: Optional[int] = Field(None, example=12, description="ID Hợp đồng nhập viện đi kèm (nếu có)")
    requires_inspection: bool = Field(True, description="True: Cần NVCS đi tuần kiểm kê & chụp ảnh hàng ngày. False: Đồ dùng lặt vặt chỉ lưu danh mục")
    status: Optional[str] = Field("Active", example="Active", description="Trạng thái: 'Active' (Đang dùng) hoặc 'Archived' (Lưu kho/Đã mang về)")

class AssetCreate(AssetBase):
    pass

class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    elder_name: Optional[str] = Field(None, example="Nguyễn Văn A", description="Họ tên Cụ sở hữu")
    room_number: Optional[str] = Field(None, example="Phòng 101", description="Số phòng")
    facility_name: Optional[str] = Field(None, example="Cơ sở 1 - TP.HCM", description="Tên Cơ sở")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# NGHIỆP VỤ KIỂM KÊ (SHIFTS & LOGS)
# ==========================================
class ShiftResponse(BaseModel):
    id: int
    shift_date: date
    shift_type: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InspectionLogCreate(BaseModel):
    asset_id: int
    status: str
    image_url: Optional[str] = None
    note: Optional[str] = None

class InspectionLogResponse(InspectionLogCreate):
    id: int
    shift_id: int
    user_id: int
    version: int
    is_latest: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RoomPatrolProgressResponse(BaseModel):
    room_id: int
    room_number: str
    description: Optional[str] = None
    zone_name: str
    facility_name: str
    total_assets: int
    inspected_count: int
    is_completed: bool

    model_config = ConfigDict(from_attributes=True)

class AssetMissingRequest(BaseModel):
    asset_id: int
    note: str # Bắt buộc phải có chuỗi ghi chú lý do giải trình


class StaffHistoryResponse(BaseModel):
    id: int
    asset_id: int
    status: str
    note: Optional[str] = None
    created_at: datetime
    shift_date: Optional[str] = None 
    shift_type: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ===================================
# DASHBOARD TỔNG QUAN
# ===================================
class AssetIncidentDetail(BaseModel):
    asset_id: int
    asset_name: str
    room_number: str 

class ShiftSummaryDetail(BaseModel):
    shift_id: int
    shift_date: date 
    shift_type: str
    total_assets: int
    inspected_count: int
    missing_count: int
    lost_count: int
    is_email_sent: bool
    missing_assets_details: List[AssetIncidentDetail] = []
    lost_assets_details: List[AssetIncidentDetail] = []
    created_at: datetime

class DashboardCurrentShift(BaseModel):
    status: str
    shift_type: Optional[str] = None
    progress_percentage: float = 0.0
    total_assets: int = 0
    inspected_count: int = 0
    missing_items_count: int = 0
    lost_items_count: int = 0

class DashboardResponse(BaseModel):
    current_shift: DashboardCurrentShift
    recent_incidents: List[ShiftSummaryDetail]


# ===================================
# CẤU HÌNH THỜI GIAN CA TRỰC
# ===================================
class ShiftSettingUpdate(BaseModel):
    morning_start: str    # Yêu cầu "HH:MM" VD: "08:00"
    morning_end: str      # VD: "19:00"
    evening_start: str    # VD: "20:00"
    evening_end: str      # VD: "07:00"

class ShiftSettingResponse(ShiftSettingUpdate):
    id: int
    model_config = ConfigDict(from_attributes=True)