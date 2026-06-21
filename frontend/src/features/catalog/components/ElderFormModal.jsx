import React, { useState, useEffect } from 'react';

export const ElderFormModal = ({ isOpen, onClose, onSubmit, initialData, rooms }) => {
  const [formData, setFormData] = useState({ full_name: '', room_id: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(initialData || { full_name: '', room_id: '', notes: '' });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{initialData ? '✏️ Cập Nhật Hồ Sơ Cụ' : '✨ Đăng Ký Hồ Sơ Lưu Trú'}</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Họ và Tên Cụ <span style={{color: '#EF4444'}}>*</span></label>
            <input type="text" required placeholder="VD: Nguyễn Văn A..." value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} style={styles.input} autoFocus />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Xếp Phòng Lưu Trú <span style={{color: '#EF4444'}}>*</span></label>
            <select required value={formData.room_id || ''} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} style={styles.select}>
              <option value="" disabled>-- Chọn phòng cho Cụ --</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>Phòng {room.room_number} {room.description ? `(${room.description})` : ''}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Ghi chú y tế / Thói quen (Tùy chọn)</label>
            <textarea placeholder="VD: Cụ hay mất ngủ, cần ăn nhạt..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={styles.textarea} rows="3" />
          </div>

          <div style={styles.footerActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Hủy Bỏ</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting || !formData.full_name.trim() || !formData.room_id}>
              {isSubmitting ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Tạo Hồ Sơ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🔥 UI Chuẩn Hóa
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  title: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', fontWeight: 'bold' },
  form: { padding: '20px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#1E293B' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box', resize: 'vertical' },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' },
  cancelBtn: { padding: '10px 16px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  submitBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }
};