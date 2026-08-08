import React, { useState, useEffect } from 'react';
import { careDutyApi } from '../api/careDutyApi';

export const ShiftReportView = ({ report, onEditReport, role = 'CARESTAFF' }) => {
  if (!report) return null;

  const currentRole = role.toUpperCase();
  const canEditReport = currentRole.includes('COORDINATOR') || currentRole.includes('ADMIN');
  const isAdminOrManager = currentRole.includes('ADMIN') || currentRole.includes('MANAGER');

  // State Toggle dành cho Admin / Manager
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Khi Toggle mở -> Gọi API lấy chi tiết vết sửa
  useEffect(() => {
    if (showEditHistory && report.id && isAdminOrManager) {
      setLoadingAudit(true);
      careDutyApi.getShiftReportAuditHistory(report.id)
        .then((res) => setAuditLogs(res?.data || res || []))
        .catch((err) => console.error('Lỗi lấy audit history:', err))
        .finally(() => setLoadingAudit(false));
    }
  }, [showEditHistory, report.id, isAdminOrManager]);

  const parseDescriptions = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n').filter(Boolean);
    return lines.map((line) => {
      const match = line.match(/^\d+\.\s*(.*?):\s*(.*)$/);
      if (match) {
        return { elderName: match[1].trim(), note: match[2].trim() };
      }
      return { elderName: 'Cụ', note: line };
    });
  };

  const parsedEvents = parseDescriptions(report.formatted_elder_descriptions);

  return (
    <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>BÁO CÁO GIAO CA HOÀN CHỈNH</span>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
            CƠ SỞ: {report.facility_name || 'Cơ sở 1'}
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
            ✓ Bản Báo Cáo Cuối
          </span>
          {canEditReport && onEditReport && (
            <button
              type="button"
              onClick={onEditReport}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d97706', backgroundColor: '#fffbeb', fontSize: '12px', fontWeight: '800', color: '#b45309', cursor: 'pointer' }}
            >
              ✏️ Chỉnh sửa báo cáo
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
        <div>
          <strong style={{ color: '#475569' }}>Người báo cáo:</strong> <span style={{ fontWeight: '800', color: '#0f172a' }}>{report.reporter_name}</span>
        </div>

        <div>
          <strong style={{ display: 'block', marginBottom: '8px', color: '#334155' }}>Diễn biến trong ca (Mới nhất):</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parsedEvents.length === 0 ? (
              <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>Không có sự cố nào ghi nhận.</div>
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
            {report.handover_notes}
          </div>
        </div>

        {/* TOGGLE DÀNH RIÊNG CHO MANAGER / ADMIN */}
        {isAdminOrManager && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                🛡️ Chế độ Quản lý: Xem lịch sử vết sửa báo cáo?
              </span>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showEditHistory}
                  onChange={(e) => setShowEditHistory(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: showEditHistory ? '#0284c7' : '#cbd5e1',
                  borderRadius: '999px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: showEditHistory ? '22px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>

            {/* VÙNG HIỂN THỊ CHI TIẾT AUDIT LOG KHI BẬT TOGGLE */}
            {showEditHistory && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loadingAudit ? (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '6px' }}>⏳ Đang tải vết chỉnh sửa từ server...</div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '6px' }}>Báo cáo gốc, chưa có lượt chỉnh sửa nào.</div>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} style={{ background: '#f1f5f9', borderLeft: '4px solid #0284c7', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                        <span>👤 {log.actor_name}</span>
                        <span>⏱️ {new Date(log.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <div style={{ color: '#334155', fontStyle: 'italic' }}>
                        💬 {log.payload}
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