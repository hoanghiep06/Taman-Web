from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from sqlalchemy import func
from models import Room, Zone, Facility, User
from schemas import RoomCreate, RoomResponse, RoleType
from core.dependencies import require_management

router = APIRouter(prefix="/api/admin/rooms", tags=["[Admin/Manager] Quản lý Phòng & Phân Khu"])

# 1. Get All: Lấy toàn bộ danh sách toàn bộ phòng
@router.get("", response_model=List[RoomResponse])
def get_all_rooms(
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở"),
    zone_id: Optional[int] = Query(None, description="Lọc theo Phân khu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    query = db.query(Room).options(
        joinedload(Room.zone).joinedload(Zone.facility)
    )

    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.join(Zone).filter(Zone.facility_id == target_facility_id)

    if zone_id is not None:
        if target_facility_id is None:
            query = query.join(Zone)
        query = query.filter(Room.zone_id == zone_id)

    rooms = query.order_by(Room.room_number).all()

    return [
        RoomResponse(
            id=r.id,
            zone_id=r.zone_id,
            room_number=r.room_number,
            description=r.description,
            zone_name=r.zone.name if r.zone else "Chưa xếp khu",
            facility_id=r.zone.facility.id if (r.zone and r.zone.facility) else None,
            facility_name=r.zone.facility.name if (r.zone and r.zone.facility) else "Chưa xếp cơ sở",
            created_at=r.created_at
        )
        for r in rooms
    ]


# =========================================================================
# 2. CREATE: TẠO PHÒNG MỚI (CHỈ CHẶN TRÙNG TRONG CÙNG PHÂN KHU)
# =========================================================================
@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    zone = db.query(Zone).options(joinedload(Zone.facility)).filter(Zone.id == payload.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Không tìm thấy Phân khu với ID = {payload.zone_id}"
        )
    
    if current_user.facility_id is not None and zone.facility_id != current_user.facility_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tạo phòng tại Phân khu thuộc Cơ sở khác!"
        )

    clean_room_number = payload.room_number.strip()
    
    # 🌟 CHỈ KIỂM TRA TRÙNG TRONG CÙNG 1 PHÂN KHU (ZONE_ID)
    existing_room = db.query(Room).filter(
        Room.zone_id == payload.zone_id,
        func.lower(Room.room_number) == clean_room_number.lower()
    ).first()
    
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng '{clean_room_number}' đã tồn tại trong {zone.name}. Vui lòng đặt tên phòng khác!"
        )

    new_room = Room(
        zone_id=payload.zone_id,
        room_number=clean_room_number,
        description=payload.description
    )

    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    facility_obj = zone.facility
    return RoomResponse(
        id=new_room.id,
        zone_id=new_room.zone_id,
        room_number=new_room.room_number,
        description=new_room.description,
        zone_name=zone.name,
        facility_id=facility_obj.id if facility_obj else None,
        facility_name=facility_obj.name if facility_obj else None,
        created_at=new_room.created_at
    )


# =========================================================================
# 3. UPDATE: SỬA THÔNG TIN PHÒNG
# =========================================================================
@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int, 
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    room = db.query(Room).options(joinedload(Room.zone).joinedload(Zone.facility)).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy phòng để cập nhật!"
        )

    if current_user.facility_id is not None:
        if not room.zone or room.zone.facility_id != current_user.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Bạn không có quyền chỉnh sửa phòng thuộc Cơ sở khác!"
            )

    target_zone = db.query(Zone).options(joinedload(Zone.facility)).filter(Zone.id == payload.zone_id).first()
    if not target_zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Phân khu mới chọn không tồn tại!"
        )

    if current_user.facility_id is not None and target_zone.facility_id != current_user.facility_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Không thể chuyển phòng sang Phân khu thuộc Cơ sở khác!"
        )

    clean_room_number = payload.room_number.strip()
    
    # 🌟 CHỈ KIỂM TRA TRÙNG VỚI CÁC PHÒNG KHÁC TRONG CÙNG PHÂN KHU ĐÍCH
    existing_conflict = db.query(Room).filter(
        Room.zone_id == payload.zone_id,
        func.lower(Room.room_number) == clean_room_number.lower(),
        Room.id != room_id
    ).first()

    if existing_conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số phòng '{clean_room_number}' đã tồn tại trong {target_zone.name}!"
        )

    room.zone_id = payload.zone_id
    room.room_number = clean_room_number
    room.description = payload.description.strip() if payload.description else None

    db.commit()
    db.refresh(room)

    facility_obj = target_zone.facility
    return RoomResponse(
        id=room.id,
        zone_id=room.zone_id,
        room_number=room.room_number,
        description=room.description,
        zone_name=target_zone.name,
        facility_id=facility_obj.id if facility_obj else None,
        facility_name=facility_obj.name if facility_obj else None,
        created_at=room.created_at
    )

# 3. GET BY ID: Xem thông tin 1 phòng cụ thể
@router.get("/{room_id}", response_model=RoomResponse)
def get_room_by_id(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    room = db.query(Room).options(
        joinedload(Room.zone).joinedload(Zone.facility)
    ).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phòng này trên hệ thống"
        )

    if current_user.facility_id is not None:
        if not room.zone or room.zone.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phòng thuộc Cơ sở khác!")

    zone_obj = room.zone

    facility_obj = zone_obj.facility if zone_obj else None

    return RoomResponse(
        id=room.id,
        zone_id=room.zone_id,
        room_number=room.room_number,
        description=room.description,
        zone_name=zone_obj.name if zone_obj else None,
        facility_id=facility_obj.id if facility_obj else None,
        facility_name=facility_obj.name if facility_obj else None,
        created_at=room.created_at
    )
