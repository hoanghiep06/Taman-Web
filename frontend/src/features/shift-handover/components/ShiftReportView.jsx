import React, { useState, useEffect } from 'react';
import { shiftHandoverApi } from '../api/shiftHandoverApi';

// Tạo bảng màu động dựa theo Facility ID, không hardcode tên cơ sở
const getFacilityTheme = (facilityId) => {
  const THEME_PALETTES = [
    { border: '#0284c7', headerBg: '#e0f2fe', textColor: '#0369a1' },
    { border: '#059669', headerBg: '#dcfce7', textColor: '#15803d' },
    { border: '#7c3aed', headerBg: '#f3e8ff', textColor: '#6d28d9' },
    { border: '#d97706', headerBg: '#fef3c7', textColor: '#b45309' },
  ];
  if (!facilityId) return THEME_PALETTES[0];
  const idx = Math.abs(Number(facilityId)) % THEME_PALETTES.length;
  return THEME_PALETTES[idx];
};

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

const formatAuditOldContent = (rawPayload) => {
  if (!rawPayload) return 'Không có dữ liệu cũ';

  try {
    const obj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    if (obj && obj.old) {
      const oldElder = obj.old.elder_descriptions || 'Không có ghi nhận';
      const oldHandover = obj.old.handover_notes || 'Không có ghi chú';
      return `Diễn biến Cụ: [${oldElder}] | Giao ca: [${oldHandover}]`;
    }

    if (obj && (obj.old_content || obj.old_notes)) {
      return obj.old_content || obj.old_notes;
    }
  } catch (e) {}

  let text = String(rawPayload);
  if (text.includes('-->') || text.includes('->')) {
    const separator = text.includes('-->') ? '-->' : '->';
    text = text.split(separator)[0];
  }
  return text
    .replace(/^NỘI DUNG CŨ:\s*/i, '')
    .replace(/^Ghi chú cũ:\s*/i, '')
    .trim();
};

export const exportReportAsJPG = (report, facilityAlerts = [], isHistory = false) => {
  const scale = 2;
  const baseWidth = 840;
  const margin = 28;
  const contentWidth = baseWidth - margin * 2;

  const rawEvents = (report.formatted_elder_descriptions || '').split('\n').filter(Boolean);
  const cleanEvents = rawEvents.map(e => e.replace(/\bCụ\s+/gi, ''));
  const handoverNotes = (report.handover_notes || 'Không có lưu ý đặc biệt.').replace(/\bCụ\s+/gi, '');

  const realDangerAlerts = facilityAlerts.filter(
    alt => alt.issueDetail && alt.issueDetail.trim() !== '' && alt.alertType !== 'NOTE_ONLY'
  );

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

  let h = margin + 92 + 20 + 68 + 24;

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

  if (realDangerAlerts.length > 0) {
    h += 32;
    realDangerAlerts.forEach(alt => {
      const text = `${alt.roomNumber} • ${alt.elderName} - ${alt.issueDetail}`;
      const lines = wrapText(text, contentWidth - 32, '700 13.5px system-ui, -apple-system, sans-serif');
      h += lines.length * 22 + 18 + 8;
    });
    h += 12;
  }

  h += 32;
  const noteLines = wrapText(handoverNotes, contentWidth - 32, '500 14px system-ui, -apple-system, sans-serif');
  const noteBoxH = Math.max(noteLines.length * 24 + 20, 56);
  h += noteBoxH + 28;

  h += 40;

  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = h * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, baseWidth, h);

  let currentY = margin;

  // HEADER BANNER
  drawRoundedRect(ctx, margin, currentY, contentWidth, 92, 18, '#0b1329');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('VIỆN DƯỠNG LÃO TÂM AN • BÁO CÁO GIAO CA Y TẾ', margin + 24, currentY + 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(report.facility_name || `Cơ sở ${report.facility_id}`, margin + 24, currentY + 65);

  const badgeText = isHistory ? '📜 BẢN LỊCH SỬ' : '✓ ĐÃ CHỐT CA';
  const badgeBg = isHistory ? '#0284c7' : '#16a34a';
  drawRoundedRect(ctx, margin + contentWidth - 140, currentY + 28, 116, 36, 18, badgeBg);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 12.5px system-ui, -apple-system, sans-serif';
  ctx.fillText(badgeText, margin + contentWidth - 126, currentY + 51);

  currentY += 92 + 20;

  // METADATA GRID
  const colGap = 12;
  const colWidth = (contentWidth - colGap * 2) / 3;

  drawRoundedRect(ctx, margin, currentY, colWidth, 68, 14, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('NGÀY BÁO CÁO', margin + 16, currentY + 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(report.shift_date || '', margin + 16, currentY + 48);

  drawRoundedRect(ctx, margin + colWidth + colGap, currentY, colWidth, 68, 14, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('CA TRỰC', margin + colWidth + colGap + 16, currentY + 24);
  ctx.fillStyle = '#0284c7';
  ctx.font = '800 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Ca ${report.shift_type || 'Trực'}`, margin + colWidth + colGap + 16, currentY + 48);

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

  // DIỄN BIẾN TRONG CA
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

  // CẢNH BÁO SỨC KHỎE
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

  // LƯU Ý CA TIẾP THEO
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

  // FOOTER
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

  const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `BaoCao_${(report.facility_name || `CS_${report.facility_id}`).replace(/\s+/g, '_')}_${report.shift_date}.jpg`;
  link.click();
};

export const ShiftReportView = ({ reports, alerts = [], onEditReport, role = 'CAREGIVER' }) => {
  const reportsList = Array.isArray(reports) ? reports : (reports ? [reports] : []);
  if (reportsList.length === 0) return null;

  const currentRole = role.toUpperCase();
  const canEditReport =
    currentRole.includes('COORDINATOR') ||
    currentRole.includes('ADMIN') ||
    currentRole.includes('MANAGER') ||
    currentRole.includes('DOCTOR');
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
        const theme = getFacilityTheme(report.facility_id);
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
          />
        );
      })}
    </div>
  );
};

const SingleFacilityReportCard = ({ report, theme, parsedEvents, canEditReport, isAdminOrManager, onEditReport }) => {
  const isPrevious = Boolean(report.isPrevious);
  const shiftName = report.shift_type === 'Sang' ? 'Ca Sáng' : 'Ca Tối';

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: isPrevious ? '2px dashed #f59e0b' : `2px solid ${theme.border}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      overflow: 'hidden'
    }}>
      {/* BANNER TRẠNG THÁI HIỆN TẠI / QUÁ KHỨ */}
      {isPrevious ? (
        <div style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#b45309',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          <span>⚠️ BẢN THAM KHẢO TỪ CA TRƯỚC (Chưa tạo báo cáo ca hôm nay)</span>
          <span>Ngày cũ: {report.shift_date} ({shiftName})</span>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ecfdf5',
          borderBottom: '1px solid #a7f3d0',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#047857',
          fontSize: '12px',
          fontWeight: '800'
        }}>
          <span>🟢 BÁO CÁO GIAO CA CHÍNH THỨC - HÔM NAY</span>
          <span>{report.shift_date} • {shiftName}</span>
        </div>
      )}

      {/* NỘI DUNG CARD */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ background: theme.headerBg, color: theme.textColor, padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '900' }}>
              🏢 {report.facility_name || `Cơ sở ${report.facility_id}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Người báo cáo: <b style={{ color: '#0f172a' }}>{report.reporter_name}</b>
            </span>

            {canEditReport && (
              <button
                type="button"
                onClick={onEditReport}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                ✏️ Hiệu chỉnh
              </button>
            )}
          </div>
        </div>

        {/* CÁC DIỄN BIẾN TRONG CA */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
            1. DIỄN BIẾN TRONG CA:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {parsedEvents.length === 0 ? (
              <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '13px' }}>Không có ghi nhận.</div>
            ) : (
              parsedEvents.map((item, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
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

        {/* HƯỚNG XỬ LÝ / LƯU Ý CA SAU */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
            2. LƯU Ý / BÀN GIAO CHO CA SAU:
          </div>
          <div style={{ background: '#fffbeb', color: '#78350f', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fef3c7', fontWeight: '600', fontSize: '13px' }}>
            {report.handover_notes || 'Không có lưu ý đặc biệt.'}
          </div>
        </div>
      </div>
    </div>
  );
};

