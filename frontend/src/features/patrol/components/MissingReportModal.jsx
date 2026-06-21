import React, { useState, useEffect } from 'react';
import { theme } from '../utils/theme';

export const MissingReportModal = ({ isOpen, onClose, onSubmit }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) setNote('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (note.trim().length > 0) onSubmit(note);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h4 style={styles.modalTitle}>⚠️ Báo cáo sự cố / mất đồ</h4>
        <p style={styles.modalSubtitle}>Mô tả ngắn gọn lý do để lưu vào nhật ký kiểm kê.</p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Không tìm thấy trong phòng, đã hỏi điều dưỡng..."
            style={styles.textarea}
            required
          />
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Quay lại</button>
            <button type="submit" disabled={note.trim().length === 0} style={{
              ...styles.confirmBtn,
              opacity: note.trim().length === 0 ? 0.5 : 1,
              cursor: note.trim().length === 0 ? 'not-allowed' : 'pointer',
            }}>Xác nhận</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  modalContent: { backgroundColor: theme.color.surface, padding: '20px', borderRadius: theme.radius.xxl, width: '100%', maxWidth: '340px', boxShadow: theme.shadow.xl },
  modalTitle: { margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: theme.color.ink },
  modalSubtitle: { margin: '0 0 14px 0', fontSize: '12.5px', color: theme.color.inkTertiary, lineHeight: 1.5 },
  textarea: { width: '100%', height: '88px', padding: '12px', boxSizing: 'border-box', borderRadius: theme.radius.md, border: `1.5px solid ${theme.color.borderStrong}`, resize: 'none', fontSize: '16px', marginBottom: '16px', fontFamily: 'inherit', color: theme.color.ink },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  cancelBtn: { padding: '10px 14px', backgroundColor: theme.color.surfaceMuted, border: 'none', borderRadius: theme.radius.md, fontSize: '13px', color: theme.color.inkSecondary, fontWeight: '600', cursor: 'pointer' },
  confirmBtn: { padding: '10px 16px', backgroundColor: theme.color.danger, border: 'none', borderRadius: theme.radius.md, fontSize: '13px', color: '#FFF', fontWeight: '700' },
};