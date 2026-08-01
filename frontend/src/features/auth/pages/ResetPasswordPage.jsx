import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { authApi } from '../api/authApi';
import styles from './ResetPasswordPage.module.css';

const STRENGTH_RULES = [
  { key: 'length', label: 'Dài tối thiểu 8 ký tự', test: (pw) => pw.length >= 8 },
  { key: 'upperLower', label: 'Có chữ hoa & chữ thường', test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { key: 'number', label: 'Có ít nhất 1 chữ số', test: (pw) => /[0-9]/.test(pw) },
];

// QUAN TRỌNG: Component này ĐÃ ĐƯỢC CHUYỂN RA NGOÀI ResetPasswordPage.
// Bản cũ định nghĩa PasswordField bên trong function component cha, khiến React
// coi đây là 1 "loại" component MỚI ở mỗi lần re-render (mỗi lần gõ phím),
// dẫn đến unmount/remount input và mất focus/con trỏ liên tục khi gõ.
const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder }) => (
  <div className={styles.inputGroup}>
    <label className={styles.label} htmlFor={id}>{label}</label>
    <div className={styles.passwordWrapper}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={styles.inputPassword}
        placeholder={placeholder}
        required
      />
      <button type="button" className={styles.eyeButton} onClick={onToggle} tabIndex={-1} aria-label={show ? 'Ẩn' : 'Hiện'}>
        {show ? '👁️' : '🙈'}
      </button>
    </div>
  </div>
);

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
    const result = {};
    STRENGTH_RULES.forEach(({ key, test }) => {
      result[key] = test(newPassword);
    });
    setStrength(result);
  }, [newPassword]);

  const isPasswordStrong = STRENGTH_RULES.every(({ key }) => strength[key]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isPasswordStrong) {
      setError('Mật khẩu mới chưa đủ tiêu chuẩn bảo mật!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không trùng khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      clearMustChangePasswordFlag();
      navigate(user.role === 'Staff' ? '/rooms' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalBox}>
        <div className={styles.iconWarning}>🔒</div>
        <h2 className={styles.warningTitle}>KÍCH HOẠT TÀI KHOẢN</h2>
        <p className={styles.infoText}>
          Đây là lần đầu đăng nhập. Bạn bắt buộc phải đặt mật khẩu mới để bảo mật hệ thống.
        </p>

        {error && <div className={styles.errorBox} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <PasswordField
            id="reset-old-pw"
            label="Mật khẩu hiện tại"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            show={showOld}
            onToggle={() => setShowOld(!showOld)}
            placeholder="Nhập mật khẩu đang dùng..."
          />

          <PasswordField
            id="reset-new-pw"
            label="Mật khẩu mới"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            show={showNew}
            onToggle={() => setShowNew(!showNew)}
            placeholder="Nhập mật khẩu mới..."
          />

          <div className={styles.strengthChecker} aria-live="polite">
            {STRENGTH_RULES.map(({ key, label }) => (
              <div key={key} className={`${styles.strengthItem} ${strength[key] ? styles.pass : styles.fail}`}>
                <span className={styles.strengthIcon}>{strength[key] ? '✔' : '✖'}</span>
                {label}
              </div>
            ))}
          </div>

          <PasswordField
            id="reset-confirm-pw"
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            show={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
            placeholder="Nhập lại mật khẩu mới..."
          />

          <button id="reset-submit" type="submit" disabled={isSubmitting || !isPasswordStrong} className={styles.submitButton}>
            {isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};