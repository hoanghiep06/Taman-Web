import React, { useState, useEffect } from 'react';
import { careDutyApi } from '../api/careDutyApi';

// HÀM VẼ TẢI ẢNH JPG PHONG CÁCH PHIẾU BÁO CÁO Y TẾ CAO CẤP
export const exportReportToJPG = (report, facilityAlerts = [], isHistory = false) => {
  const scale = 2; // Độ phân giải Retina HD
  const width = 800;
  const padding = 36;
  const contentWidth = width - padding * 2;

  // Xử lý dữ liệu văn bản
  const rawEvents = (report.formatted_elder_descriptions || '').split('\n').filter(Boolean);
  const cleanEvents = rawEvents.map(e => e.replace(/\bCụ\s+/gi, ''));
  const handoverNotes = (report.handover_notes || 'Không có lưu ý đặc biệt.').replace(/\bCụ\s+/gi, '');
  const realDangerAlerts = facilityAlerts.filter(alt => alt.issueDetail && alt.issueDetail.trim() !== '' && alt.alertType !== 'NOTE_ONLY');

  // Canvas phụ tính toán chiều cao động
  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  dummyCtx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const wrapText = (text, maxWidth) => {
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

  // Tính chiều cao
  let h = 40 + 70 + 20 + 80 + 24; // Header + Facility Info + Meta Grid

  // Chiều cao Diễn biến
  h += 36;
  if (cleanEvents.length === 0) {
    h += 40;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(item, contentWidth - 36);
      h += lines.length * 22 + 16;
    });
  }
  h += 20;

  // Chiều cao Cảnh báo
  if (realDangerAlerts.length > 0) {
    h += 36;
    realDangerAlerts.forEach(alt => {
      const lines = wrapText(`${alt.roomNumber} • ${alt.elderName} - ${alt.issueDetail}`, contentWidth - 36);
      h += lines.length * 22 + 16;
    });
    h += 20;
  }

  // Chiều cao Lưu ý ca sau
  h += 36;
  const noteLines = wrapText(handoverNotes, contentWidth - 32);
  h += Math.max(noteLines.length * 24 + 24, 60) + 40;

  // VẼ CANVAS CHÍNH
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = h * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Nền trắng tinh tế
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, h);

  // Đường viền trang trí xanh ngọc ở mép trên cùng
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, width, 6);

  let y = 32;

  // 1. HEADER THƯƠNG HIỆU TÂM AN
  ctx.fillStyle = '#0369a1';
  ctx.font = '800 12px -apple-system, sans-serif';
  ctx.fillText('VIỆN DƯỠNG LÃO TÂM AN', padding, y);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px -apple-system, sans-serif';
  ctx.fillText(isHistory ? 'PHIẾU TRÍCH XUẤT LỊCH SỬ GIAO CA' : 'PHIẾU BÁO CÁO GIAO CA Y TẾ', width - padding - 220, y);

  y += 24;

  // Tên Cơ sở
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px -apple-system, sans-serif';
  ctx.fillText(report.facility_name || `CS ${report.facility_id}`, padding, y + 8);

  y += 44;

  // Đường kẻ phân cách xám nhạt
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  y += 16;

  // 2. KHỐI THÔNG TIN METADATA (3 Ô CHUẨN ĐỒNG BỘ)
  const boxW = (contentWidth - 24) / 3;
  const drawMetaBox = (x, label, value, valColor = '#0f172a') => {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, 58, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '700 10px -apple-system, sans-serif';
    ctx.fillText(label, x + 12, y + 20);

    ctx.fillStyle = valColor;
    ctx.font = '800 13px -apple-system, sans-serif';
    ctx.fillText(value, x + 12, y + 40);
  };

  drawMetaBox(padding, 'NGÀY BÁO CÁO', report.shift_date || '');
  drawMetaBox(padding + boxW + 12, 'CA TRỰC', `Ca ${report.shift_type || 'Trực'}`, '#0284c7');
  
  const reporter = report.reporter_name || 'Điều phối viên';
  const cleanReporter = reporter.length > 20 ? reporter.substring(0, 18) + '...' : reporter;
  drawMetaBox(padding + (boxW + 12) * 2, 'NGƯỜI BÁO CÁO', cleanReporter);

  y += 78;

  // 3. SECTIONS CÁC DIỄN BIẾN TRONG CA
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 14px -apple-system, sans-serif';
  ctx.fillText('DIỄN BIẾN TRONG CA TRỰC', padding, y);
  y += 16;

  if (cleanEvents.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 13px -apple-system, sans-serif';
    ctx.fillText('Ca trực bình thường, không ghi nhận diễn biến đặc biệt.', padding, y + 16);
    y += 36;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(item, contentWidth - 36);
      const boxH = lines.length * 22 + 14;

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(padding, y, contentWidth, boxH, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Vệt trang trí xanh lá góc trái
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(padding, y, 4, boxH, { tl: 8, bl: 8, tr: 0, br: 0 });
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '600 13px -apple-system, sans-serif';
      lines.forEach((line, idx) => {
        ctx.fillText(line, padding + 16, y + 20 + idx * 22);
      });

      y += boxH + 8;
    });
  }

  y += 12;

  // 4. CẢNH BÁO SỨC KHỎE (CHỈ HIỂN THỊ NẾU CÓ CẢNH BÁO THỰC SỰ)
  if (realDangerAlerts.length > 0) {
    ctx.fillStyle = '#dc2626';
    ctx.font = '800 14px -apple-system, sans-serif';
    ctx.fillText('CẢNH BÁO SỨC KHỎE & CHỈ SỐ BẤT THƯỜNG', padding, y);
    y += 16;

    realDangerAlerts.forEach(alt => {
      const lines = wrapText(`${alt.roomNumber} • ${alt.elderName} - ${alt.issueDetail}`, contentWidth - 36);
      const boxH = lines.length * 22 + 14;

      ctx.fillStyle = '#fff1f2';
      ctx.beginPath();
      ctx.roundRect(padding, y, contentWidth, boxH, 8);
      ctx.fill();
      ctx.strokeStyle = '#fecdd3';
      ctx.stroke();

      ctx.fillStyle = '#be123c';
      ctx.font = '700 13px -apple-system, sans-serif';
      lines.forEach((line, idx) => {
        ctx.fillText(line, padding + 16, y + 20 + idx * 22);
      });

      y += boxH + 8;
    });
    y += 12;
  }

  // 5. HƯỚNG XỬ LÝ / LƯU Ý CA SAU
  ctx.fillStyle = '#b45309';
  ctx.font = '800 14px -apple-system, sans-serif';
  ctx.fillText('HƯỚNG XỬ LÝ & LƯU Ý CA TIẾP THEO', padding, y);
  y += 16;

  const handoverLines = wrapText(handoverNotes, contentWidth - 32);
  const handoverH = Math.max(handoverLines.length * 24 + 18, 54);

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.roundRect(padding, y, contentWidth, handoverH, 8);
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.font = '600 13.5px -apple-system, sans-serif';
  handoverLines.forEach((line, idx) => {
    ctx.fillText(line, padding + 16, y + 22 + idx * 24);
  });

  y += handoverH + 30;

  // FOOTER CHỮ KÝ MINH BẠCH
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  y += 18;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px -apple-system, sans-serif';
  ctx.fillText('Hệ thống Quản lý Ca trực Tâm An Healthcare • Báo cáo tự động', padding, y);
  ctx.fillText(new Date().toLocaleString('vi-VN'), width - padding - 130, y);

  // Tải file JPG
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
        const parsedEvents = parseDescriptions(report.formatted_elder_descriptions);
        const facilityAlerts = alerts.filter(a => Number(a.facilityId) === Number(report.facility_id));

        return (
          <SingleFacilityReportCard
            key={report.id}
            report={report}
            facilityAlerts={facilityAlerts}
            parsedEvents={parsedEvents}
            canEditReport={canEditReport}
            isAdminOrManager={isAdminOrManager}
            onEditReport={() => onEditReport && onEditReport(report)}
            onExportJPG={() => exportReportToJPG(report, facilityAlerts, false)}
          />
        );
      })}
    </div>
  );
};

const SingleFacilityReportCard = ({ report, facilityAlerts, parsedEvents, canEditReport, isAdminOrManager, onEditReport, onExportJPG }) => {
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
      borderRadius: '16px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '800' }}>
            🏢 {report.facility_name || `CƠ SỞ ${report.facility_id}`}
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