from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Room, Zone, Facility, User
from schemas import RoomCreate, RoomResponse, RoleType
from core.dependencies import require_management

router = APIRouter(prefix="/api/admin/rooms", tags=["[Admin/Manager] Quản lý Phòng & Phân Khu"])

# 1. Get All: Lấy toàn bộ danh sách toàn bộ phòng
@router.get("", response_model=List[RoomResponse])
def get_all_rooms(
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở"),
    zone_id: Optional[int] = Query(None, description="Lọc theo Phân khu (Khu A, Khu B...)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    query = db.query(Room).options(
        joinedload(Room.zone).joinedload(Zone.facility)
    )

    # 1. Phân quyền đa cơ sở
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.join(Zone).filter(Zone.facility_id == target_facility_id)

    # 2. Lọc theo Phân khu (nếu có)
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

# 2. Create: Tạo phòng chăm sóc
@router.post(
    "", 
    response_model=RoomResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Tạo phòng chăm sóc mới",
    description="""
    **Quy trình tạo phòng:**
    1. Nhận `zone_id` từ Frontend -> Tự động xác định Phân khu và Cơ sở liên kết.
    2. Kiểm tra phân quyền: Manager cơ sở X không được tạo phòng tại Phân khu thuộc Cơ sở Y[cite: 24].
    3. Kiểm tra trùng lặp `room_number` trên toàn hệ thống (chống lỗi Database UniqueViolation).
    4. Trả về đầy đủ: `id`, `room_number`, `zone_id`, `zone_name`, `facility_id`, `facility_name`[cite: 21, 24].
    """
)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    # 1. Kiểm tra Phân khu (zone_id) có tồn tại không
    zone = db.query(Zone).options(joinedload(Zone.facility)).filter(Zone.id == payload.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Không tìm thấy Phân khu với ID = {payload.zone_id}"
        )
    
    # 2. Phân quyền: Manager cơ sở nào chỉ được tạo phòng tại Cơ sở đó[cite: 24]
    if current_user.facility_id is not None and zone.facility_id != current_user.facility_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tạo phòng tại Phân khu thuộc Cơ sở khác!"
        )

    # 3. Chuẩn hóa mã phòng và kiểm tra trùng lặp toàn bảng (do room_number có unique=True)[cite: 22]
    clean_room_number = payload.room_number.strip()
    
    existing_room = db.query(Room).options(joinedload(Room.zone)).filter(
        func.lower(Room.room_number) == clean_room_number.lower()
    ).first()
    
    if existing_room:
        current_zone_name = existing_room.zone.name if existing_room.zone else "Khu khác"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã phòng '{clean_room_number}' đã tồn tại trên hệ thống (đang thuộc {current_zone_name}). Vui lòng đặt mã khác (VD: B13, A2)!"
        )

    # 4. Thêm phòng mới vào Database[cite: 24]
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


# 4. Update: Chỉnh sửa số phòng, mô tả phòng
@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int, 
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    room = db.query(Room).options(joinedload(Room.zone)).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng để cập nhật")

    if current_user.facility_id is not None:
        if not room.zone or room.zone.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền sửa phòng thuộc Cơ sở khác!")

    # 2. Kiểm tra Phân khu mới chọn
    target_zone = db.query(Zone).options(joinedload(Zone.facility)).filter(Zone.id == payload.zone_id).first()
    if not target_zone:
        raise HTTPException(status_code=404, detail="Phân khu mới chọn không tồn tại")

    # 3. Kiểm tra nếu Manager chuyển phòng sang Phân khu thuộc Cơ sở khác mà mình không quản lý
    if current_user.facility_id is not None and target_zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Không thể chuyển phòng sang Phân khu thuộc Cơ sở khác!")
    
    
    # 4. Kiểm tra trùng số phòng
    if room.room_number != payload.room_number or room.zone_id != payload.zone_id:
        existing = db.query(Room).filter(
            Room.zone_id == payload.zone_id,
            Room.room_number == payload.room_number,
            Room.id != room_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Số phòng '{payload.room_number}' đã bị trùng trong {target_zone.name}")
        
    room.zone_id = payload.zone_id
    room.room_number = payload.room_number
    room.description = payload.description

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


# 5. DELETE: Xóa phòng khỏi hệ thống
@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(
    room_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    room = db.query(Room).options(joinedload(Room.zone)).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng để xóa")

    # Kiểm tra xem Manager có quyền xóa phòng ở Cơ sở này không
    if current_user.facility_id is not None:
        if not room.zone or room.zone.facility_id != current_user.facility_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa phòng thuộc Cơ sở khác!")

    db.delete(room)
    db.commit()
    return {"message": f"Đã xóa thành công phòng '{room.room_number}'"}