from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from core.dependencies import PermissionChecker
from core.elder_access import get_accessible_elder
from database import get_db
from models import AuditLog, Medicine, MedicineCategory, Prescription, PrescriptionItem, PrescriptionLog, User
from schemas import PrescriptionCreate, PrescriptionDetailResponse, RoleType

router = APIRouter(prefix="/api/prescriptions", tags=["[Y tế] Toa thuốc"])

require_prescription_view = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator,
])
require_prescription_write = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator,
])
require_prescription_approve = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor,
])


def _audit(db: Session, request: Request, actor: User, action: str, prescription: Prescription) -> None:
    db.add(AuditLog(
        actor_id=actor.id,
        action=action,
        target_id=f"prescription:{prescription.id}",
        ip_address=request.client.host if request.client else "unknown",
        payload=f"NCT ID: {prescription.elder_id}; trạng thái: {prescription.status}",
    ))


def _create_inline_medicine(db: Session, current_user: User, medicine_input) -> Medicine:
    if medicine_input.category_id is not None and not db.query(MedicineCategory.id).filter(
        MedicineCategory.id == medicine_input.category_id,
        MedicineCategory.status == "active",
    ).first():
        raise HTTPException(status_code=422, detail="Nhóm thuốc của thuốc mới không hợp lệ.")

    existing = db.query(Medicine).filter(
        Medicine.name.ilike(medicine_input.name.strip()),
        Medicine.strength.ilike((medicine_input.strength or "").strip()),
        Medicine.dosage_form.ilike((medicine_input.dosage_form or "").strip()),
    ).first()
    if existing:
        return existing

    medicine = Medicine(
        name=medicine_input.name.strip(),
        generic_name=medicine_input.generic_name.strip() if medicine_input.generic_name else None,
        strength=medicine_input.strength.strip() if medicine_input.strength else None,
        unit=medicine_input.unit.strip(),
        dosage_form=medicine_input.dosage_form.strip() if medicine_input.dosage_form else None,
        category_id=medicine_input.category_id,
        route=medicine_input.route.strip() if medicine_input.route else None,
        is_high_alert=medicine_input.is_high_alert,
        storage_note=medicine_input.storage_note.strip() if medicine_input.storage_note else None,
        note=medicine_input.note.strip() if medicine_input.note else None,
        status="pending_review" if current_user.role == RoleType.Coordinator else "active",
        created_by=current_user.id,
        approved_by=None if current_user.role == RoleType.Coordinator else current_user.id,
        approved_at=None if current_user.role == RoleType.Coordinator else datetime.now(timezone.utc),
    )
    db.add(medicine)
    db.flush()
    return medicine


def _load_accessible_prescription(
    db: Session,
    current_user: User,
    prescription_id: int,
) -> Prescription:
    prescription = (
        db.query(Prescription)
        .options(joinedload(Prescription.items))
        .filter(Prescription.id == prescription_id)
        .first()
    )
    if prescription is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy toa thuốc.")
    get_accessible_elder(db, current_user, prescription.elder_id)
    return prescription


@router.get("", response_model=List[PrescriptionDetailResponse])
def list_prescriptions(
    elder_id: int = Query(..., ge=1),
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_prescription_view),
):
    get_accessible_elder(db, current_user, elder_id)
    query = (
        db.query(Prescription)
        .options(joinedload(Prescription.items))
        .filter(Prescription.elder_id == elder_id)
    )
    if active_only:
        query = query.filter(Prescription.status == "active")
    return query.order_by(Prescription.start_date.desc(), Prescription.id.desc()).all()


@router.get("/{prescription_id}", response_model=PrescriptionDetailResponse)
def get_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_prescription_view),
):
    return _load_accessible_prescription(db, current_user, prescription_id)


@router.post("", response_model=PrescriptionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_prescription(
    payload: PrescriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_prescription_write),
):
    get_accessible_elder(db, current_user, payload.elder_id)
    if payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="Ngày kết thúc không thể trước ngày bắt đầu.")
    if payload.follow_up_date and payload.follow_up_date < payload.start_date:
        raise HTTPException(status_code=422, detail="Ngày tái khám không thể trước ngày bắt đầu.")

    medicine_ids = {item.medicine_id for item in payload.items if item.medicine_id is not None}
    medicines = {}
    if medicine_ids:
        medicines = {medicine.id: medicine for medicine in db.query(Medicine).filter(Medicine.id.in_(medicine_ids)).all()}
        missing_ids = medicine_ids - medicines.keys()
        if missing_ids:
            raise HTTPException(status_code=422, detail="Có thuốc không tồn tại trong danh mục.")

    prescription = Prescription(
        elder_id=payload.elder_id,
        image_url=payload.image_url,
        start_date=payload.start_date,
        end_date=payload.end_date,
        follow_up_date=payload.follow_up_date,
        diagnosis=payload.diagnosis,
        note=payload.note,
        prescribed_by=payload.prescribed_by or current_user.full_name,
        prescribed_by_user_id=current_user.id,
        status="draft" if current_user.role == RoleType.Coordinator else "active",
        is_active=current_user.role != RoleType.Coordinator,
    )
    db.add(prescription)
    db.flush()

    for item in payload.items:
        medicine = medicines.get(item.medicine_id)
        if item.new_medicine is not None:
            medicine = _create_inline_medicine(db, current_user, item.new_medicine)
        if medicine is None:
            raise HTTPException(status_code=422, detail="Thiếu thông tin thuốc trong dòng toa.")

        # Only a clinical approver can promote a pending catalogue entry.
        if medicine.status == "pending_review" and current_user.role != RoleType.Coordinator:
            medicine.status = "active"
            medicine.approved_by = current_user.id
            medicine.approved_at = datetime.now(timezone.utc)

        prescription.items.append(PrescriptionItem(
            medicine_id=medicine.id,
            medicine_name=medicine.name,
            medicine_strength=medicine.strength,
            unit=medicine.unit,
            total_quantity=item.total_quantity,
            morning_dose=item.morning_dose,
            noon_dose=item.noon_dose,
            evening_dose=item.evening_dose,
            night_dose=item.night_dose,
            route=item.route,
            instructions=item.instructions,
            prn_condition=item.prn_condition,
        ))

    db.add(PrescriptionLog(
        prescription_id=prescription.id,
        changed_by=current_user.id,
        change_type="CREATE",
        change_notes="Tạo toa thuốc mới.",
    ))
    _audit(db, request, current_user, "CREATE_PRESCRIPTION", prescription)
    db.commit()
    return _load_accessible_prescription(db, current_user, prescription.id)


@router.put("/{prescription_id}/status", response_model=PrescriptionDetailResponse)
def update_prescription_status(
    prescription_id: int,
    request: Request,
    new_status: str = Query(..., pattern="^(active|stopped|completed|superseded)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_prescription_approve),
):
    prescription = _load_accessible_prescription(db, current_user, prescription_id)
    prescription.status = new_status
    prescription.is_active = new_status == "active"
    if new_status == "active":
        pending_medicines = db.query(Medicine).join(
            PrescriptionItem, PrescriptionItem.medicine_id == Medicine.id
        ).filter(
            PrescriptionItem.prescription_id == prescription.id,
            Medicine.status == "pending_review",
        ).all()
        for medicine in pending_medicines:
            medicine.status = "active"
            medicine.approved_by = current_user.id
            medicine.approved_at = datetime.now(timezone.utc)
    db.add(PrescriptionLog(
        prescription_id=prescription.id,
        changed_by=current_user.id,
        change_type="STATUS_CHANGE",
        change_notes=f"Chuyển trạng thái toa sang {new_status}.",
    ))
    _audit(db, request, current_user, "UPDATE_PRESCRIPTION_STATUS", prescription)
    db.commit()
    return _load_accessible_prescription(db, current_user, prescription.id)
