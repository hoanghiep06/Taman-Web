import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { authApi } from '../api/authApi';
import styles from './LoginPage.module.css';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const MAX_ATTEMPTS = 5;
  const isLocked = failedAttempts >= MAX_ATTEMPTS;

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLocked) { setError('Tài khoản đã bị khóa tạm thời. Vui lòng chờ và thử lại.'); return; }
    if (!username || !password) return;

    setError('');
    setIsSubmitting(true);

    try {
      const response = await authApi.login(username, password);
      const userSession = login(response);

      if (userSession.mustChangePassword) navigate('/force-reset');
      else navigate('/dashboard');
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setError('❌ Bạn đã nhập sai 5 lần! Tính năng đăng nhập tạm khóa.');
      } else {
        setError(`Sai tài khoản hoặc mật khẩu. Bạn còn ${MAX_ATTEMPTS - newAttempts} lần thử.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.card} noValidate>
        <div className={styles.logoCircle}>TA</div>
        <h1 className={styles.title}>TÂM AN INVENTORY</h1>
        <p className={styles.subtitle}>Hệ thống quản lý kiểm kê tài sản</p>

        {error && <div className={styles.errorBox} role="alert">{error}</div>}

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="login-username">Tên đăng nhập</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting || isLocked}
              className={styles.input}
              placeholder="Nhập tên tài khoản..."
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="login-password">Mật khẩu</label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || isLocked}
                className={styles.inputPassword}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting || isLocked}
            className={styles.button}
          >
            {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}
          </button>
        </div>
      </form>
    </div>
  );
};