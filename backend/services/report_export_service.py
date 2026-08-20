import io
import re
import logging
from datetime import datetime, date
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session, joinedload

from database import SessionLocal
import models
from services.drive_service import upload_shift_handover_report_to_drive, sanitize_filename

logger = logging.getLogger("report_export_service")


def export_and_upload_shift_report_background(report_id: int):
    db: Session = SessionLocal()
    try:
        report = db.query(models.ShiftReport).options(
            joinedload(models.ShiftReport.facility),
            joinedload(models.ShiftReport.coordinator)
        ).filter(models.ShiftReport.id == report_id).first()

        if not report:
            return

        facility_name = report.facility.name if report.facility else "Cơ Sở Chưa Xác Định"
        coordinator_name = report.coordinator.full_name if report.coordinator else "N/A"
        shift_type_label = "Ca Sáng (08:00 - 19:00)" if report.shift_type == "Sang" else "Ca Tối (20:00 - 07:00)"
        shift_date_str = str(report.shift_date)

        wb = openpyxl.Workbook()
        
        # Styles
        title_font = Font(name="Arial", size=13, bold=True, color="1F4E78")
        section_font = Font(name="Arial", size=10, bold=True, color="1F4E78")
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        table_header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
        table_header_font = Font(name="Arial", size=9, bold=True, color="1F4E78")
        header_font = Font(name="Arial", size=9, bold=True, color="FFFFFF")
        bold_font = Font(name="Arial", size=9, bold=True)
        normal_font = Font(name="Arial", size=9)
        danger_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
        danger_font = Font(name="Arial", size=9, color="C00000", bold=True)
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style='thin', color='D9D9D9'), right=Side(style='thin', color='D9D9D9'),
            top=Side(style='thin', color='D9D9D9'), bottom=Side(style='thin', color='D9D9D9')
        )

        # =============================================================
        # SHEET 1: BIÊN BẢN BÀN GIAO CA TRỰC
        # =============================================================
        ws1 = wb.active
        ws1.title = "BÀN GIAO CA TRỰC"
        ws1.views.sheetView[0].showGridLines = True

        ws1.merge_cells("A1:F1")
        ws1["A1"] = "BIÊN BẢN BÁO CÁO GIAO CA TRỰC - VIỆN DƯỠNG LÃO TÂM AN"
        ws1["A1"].font = title_font
        ws1["A1"].alignment = center_align
        ws1.row_dimensions[1].height = 28

        meta_info = [
            ("Cơ Sở:", facility_name, "Ca Trực Bàn Giao:", shift_type_label),
            ("Ngày Ca Trực:", report.shift_date.strftime("%d/%m/%Y"), "Người Lập Báo Cáo:", coordinator_name),
            ("Thời Gian Nộp:", report.created_at.strftime("%d/%m/%Y %H:%M:%S") if report.created_at else "", "Trạng Thái:", "Đã xác nhận giao ca (Submitted)")
        ]

        for r_idx, (l1, v1, l2, v2) in enumerate(meta_info, start=3):
            ws1.cell(row=r_idx, column=1, value=l1).font = bold_font
            ws1.cell(row=r_idx, column=2, value=v1).font = normal_font
            ws1.cell(row=r_idx, column=4, value=l2).font = bold_font
            ws1.cell(row=r_idx, column=5, value=v2).font = normal_font
            ws1.row_dimensions[r_idx].height = 20

        # 1. Tóm tắt nổi bật
        ws1.cell(row=7, column=1, value="1. TÓM TẮT VẤN ĐỀ NỔI BẬT TRONG CA:").font = section_font
        ws1.merge_cells("A8:F8")
        ws1["A8"] = report.highlighted_issues or "Không có sự cố bất thường."
        ws1["A8"].font = normal_font
        ws1["A8"].alignment = left_align_wrap
        ws1.row_dimensions[8].height = 25

        # 2. Lưu ý ca tiếp theo
        ws1.cell(row=10, column=1, value="2. LƯU Ý & HƯỚNG XỬ LÝ CA TIẾP THEO:").font = section_font
        ws1.merge_cells("A11:F12")
        ws1["A11"] = report.handover_notes or "Bàn giao ca bình thường."
        ws1["A11"].font = normal_font
        ws1["A11"].alignment = left_align_wrap

        # 3. DIỄN BIẾN CHI TIẾT TỪNG CỤ (TÁCH THÀNH CÁC DÒNG RIÊNG BIỆT)
        ws1.cell(row=14, column=1, value="3. DIỄN BIẾN CHI TIẾT TỪNG CỤ:").font = section_font
        
        # Tiêu đề bảng
        ws1.cell(row=15, column=1, value="STT").fill = table_header_fill
        ws1.cell(row=15, column=1).font = table_header_font
        ws1.cell(row=15, column=1).alignment = center_align
        ws1.cell(row=15, column=1).border = thin_border

        ws1.cell(row=15, column=2, value="Họ Và Tên Cụ").fill = table_header_fill
        ws1.cell(row=15, column=2).font = table_header_font
        ws1.cell(row=15, column=2).alignment = Alignment(horizontal="left", vertical="center")
        ws1.cell(row=15, column=2).border = thin_border

        ws1.merge_cells("C15:F15")
        ws1.cell(row=15, column=3, value="Diễn Biến & Ghi Chú Chi Tiết Trong Ca").fill = table_header_fill
        ws1.cell(row=15, column=3).font = table_header_font
        ws1.cell(row=15, column=3).alignment = Alignment(horizontal="left", vertical="center")
        for col_c in range(3, 7):
            ws1.cell(row=15, column=col_c).border = thin_border

        # Parse chuỗi elder_descriptions theo từng dòng (dạng "1. Cụ Long: Ghi chú...")
        raw_lines = [l.strip() for l in (report.elder_descriptions or "").split("\n") if l.strip()]
        current_r = 16

        if not raw_lines:
            ws1.cell(row=16, column=1, value="-").alignment = center_align
            ws1.cell(row=16, column=2, value="Tất cả các Cụ").alignment = Alignment(horizontal="left", vertical="center")
            ws1.merge_cells("C16:F16")
            ws1.cell(row=16, column=3, value="Sinh hoạt và sức khỏe ổn định trong suốt ca trực.")
            for c_i in range(1, 7): ws1.cell(row=16, column=c_i).border = thin_border
            current_r = 17
        else:
            for idx, line in enumerate(raw_lines, start=1):
                ws1.row_dimensions[current_r].height = 22
                
                # Tách Tên Cụ và Ghi chú qua dấu hai chấm
                if ":" in line:
                    parts = line.split(":", 1)
                    e_name = re.sub(r"^\d+\.\s*", "", parts[0]).strip()
                    e_note = parts[1].strip()
                else:
                    e_name = f"Mục {idx}"
                    e_note = line

                c1 = ws1.cell(row=current_r, column=1, value=idx)
                c1.alignment = center_align
                c1.border = thin_border
                c1.font = normal_font

                c2 = ws1.cell(row=current_r, column=2, value=e_name)
                c2.alignment = Alignment(horizontal="left", vertical="center")
                c2.border = thin_border
                c2.font = bold_font

                ws1.merge_cells(start_row=current_r, start_column=3, end_row=current_r, end_column=6)
                c3 = ws1.cell(row=current_r, column=3, value=e_note)
                c3.alignment = left_align_wrap
                c3.font = normal_font
                for col_c in range(3, 7):
                    ws1.cell(row=current_r, column=col_c).border = thin_border

                current_r += 1

        ws1.column_dimensions["A"].width = 6
        ws1.column_dimensions["B"].width = 24
        ws1.column_dimensions["C"].width = 25
        ws1.column_dimensions["D"].width = 25
        ws1.column_dimensions["E"].width = 25
        ws1.column_dimensions["F"].width = 20

        # =============================================================
        # SHEET 2: ĐỐI SOÁT SINH HIỆU TRONG CA
        # =============================================================
        ws2 = wb.create_sheet(title="SINH HIỆU TRONG CA")
        ws2.views.sheetView[0].showGridLines = True

        ws2.merge_cells("A1:K1")
        ws2["A1"] = f"BẢNG ĐỐI SOÁT SINH HIỆU - {facility_name.upper()} ({shift_type_label.upper()} NGÀY {report.shift_date.strftime('%d/%m/%Y')})"
        ws2["A1"].font = title_font
        ws2["A1"].alignment = center_align
        ws2.row_dimensions[1].height = 26

        v_headers = ["STT", "Phòng", "Người Cao Tuổi", "Huyết Áp\n(mmHg)", "Mạch\n(bpm)", "SpO2\n(%)", "Nhiệt Độ\n(°C)", "Trạng Thái", "Ghi Chú Triệu Chứng", "Người Đo", "Thời Gian Đo"]
        
        ws2.row_dimensions[3].height = 25
        for c_idx, h in enumerate(v_headers, start=1):
            cell = ws2.cell(row=3, column=c_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            cell.border = thin_border

        start_dt = datetime.combine(report.shift_date, datetime.min.time())
        end_dt = datetime.combine(report.shift_date, datetime.max.time())

        vitals = db.query(models.VitalSignRecord, models.Elder.full_name, models.Room.room_number, models.User.full_name.label("staff_name"))\
                   .join(models.Elder, models.VitalSignRecord.elder_id == models.Elder.id)\
                   .join(models.Room, models.Elder.room_id == models.Room.id)\
                   .join(models.Zone, models.Room.zone_id == models.Zone.id)\
                   .outerjoin(models.User, models.VitalSignRecord.measured_by == models.User.id)\
                   .filter(
                       models.Zone.facility_id == report.facility_id,
                       models.VitalSignRecord.shift_type == report.shift_type,
                       models.VitalSignRecord.measured_at >= start_dt,
                       models.VitalSignRecord.measured_at <= end_dt
                   ).order_by(models.Room.room_number, models.Elder.full_name).all()

        for r_i, (v, elder_name, room_num, staff_name) in enumerate(vitals, start=4):
            is_ab = v.is_abnormal
            row_vals = [
                r_i - 3,
                room_num or "N/A",
                elder_name,
                f"{v.bp_systolic}/{v.bp_diastolic}" if v.bp_systolic else "N/A",
                v.pulse or "N/A",
                f"{v.spo2}%" if v.spo2 else "N/A",
                f"{v.temperature}°C" if v.temperature else "N/A",
                "⚠️ BẤT THƯỜNG" if is_ab else "Bình thường",
                v.notes or "",
                staff_name or "N/A",
                v.measured_at.strftime("%H:%M:%S") if v.measured_at else ""
            ]
            ws2.row_dimensions[r_i].height = 20
            for c_i, val in enumerate(row_vals, start=1):
                c = ws2.cell(row=r_i, column=c_i, value=val)
                c.border = thin_border
                c.font = danger_font if (is_ab and c_i in [4, 5, 6, 7, 8]) else normal_font
                if is_ab: c.fill = danger_fill
                if c_i in [1, 2, 4, 5, 6, 7, 8, 11]:
                    c.alignment = center_align
                else:
                    c.alignment = Alignment(horizontal="left", vertical="center")

        ws2.column_dimensions["A"].width = 6
        ws2.column_dimensions["B"].width = 10
        ws2.column_dimensions["C"].width = 24
        ws2.column_dimensions["D"].width = 14
        ws2.column_dimensions["E"].width = 10
        ws2.column_dimensions["F"].width = 10
        ws2.column_dimensions["G"].width = 12
        ws2.column_dimensions["H"].width = 16
        ws2.column_dimensions["I"].width = 30
        ws2.column_dimensions["J"].width = 18
        ws2.column_dimensions["K"].width = 14

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        # Đặt tên file ngắn gọn
        filename = "Ca_Sang.xlsx" if report.shift_type == "Sang" else "Ca_Toi.xlsx"

        drive_url = upload_shift_handover_report_to_drive(
            file_bytes=output.getvalue(),
            facility_name=facility_name,
            shift_date_str=shift_date_str,
            filename=filename
        )
        logger.info(f"[HANDOVER REPORT DRIVE SUCCESS]: Đã lưu: {filename} -> {drive_url}")

    except Exception as e:
        logger.error(f"[EXPORT REPORT ERROR]: {str(e)}")
    finally:
        db.close()