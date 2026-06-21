import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { authApi } from '../api/authApi';

export const ResetPasswordPage = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [strength, setStrength] = useState({ length: false, upperLower: false, number: false });

  const { user, clearMustChangePasswordFlag } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    setStrength({ 
      length: newPassword.length >= 8, 
      upperLower: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword), 
      number: /[0-9]/.test(newPassword) 
    });
  }, [newPassword]);

  const isPasswordStrong = strength.length && strength.upperLower && strength.number;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Mật khẩu mới chưa đáp ứng đủ tiêu chuẩn độ mạnh an toàn!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      clearMustChangePasswordFlag(); 
      if (user.role === 'Staff') navigate('/rooms');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalBox}>
        <div style={styles.iconWarning}>🔒</div>
        <h3 style={styles.warningTitle}>KÍCH HOẠT TÀI KHOẢN</h3>
        <p style={styles.infoText}>Đây là lần đầu đăng nhập. Bạn bắt buộc phải đổi mật khẩu mới để bảo mật hệ thống.</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu hiện tại</label>
            <div style={styles.passwordWrapper}>
              <input 
                type={showOld ? "text" : "password"} 
                value={oldPassword} 
                onChange={(e) => setOldPassword(e.target.value)} 
                style={styles.inputPassword}
                placeholder="Nhập mật khẩu đang dùng..."
                required 
              />
              <button type="button" style={styles.eyeButton} onClick={() => setShowOld(!showOld)} tabIndex="-1">
                {showOld ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu mới</label>
            <div style={styles.passwordWrapper}>
              <input 
                type={showNew ? "text" : "password"} 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                style={styles.inputPassword}
                placeholder="Nhập mật khẩu mới..."
                required 
              />
              <button type="button" style={styles.eyeButton} onClick={() => setShowNew(!showNew)} tabIndex="-1">
                {showNew ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div style={styles.strengthChecker}>
            <div style={{ color: strength.length ? '#27AE60' : '#E74C3C' }}>{strength.length ? '✔' : '✖'} Dài tối thiểu 8 ký tự</div>
            <div style={{ color: strength.upperLower ? '#27AE60' : '#E74C3C' }}>{strength.upperLower ? '✔' : '✖'} Có chữ hoa & chữ thường</div>
            <div style={{ color: strength.number ? '#27AE60' : '#E74C3C' }}>{strength.number ? '✔' : '✖'} Có ít nhất 1 chữ số</div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Xác nhận mật khẩu mới</label>
            <div style={styles.passwordWrapper}>
              <input 
                type={showConfirm ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                style={styles.inputPassword}
                placeholder="Nhập lại mật khẩu mới..."
                required 
              />
              <button type="button" style={styles.eyeButton} onClick={() => setShowConfirm(!showConfirm)} tabIndex="-1">
                {showConfirm ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !isPasswordStrong} 
            style={{ ...styles.submitButton, opacity: (isSubmitting || !isPasswordStrong) ? 0.6 : 1 }}
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(31, 78, 120, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontFamily: "'Segoe UI', sans-serif" },
  modalBox: { backgroundColor: '#FFF', padding: '35px', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
  iconWarning: { fontSize: '40px', textAlign: 'center', marginBottom: '10px' },
  warningTitle: { color: '#1F4E78', margin: '0 0 10px 0', textAlign: 'center', fontWeight: '800', fontSize: '20px' },
  infoText: { fontSize: '14px', color: '#7F8C8D', lineHeight: '1.5', marginBottom: '25px', textAlign: 'center' },
  inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { marginBottom: '8px', fontSize: '13px', color: '#34495E', fontWeight: '700' },
  
  // Đồng bộ ô Input cho màn hình Reset
  passwordWrapper: { position: 'relative', display: 'flex', width: '100%' },
  inputPassword: { 
    width: '100%', padding: '12px', paddingRight: '50px', borderRadius: '8px', 
    border: '1px solid #B0BEC5', fontSize: '14px', outline: 'none', backgroundColor: '#FFFFFF', 
    color: '#1A252F', fontWeight: '500', boxSizing: 'border-box', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' 
  },
  
  eyeButton: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '5px', color: '#7F8C8D' },
  strengthChecker: { padding: '12px', backgroundColor: '#F9FAFA', borderRadius: '8px', fontSize: '13px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px dashed #BDC3C7', fontWeight: '500' },
  errorBox: { padding: '12px', backgroundColor: '#FDEDEC', color: '#C0392B', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', lineHeight: '1.4' },
  submitButton: { width: '100%', padding: '14px', backgroundColor: '#27AE60', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '10px' }
};