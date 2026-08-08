import React, { useState, useEffect, useMemo } from 'react';
import { exportReportToJPG } from './ShiftReportView';

// BẢNG MÀU ĐỒNG BỘ CHO MANAGER / ADMIN
const SHIFT_PALETTE = [
  { bg: '#f0f9ff', border: '#0284c7', badgeBg: '#e0f2fe', badgeColor: '#0369a1' },
  { bg: '#fdf4ff', border: '#c084fc', badgeBg: '#fae8ff', badgeColor: '#86198f' },
  { bg: '#f0fdf4', border: '#22c55e', badgeBg: '#dcfce7', badgeColor: '#15803d' },
  { bg: '#fffbeb', border: '#f59e0b', badgeBg: '#fef3c7', badgeColor: '#b45309' },
  { bg: '#fff1f2', border: '#f43f5e', badgeBg: '#ffe4e6', badgeColor: '#be123c' },
];

const getShiftColorStyle = (shiftDate, shiftType) => {
  const key = `${shiftDate}_${shiftType}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SHIFT_PALETTE.length;
  return SHIFT_PALETTE[index];
};

// HÀM VẼ KHUNG BO GÓC CANVAS
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

// HÀM TỰ ĐỘNG XUỐNG DÒNG VĂN BẢN
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

// HÀM TẠO ẢNH BÁO CÁO CŨ DÀNH RIÊNG CHO MANAGER / ADMIN
const exportHistoryReportAsJPG = (report) => {
  const scale = 2; // Độ phân giải Retina HD
  const baseWidth = 840;
  const margin = 32;
  const contentWidth = baseWidth - margin * 2;

  const rawEvents = (report.formatted_elder_descriptions || '').split('\n').filter(Boolean);
  const cleanEvents = rawEvents.map(e => e.replace(/\bCụ\s+/gi, ''));
  const handoverNotes = (report.handover_notes || 'Không có lưu ý đặc biệt.').replace(/\bCụ\s+/gi, '');

  // 1. TÍNH CHỈ SỐ CHIỀU CAO CANVAS ĐỘNG
  const dummyCanvas = document.createElement('canvas');
  const dummyCtx = dummyCanvas.getContext('2d');
  dummyCtx.font = '14px system-ui, -apple-system, sans-serif';

  let computedHeight = 30 + 90 + 20 + 70 + 20;

  // Chiều cao phần diễn biến
  computedHeight += 45;
  if (cleanEvents.length === 0) {
    computedHeight += 48;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(dummyCtx, item, contentWidth - 40);
      computedHeight += lines.length * 22 + 20;
    });
  }
  computedHeight += 16;

  // Chiều cao phần lưu ý
  computedHeight += 45;
  const noteLines = wrapText(dummyCtx, handoverNotes, contentWidth - 36);
  computedHeight += Math.max(noteLines.length * 24 + 24, 60);
  computedHeight += 70;

  // 2. VẼ CANVAS
  const canvas = document.createElement('canvas');
  canvas.width = baseWidth * scale;
  canvas.height = computedHeight * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, baseWidth, computedHeight);

  let currentY = 24;

  // 3. HEADER BANNER
  drawRoundedRect(ctx, margin, currentY, contentWidth, 90, 16, '#0f172a');
  drawRoundedRect(ctx, margin, currentY, 8, 90, { tl: 16, bl: 16, tr: 0, br: 0 }, '#0284c7');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('VIỆN DƯỠNG LÃO TÂM AN • BÁO CÁO GIAO CA LỊCH SỬ', margin + 24, currentY + 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText(report.facility_name || `CƠ SỞ ${report.facility_id}`, margin + 24, currentY + 62);

  drawRoundedRect(ctx, margin + contentWidth - 130, currentY + 28, 106, 32, 20, '#0369a1');
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.fillText('📜 BẢN LỊCH SỬ', margin + contentWidth - 118, currentY + 49);

  currentY += 106;

  // 4. METADATA GRID 3 CỘT
  const colGap = 12;
  const colWidth = (contentWidth - colGap * 2) / 3;

  // Ngày
  drawRoundedRect(ctx, margin, currentY, colWidth, 64, 12, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#64748b';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('NGÀY BÁO CÁO', margin + 14, currentY + 22);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 14px system-ui, sans-serif';
  ctx.fillText(report.shift_date || '', margin + 14, currentY + 44);

  // Ca Trực
  drawRoundedRect(ctx, margin + colWidth + colGap, currentY, colWidth, 64, 12, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#64748b';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('CA TRỰC', margin + colWidth + colGap + 14, currentY + 22);
  ctx.fillStyle = '#0369a1';
  ctx.font = '800 14px system-ui, sans-serif';
  ctx.fillText(`Ca ${report.shift_type || 'Trực'}`, margin + colWidth + colGap + 14, currentY + 44);

  // Người báo cáo
  drawRoundedRect(ctx, margin + (colWidth + colGap) * 2, currentY, colWidth, 64, 12, '#ffffff', '#e2e8f0');
  ctx.fillStyle = '#64748b';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('NGƯỜI BÁO CÁO', margin + (colWidth + colGap) * 2 + 14, currentY + 22);

  ctx.fillStyle = '#0f172a';
  const reporterName = report.reporter_name || 'Điều phối viên';
  const reporterLines = wrapText(dummyCtx, reporterName, colWidth - 28);

  if (reporterLines.length > 1) {
    ctx.font = '800 11.5px system-ui, sans-serif';
    ctx.fillText(reporterLines[0], margin + (colWidth + colGap) * 2 + 14, currentY + 38);
    ctx.fillText(reporterLines[1], margin + (colWidth + colGap) * 2 + 14, currentY + 52);
  } else {
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(reporterName, margin + (colWidth + colGap) * 2 + 14, currentY + 44);
  }

  currentY += 80;

  // 5. CÁC DIỄN BIẾN TRONG CA
  ctx.fillStyle = '#334155';
  ctx.font = '800 14px system-ui, sans-serif';
  ctx.fillText('📋 CÁC DIỄN BIẾN TRONG CA', margin, currentY + 14);
  currentY += 26;

  ctx.font = '14px system-ui, sans-serif';
  if (cleanEvents.length === 0) {
    drawRoundedRect(ctx, margin, currentY, contentWidth, 48, 12, '#ffffff', '#e2e8f0');
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px system-ui, sans-serif';
    ctx.fillText('Không ghi nhận diễn biến bất thường.', margin + 16, currentY + 28);
    currentY += 60;
  } else {
    cleanEvents.forEach(item => {
      const lines = wrapText(ctx, item, contentWidth - 40);
      const itemHeight = lines.length * 22 + 16;

      drawRoundedRect(ctx, margin, currentY, contentWidth, itemHeight, 10, '#ffffff', '#e2e8f0');
      
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(margin + 18, currentY + 18, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '600 13.5px system-ui, sans-serif';
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, margin + 32, currentY + 20 + lIdx * 22);
      });

      currentY += itemHeight + 8;
    });
    currentY += 12;
  }

  // 6. HƯỚNG XỬ LÝ / LƯU Ý CA SAU
  ctx.fillStyle = '#b45309';
  ctx.font = '800 14px system-ui, sans-serif';
  ctx.fillText('📌 HƯỚNG XỬ LÝ & LƯU Ý CHO CA TIẾP THEO', margin, currentY + 14);
  currentY += 26;

  ctx.font = '600 14px system-ui, sans-serif';
  const handoverLines = wrapText(ctx, handoverNotes, contentWidth - 36);
  const handoverBoxHeight = Math.max(handoverLines.length * 24 + 20, 56);

  drawRoundedRect(ctx, margin, currentY, contentWidth, handoverBoxHeight, 12, '#fffbeb', '#fde68a');

  ctx.fillStyle = '#78350f';
  handoverLines.forEach((line, lIdx) => {
    ctx.fillText(line, margin + 18, currentY + 24 + lIdx * 24);
  });

  currentY += handoverBoxHeight + 30;

  // 7. FOOTER
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(margin, currentY, contentWidth, 1);
  currentY += 16;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('Hệ thống Quản lý Ca trực Viện Dưỡng Lão Tâm An • Ảnh trích xuất lịch sử', margin, currentY);
  ctx.fillText(new Date().toLocaleString('vi-VN'), margin + contentWidth - 140, currentY);

  // 8. TẢI FILE JPG
  const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `LichSu_BaoCao_${(report.facility_name || 'CS').replace(/\s+/g, '_')}_${report.shift_date}.jpg`;
  link.click();
};

export const ShiftReportHistoryModal = ({ isOpen, onClose, facilityId, onFetchArchived, role = 'CARESTAFF' }) => {
  const currentRole = (role || '').toUpperCase();
  const isAdminOrManager = currentRole.includes('ADMIN') || currentRole.includes('MANAGER');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // States lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState('');
  const [limitDays, setLimitDays] = useState(7);

  const [showAuditLogsToggle, setShowAuditLogsToggle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, targetDate, shiftType, limitDays, showAuditLogsToggle]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await onFetchArchived({
        limit_days: targetDate ? undefined : limitDays,
        target_date: targetDate || undefined,
        shift_type: shiftType || undefined,
        include_history: showAuditLogsToggle && isAdminOrManager
      });
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableFacilities = useMemo(() => {
    const map = new Map();
    reports.forEach((r) => {
      if (r.facility_id) {
        map.set(String(r.facility_id), r.facility_name || `Cơ sở ${r.facility_id}`);
      }
    });
    return Array.from(map.entries());
  }, [reports]);

  const filteredReports = reports.filter((r) => {
    if (targetDate && r.shift_date !== targetDate) return false;
    if (shiftType && r.shift_type !== shiftType) return false;
    if (selectedFacilityFilter && String(r.facility_id) !== String(selectedFacilityFilter)) return false;

    const kw = searchTerm.toLowerCase().trim();
    if (!kw) return true;

    return (
      (r.reporter_name && r.reporter_name.toLowerCase().includes(kw)) ||
      (r.formatted_elder_descriptions && r.formatted_elder_descriptions.toLowerCase().includes(kw)) ||
      (r.handover_notes && r.handover_notes.toLowerCase().includes(kw)) ||
      (r.facility_name && r.facility_name.toLowerCase().includes(kw))
    );
  });

  const cleanElderText = (rawText) => {
    if (!rawText) return '';
    return rawText.replace(/\bCụ\s+/gi, '');
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '750px', maxHeight: '90vh', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>

        {/* HEADER MODAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>📚 TRA CỨU BÁO CÁO GIAO CA QUÁ KHỨ</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

        {/* BAR FILTER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Tìm tên, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
          />

          <select
            value={selectedFacilityFilter}
            onChange={(e) => setSelectedFacilityFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', backgroundColor: '#fff' }}
          >
            <option value="">Tất cả Cơ sở</option>
            {availableFacilities.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
          />

          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', backgroundColor: '#fff' }}
          >
            <option value="">Tất cả ca</option>
            <option value="Sang">Ca Sáng</option>
            <option value="Toi">Ca Tối</option>
          </select>
        </div>

        {/* NÚT LỌC NHANH & TOGGLE LỊCH SỬ MANAGER */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Nhanh:</span>
          {[3, 7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => { setLimitDays(d); setTargetDate(''); }}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: limitDays === d && !targetDate ? '#0284c7' : '#fff', color: limitDays === d && !targetDate ? '#fff' : '#333', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              {d} ngày
            </button>
          ))}

          {isAdminOrManager && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>🛡️ Vết sửa:</span>
              <input
                type="checkbox"
                checked={showAuditLogsToggle}
                onChange={(e) => setShowAuditLogsToggle(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* DANH SÁCH BÁO CÁO QUÁ KHỨ */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontWeight: 'bold' }}>⏳ Đang tải dữ liệu...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không thấy báo cáo giao ca phù hợp.</div>
          ) : (
            filteredReports.map((item, idx) => {
              const colorStyle = isAdminOrManager 
                ? getShiftColorStyle(item.shift_date, item.shift_type)
                : { bg: '#f8fafc', border: '#cbd5e1', badgeBg: '#0284c7', badgeColor: '#fff' };

              return (
                <div 
                  key={idx} 
                  style={{ 
                    backgroundColor: colorStyle.bg, 
                    borderLeft: `5px solid ${colorStyle.border}`,
                    border: `1px solid ${colorStyle.border}`,
                    borderRadius: '12px', 
                    padding: '12px 14px', 
                    marginBottom: '10px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                        🏢 {item.facility_name || `CS ${item.facility_id}`}
                      </span>

                      <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                        Ca {item.shift_type} - {item.shift_date}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                      {/* NÚT TẢI ẢNH ĐỘC QUYỀN CHO MANAGER / ADMIN */}
                      {isAdminOrManager && (
                        <button
                            type="button"
                            onClick={() => exportReportToJPG(item, [], true)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #0284c7',
                                backgroundColor: '#e0f2fe',
                                fontSize: '11px',
                                fontWeight: '800',
                                color: '#0369a1',
                                cursor: 'pointer'
                            }}
                            >
                            📸 Tải ảnh
                            </button>
                      )}

                      <span style={{ color: '#0369a1', fontWeight: '700', fontSize: '12px' }}>
                        👤 {item.reporter_name}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#1e293b', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '1.5' }}>
                    {cleanElderText(item.formatted_elder_descriptions)}
                  </div>

                  {item.handover_notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                      <b>📌 Lưu ý ca sau:</b> {item.handover_notes}
                    </div>
                  )}

                  {/* LỊCH SỬ CHỈNH SỬA CHO MANAGER */}
                  {showAuditLogsToggle && isAdminOrManager && item.edit_history && item.edit_history.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '4px' }}>
                        📜 Lịch sử chỉnh sửa ({item.edit_history.length} lần):
                      </div>
                      {item.edit_history.map((log, lIdx) => (
                        <div key={lIdx} style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', marginBottom: '4px' }}>
                          <b>{log.actor_name}</b> ({new Date(log.created_at).toLocaleString('vi-VN')}): {log.payload}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};