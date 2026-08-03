from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Elder, ElderHealthProfile, Room, Zone, Asset, User
from schemas import (
    ElderCreate, ElderResponse, 
    ElderHealthProfileUpdate, ElderHealthProfileResponse, 
    RoleType
)
from core.dependencies import require_care_team, require_medical_team

router = APIRouter(prefix="/api/admin/elders", tags=["[Admin/Manager/Y tế] Quản lý Người Cao Tuổi & Hồ Sơ Sức Khỏe"])


# =========================================================================
# 1. READ: LẤY DANH SÁCH CỤ (PHÂN QUYỀN CƠ SỞ & LỌC THEO PHÒNG/KHU)
# =========================================================================

@router.get("", response_model=List[ElderResponse])
def get_all_elders(
    room_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    facility_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    """
    Lấy danh sách Cụ già:
    - NVCS/Manager Cơ sở X: Tự động lọc các Cụ thuộc Cơ sở X.
    - Manager Vùng/Admin (facility_id is None): Có thể xem tất cả hoặc lọc theo facility_id.
    - Hỗ trợ lọc nhanh theo Room hoặc Zone.
    """
    query = db.query(Elder).options(
        joinedload(Elder.room).joinedload(Room.zone).joinedload(Zone.facility)
    )

    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id

    if target_facility_id is not None:
        query = query.join(Room).join(Zone).filter(Zone.facility_id == target_facility_id)

    if zone_id:
        if target_facility_id is None:
            query = query.join(Room)
        query = query.filter(Room.zone_id == zone_id)

    if room_id:
        query = query.filter(Elder.room_id == room_id)

    return query.order_by(Elder.full_name).all()


# =========================================================================
# 2. CREATE: TIẾP NHẬN CỤ MỚI (MVP2 AUTO-GENERATE HỒ SƠ SỨC KHỎE TRỐNG)
# =========================================================================
@router.post("", response_model=ElderResponse, status_code=status.HTTP_201_CREATED)
def create_elder(
    elder_in: ElderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    """
    Tiếp nhận Cụ mới vào viện:
    - Kiểm tra Phòng tiếp nhận có thuộc Cơ sở mà Manager quản lý không.
    - Tự động khởi tạo 1 bản ghi ElderHealthProfile (Hồ sơ sức khỏe trống) sẵn sàng cho Bác sĩ/NVCS nhập liệu.
    """
    if elder_in.room_id:
        room = db.query(Room).options(joinedload(Room.zone)).filter(Room.id == elder_in.room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Phòng được chọn không tồn tại!")

        if current_user.facility_id is not None and room.zone.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xếp Cụ vào phòng thuộc Cơ sở khác!")

    new_elder = Elder(**elder_in.model_dump())
    db.add(new_elder)
    db.commit()
    db.refresh(new_elder)

    # Khởi tạo hồ sơ sức khỏe ban đầu
    health_profile = ElderHealthProfile(
        elder_id=new_elder.id,
        has_surgery=False,
        has_fall=False,
        has_stroke=False,
        has_cardiovascular=False,
        drug_allergies=[],
        food_allergies=[],
        chronic_diseases=[]
    )
    db.add(health_profile)
    db.commit()

    return new_elder


# =========================================================================
# 3. READ DETAIL: XEM THÔNG TIN CHI TIẾT 1 CỤ
# =========================================================================
@router.get("/{elder_id}", response_model=ElderResponse)
def get_elder_by_id(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    """Xem thông tin định danh & phòng ở của Cụ"""
    elder = db.query(Elder).options(
        joinedload(Elder.room).joinedload(Room.zone)
    ).filter(Elder.id == elder_id).first()

    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin Cụ")

    # Kiểm tra quyền Cơ sở
    if current_user.facility_id is not None and elder.room and elder.room.zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem thông tin Cụ thuộc Cơ sở khác!")

    return elder


# =========================================================================
# 4. UPDATE: CẬP NHẬT THÔNG TIN CỤ & TỰ ĐỘNG DI DỜI TƯ TRANG (MVP1 & MVP2)
# =========================================================================
@router.put("/{elder_id}", response_model=ElderResponse)
def update_elder(
    elder_id: int,
    elder_data: ElderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):

    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin Cụ")

    # Kiểm tra quyền ở phòng cũ
    if current_user.facility_id is not None and elder.room and elder.room.zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa thông tin Cụ thuộc Cơ sở khác!")

    old_room_id = elder.room_id

    # Kiểm tra phòng mới nếu có đổi phòng
    if elder_data.room_id and elder_data.room_id != old_room_id:
        new_room = db.query(Room).options(joinedload(Room.zone)).filter(Room.id == elder_data.room_id).first()
        if not new_room:
            raise HTTPException(status_code=404, detail="Phòng mới chọn không tồn tại!")
        
        if current_user.facility_id is not None and new_room.zone.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Không thể chuyển Cụ sang phòng thuộc Cơ sở khác!")

    for field, value in elder_data.model_dump(exclude_unset=True).items():
        setattr(elder, field, value)

    # ──── 💥 MVP1 VÁ LỖI TỰ ĐỘNG: DI DỜI TẤT CẢ TƯ TRANG CỦA CỤ SANG PHÒNG MỚI ────
    if elder.room_id != old_room_id:
        db.query(Asset).filter(Asset.elder_id == elder.id).update(
            {"room_id": elder.room_id},
            synchronize_session=False
        )

    db.commit()
    db.refresh(elder)
    return elder

# =========================================================================
# 5. DELETE: XÓA HỒ SƠ CỤ (XÓA CASCADE HỒ SƠ Y TẾ & CHUYỂN TƯ TRANG VỀ TÀI SẢN CHUNG)
# =========================================================================

@router.delete("/{elder_id}", status_code=status.HTTP_200_OK)
def delete_elder(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    """Xóa hồ sơ Cụ khỏi hệ thống"""
    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin Cụ")

    if current_user.facility_id is not None and elder.room and elder.room.zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa Cụ thuộc Cơ sở khác!")

    # Chuyển các tài sản gắn với Cụ này thành tài sản chung của phòng (elder_id = NULL)
    db.query(Asset).filter(Asset.elder_id == elder.id).update(
        {"elder_id": None},
        synchronize_session=False
    )

    db.delete(elder)
    db.commit()
    return {"message": f"Đã xóa thành công hồ sơ Cụ '{elder.full_name}'"}


# =========================================================================
# 6. HỒ SƠ SỨC KHỎE CHUYÊN SÂU (MVP2: TIỀN SỬ BỆNH & GHI CHÚ BÁC SĨ)
# =========================================================================
@router.get("/{elder_id}/health-profile", response_model=ElderHealthProfileResponse)
def get_elder_health_profile(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medical_team)
):
    """
    Dành cho Bác sĩ / Điều phối / NVCS:
    - Xem chi tiết Bệnh nền, Tiền sử phẫu thuật, Té ngã, Đột quỵ, Tim mạch, Dị ứng thuốc & Thực phẩm.
    """

    profile = db.query(ElderHealthProfile).filter(ElderHealthProfile.elder_id == elder_id).first()
    if not profile:
        elder = db.query(Elder).filter(Elder.id == elder_id).first()
        if not elder:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin Cụ")

        profile = ElderHealthProfile(elder_id=elder_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile

@router.put("/{elder_id}/health-profile", response_model=ElderHealthProfileResponse)
def update_elder_health_profile(
    elder_id: int,
    profile_in: ElderHealthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medical_team)
):
    profile = db.query(ElderHealthProfile).filter(ElderHealthProfile.elder_id == elder_id).first()
    if not profile:
        profile = ElderHealthProfile(elder_id=elder_id)
        db.add(profile)

    # Đảm bảo tính nhất quán dữ liệu cho các câu hỏi Yes/No
    data_dict = profile_in.model_dump()
    
    if not data_dict.get("has_surgery"):
        data_dict["surgery_describe"] = None
    if not data_dict.get("has_fall"):
        data_dict["fall_describe"] = None
    if not data_dict.get("has_stroke"):
        data_dict["stroke_describe"] = None
    if not data_dict.get("has_cardiovascular"):
        data_dict["cardiovascular_describe"] = None

    for key, value in data_dict.items():
        setattr(profile, key, value)

    try:
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Cập nhật hồ sơ sức khỏe thất bại do vi phạm ràng buộc dữ liệu: {str(e)}"
        )

    return profile


    