from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from datetime import datetime, timezone

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload

from core.dependencies import PermissionChecker
from database import get_db
from models import AuditLog, Medicine, MedicineCategory, User
from schemas import (
    MedicineCategoryCreate,
    MedicineCategoryResponse,
    MedicineCreate,
    MedicineResponse,
    MedicineStatusUpdate,
    MedicineUpdate,
    RoleType,
)

router = APIRouter(prefix="/api/medicines", tags=["[Y tế] Danh mục thuốc"])
category_router = APIRouter(prefix="/api/medicine-categories", tags=["[Y tế] Nhóm thuốc"])

require_medicine_view = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator,
])
require_medicine_create = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator,
])
require_medicine_manage = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor,
])

def _audit(db: Session, request: Request, actor: User, action: str, medicine: Medicine) -> None:
    db.add(AuditLog(
        actor_id=actor.id,
        action=action,
        target_id=f"medicine:{medicine.id}",
        ip_address=request.client.host if request.client else "unknown",
        payload=f"Tên thuốc: {medicine.name}; trạng thái: {medicine.status}",
    ))


def _normalise(value: Optional[str]) -> Optional[str]:
    return value.strip() if value and value.strip() else None


def _require_category(db: Session, category_id: Optional[int]) -> None:
    if category_id is not None and not db.query(MedicineCategory.id).filter(
        MedicineCategory.id == category_id,
        MedicineCategory.status == "active",
    ).first():
        raise HTTPException(status_code=422, detail="Nhóm thuốc không tồn tại hoặc đã ngừng dùng.")


def _find_duplicate(db: Session, payload: MedicineCreate, excluded_id: Optional[int] = None) -> Optional[Medicine]:
    query = db.query(Medicine).filter(
        func.lower(Medicine.name) == payload.name.strip().lower(),
        func.coalesce(func.lower(Medicine.strength), "") == (payload.strength or "").strip().lower(),
        func.coalesce(func.lower(Medicine.dosage_form), "") == (payload.dosage_form or "").strip().lower(),
    )
    if excluded_id is not None:
        query = query.filter(Medicine.id != excluded_id)
    return query.first()


@router.get("", response_model=List[MedicineResponse])
def list_medicines(
    search: Optional[str] = Query(None, max_length=100),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_view),
):
    query = db.query(Medicine).options(joinedload(Medicine.category))
    if not include_inactive:
        query = query.filter(Medicine.status == "active")
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(or_(
            Medicine.name.ilike(pattern),
            Medicine.generic_name.ilike(pattern),
            Medicine.strength.ilike(pattern),
        ))
    return query.order_by(Medicine.name, Medicine.strength).limit(100).all()


@router.get("/suggestions", response_model=List[MedicineResponse])
def medicine_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    category_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_view),
):
    """Fast autocomplete endpoint used by the prescription form."""
    keyword = q.strip()
    pattern = f"%{keyword}%"
    query = (
        db.query(Medicine)
        .options(joinedload(Medicine.category))
        .filter(Medicine.status == "active")
        .filter(or_(
            Medicine.name.ilike(pattern),
            Medicine.generic_name.ilike(pattern),
            Medicine.strength.ilike(pattern),
        ))
    )
    if category_id is not None:
        query = query.filter(Medicine.category_id == category_id)
    return query.order_by(
        case((func.lower(Medicine.name) == keyword.lower(), 0), else_=1),
        Medicine.name,
        Medicine.strength,
    ).limit(12).all()


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    payload: MedicineCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_create),
):
    _require_category(db, payload.category_id)
    if _find_duplicate(db, payload):
        raise HTTPException(status_code=409, detail="Thuốc cùng tên, hàm lượng và dạng bào chế đã tồn tại.")

    medicine = Medicine(
        name=payload.name.strip(),
        generic_name=_normalise(payload.generic_name),
        strength=_normalise(payload.strength),
        unit=payload.unit.strip(),
        dosage_form=_normalise(payload.dosage_form),
        category_id=payload.category_id,
        route=_normalise(payload.route),
        is_high_alert=payload.is_high_alert,
        storage_note=_normalise(payload.storage_note),
        note=_normalise(payload.note),
        status="pending_review" if current_user.role == RoleType.Coordinator else "active",
        created_by=current_user.id,
        approved_by=None if current_user.role == RoleType.Coordinator else current_user.id,
        approved_at=None if current_user.role == RoleType.Coordinator else datetime.now(timezone.utc),
    )
    db.add(medicine)
    db.flush()
    _audit(db, request, current_user, "CREATE_MEDICINE", medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


@router.put("/{medicine_id}", response_model=MedicineResponse)
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_manage),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if medicine is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thuốc.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(medicine, field, _normalise(value) if isinstance(value, str) else value)

    _require_category(db, medicine.category_id)

    duplicate_payload = MedicineCreate(
        name=medicine.name,
        generic_name=medicine.generic_name,
        strength=medicine.strength,
        unit=medicine.unit,
        dosage_form=medicine.dosage_form,
        note=medicine.note,
    )
    if _find_duplicate(db, duplicate_payload, excluded_id=medicine.id):
        raise HTTPException(status_code=409, detail="Thuốc cùng tên, hàm lượng và dạng bào chế đã tồn tại.")

    _audit(db, request, current_user, "UPDATE_MEDICINE", medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


@router.put("/{medicine_id}/status", response_model=MedicineResponse)
def update_medicine_status(
    medicine_id: int,
    payload: MedicineStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_manage),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if medicine is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy thuốc.")
    medicine.status = payload.status
    if payload.status == "active":
        medicine.approved_by = current_user.id
        medicine.approved_at = datetime.now(timezone.utc)
    _audit(db, request, current_user, "UPDATE_MEDICINE_STATUS", medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


@category_router.get("", response_model=List[MedicineCategoryResponse])
def list_medicine_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_view),
):
    return db.query(MedicineCategory).filter(MedicineCategory.status == "active").order_by(MedicineCategory.name).all()


@category_router.post("", response_model=MedicineCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_medicine_category(
    payload: MedicineCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medicine_manage),
):
    name = payload.name.strip()
    if db.query(MedicineCategory).filter(func.lower(MedicineCategory.name) == name.lower()).first():
        raise HTTPException(status_code=409, detail="Nhóm thuốc đã tồn tại.")
    category = MedicineCategory(name=name, description=_normalise(payload.description), status="active")
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
