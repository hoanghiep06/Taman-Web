import React, { useState, useEffect } from 'react';

export const AssetFormModal = ({ isOpen, onClose, onSubmit, initialData, rooms, elders }) => {
  const [formData, setFormData] = useState({ asset_name: '', description: '', room_id: '', elder_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(initialData || { asset_name: '', description: '', room_id: '', elder_id: '' });
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const availableElders = elders.filter(e => e.room_id === parseInt(formData.room_id));

  const handleRoomChange = (e) => setFormData({ ...formData, room_id: e.target.value, elder_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ ...formData, elder_id: formData.elder_id ? parseInt(formData.elder_id) : null });
    setIsSubmitting(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{initialData ? '✏️ Cập Nhật Tài Sản' : '✨ Thêm Tài Sản'}</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên Tài Sản / Vật Tư <span style={{color: '#EF4444'}}>*</span></label>
            <input type="text" required placeholder="VD: Máy trợ oxy Yuwell..." value={formData.asset_name} onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })} style={styles.input} autoFocus />
          </div>

          <div style={styles.formGroupRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Thuộc Phòng <span style={{color: '#EF4444'}}>*</span></label>
              {/* SELECT ĐÃ FIX MÀU: Nền trắng, chữ đen, viền xám đậm */}
              <select required value={formData.room_id || ''} onChange={handleRoomChange} style={styles.select}>
                <option value="" disabled>-- Chọn Phòng --</option>
                {rooms.map(room => <option key={room.id} value={room.id}>Phòng {room.room_number}</option>)}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Người Sở Hữu</label>
              <select value={formData.elder_id || ''} onChange={(e) => setFormData({ ...formData, elder_id: e.target.value })} style={!formData.room_id ? styles.selectDisabled : styles.select} disabled={!formData.room_id}>
                <option value="">Tài sản chung phòng</option>
                {availableElders.map(elder => <option key={elder.id} value={elder.id}>👵 {elder.full_name}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Đặc điểm nhận dạng</label>
            <textarea placeholder="VD: Màu trắng, model 8F-5AW..." value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={styles.textarea} rows="2" />
          </div>

          <div style={styles.footerActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Hủy Bỏ</button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting || !formData.asset_name.trim() || !formData.room_id}>
              {isSubmitting ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Thêm Tài Sản')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🔥 ĐÃ FIX UI CHO TOÀN BỘ Ô NHẬP LIỆU: Bỏ trong suốt, ép màu chữ đậm
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '500px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  title: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', fontWeight: 'bold' },
  form: { padding: '20px' },
  formGroup: { marginBottom: '16px' },
  formGroupRow: { display: 'flex', gap: '16px', marginBottom: '16px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#1E293B' },
  
  // UI Cập nhật cho Ô nhập liệu & Select Box (Tương phản cao)
  input: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box', resize: 'vertical' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #94A3B8', borderRadius: '8px', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },
  selectDisabled: { width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', color: '#94A3B8', backgroundColor: '#F1F5F9', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' },
  
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' },
  cancelBtn: { padding: '10px 16px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  submitBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }
};