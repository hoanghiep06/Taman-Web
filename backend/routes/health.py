# backend/routes/health.py
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import (
    Elder, VitalSignRecord, Prescription, PrescriptionLog, 
    TreatmentDiary, ShiftReport, User, Room, Zone, Facility, AuditLog,
    WeightRecord  
)
from schemas import (
    VitalSignCreate, VitalSignResponse, VitalSignUpdate,
    PrescriptionCreate, PrescriptionResponse, PrescriptionChangeLog,
    TreatmentDiaryCreate, TreatmentDiaryResponse,
    ElderHealthSummaryCard, ElderShiftNoteInput,
    ShiftMedicalReportCreate, ShiftMedicalReportResponse,
    RoleType, ShiftType, WeightRecordCreate, WeightRecordResponse, 
    ElderWeightDueResponse, WeightRecordUpdate, ShiftMedicalReportDetailResponse, ShiftReportAuditResponse, ShiftMedicalReportUpdate
)
from core.dependencies import PermissionChecker, get_current_user, require_care_team, require_medical_team
from core.constants import VITAL_LIMITS, max_allowed_days_for_staff, max_allowed_days_max

router = APIRouter(prefix="/api/health", tags=["[Y tế/Bác sĩ/Điều phối/NVCS] Quản lý Sức Khỏe & Ca Trực"])

# MA TRẬN PHÂN QUYỀN
require_care_vital = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor, RoleType.Coordinator, RoleType.Caregiver
])
require_coordinator_report = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Coordinator
])
require_doctor_only = PermissionChecker([
    RoleType.Admin, RoleType.Manager, RoleType.Doctor
])


# =========================================================================
# 1. ĐO & SỬA CHỈ SỐ SINH HIỆU (NVCS & ĐIỀU PHỐI CÓ QUYỀN)
# =========================================================================
@router.post("/vitals", response_model=VitalSignResponse, status_code=status.HTTP_201_CREATED)
def record_vital_signs(
    payload: VitalSignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """NVCS / Điều phối đo sinh hiệu (Bắt cờ cảnh báo tự động)"""
    elder = db.query(Elder).filter(Elder.id == payload.elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy Cụ!")

    is_abnormal = calculate_abnormal_flag(payload.spo2, payload.bp_systolic, payload.bp_diastolic, payload.temperature, payload.pulse)

    new_record = VitalSignRecord(
        elder_id=payload.elder_id,
        measured_by=current_user.id,
        shift_type=payload.shift_type.value,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        pulse=payload.pulse,
        spo2=payload.spo2,
        temperature=payload.temperature,
        notes=payload.notes,
        is_abnormal=is_abnormal
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


@router.put("/vitals/{vital_id}", response_model=VitalSignResponse)
def update_vital_signs(
    vital_id: int,
    payload: VitalSignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    SỬA LẠI CHỈ SỐ KHI NHÂN VIÊN GÕ NHẦM:
    - Cập nhật chỉ số đúng & Tính toán lại cờ bất thường `is_abnormal`.
    - Ghi vết AuditLog để đảm bảo tính minh bạch y tế (không mất vết lịch sử).
    """
    record = db.query(VitalSignRecord).filter(VitalSignRecord.id == vital_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sinh hiệu này!")

    old_values = f"BP:{record.bp_systolic}/{record.bp_diastolic}, SPO2:{record.spo2}, Temp:{record.temperature}"

    if payload.bp_systolic is not None: record.bp_systolic = payload.bp_systolic
    if payload.bp_diastolic is not None: record.bp_diastolic = payload.bp_diastolic
    if payload.pulse is not None: record.pulse = payload.pulse
    if payload.spo2 is not None: record.spo2 = payload.spo2
    if payload.temperature is not None: record.temperature = payload.temperature
    if payload.notes is not None: record.notes = payload.notes

    record.is_abnormal = calculate_abnormal_flag(record.spo2, record.bp_systolic, record.bp_diastolic, record.temperature, record.pulse)

    audit = AuditLog(
        actor_id=current_user.id,
        action="UPDATE_VITAL_SIGN",
        target_id=str(vital_id),
        ip_address="Internal",
        payload=f"Sửa sinh hiệu Cụ ID={record.elder_id}. Cũ: [{old_values}] -> Mới: [BP:{record.bp_systolic}/{record.bp_diastolic}, SPO2:{record.spo2}]"
    )
    db.add(audit)

    db.commit()
    db.refresh(record)
    return record


@router.get("/vitals/elder/{elder_id}", response_model=List[VitalSignResponse])
def get_elder_vital_history(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """Xem toàn bộ lịch sử sinh hiệu qua các ngày của 1 Cụ"""
    return db.query(VitalSignRecord)\
        .filter(VitalSignRecord.elder_id == elder_id)\
        .order_by(VitalSignRecord.measured_at.desc()).all()


@router.get("/vitals/history", response_model=List[VitalSignResponse])
def get_vital_signs_history(
    elder_id: Optional[int] = Query(None, description="ID của Cụ cụ thể (Để trống nếu muốn lấy toàn bộ các Cụ)"),
    target_date: Optional[date] = Query(None, description="Lọc chính xác theo ngày đo (YYYY-MM-DD)"),
    limit_days: Optional[int] = Query(None, ge=1, le=90, description="Lấy dữ liệu trong N ngày gần nhất (VD: 3, 7, 30 ngày)"),
    shift_type: Optional[ShiftType] = Query(None, description="Lọc theo ca trực (Sang / Toi)"),
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    TRUY VẤN LỊCH SỬ SINH HIỆU ĐA NĂNG:
    1. Lấy toàn bộ các Cụ HOẶC chỉ 1 Cụ cụ thể (`elder_id`).
    2. Lọc theo số ngày gần nhất (`limit_days`) HOẶC 1 ngày cụ thể (`target_date`).
    3. Hỗ trợ lọc theo Ca trực (`shift_type`) và Cơ sở (`facility_id`).
    4. Tự động áp ngưỡng số ngày tra cứu tối đa theo Vai trò.
    """
    query = db.query(VitalSignRecord).join(Elder, VitalSignRecord.elder_id == Elder.id)

    # 1. PHÂN QUYỀN ĐA CƠ SỞ (Multi-facility isolation)
    target_f_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_f_id is not None:
        query = query.join(Room, Elder.room_id == Room.id)\
                     .join(Zone, Room.zone_id == Zone.id)\
                     .filter(Zone.facility_id == target_f_id)

    # 2. LỌC THEO CỤ GIÀ CỤ THỂ (NẾU CÓ)
    if elder_id:
        query = query.filter(VitalSignRecord.elder_id == elder_id)

    # 3. KHÓA BẢO MẬT SỐ NGÀY THEO VAI TRÒ
    today = date.today()
    max_allowed = max_allowed_days_max
    if current_user.role in [RoleType.Caregiver, RoleType.Coordinator]:
        max_allowed = max_allowed_days_for_staff

    # Ưu tiên Lọc theo ngày cụ thể (target_date) trước
    if target_date:
        cutoff_date = today - timedelta(days=max_allowed)
        if target_date < cutoff_date:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản [{current_user.role}] chỉ được xem lịch sử trong vòng {max_allowed} ngày gần nhất!"
            )
        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())
        query = query.filter(VitalSignRecord.measured_at >= start_dt, VitalSignRecord.measured_at <= end_dt)
    else:
        # Nếu không có target_date thì mới dùng limit_days hoặc default cutoff_date
        effective_days = min(limit_days, max_allowed) if limit_days else max_allowed
        cutoff_date = today - timedelta(days=effective_days)
        query = query.filter(VitalSignRecord.measured_at >= cutoff_date)

    # 4. LỌC THEO CA TRỰC
    if shift_type:
        query = query.filter(VitalSignRecord.shift_type == shift_type.value)

    records = query.order_by(VitalSignRecord.measured_at.desc()).all()
    return records


# =========================================================================
# 2. BÁO CÁO GIAO CA ĐIỀU PHỐI (CHỈ ĐIỀU PHỐI THỰC HIỆN)
# =========================================================================
@router.post("/shift-reports", response_model=ShiftMedicalReportResponse, status_code=status.HTTP_201_CREATED)
def create_shift_medical_report(
    payload: ShiftMedicalReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_report)
):
    """
    ĐIỀU PHỐI TỔNG KẾT CA TRỰC:
    1. Chọn từng Cụ -> Gõ ghi chú diễn biến trong ca.
    2. Tự động lưu vào Nhật ký `TreatmentDiary` của Cụ đó để bật cờ chú ý cho Bác sĩ.
    3. Định dạng chuỗi văn bản giao ca hoàn chỉnh.
    """
    formatted_descriptions = []

    for idx, item in enumerate(payload.elder_events, start=1):
        elder = db.query(Elder).filter(Elder.id == item.elder_id).first()
        if not elder:
            continue

        note_text = item.note.strip()
        formatted_descriptions.append(f"{idx}. {elder.full_name}: {note_text}")

        diary = TreatmentDiary(
            elder_id=elder.id,
            event_type="Lưu ý giao ca (ĐP)",
            content=note_text,
            created_by=current_user.id
        )
        db.add(diary)

    full_text = "\n".join(formatted_descriptions)

    new_report = ShiftReport(
        facility_id=payload.facility_id,
        coordinator_id=current_user.id,
        shift_date=payload.shift_date,
        shift_type=payload.shift_type.value,
        highlighted_issues=f"Đã ghi nhận lưu ý cho {len(payload.elder_events)} Cụ.",
        elder_descriptions=full_text,
        handover_notes=payload.handover_notes
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    facility = db.query(Facility).filter(Facility.id == payload.facility_id).first()

    return ShiftMedicalReportResponse(
        id=new_report.id,
        facility_id=new_report.facility_id,
        facility_name=facility.name if facility else "N/A",
        reporter_id=current_user.id,
        reporter_name=current_user.full_name,
        shift_date=new_report.shift_date,
        shift_type=ShiftType(new_report.shift_type),
        formatted_elder_descriptions=full_text,
        handover_notes=new_report.handover_notes,
        created_at=new_report.created_at
    )


# =========================================================================
# 3. DASHBOARD CA LIVE CHO TOÀN BỘ NHÂN VIÊN
# =========================================================================
@router.get("/dashboard-live", response_model=List[ElderHealthSummaryCard])
def get_live_shift_dashboard_for_all(
    facility_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    return build_health_dashboard_cards(db, current_user, facility_id, is_doctor_view=False)


# =========================================================================
# 4. DASHBOARD Y TẾ CHUYÊN SÂU DÀNH RIÊNG CHO BÁC SĨ & MANAGER
# =========================================================================
@router.get("/dashboard-doctor", response_model=List[ElderHealthSummaryCard])
def get_doctor_advanced_dashboard(
    facility_id: Optional[int] = None,
    only_attention_needed: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_medical_team)
):
    cards = build_health_dashboard_cards(db, current_user, facility_id, is_doctor_view=True)
    if only_attention_needed:
        cards = [c for c in cards if c.has_abnormal_vital]
    return cards


# =========================================================================
# 5. XEM LẠI BÁO CÁO GIAO CA QUÁ KHỨ & NHẬT KÝ
# =========================================================================
@router.get("/shift-reports/archive", response_model=List[ShiftMedicalReportDetailResponse])
def get_archived_shift_reports(
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở"),
    target_date: Optional[date] = Query(None, description="Xem ngày cụ thể (YYYY-MM-DD)"),
    shift_type: Optional[ShiftType] = Query(None, description="Lọc theo Ca Sáng / Ca Tối"),
    limit_days: Optional[int] = Query(None, ge=1, le=90, description="Giới hạn số ngày gần nhất muốn xem (VD: 3, 7, 30 ngày)"),
    include_history: bool = Query(False, description="Chỉ Admin/Manager mới có quyền xem lịch sử các vết chỉnh sửa"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    XEM LẠI BÁO CÁO GIAO CA QUÁ KHỨ:
    - NVCS, Điều phối, Bác sĩ: Chỉ xem được BẢN BÁO CÁO HOÀN CHỈNH CUỐI CÙNG trong giới hạn ngày cho phép.
    - Admin, Manager: Khi truyền `include_history=True` sẽ xem được thêm danh sách Nhật ký lịch sử các lần hiệu chỉnh (Audit History).
    """
    query = db.query(ShiftReport).options(
        joinedload(ShiftReport.coordinator), 
        joinedload(ShiftReport.facility)
    )

    # 1. PHÂN QUYỀN ĐA CƠ SỞ (Multi-facility isolation)
    target_f_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_f_id is not None:
        query = query.filter(ShiftReport.facility_id == target_f_id)

    # 2. KHÓA GIỚI HẠN SỐ NGÀY THEO VAI TRÒ
    today = date.today()
    max_allowed_days = max_allowed_days_max
    if current_user.role in [RoleType.Caregiver, RoleType.Coordinator]:
        max_allowed_days = max_allowed_days_for_staff

    effective_limit_days = limit_days if limit_days and limit_days <= max_allowed_days else max_allowed_days
    cutoff_date = today - timedelta(days=effective_limit_days)

    query = query.filter(ShiftReport.shift_date >= cutoff_date)

    # 3. LỌC THEO NGÀY CỤ THỂ VÀ CA TRỰC
    if target_date:
        if target_date < cutoff_date:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Tài khoản vai trò [{current_user.role}] chỉ được xem lại báo cáo trong vòng {effective_limit_days} ngày gần nhất!"
            )
        query = query.filter(ShiftReport.shift_date == target_date)

    if shift_type:
        query = query.filter(ShiftReport.shift_type == shift_type.value)

    reports = query.order_by(ShiftReport.shift_date.desc(), ShiftReport.created_at.desc()).all()

    # 4. BẢO MẬT & TRUY XUẤT VẾT LỊCH SỬ CHỈNH SỬA (CHO ADMIN / MANAGER)
    is_admin_or_manager = current_user.role in [RoleType.Admin, RoleType.Manager]
    results = []

    for r in reports:
        history_list = []
        
        # Chỉ truy vấn vết AuditLog khi là Admin/Manager VÀ có bật cờ include_history
        if include_history and is_admin_or_manager:
            audit_logs = db.query(AuditLog)\
                .filter(
                    AuditLog.action == "UPDATE_SHIFT_REPORT",
                    AuditLog.target_id == str(r.id)
                )\
                .order_by(AuditLog.created_at.desc()).all()

            for log in audit_logs:
                actor = db.query(User).filter(User.id == log.actor_id).first() if log.actor_id else None
                history_list.append(
                    ShiftReportAuditResponse(
                        id=log.id,
                        actor_id=log.actor_id,
                        actor_name=actor.full_name if actor else "Hệ thống",
                        action=log.action,
                        ip_address=log.ip_address,
                        created_at=log.created_at,
                        payload=log.payload
                    )
                )

        results.append(
            ShiftMedicalReportDetailResponse(
                id=r.id,
                facility_id=r.facility_id,
                facility_name=r.facility.name if r.facility else "N/A",
                reporter_id=r.coordinator_id,
                reporter_name=r.coordinator.full_name if r.coordinator else "N/A",
                shift_date=r.shift_date,
                shift_type=ShiftType(r.shift_type),
                formatted_elder_descriptions=r.elder_descriptions,  # Bản báo cáo đã cập nhật mới nhất
                handover_notes=r.handover_notes,
                created_at=r.created_at,
                edit_history=history_list  # Mảng vết sửa (Rỗng đối với Doctor / Caregiver / Coordinator)
            )
        )

    return results


@router.put("/shift-reports/{report_id}", response_model=ShiftMedicalReportResponse)
def update_shift_medical_report(
    report_id: int,
    payload: ShiftMedicalReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_report)
):
    """
    SỬA BÁO CÁO GIAO CA (CHỈ ĐIỀU PHỐI / MANAGER / ADMIN):
    - Cập nhật ghi chú diễn biến của các Cụ hoặc ghi chú dặn dò ca sau.
    - Nếu sửa danh sách `elder_events`, hệ thống tự động cập nhật lại chuỗi văn bản giao ca 
      và đẩy thêm vết mới vào Nhật ký `TreatmentDiary`.
    - Ghi log vết sửa AuditLog công khai.
    """
    report = db.query(ShiftReport)\
        .options(joinedload(ShiftReport.coordinator), joinedload(ShiftReport.facility))\
        .filter(ShiftReport.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo giao ca này!")

    # Ràng buộc phân quyền Cơ sở (Nếu không phải Admin/Manager toàn viện thì chỉ được sửa báo cáo của cơ sở mình)
    if current_user.facility_id is not None and report.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa báo cáo của Cơ sở khác!")

    old_notes = report.handover_notes

    # 1. Cập nhật lại diễn biến của các Cụ (nếu Frontend có truyền lên mảng mới)
    if payload.elder_events is not None:
        formatted_descriptions = []
        for idx, item in enumerate(payload.elder_events, start=1):
            elder = db.query(Elder).filter(Elder.id == item.elder_id).first()
            if not elder:
                continue

            note_text = item.note.strip()
            formatted_descriptions.append(f"{idx}. {elder.full_name}: {note_text}")

            # Đẩy cập nhật bổ sung vào Nhật ký điều trị của Cụ
            diary = TreatmentDiary(
                elder_id=elder.id,
                event_type="Cập nhật báo cáo ca (ĐP)",
                content=f"[Hiệu chỉnh ca] {note_text}",
                created_by=current_user.id
            )
            db.add(diary)

        report.elder_descriptions = "\n".join(formatted_descriptions)
        report.highlighted_issues = f"Đã cập nhật lưu ý cho {len(payload.elder_events)} Cụ."

    # 2. Cập nhật lại ghi chú dặn dò ca sau
    if payload.handover_notes is not None:
        report.handover_notes = payload.handover_notes

    # 3. Ghi vết AuditLog bảo vệ tính minh bạch
    audit = AuditLog(
        actor_id=current_user.id,
        action="UPDATE_SHIFT_REPORT",
        target_id=str(report_id),
        ip_address="Internal",
        payload=f"ĐIỀU PHỐI [{current_user.full_name}] đã chỉnh sửa Báo cáo giao ca ID={report_id} ngày {report.shift_date}"
    )
    db.add(audit)

    db.commit()
    db.refresh(report)

    return ShiftMedicalReportResponse(
        id=report.id,
        facility_id=report.facility_id,
        facility_name=report.facility.name if report.facility else "N/A",
        reporter_id=report.coordinator_id,
        reporter_name=report.coordinator.full_name if report.coordinator else "N/A",
        shift_date=report.shift_date,
        shift_type=ShiftType(report.shift_type),
        formatted_elder_descriptions=report.elder_descriptions,
        handover_notes=report.handover_notes,
        created_at=report.created_at
    )


@router.get("/diary/elder/{elder_id}", response_model=List[TreatmentDiaryResponse])
def get_elder_treatment_diary_history(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    diaries = db.query(TreatmentDiary).options(joinedload(TreatmentDiary.staff))\
        .filter(TreatmentDiary.elder_id == elder_id)\
        .order_by(TreatmentDiary.created_at.desc()).all()

    return [
        TreatmentDiaryResponse(
            id=d.id,
            elder_id=d.elder_id,
            event_type=d.event_type,
            content=d.content,
            image_url=d.image_url,
            created_by=d.created_by,
            created_by_name=d.staff.full_name if d.staff else "N/A",
            created_at=d.created_at
        ) for d in diaries
    ]


# =========================================================================
# 6. QUẢN LÝ CÂN NẶNG HÀNG THÁNG (POST / PUT / GET)
# =========================================================================
@router.post("/weight", response_model=WeightRecordResponse, status_code=status.HTTP_201_CREATED)
def record_elder_weight(
    payload: WeightRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    Nhập chỉ số cân nặng định kỳ cho Cụ (Thường đo 30 ngày/lần):
    - Tự động lưu bản ghi vào `weight_records` với tháng YYYY-MM hiện tại.
    - Tự động cập nhật `last_weight_date` trong hồ sơ của Cụ để reset bộ đếm 30 ngày.
    """
    elder = db.query(Elder).filter(Elder.id == payload.elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin Cụ!")

    today_date = date.today()
    current_month_str = today_date.strftime("%Y-%m")

    existing_record = db.query(WeightRecord)\
        .options(joinedload(WeightRecord.staff))\
        .filter(
            WeightRecord.elder_id == payload.elder_id,
            WeightRecord.measured_month == current_month_str
        ).first()

    if existing_record:
        existing_record.weight = payload.weight
        existing_record.notes = payload.notes
        existing_record.measured_by = current_user.id
        existing_record.measured_at = datetime.now()
        
        elder.last_weight_date = today_date
        db.commit()
        db.refresh(existing_record)
        return existing_record

    new_record = WeightRecord(
        elder_id=payload.elder_id,
        measured_by=current_user.id,
        weight=payload.weight,
        measured_month=current_month_str,
        notes=payload.notes
    )
    
    elder.last_weight_date = today_date

    db.add(new_record)
    db.commit()

    record = db.query(WeightRecord)\
        .options(joinedload(WeightRecord.staff))\
        .filter(WeightRecord.id == new_record.id).first()

    return record


@router.put("/weight/{weight_id}", response_model=WeightRecordResponse)
def update_elder_weight(
    weight_id: int,
    payload: WeightRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """Sửa lại chỉ số cân nặng khi nhân viên nhập nhầm số kg"""
    record = db.query(WeightRecord)\
        .options(joinedload(WeightRecord.staff))\
        .filter(WeightRecord.id == weight_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi cân nặng này!")

    old_weight = record.weight
    record.weight = payload.weight
    if payload.notes is not None:
        record.notes = payload.notes
    record.measured_by = current_user.id

    audit = AuditLog(
        actor_id=current_user.id,
        action="UPDATE_WEIGHT_RECORD",
        target_id=str(weight_id),
        ip_address="Internal",
        payload=f"Sửa cân nặng Cụ ID={record.elder_id}. Cũ: {old_weight}kg -> Mới: {payload.weight}kg"
    )
    db.add(audit)

    db.commit()
    db.refresh(record)

    return record


@router.get("/weight/elder/{elder_id}", response_model=List[WeightRecordResponse])
def get_elder_weight_history(
    elder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """Lấy danh sách lịch sử cân nặng qua các tháng của 1 Cụ"""
    records = db.query(WeightRecord)\
        .options(joinedload(WeightRecord.staff))\
        .filter(WeightRecord.elder_id == elder_id)\
        .order_by(WeightRecord.measured_month.desc()).all()

    return records


@router.get("/weight/due-list", response_model=List[ElderWeightDueResponse])
def get_elders_due_for_weight(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    API Nhắc Lịch Cân Thông Minh:
    - Nhắc nhở sớm từ ngày thứ 25 (cho 5 ngày chuẩn bị trước mốc 30 ngày).
    - Tính toán `days_remaining`: Số ngày còn lại trước khi trễ hạn.
    - Phân loại `status_flag`:
        + 'OVERDUE' : Đã quá hạn (>= 30 ngày hoặc chưa từng cân) -> Cần cân gấp!
        + 'WARNING' : Sắp đến hạn (25 - 29 ngày) -> Chuẩn bị cân trong các ca tới.
    """
    query = db.query(Elder).options(joinedload(Elder.room))
    if current_user.facility_id is not None:
        query = query.join(Room).join(Zone).filter(Zone.facility_id == current_user.facility_id)

    elders = query.all()
    today = date.today()
    due_list = []

    for elder in elders:
        days_since = None
        days_remaining = 0
        is_overdue = False
        status_flag = "NORMAL"

        if elder.last_weight_date:
            days_since = (today - elder.last_weight_date).days
            days_remaining = 30 - days_since

            if days_since >= 30:
                is_overdue = True
                status_flag = "OVERDUE"
            elif days_since >= 25:
                status_flag = "WARNING"
            else:
                status_flag = "NORMAL"
        else:
            days_since = None
            days_remaining = 0
            is_overdue = True
            status_flag = "OVERDUE"

        if status_flag in ["OVERDUE", "WARNING"]:
            due_list.append(
                ElderWeightDueResponse(
                    elder_id=elder.id,
                    elder_name=elder.full_name,
                    room_number=elder.room.room_number if elder.room else "Chưa xếp phòng",
                    last_weight_date=elder.last_weight_date,
                    days_since_last_weight=days_since,
                    days_remaining=days_remaining,
                    status_flag=status_flag,
                    is_overdue=is_overdue
                )
            )

    due_list.sort(
        key=lambda x: (
            0 if x.status_flag == "OVERDUE" else 1,
            x.days_remaining
        )
    )

    return due_list


# =========================================================================
# HÀM HELPER HỖ TRỢ DỰNG CARD DASHBOARD COMPONENT
# =========================================================================
def calculate_abnormal_flag(spo2, bp_sys, bp_dia, temp, pulse) -> bool:
    if spo2 and spo2 < VITAL_LIMITS["SPO2_WARNING"]: return True
    if bp_sys and (bp_sys > VITAL_LIMITS["BP_SYSTOLIC_HIGH"] or bp_sys < VITAL_LIMITS["BP_SYSTOLIC_LOW"]): return True
    if bp_dia and (bp_dia > VITAL_LIMITS["BP_DIASTOLIC_HIGH"] or bp_dia < VITAL_LIMITS["BP_DIASTOLIC_LOW"]): return True
    if temp and temp >= VITAL_LIMITS["TEMP_FEVER"]: return True
    if pulse and (pulse > VITAL_LIMITS["PULSE_FAST"] or pulse < VITAL_LIMITS["PULSE_SLOW"]): return True
    return False


def build_health_dashboard_cards(db: Session, current_user: User, facility_id: Optional[int], is_doctor_view: bool) -> List[ElderHealthSummaryCard]:
    query = db.query(Elder).options(joinedload(Elder.room).joinedload(Room.zone))
    
    target_f_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_f_id is not None:
        query = query.join(Room).join(Zone).filter(Zone.facility_id == target_f_id)

    elders = query.order_by(Elder.room_id).all()
    cards = []
    today_start = datetime.combine(date.today(), datetime.min.time())

    for elder in elders:
        latest_vital = db.query(VitalSignRecord)\
            .filter(VitalSignRecord.elder_id == elder.id)\
            .order_by(VitalSignRecord.measured_at.desc()).first()

        active_prescription = db.query(Prescription)\
            .filter(Prescription.elder_id == elder.id, Prescription.is_active == True).first()

        today_diaries = db.query(TreatmentDiary)\
            .filter(TreatmentDiary.elder_id == elder.id, TreatmentDiary.created_at >= today_start).all()

        diary_notes = [f"[{d.event_type}] {d.content}" for d in today_diaries]

        attention_reasons = []
        has_abnormal_vital = False

        if latest_vital and latest_vital.is_abnormal:
            has_abnormal_vital = True
            if latest_vital.spo2 and latest_vital.spo2 < VITAL_LIMITS["SPO2_WARNING"]:
                attention_reasons.append(f"SpO2 thấp ({latest_vital.spo2}%)")
            if latest_vital.temperature and latest_vital.temperature >= VITAL_LIMITS["TEMP_FEVER"]:
                attention_reasons.append(f"Sốt ({latest_vital.temperature}°C)")
            if latest_vital.bp_systolic and latest_vital.bp_systolic > VITAL_LIMITS["BP_SYSTOLIC_HIGH"]:
                attention_reasons.append(f"Huyết áp cao ({latest_vital.bp_systolic}/{latest_vital.bp_diastolic})")

        if diary_notes:
            has_abnormal_vital = True
            attention_reasons.append(f"Có {len(diary_notes)} lưu ý giao ca")

        cards.append(
            ElderHealthSummaryCard(
                elder_id=elder.id,
                elder_name=elder.full_name,
                room_number=elder.room.room_number if elder.room else "Chưa xếp phòng",
                latest_vital_signs=latest_vital,
                has_abnormal_vital=has_abnormal_vital,
                active_prescription_url=active_prescription.image_url if (is_doctor_view and active_prescription) else None,
                recent_diary_events=diary_notes,
                doctor_attention_reasons=attention_reasons
            )
        )

    cards.sort(key=lambda x: x.has_abnormal_vital, reverse=True)
    return cards