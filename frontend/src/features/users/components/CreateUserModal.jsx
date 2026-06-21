import React, { useState } from 'react';
import { ROLES } from '../../../utils/constants';

export const CreateUserModal = ({ isOpen, onClose, onSave, currentUserRole }) => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: ROLES.STAFF,
    is_active: true
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.full_name) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    onSave(formData);
    // Reset form sau khi gửi
    setFormData({ username: '', full_name: '', password: '', role: ROLES.STAFF, is_active: true });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalBox}>
        <h3 style={styles.title}>➕ Thêm Tài Khoản Nhân Sự Mới</h3>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label>Tên Đăng Nhập *</label>
            <input 
              type="text" 
              value={formData.username} 
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Họ và Tên Nhân Viên *</label>
            <input 
              type="text" 
              value={formData.full_name} 
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Mật Khẩu Khởi Tạo *</label>
            <input 
              type="password" 
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              placeholder="Nhập mật khẩu ban đầu..."
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Chức Vụ Hệ Thống *</label>
            <select 
              value={formData.role} 
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value={ROLES.STAFF}>Nhân viên tuần tra (Staff)</option>
              <option value={ROLES.MANAGER}>Quản lý cơ sở (Manager)</option>
              
              {/* HÀNG RÀO 1: Nếu role là Manager thì KHÔNG hiển thị tùy chọn tạo Admin */}
              {currentUserRole === ROLES.ADMIN && (
                <option value={ROLES.ADMIN}>Quản trị viên cấp cao (Admin)</option>
              )}
            </select>
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Hủy Bỏ</button>
            <button type="submit" style={styles.saveBtn}>Khởi Tạo Tài Khoản</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modalBox: { backgroundColor: '#FFF', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
  title: { margin: '0 0 20px 0', color: '#1F4E78', fontSize: '18px', fontWeight: 'bold' },
  inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#BDC3C7', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  saveBtn: { padding: '8px 16px', backgroundColor: '#1F4E78', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};