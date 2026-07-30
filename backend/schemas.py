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
    
    # Cấu hình cho Pydantic v2 để đọc dữ liệu từ SQLAlchemy Models
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# LOGIN Password
# ==========================================
class PasswordChange(BaseModel):
    old_password: str
    new_password: str

# ==========================================
# Theo dõi đăng nhập
# ==========================================
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
    model_config = ConfigDict(from_attributes=True)
    

# ==========================================
# THỰC THỂ: PHÒNG (ROOM)
# ==========================================
class RoomBase(BaseModel):
    room_number: str
    description: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# THỰC THỂ: CỤ GIÀ (ELDER)
# ==========================================
class ElderBase(BaseModel):
    full_name: str
    room_id: Optional[int] = None

class ElderCreate(ElderBase):
    pass

class ElderResponse(ElderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# THỰC THỂ: TÀI SẢN (ASSET)
# ==========================================
class AssetBase(BaseModel):
    asset_name: str
    room_id: int
    elder_id: Optional[int] = None
    status: Optional[str] = 'Active'

class AssetCreate(AssetBase):
    pass

class AssetResponse(BaseModel):
    id: int
    asset_name: str
    room_id: int
    elder_id: Optional[int] = None
    status: str
    created_at: datetime

    # Pydantic v2 configuration to read attributes from SQLAlchemy models
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

# ===================================
# Luồng báo mất
# ===================================
class AssetMissingRequest(BaseModel):
    asset_id: int
    note: str # Bắt buộc phải có chuỗi ghi chú lý do giải trình



# =====================================
# Lịch sử từng nhân viên 
# =====================================

class StaffHistoryResponse(BaseModel):
    id: int
    asset_id: int
    status: str
    note: Optional[str] = None
    created_at: datetime  # Thời điểm thực hiện hành động
    
    # Thông tin bổ sung từ bảng Shift (lấy qua quan hệ)
    shift_date: Optional[str] = None 
    shift_type: Optional[str] = None

    class Config:
        from_attributes = True

    
# ===================================
# Luồng DASHBOARD
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

# Chỉnh đổi phần ca làm
class ShiftSettingUpdate(BaseModel):
    morning_start: str    # Yêu cầu "HH:MM" VD: "04:30"
    morning_end: str
    evening_start: str
    evening_end: str


class ShiftSettingResponse(ShiftSettingUpdate):
    id: int
    model_config = ConfigDict(from_attributes=True)