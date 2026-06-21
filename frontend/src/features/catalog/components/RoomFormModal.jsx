import React, { useState, useEffect } from 'react';

export const RoomFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({ room_number: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động nạp dữ liệu nếu đang ở chế độ "Sửa", xóa trống nếu "Thêm mới"
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { room_number: '', description: '' });
    }
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
          <h3 style={styles.title}>
            {initialData ? '✏️ Cập Nhật Thông Tin Phòng' : '✨ Thêm Mới Khu Vực / Phòng'}
          </h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Số Phòng / Mã Khu Vực <span style={{color: '#EF4444'}}>*</span></label>
            <input
              type="text"
              required
              placeholder="VD: 101, VIP-1, Sảnh Chính..."
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mô Tả Chức Năng</label>
            <textarea
              placeholder="VD: Phòng tiêu chuẩn 2 giường, Gần cửa sổ..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={styles.textarea}
              rows="3"
            />
          </div>

          <div style={styles.footerActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>
              Hủy Bỏ
            </button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting || !formData.room_number.trim()}>
              {isSubmitting ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Tạo Phòng Mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  title: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', fontWeight: 'bold' },
  form: { padding: '20px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#334155' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box', resize: 'vertical' },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' },
  cancelBtn: { padding: '10px 16px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  submitBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
};