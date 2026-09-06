from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from models import Elder, Room, User, Zone


def get_accessible_elder(db: Session, current_user: User, elder_id: int) -> Elder:
    """Return an elder only when the caller is entitled to their facility.

    New health APIs must use this helper instead of trusting a client supplied
    elder_id. It prevents cross-facility access while preserving global access
    for privileged users whose facility_id is NULL.
    """
    query = (
        db.query(Elder)
        .options(joinedload(Elder.room).joinedload(Room.zone))
        .filter(Elder.id == elder_id)
    )

    if current_user.facility_id is not None:
        query = query.join(Room, Elder.room_id == Room.id).join(Zone, Room.zone_id == Zone.id).filter(
            Zone.facility_id == current_user.facility_id
        )

    elder = query.first()
    if elder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy Người cao tuổi hoặc bạn không có quyền truy cập.",
        )
    return elder
