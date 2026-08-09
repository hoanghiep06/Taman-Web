import React, { useState, useEffect } from 'react';
import { shiftHandoverApi } from '../api/shiftHandoverApi';

const FACILITY_THEMES = {
  1: { border: '#0284c7', headerBg: '#e0f2fe', textColor: '#0369a1', badge: '🏢 CƠ SỞ 1 - THỦ ĐỨC' },
  2: { border: '#059669', headerBg: '#dcfce7', textColor: '#15803d', badge: '🏢 CƠ SỞ 2 - BÌNH CHÁNH' },
  default: { border: '#7c3aed', headerBg: '#f3e8ff', textColor: '#6d28d9', badge: '🏢 CƠ SỞ DỰ PHÒNG' }
};

// HÀM VẼ THẺ BO GÓC CANVAS
const drawRoundedRect = (ctx, x, y, width, height, radius, fillStyle = null, strokeStyle = null, lineWidth = 1) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};

// HÀM TẠO ẢNH BÁO CÁO CÓ GIAO DIỆN KHUÔN MẪU CHUẨN CARD UI (IMAGE_A090D4)
export const exportReportAsJPG = (report, facilityAlerts = [], isHistory = false) => {
  const scale = 2; // Độ phân giải Retina HD
  const baseWidth = 840;
  const margin = 28;
  const contentWidth = baseWidth - margin * 2;

  // Làm sạch dữ liệu
  const rawEvents = (report.formatted_elder_descriptions || '').split('\n').filter(Boolean);
  const cleanEvents = rawEvents.map(e => e.replace(/\bCụ\s+/gi, ''));
  const handoverNotes = (report.handover_notes || 'Không có lưu ý đặc biệt.').replace(/\bCụ\s+/gi, '');

  // CHỈ LẤY NHỮNG CỤ CÓ CHỈ SỐ SỨC KHỎE BẤT THƯỜNG THỰC SỰ
  const realDangerAlerts = facilityAlerts.filter(
    alt => alt.issueDetail && alt.issueDetail.trim() !== '' && alt.alertType !== 'NOTE_ONLY'
  );

  // Canvas phụ để đo chiều cao văn bản
  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');

  const wrapText = (text, maxWidth, font) => {
    dummyCtx.font = font;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      if (dummyCtx.measureText(testLine).width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // 1. TÍNH TOÁN CHÍNH XÁC CHIỀU CAO CỦA TẤM ẢNH
  let h = margin + 92 + 20 + 68 + 24; // Header + Meta Grid + Margin

  // Chiều cao Diễn biến trong ca
  h += 32;
  if (cleanEvents.length === 0) {
    h += 48 + 12;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(item, contentWidth - 44, '600 14px system-ui, -apple-system, sans-serif');
      h += lines.length * 22 + 18 + 8;
    });
    h += 12;
  }

  // Chiều cao Cảnh báo sức khỏe
  if (realDangerAlerts.length > 0) {
    h += 32;
    realDangerAlerts.forEach(alt => {
      const text = `${alt.roomNumber} • ${alt.elderName} - ${alt.issueDetail}`;
      const lines = wrapText(text, contentWidth - 32, '700 13.5px system-ui, -apple-system, sans-serif');
      h += lines.length * 22 + 18 + 8;
    });
    h += 12;
  }

  // Chiều cao Lưu ý ca sau
  h += 32;
  const noteLines = wrapText(handoverNotes, contentWidth - 32, '500 14px system-ui, -apple-system, sans-serif');
  const noteBoxH = Math.max(noteLines.length * 24 + 20, 56);
  h += noteBoxH + 28;

  // Footer
  h += 40;

  // 2. KHỞI TẠO CANVAS THẬT VỚI KÍCH THƯỚC CHUẨN
  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = h * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background Slate Nền xám nhạt
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, baseWidth, h);

  let currentY = margin;

  // -------------------------------------------------------------
  // A. HEADER BANNER NỀN ĐEN NAVY (#0b1329)
  // -------------------------------------------------------------
  drawRoundedRect(ctx, margin, currentY, contentWidth, 92, 18, '#0b1329');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('VIỆN DƯỠNG LÃO TÂM AN • BÁO CÁO GIAO CA Y TẾ', margin + 24, currentY + 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(report.facility_name || `CS ${report.facility_id}`, margin + 24, currentY + 65);

  // Badge trạng thái góc phải Header
  const badgeText = isHistory ? '📜 BẢN LỊCH SỬ' : '✓ ĐÃ CHỐT CA';
  const badgeBg = isHistory ? '#0284c7' : '#16a34a';
  drawRoundedRect(ctx, margin + contentWidth - 140, currentY + 28, 116, 36, 18, badgeBg);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 12.5px system-ui, -apple-system, sans-serif';
  ctx.fillText(badgeText, margin + contentWidth - 126, currentY + 51);

  currentY += 92 + 20;

  // -------------------------------------------------------------
  // B. KHỐI TỔNG HỢP THÔNG TIN 3 CỘT (METADATA GRID)
  // -------------------------------------------------------------
  const colGap = 12;
  const colWidth = (contentWidth - colGap * 2) / 3;

  // Box 1: Ngày
  drawRoundedRect(ctx, margin, currentY, colWidth, 68, 14, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('NGÀY BÁO CÁO', margin + 16, currentY + 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(report.shift_date || '', margin + 16, currentY + 48);

  // Box 2: Ca Trực
  drawRoundedRect(ctx, margin + colWidth + colGap, currentY, colWidth, 68, 14, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('CA TRỰC', margin + colWidth + colGap + 16, currentY + 24);
  ctx.fillStyle = '#0284c7';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Ca ${report.shift_type || 'Trực'}`, margin + colWidth + colGap + 16, currentY + 48);

  // Box 3: Người báo cáo (Đã sửa hiển thị ĐẦY ĐỦ TÊN 100%)
  drawRoundedRect(ctx, margin + (colWidth + colGap) * 2, currentY, colWidth, 68, 14, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('NGƯỜI BÁO CÁO', margin + (colWidth + colGap) * 2 + 16, currentY + 24);

  ctx.fillStyle = '#0f172a';
  const reporterName = report.reporter_name || 'Điều phối viên';
  const nameLines = wrapText(reporterName, colWidth - 28, '800 13.5px system-ui, -apple-system, sans-serif');

  if (nameLines.length > 1) {
    ctx.font = '800 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(nameLines[0], margin + (colWidth + colGap) * 2 + 16, currentY + 41);
    ctx.fillText(nameLines[1], margin + (colWidth + colGap) * 2 + 16, currentY + 55);
  } else {
    ctx.font = '800 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(reporterName, margin + (colWidth + colGap) * 2 + 16, currentY + 48);
  }

  currentY += 68 + 24;

  // -------------------------------------------------------------
  // C. CÁC DIỄN BIẾN TRONG CA
  // -------------------------------------------------------------
  ctx.fillStyle = '#334155';
  ctx.font = '800 14.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('📋 CÁC DIỄN BIẾN TRONG CA', margin, currentY);
  currentY += 12;

  if (cleanEvents.length === 0) {
    drawRoundedRect(ctx, margin, currentY, contentWidth, 48, 12, '#ffffff', '#e2e8f0');
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('Ca trực bình thường, không ghi nhận diễn biến đặc biệt.', margin + 18, currentY + 29);
    currentY += 48 + 16;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(item, contentWidth - 44, '600 14px system-ui, -apple-system, sans-serif');
      const boxH = lines.length * 22 + 18;

      drawRoundedRect(ctx, margin, currentY, contentWidth, boxH, 12, '#ffffff', '#e2e8f0');

      // Chấm tròn Xanh lá
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(margin + 20, currentY + 20, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '600 14px system-ui, -apple-system, sans-serif';
      lines.forEach((line, idx) => {
        ctx.fillText(line, margin + 34, currentY + 24 + idx * 22);
      });

      currentY += boxH + 8;
    });
    currentY += 12;
  }

  // -------------------------------------------------------------
  // D. CẢNH BÁO SỨC KHỎE (CHỈ HIỂN THỊ KHI CÓ BẤT THƯỜNG THỰC SỰ)
  // -------------------------------------------------------------
  if (realDangerAlerts.length > 0) {
    ctx.fillStyle = '#9f1239';
    ctx.font = '800 14.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('🚨 CẢNH BÁO SỨC KHỎE & CHỈ SỐ BẤT THƯỜNG', margin, currentY);
    currentY += 12;

    realDangerAlerts.forEach(alt => {
      const text = `${alt.roomNumber} • ${alt.elderName} - ${alt.issueDetail}`;
      const lines = wrapText(text, contentWidth - 32, '700 13.5px system-ui, -apple-system, sans-serif');
      const boxH = lines.length * 22 + 18;

      drawRoundedRect(ctx, margin, currentY, contentWidth, boxH, 12, '#fff1f2', '#fecdd3');

      ctx.fillStyle = '#be123c';
      ctx.font = '700 13.5px system-ui, -apple-system, sans-serif';
      lines.forEach((line, idx) => {
        ctx.fillText(line, margin + 16, currentY + 22 + idx * 22);
      });

      currentY += boxH + 8;
    });
    currentY += 12;
  }

  // -------------------------------------------------------------
  // E. HƯỚNG XỬ LÝ & LƯU Ý CHO CA TIẾP THEO
  // -------------------------------------------------------------
  ctx.fillStyle = '#b45309';
  ctx.font = '800 14.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('📌 HƯỚNG XỬ LÝ & LƯU Ý CHO CA TIẾP THEO', margin, currentY);
  currentY += 12;

  ctx.font = '500 14px system-ui, -apple-system, sans-serif';
  const handoverLines = wrapText(handoverNotes, contentWidth - 32, '500 14px system-ui, -apple-system, sans-serif');
  const handoverBoxH = Math.max(handoverLines.length * 24 + 20, 56);

  drawRoundedRect(ctx, margin, currentY, contentWidth, handoverBoxH, 12, '#fffbeb', '#fde68a');

  ctx.fillStyle = '#78350f';
  handoverLines.forEach((line, idx) => {
    ctx.fillText(line, margin + 16, currentY + 24 + idx * 24);
  });

  currentY += handoverBoxH + 28;

  // -------------------------------------------------------------
  // F. FOOTER TÂM AN HEALTHCARE
  // -------------------------------------------------------------
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, currentY);
  ctx.lineTo(baseWidth - margin, currentY);
  ctx.stroke();

  currentY += 18;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('Hệ thống Quản lý Ca trực Viện Dưỡng Lão Tâm An • Ảnh báo cáo xuất tự động', margin, currentY);

  const nowStr = new Date().toLocaleString('vi-VN');
  const timeWidth = dummyCtx.measureText(nowStr).width;
  ctx.fillText(nowStr, baseWidth - margin - timeWidth, currentY);

  // 3. TẢI FILE JPG NẾU XUẤT ẢNH
  const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `BaoCao_${(report.facility_name || 'CS').replace(/\s+/g, '_')}_${report.shift_date}.jpg`;
  link.click();
};

export const ShiftReportView = ({ reports, alerts = [], onEditReport, role = 'CARESTAFF' }) => {
  const reportsList = Array.isArray(reports) ? reports : (reports ? [reports] : []);
  if (reportsList.length === 0) return null;

  const currentRole = role.toUpperCase();
  const canEditReport = currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN');
  const isAdminOrManager = currentRole.includes('ADMIN') || currentRole.includes('MANAGER');

  const parseDescriptions = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n').filter(Boolean);
    return lines.map((line) => {
      const match = line.match(/^\d+\.\s*(.*?):\s*(.*)$/);
      if (match) {
        const cleanName = match[1].replace(/^Cụ\s+/i, '').trim();
        return { elderName: cleanName, note: match[2].trim() };
      }
      return { elderName: 'Ghi chú', note: line.replace(/^Cụ\s+/i, '') };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
      {reportsList.map((report) => {
        const theme = FACILITY_THEMES[report.facility_id] || FACILITY_THEMES.default;
        const parsedEvents = parseDescriptions(report.formatted_elder_descriptions);
        const facilityAlerts = alerts.filter(a => Number(a.facilityId) === Number(report.facility_id));

        return (
          <SingleFacilityReportCard
            key={report.id}
            report={report}
            facilityAlerts={facilityAlerts}
            theme={theme}
            parsedEvents={parsedEvents}
            canEditReport={canEditReport}
            isAdminOrManager={isAdminOrManager}
            onEditReport={() => onEditReport && onEditReport(report)}
            onExportJPG={() => exportReportAsJPG(report, facilityAlerts, false)}
          />
        );
      })}
    </div>
  );
};

const SingleFacilityReportCard = ({ report, theme, parsedEvents, canEditReport, isAdminOrManager, onEditReport, onExportJPG }) => {
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (showEditHistory && report.id && isAdminOrManager) {
      setLoadingAudit(true);
      careDutyApi.getShiftReportAuditHistory(report.id)
        .then((res) => setAuditLogs(res?.data || res || []))
        .catch((err) => console.error('Lỗi lấy audit history:', err))
        .finally(() => setLoadingAudit(false));
    }
  }, [showEditHistory, report.id, isAdminOrManager]);

  return (
    <div style={{
      background: '#ffffff',
      padding: '20px',
      borderRadius: '18px',
      border: `3px solid ${theme.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ background: theme.headerBg, color: theme.textColor, padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px' }}>
            {report.facility_name || theme.badge}
          </span>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '6px 0 0 0' }}>
            BÁO CÁO GIAO CA CHÍNH THỨC
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onExportJPG}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #0284c7', backgroundColor: '#e0f2fe', fontSize: '12px', fontWeight: '800', color: '#0369a1', cursor: 'pointer' }}
          >
            📸 Tải ảnh Zalo
          </button>

          <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
            ✓ Đã chốt ca
          </span>

          {canEditReport && (
            <button
              type="button"
              onClick={onEditReport}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d97706', backgroundColor: '#fffbeb', fontSize: '12px', fontWeight: '800', color: '#b45309', cursor: 'pointer' }}
            >
              ✏️ Hiệu chỉnh
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
        <div>
          <strong style={{ color: '#475569' }}>Người báo cáo:</strong> <span style={{ fontWeight: '800', color: '#0f172a' }}>{report.reporter_name}</span>
        </div>

        <div>
          <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Diễn biến trong ca:</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parsedEvents.length === 0 ? (
              <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>Không có ghi nhận.</div>
            ) : (
              parsedEvents.map((item, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>
                    {item.elderName}
                  </span>
                  <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '13px' }}>
                    {item.note}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <strong style={{ display: 'block', marginBottom: '4px', color: '#334155' }}>Hướng xử lý / Lưu ý ca sau:</strong>
          <div style={{ background: '#fffbeb', color: '#78350f', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fef3c7', fontWeight: '700', lineHeight: '1.5' }}>
            {report.handover_notes || 'Không có lưu ý đặc biệt.'}
          </div>
        </div>

        {isAdminOrManager && (
          <div style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                🛡️ Xem lịch sử vết sửa báo cáo này
              </span>
              <input
                type="checkbox"
                checked={showEditHistory}
                onChange={(e) => setShowEditHistory(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {showEditHistory && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {loadingAudit ? (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '4px' }}>Đang tải log...</div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '4px' }}>Chưa có lượt sửa nào.</div>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} style={{ background: '#f1f5f9', borderLeft: '4px solid #0284c7', padding: '8px 10px', borderRadius: '6px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#0f172a' }}>
                        <span>👤 {log.actor_name}</span>
                        <span>🕒 {new Date(log.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <div style={{ color: '#334155', fontStyle: 'italic', marginTop: '2px' }}>
                        {log.payload}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};