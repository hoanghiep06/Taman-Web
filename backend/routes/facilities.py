from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Facility, Zone, Room, Elder, Asset, User
from schemas import (
    FacilityCreate, FacilityResponse, 
    ZoneCreate, ZoneResponse, 
    RoleType
)
from core.dependencies import require_management, require_medical_team

router = APIRouter(prefix="/api/admin/facilities", tags=["[Admin/Manager] Quản lý Cơ Sở & Phân Khu"])


# =========================================================================
# 1. QUẢN LÝ CƠ SỞ (FACILITIES)
# =========================================================================
@router.get("", response_model=List[FacilityResponse])
def get_all_facilities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medical_team)
):
    """
    Lấy danh sách các Cơ sở:
    - Admin / Manager Vùng (facility_id is None): Thấy toàn bộ danh sách các Cơ sở.
    - Manager Cơ sở (facility_id = X): Chỉ thấy Cơ sở mình đang phụ trách.
    - Trả về kèm thống kê: Số Phân khu, Số Phòng, và Số Cụ đang lưu trú.
    """
    query = db.query(Facility)
    if current_user.facility_id is not None:
        query = query.filter(Facility.id == current_user.facility_id)

    facilities = query.order_by(Facility.name).all()

    results = []
    for f in facilities:
        # Thống kê số lượng Phân khu, Phòng, NCT trong cơ sở
        total_zones = db.query(Zone).filter(Zone.facility_id == f.id).count()
        
        zone_ids = [z.id for z in db.query(Zone.id).filter(Zone.facility_id == f.id).all()]
        total_rooms = db.query(Room).filter(Room.zone_id.in_(zone_ids)).count() if zone_ids else 0
        
        room_ids = [r.id for r in db.query(Room.id).filter(Room.zone_id.in_(zone_ids)).all()] if zone_ids else []
        total_elders = db.query(Elder).filter(Elder.room_id.in_(room_ids)).count() if room_ids else 0

        results.append(
            FacilityResponse(
                id=f.id,
                name=f.name,
                address=f.address,
                total_zones=total_zones,
                total_rooms=total_rooms,
                total_elders=total_elders,
                created_at=f.created_at
            )
        )

    return results

@router.post("", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
def create_facility(
    payload: FacilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Tạo mới một Cơ sở (Chỉ Admin hoặc Manager Vùng)"""
    if current_user.facility_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tạo thêm Cơ sở mới!"
        )

    existing = db.query(Facility).filter(Facility.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Cơ sở '{payload.name}' đã tồn tại!")

    new_facility = Facility(
        name=payload.name,
        address=payload.address
    )
    db.add(new_facility)
    db.commit()
    db.refresh(new_facility)

    # Tự động tạo 'Khu A' mặc định cho Cơ sở mới
    default_zone = Zone(facility_id=new_facility.id, name="Khu A", description="Khu mặc định ban đầu")
    db.add(default_zone)
    db.commit()

    return FacilityResponse(
        id=new_facility.id,
        name=new_facility.name,
        address=new_facility.address,
        total_zones=1,
        total_rooms=0,
        total_elders=0,
        created_at=new_facility.created_at
    )


@router.put("/{facility_id}", response_model=FacilityResponse)
def update_facility(
    facility_id: int,
    payload: FacilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Cập nhật tên hoặc địa chỉ Cơ sở"""
    if current_user.facility_id is not None and current_user.facility_id != facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa thông tin Cơ sở khác!")

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Không tìm thấy Cơ sở này")

    if facility.name != payload.name:
        existing = db.query(Facility).filter(Facility.name == payload.name, Facility.id != facility_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Tên cơ sở '{payload.name}' đã bị trùng")

    facility.name = payload.name
    facility.address = payload.address
    db.commit()
    db.refresh(facility)

    return FacilityResponse(
        id=facility.id,
        name=facility.name,
        address=facility.address,
        created_at=facility.created_at
    )


@router.delete("/{facility_id}", status_code=status.HTTP_200_OK)
def delete_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Xóa Cơ sở (Chỉ dành cho Admin)"""
    if current_user.role != RoleType.Admin:
        raise HTTPException(status_code=403, detail="Chỉ Admin tối cao mới có quyền xóa toàn bộ Cơ sở!")

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Không tìm thấy Cơ sở")

    db.delete(facility)
    db.commit()
    return {"message": f"Đã xóa thành công Cơ sở '{facility.name}' và toàn bộ Phân khu liên quan"}


# =========================================================================
# 2. QUẢN LÝ PHÂN KHU (ZONES - KHU A, KHU B, KHU C...)
# =========================================================================

@router.get("/zones", response_model=List[ZoneResponse])
def get_zones_by_facility(
    facility_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """
    Lấy danh sách các Phân khu (Khu A, Khu B...):
    - Trả về danh sách kèm số Phòng, số Cụ, và Tổng số tư trang CẦN KIỂM TRÀ (`requires_inspection == True`).
    """
    query = db.query(Zone).options(joinedload(Zone.facility))
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id


    if target_facility_id is not None:
        query = query.filter(Zone.facility_id == target_facility_id)

    zones = query.order_by(Zone.facility_id, Zone.name).all()

    results = []
    for z in zones:
        rooms = db.query(Room).filter(Room.zone_id == z.id).all()
        room_ids = [r.id for r in rooms]

        total_rooms = len(rooms)
        total_elders = db.query(Elder).filter(Elder.room_id.in_(room_ids)).count() if room_ids else 0

        # Đếm tổng tư trang BẮT BUỘC KIỂM TRÀ của riêng Khu này
        total_inspection_assets = db.query(Asset).filter(
            Asset.room_id.in_(room_ids),
            Asset.status == "Active",
            Asset.requires_inspection == True
        ).count() if room_ids else 0

        results.append(
            ZoneResponse(
                id=z.id,
                facility_id=z.facility_id,
                facility_name=z.facility.name if z.facility else "N/A",
                name=z.name,
                description=z.description,
                total_rooms=total_rooms,
                total_elders=total_elders,
                total_inspection_assets=total_inspection_assets
            )
        )

    return results


@router.post("/zones", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Thêm Phân khu mới (VD: Tạo 'Khu C' cho Cơ sở 1)"""
    if current_user.facility_id is not None and current_user.facility_id != payload.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền tạo Phân khu tại Cơ sở khác!")

    facility = db.query(Facility).filter(Facility.id == payload.facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Cơ sở được chọn không tồn tại")

    existing = db.query(Zone).filter(
        Zone.facility_id == payload.facility_id,
        Zone.name == payload.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Tên '{payload.name}' đã tồn tại trong {facility.name}")

    new_zone = Zone(
        facility_id=payload.facility_id,
        name=payload.name,
        description=payload.description
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)

    return ZoneResponse(
        id=new_zone.id,
        facility_id=new_zone.facility_id,
        facility_name=facility.name,
        name=new_zone.name,
        description=new_zone.description,
        total_rooms=0,
        total_elders=0,
        total_inspection_assets=0
    )


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: int,
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Sửa thông tin Phân khu"""
    zone = db.query(Zone).options(joinedload(Zone.facility)).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy Phân khu")

    if current_user.facility_id is not None and zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa Phân khu của Cơ sở khác!")

    zone.name = payload.name
    zone.description = payload.description
    db.commit()
    db.refresh(zone)

    return ZoneResponse(
        id=zone.id,
        facility_id=zone.facility_id,
        facility_name=zone.facility.name if zone.facility else "N/A",
        name=zone.name,
        description=zone.description
    )


@router.delete("/zones/{zone_id}", status_code=status.HTTP_200_OK)
def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    """Xóa Phân khu (Toàn bộ Phòng thuộc Khu này sẽ bị xóa cascade)"""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Không tìm thấy Phân khu")

    if current_user.facility_id is not None and zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa Phân khu của Cơ sở khác!")

    db.delete(zone)
    db.commit()
    return {"message": f"Đã xóa thành công '{zone.name}' và toàn bộ các Phòng bên trong"}
