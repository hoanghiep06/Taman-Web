from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Room
from schemas import RoomCreate, RoomResponse
from core.dependencies import get_privileged_user, get_current_user


router = APIRouter(prefix="/admin/rooms", tags=["Admin/Manager: Quản lý phòng"])

# 1. Get All: Lấy toàn bộ danh sách toàn bộ phòng
@router.get("", response_model=List[RoomResponse])
def get_all_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Room).order_by(Room.room_number).all()


# 2. Create: Tạo phòng chăm sóc
@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
): 
    # Kiểm tra phòng đã tồn tại chưa
    existing_room = db.query(Room).filter(Room.room_number == payload.room_number).first()
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng số '{payload.room_number}' đã tồn tại trên hệ thống."
        )
    
    new_room = Room(
        room_number=payload.room_number, 
        description=payload.description
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room


# 3. GET BY ID: Xem thông tin 1 phòng cụ thể
@router.get("/{room_id}", response_model=RoomResponse)
def get_room_by_id(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phòng này trên hệ thống"
        )
    
    return room


# 4. Update: Chỉnh sửa số phòng, mô tả phòng
@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int, 
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phòng này để cập nhật"
        )
    
    # Nếu thay đổi số phòng, thì số phòng mới có bị trùng với phòng khác không
    if room.room_number != payload.room_number:
        existing_room = db.query(Room).filter(Room.room_number == payload.room_number).first()
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số phòng '{payload.room_number}' đã bị trùng, vui lòng đổi số phòng khác"
            )
        
    room.room_number = payload.room_number
    room.description = payload.description

    db.commit()
    db.refresh(room)

    return room


# 5. DELETE: Xóa phòng khỏi hệ thống
@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(
    room_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phòng này để xóa"
        )
    
    """
    Lưu ý: Khi xóa phòng, toàn bộ tài sản gắn với phòng này sẽ tự động bị xóa theo
    NCT chuyển room_id về NULL 
    """

    db.delete(room)
    db.commit()
    
    return {"message": f"Đã xóa thành công phòng {room.room_number} và các tài sản liên quan."}