# backend/routes/health.py
from typing import List, Optional
from datetime import date, datetime, timedelta, time 
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from services.maintenance_service import run_system_maintenance_jit


from services.shift_service import check_and_sync_shift_jit 

from database import get_db
from models import (
    Elder, VitalSignRecord, Prescription, PrescriptionLog, 
    TreatmentDiary, ShiftReport, User, Room, Zone, Facility, AuditLog,
    WeightRecord , Shift, VitalSignRecord, ShiftSetting, User
)
from schemas import (
    VitalSignCreate, VitalSignResponse, VitalSignUpdate,
    PrescriptionCreate, PrescriptionResponse, PrescriptionChangeLog,
    TreatmentDiaryCreate, TreatmentDiaryResponse,
    ElderHealthSummaryCard, ElderShiftNoteInput,
    ShiftMedicalReportCreate, ShiftMedicalReportResponse,
    RoleType, ShiftType, WeightRecordCreate, WeightRecordResponse, CurrentShiftResponse,
    ElderWeightDueResponse, WeightRecordUpdate, ShiftMedicalReportDetailResponse, ShiftReportAuditResponse, 
    ShiftMedicalReportUpdate, CurrentShiftResponse, FacilityShiftReportStatusResponse, FacilityShiftReportSubmissionItem
)
from core.dependencies import PermissionChecker, get_current_user, require_care_team, require_medical_team
from core.constants import VITAL_LIMITS, max_allowed_days_for_staff, max_allowed_days_max
import json 
import logging
import pytz

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




@router.get(
    "/current-shift",
    response_model=CurrentShiftResponse,
    summary="[Tất cả nhân viên] Lấy thông tin Ca trực Live hiện tại",
    description="""
    **Dành cho toàn bộ Web & Mobile Frontend:**
    - Tự động kích hoạt JIT kiểm tra/mở ca trực live theo giờ thực tế.
    - Trả về chi tiết: `shift_id`, `shift_date`, `shift_type` (Sang/Toi), trạng thái (`Open`), cùng khung giờ bắt đầu - kết thúc.
    """
)
def get_current_live_shift(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Cho phép mọi tài khoản đã đăng nhập
):
    # 1. Kích hoạt JIT Sync làm mới và đồng bộ ca trực live tức thì
    run_system_maintenance_jit(db, background_tasks)

    # 2. Truy vấn ca trực đang Open
    active_shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.id.desc()).first()

    # 3. Lấy cấu hình khung giờ hiển thị
    setting = db.query(ShiftSetting).first()
    m_start = setting.morning_start if setting else "08:00"
    m_end = setting.morning_end if setting else "19:00"
    e_start = setting.evening_start if setting else "20:00"
    e_end = setting.evening_end if setting else "07:00"

    today_vn = datetime.now(pytz.timezone('Asia/Ho_Chi_Minh')).date()

    if not active_shift:
        # Trường hợp đang nằm ngoài giờ trực hành chính (nghỉ giữa ca)
        return CurrentShiftResponse(
            shift_id=None,
            shift_date=today_vn,
            shift_type="None",
            status="Closed",
            start_time="",
            end_time="",
            is_active=False
        )

    # Xác định khung giờ bắt đầu - kết thúc của ca hiện tại
    if active_shift.shift_type == "Sang":
        start_time, end_time = m_start, m_end
    else:
        start_time, end_time = e_start, e_end

    return CurrentShiftResponse(
        shift_id=active_shift.id,
        shift_date=active_shift.shift_date,
        shift_type=active_shift.shift_type,
        status=active_shift.status,
        start_time=start_time,
        end_time=end_time,
        is_active=True
    )


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
    record = db.query(VitalSignRecord).filter(VitalSignRecord.id == vital_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sinh hiệu này!")

    old_values = f"BP:{record.bp_systolic}/{record.bp_diastolic}, SPO2:{record.spo2}, Temp:{record.temperature}"
    # Cập nhật các trường chỉ số
    if payload.bp_systolic is not None: record.bp_systolic = payload.bp_systolic
    if payload.bp_diastolic is not None: record.bp_diastolic = payload.bp_diastolic
    if payload.pulse is not None: record.pulse = payload.pulse
    if payload.spo2 is not None: record.spo2 = payload.spo2
    if payload.temperature is not None: record.temperature = payload.temperature
    if payload.notes is not None: record.notes = payload.notes

    # Bật cờ đánh dấu đã chỉnh sửa và tính lại cờ bất thường
    record.is_edited = True
    record.edited_at = datetime.now()
    record.is_abnormal = calculate_abnormal_flag(record.spo2, record.bp_systolic, record.bp_diastolic, record.temperature, record.pulse)

    # Ghi log minh bạch
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
@router.get("/dashboard-live", response_model=List[dict])
def get_live_shift_dashboard_for_all(
    background_tasks: BackgroundTasks,
    facility_id: Optional[int] = Query(None, description="Lọc theo Cơ sở (Nếu là Admin/Doctor)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    DASHBOARD THEO DÕI SỨC KHỎE KHU VỰC REAL-TIME:
    - Kích hoạt JIT Sync kiểm tra/chốt/mở ca tự động.
    - Nhóm theo Cơ sở -> Phân Khu -> Phòng -> Danh sách Cụ.
    - Lọc đúng dữ liệu sinh hiệu của CA TRỰC LIVE HIỆN TẠI.
    """
    # 1. KÍCH HOẠT JIT REFRESH CA TỰ ĐỘNG DỰA TRÊN SHIFT_SETTING
    run_system_maintenance_jit(db, background_tasks)

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

@router.get("/vitals/audit-check", response_model=List[dict])
def check_elder_vital_edits_in_shift(
    elder_id: int = Query(..., description="ID của Cụ cần kiểm tra"),
    target_date: date = Query(..., description="Ngày cần kiểm tra (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor_only) # Chỉ Admin, Manager, Doctor mới được check vết sửa
):
    """
    KIỂM TRA LỊCH SỬ CHỈNH SỬA SINH HIỆU CỦA 1 CỤ TRONG 1 NGÀY:
    - Thống kê xem trong ngày đó, các bản ghi sinh hiệu của Cụ đã bị NVCS/ĐP sửa đổi mấy lần.
    - Trả về danh sách AuditLog chi tiết (Ai sửa, sửa lúc mấy giờ, nội dung cũ -> mới).
    - Phân quyền: Chỉ Admin, Manager, Bác sĩ mới có quyền gọi.
    """
    # 1. Tìm tất cả các bản ghi sinh hiệu của Cụ trong ngày target_date
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    vitals_in_day = db.query(VitalSignRecord).filter(
        VitalSignRecord.elder_id == elder_id,
        VitalSignRecord.measured_at >= start_dt,
        VitalSignRecord.measured_at <= end_dt
    ).all()

    if not vitals_in_day:
        return []

    vital_ids = [v.id for v in vitals_in_day]

    # 2. Truy vấn bảng AuditLog xem các bản ghi này đã từng bị UPDATE chưa
    # target_id trong AuditLog của vital lưu dưới dạng string của vital_id
    vital_id_strs = [str(vid) for vid in vital_ids]
    
    audit_logs = db.query(AuditLog).filter(
        AuditLog.action == "UPDATE_VITAL_SIGN",
        AuditLog.target_id.in_(vital_id_strs)
    ).order_by(AuditLog.created_at.desc()).all()

    result = []
    for log in audit_logs:
        actor = db.query(User).filter(User.id == log.actor_id).first() if log.actor_id else None
        result.append({
            "audit_id": log.id,
            "vital_record_id": int(log.target_id),
            "actor_id": log.actor_id,
            "actor_name": actor.full_name if actor else "N/A",
            "action": log.action,
            "details": log.payload,  # Nội dung [Cũ -> Mới]
            "modified_at": log.created_at,
            "ip_address": log.ip_address
        })

    return result

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


@router.get("/shift-reports/auto-summary", response_model=dict)
def get_shift_abnormal_summary(
    facility_id: int = Query(..., description="ID Cơ sở"),
    target_date: date = Query(default_factory=date.today),
    shift_type: str = Query(..., description="'Sang' hoặc 'Toi'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_report)
):
    """
    TỰ ĐỘNG TỔNG HỢP DIỄN BIẾN CÁC CỤ CÓ CỜ ĐỎ TRONG CA ĐỂ NỘP BÁO CÁO GIAO CA
    """
    # Lấy danh sách các Cụ thuộc Cơ sở
    elders_in_fac = db.query(Elder).join(Room).join(Zone)\
        .filter(Zone.facility_id == facility_id).all()
    elder_ids = [e.id for e in elders_in_fac]

    # Query các bản ghi sinh hiệu có is_abnormal = True trong ca đó
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    abnormal_vitals = db.query(VitalSignRecord)\
        .filter(
            VitalSignRecord.elder_id.in_(elder_ids),
            VitalSignRecord.shift_type == shift_type,
            VitalSignRecord.measured_at >= start_dt,
            VitalSignRecord.measured_at <= end_dt,
            VitalSignRecord.is_abnormal == True
        ).all()

    auto_descriptions = []
    issues_summary = []

    for idx, v in enumerate(abnormal_vitals, start=1):
        elder = db.query(Elder).filter(Elder.id == v.elder_id).first()
        name = elder.full_name if elder else f"Cụ ID {v.elder_id}"
        
        # Ghép chỉ số bất thường + ghi chú
        vital_str = f"BP: {v.bp_systolic}/{v.bp_diastolic}, SpO2: {v.spo2}%, Temp: {v.temperature}°C"
        note_str = f" - Ghi chú: {v.notes}" if v.notes else ""
        
        auto_descriptions.append(f"{idx}. {name} [{vital_str}]{note_str}")
        issues_summary.append(f"{name} ({v.notes or 'Chỉ số bất thường'})")

    return {
        "facility_id": facility_id,
        "shift_date": target_date,
        "shift_type": shift_type,
        "abnormal_count": len(abnormal_vitals),
        "suggested_highlighted_issues": f"Ca có {len(abnormal_vitals)} Cụ báo hiệu bất thường: " + ", ".join(issues_summary) if issues_summary else "Ca trực bình thường, không có bất thường.",
        "suggested_elder_descriptions": "\n".join(auto_descriptions)
    }

@router.get("/shift-reports/{report_id}/audit-history", response_model=List[ShiftReportAuditResponse])
def get_shift_report_audit_history(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    """
    TRUY VẤN VẾT LỊCH SỬ CHỈNH SỬA CỦA 1 BÁO CÁO GIAO CA CHUYÊN BỆT:
    - Bắt buộc phân quyền: Chỉ Admin và Manager mới xem được chi tiết.
    - Ép kiểu target_id chuẩn xác để loại bỏ hoàn toàn lỗi trả về 0 lần sửa.
    """
    # Khóa bảo mật: Chỉ Admin & Manager được xem
    if current_user.role not in [RoleType.Admin, RoleType.Manager]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Chỉ Quản Lý (Manager) và Quản Trị Viên (Admin) mới có quyền xem vết chỉnh sửa báo cáo!"
        )

    report = db.query(ShiftReport).filter(ShiftReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo giao ca này!")

    # 🌟 ÉP KIỂU SẠCH SẼ CHỐNG LỖI QUERY MATCHING
    target_str = str(report_id).strip()

    audit_logs = db.query(AuditLog)\
        .filter(
            AuditLog.action == "UPDATE_SHIFT_REPORT",
            AuditLog.target_id == target_str
        )\
        .order_by(AuditLog.created_at.desc()).all()

    history = []
    for log in audit_logs:
        actor = db.query(User).filter(User.id == log.actor_id).first() if log.actor_id else None
        history.append(
            ShiftReportAuditResponse(
                id=log.id,
                actor_id=log.actor_id,
                actor_name=actor.full_name if actor else "N/A",
                action=log.action,
                ip_address=log.ip_address,
                created_at=log.created_at,
                payload=log.payload
            )
        )

    return history

@router.put("/shift-reports/{report_id}", response_model=ShiftMedicalReportResponse)
def update_shift_medical_report(
    report_id: int,
    payload: ShiftMedicalReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_report)
):
    report = db.query(ShiftReport)\
        .options(joinedload(ShiftReport.coordinator), joinedload(ShiftReport.facility))\
        .filter(ShiftReport.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo giao ca này!")

    if current_user.facility_id is not None and report.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa báo cáo của Cơ sở khác!")

    # 1. 📸 CHỤP SNAPSHOT NỘI DUNG CŨ DẠNG DICT
    old_data = {
        "elder_descriptions": report.elder_descriptions or "",
        "handover_notes": report.handover_notes or ""
    }

    # 2. THỰC HIỆN CẬP NHẬT DỮ LIỆU
    if payload.elder_events is not None:
        formatted_descriptions = []
        for idx, item in enumerate(payload.elder_events, start=1):
            elder = db.query(Elder).filter(Elder.id == item.elder_id).first()
            if not elder:
                continue

            note_text = item.note.strip()
            formatted_descriptions.append(f"{idx}. {elder.full_name}: {note_text}")

            diary = TreatmentDiary(
                elder_id=elder.id,
                event_type="Cập nhật báo cáo ca (ĐP)",
                content=f"[Hiệu chỉnh ca] {note_text}",
                created_by=current_user.id
            )
            db.add(diary)

        report.elder_descriptions = "\n".join(formatted_descriptions)
        report.highlighted_issues = f"Đã cập nhật lưu ý cho {len(payload.elder_events)} Cụ."

    if payload.handover_notes is not None:
        report.handover_notes = payload.handover_notes

    # 3. 📸 CHỤP SNAPSHOT NỘI DUNG MỚI DẠNG DICT
    new_data = {
        "elder_descriptions": report.elder_descriptions or "",
        "handover_notes": report.handover_notes or ""
    }

    # 4. ĐÓNG GÓI PAYLOAD DẠNG JSON STRING CHUẨN XÁC
    audit_payload = json.dumps({
        "old": old_data,
        "new": new_data
    }, ensure_ascii=False)

    audit = AuditLog(
        actor_id=current_user.id,
        action="UPDATE_SHIFT_REPORT",
        target_id=str(report.id).strip(),
        ip_address="Internal",
        payload=audit_payload
    )
    db.add(audit)

    # Commit toàn bộ giao dịch
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


def build_health_dashboard_cards(db: Session, current_user: User, facility_id: Optional[int] = None, is_doctor_view: bool = False):
    # 1. Lấy thông tin Ca đang Mở ("Open") thực tế trong DB do JIT vừa đồng bộ
    active_shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.id.desc()).first()
    
    # Trường hợp fallback nếu DB chưa có ca nào
    active_date = active_shift.shift_date if active_shift else date.today()
    active_type = active_shift.shift_type if active_shift else "Sang"

    # 2. Xác định Cơ sở mục tiêu
    target_f_id = current_user.facility_id if current_user.facility_id is not None else facility_id

    # 3. Query cây cấu trúc Cơ sở -> Phân khu -> Phòng ốc
    room_query = db.query(Room).join(Zone, Room.zone_id == Zone.id).join(Facility, Zone.facility_id == Facility.id)

    if target_f_id is not None:
        room_query = room_query.filter(Zone.facility_id == target_f_id)

    rooms = room_query.order_by(Facility.id, Zone.name, Room.room_number).all()

    facility_map = {}

    for room in rooms:
        zone = room.zone
        facility = zone.facility

        if facility.id not in facility_map:
            facility_map[facility.id] = {
                "facility_id": facility.id,
                "facility_name": facility.name,
                "zones": {}
            }

        if zone.id not in facility_map[facility.id]["zones"]:
            facility_map[facility.id]["zones"][zone.id] = {
                "zone_id": zone.id,
                "zone_name": zone.name, # "A", "B", "C"
                "rooms": []
            }

        # 4. Lấy các Cụ trong phòng và lọc Sinh hiệu ĐÚNG THEO CA LIVE
        elders = db.query(Elder).filter(Elder.room_id == room.id).all()
        elder_cards = []

        for elder in elders:
            latest_vital = db.query(VitalSignRecord)\
                .filter(
                    VitalSignRecord.elder_id == elder.id,
                    VitalSignRecord.shift_type == active_type,
                    func.date(VitalSignRecord.measured_at) == active_date
                )\
                .order_by(VitalSignRecord.measured_at.desc()).first()

            status_tag = "NOT_MEASURED" # Chưa đo (Reset trắng khi sang ca mới)
            is_abnormal = False
            is_edited = False

            if latest_vital:
                is_abnormal = latest_vital.is_abnormal
                is_edited = getattr(latest_vital, 'is_edited', False)

                if is_abnormal and is_edited:
                    status_tag = "DANGER_EDITED"
                elif is_abnormal:
                    status_tag = "DANGER"
                elif is_edited:
                    status_tag = "MEASURED_EDITED"
                else:
                    status_tag = "MEASURED"

            elder_cards.append({
                "elder_id": elder.id,
                "full_name": elder.full_name,
                "status_tag": status_tag,
                "is_abnormal": is_abnormal,
                "is_edited": is_edited,
                "has_abnormal_vital": is_abnormal, # Thêm trường này cho Doctor Dashboard
                "latest_vital": {
                    "vital_id": latest_vital.id,
                    "bp": f"{latest_vital.bp_systolic}/{latest_vital.bp_diastolic}",
                    "spo2": latest_vital.spo2,
                    "temperature": latest_vital.temperature,
                    "pulse": latest_vital.pulse,
                    "notes": latest_vital.notes,
                    "measured_at": latest_vital.measured_at
                } if latest_vital else None
            })

        facility_map[facility.id]["zones"][zone.id]["rooms"].append({
            "room_id": room.id,
            "room_number": room.room_number,
            "elder_count": len(elders),
            "elders": elder_cards
        })

    result = []
    for f_id, f_data in facility_map.items():
        zone_list = [z_data for z_id, z_data in f_data["zones"].items()]
        result.append({
            "facility_id": f_data["facility_id"],
            "facility_name": f_data["facility_name"],
            "active_shift_date": str(active_date),
            "active_shift_type": active_type,
            "zones": zone_list
        })

    return result



@router.get("/current-shift", response_model=CurrentShiftResponse)
def get_current_active_shift(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy thông tin ca trực hiện tại:
    - Tự động kích hoạt JIT Sync kiểm tra / mở / đóng ca theo giờ thực tế.
    - Trả về ngày, loại ca (Sáng/Tối), trạng thái và mốc giờ bắt đầu - kết thúc.
    """
    # 1. Tự động refresh / đồng bộ ca JIT
    try:
        check_and_sync_shift_jit(db)
    except Exception as jit_err:
        db.rollback()
        logging.error(f"[JIT SHIFT ERROR]: Lỗi khi đồng bộ ca: {str(jit_err)}")

    # 2. Lấy cấu hình khung giờ ca
    setting = db.query(ShiftSetting).first()
    morning_start = setting.morning_start if setting else "08:00"
    morning_end = setting.morning_end if setting else "19:00"
    evening_start = setting.evening_start if setting else "20:00"
    evening_end = setting.evening_end if setting else "07:00"

    # 3. Lấy ca đang Mở ("Open") gần nhất
    active_shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.id.desc()).first()

    if active_shift:
        is_morning = active_shift.shift_type == "Sang"
        return CurrentShiftResponse(
            shift_id=active_shift.id,
            shift_date=active_shift.shift_date,
            shift_type=active_shift.shift_type,
            status=active_shift.status,
            start_time=morning_start if is_morning else evening_start,
            end_time=morning_end if is_morning else evening_end,
            is_active=True
        )

    # Trường hợp ngoài giờ trực (không có ca nào đang Open)
    latest_shift = db.query(Shift).order_by(Shift.id.desc()).first()
    return CurrentShiftResponse(
        shift_id=latest_shift.id if latest_shift else None,
        shift_date=latest_shift.shift_date if latest_shift else date.today(),
        shift_type=latest_shift.shift_type if latest_shift else "Sang",
        status="Closed",
        start_time=morning_start,
        end_time=morning_end,
        is_active=False
    )





@router.get(
    "/shift-reports/facilities-status",
    response_model=FacilityShiftReportStatusResponse,
    summary="[Quản lý/Y tế] Kiểm tra trạng thái nộp Báo cáo ca của các Cơ sở",
    description="""
    **Mô tả nghiệp vụ:**
    - Trả về danh sách toàn bộ các Cơ sở và trạng thái đã nộp Báo cáo giao ca (`ShiftReport`) hay chưa.
    - **Mặc định thông minh:** Nếu không truyền `target_date` và `shift_type`, hệ thống tự động bốc **Ngày hôm nay và Ca trực live hiện tại**.
    - Nếu đã nộp (`is_submitted = True`), đính kèm chi tiết: `report_id`, Điều phối viên nộp, Thời gian nộp và Tóm tắt vấn đề nổi bật.
    """
)
def get_facilities_shift_report_status(
    target_date: Optional[date] = Query(None, description="Ngày cần kiểm tra (YYYY-MM-DD). Để trống = Hôm nay"),
    shift_type: Optional[ShiftType] = Query(None, description="Loại ca ('Sang' hoặc 'Toi'). Để trống = Ca live hiện tại"),
    facility_id: Optional[int] = Query(None, description="Lọc riêng 1 cơ sở (nếu cần)"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_vital)
):
    # 1. Kích hoạt JIT refresh làm mới ca trực ngầm
    if background_tasks:
        run_system_maintenance_jit(db, background_tasks)

    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_vn = datetime.now(tz)
    
    # 2. XÁC ĐỊNH NGÀY VÀ CA MẶC ĐỊNH
    resolved_date = target_date or now_vn.date()
    resolved_shift_type = shift_type.value if shift_type else None

    if not resolved_shift_type:
        # Ưu tiên lấy ca trực live đang Open trong DB
        active_shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.id.desc()).first()
        if active_shift:
            resolved_shift_type = active_shift.shift_type
            if not target_date:
                resolved_date = active_shift.shift_date
        else:
            # Tính toán dựa trên cấu hình khung giờ ShiftSetting
            setting = db.query(ShiftSetting).first()
            current_time = now_vn.time()
            try:
                m_start = time.fromisoformat(setting.morning_start if setting and setting.morning_start else "08:00")
                m_end = time.fromisoformat(setting.morning_end if setting and setting.morning_end else "19:00")
                e_start = time.fromisoformat(setting.evening_start if setting and setting.evening_start else "20:00")
                e_end = time.fromisoformat(setting.evening_end if setting and setting.evening_end else "07:00")
            except Exception:
                m_start, m_end = time(8, 0), time(19, 0)
                e_start, e_end = time(20, 0), time(7, 0)

            if m_start <= current_time <= m_end:
                resolved_shift_type = "Sang"
            elif current_time >= e_start or current_time <= e_end:
                resolved_shift_type = "Toi"
                if current_time <= e_end and not target_date:
                    resolved_date = resolved_date - timedelta(days=1)
            else:
                resolved_shift_type = "Sang"

    # 3. TRUY VẤN TẤT CẢ CƠ SỞ (CÓ ÁP DỤNG PHÂN QUYỀN)
    facility_query = db.query(Facility)
    
    # Nếu user bị giới hạn theo cơ sở (Manager/Caregiver cơ sở)
    target_f_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_f_id is not None:
        facility_query = facility_query.filter(Facility.id == target_f_id)

    facilities = facility_query.order_by(Facility.id).all()

    # 4. TRUY VẤN CÁC BÁO CÁO GIAO CA ĐÃ NỘP TRONG NGÀY & CA ĐÓ
    reports = db.query(ShiftReport).options(
        joinedload(ShiftReport.coordinator)
    ).filter(
        ShiftReport.shift_date == resolved_date,
        ShiftReport.shift_type == resolved_shift_type
    ).all()

    # Map báo cáo theo facility_id để đối chiếu nhanh O(1)
    report_map = {r.facility_id: r for r in reports}

    # 5. TỔNG HỢP KẾT QUẢ
    facility_items = []
    submitted_count = 0

    for fac in facilities:
        rep = report_map.get(fac.id)
        is_sub = rep is not None
        if is_sub:
            submitted_count += 1

        facility_items.append(
            FacilityShiftReportSubmissionItem(
                facility_id=fac.id,
                facility_name=fac.name,
                is_submitted=is_sub,
                report_id=rep.id if rep else None,
                coordinator_id=rep.coordinator_id if rep else None,
                coordinator_name=rep.coordinator.full_name if (rep and rep.coordinator) else None,
                highlighted_issues=rep.highlighted_issues if rep else None,
                handover_notes=rep.handover_notes if rep else None,
                submitted_at=rep.created_at if rep else None
            )
        )

    total_fac = len(facilities)
    return FacilityShiftReportStatusResponse(
        target_date=resolved_date,
        shift_type=resolved_shift_type,
        total_facilities=total_fac,
        submitted_count=submitted_count,
        unsubmitted_count=total_fac - submitted_count,
        facilities=facility_items
    )