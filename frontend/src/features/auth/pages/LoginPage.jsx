import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { authApi } from '../api/authApi';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (failedAttempts >= MAX_ATTEMPTS) {
      setError('Tài khoản đã bị khóa tạm thời. Vui lòng chờ và thử lại.');
      return;
    }

    if (!username || !password) return;

    setError('');
    setIsSubmitting(true);

    try {
      const response = await authApi.login(username, password);
      const userSession = login(response);

      if (userSession.mustChangePassword) navigate('/force-reset');
      else if (userSession.role === 'Staff') navigate('/rooms');
      else navigate('/dashboard');
      
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setError('❌ Bạn đã nhập sai 5 lần! Tính năng đăng nhập tạm khóa. Vui lòng chờ và thử lại');
      } else {
        setError(`Sai tài khoản hoặc mật khẩu. Bạn còn ${MAX_ATTEMPTS - newAttempts} lần thử.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <div style={styles.logoCircle}>TA</div>
        <h2 style={styles.title}>TÂM AN INVENTORY</h2>
        <p style={styles.subtitle}>Hệ thống dành cho nhân viên</p>
        
        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Tên đăng nhập</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            disabled={isSubmitting || failedAttempts >= MAX_ATTEMPTS}
            style={styles.input}
            placeholder="Nhập tên tài khoản..."
            required 
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Mật khẩu</label>
          <div style={styles.passwordWrapper}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={isSubmitting || failedAttempts >= MAX_ATTEMPTS}
              style={styles.inputPassword}
              placeholder="Nhập mật khẩu..."
              required 
            />
            <button 
              type="button" 
              style={styles.eyeButton} 
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || failedAttempts >= MAX_ATTEMPTS} 
          style={{
            ...styles.button, 
            opacity: (isSubmitting || failedAttempts >= MAX_ATTEMPTS) ? 0.6 : 1,
            cursor: (failedAttempts >= MAX_ATTEMPTS) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#E9EEF4', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  card: { padding: '40px', borderRadius: '16px', backgroundColor: '#FFF', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoCircle: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#1F4E78', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' },
  title: { textAlign: 'center', color: '#1F4E78', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800', letterSpacing: '1px' },
  subtitle: { textAlign: 'center', color: '#7F8C8D', margin: '0 0 30px 0', fontSize: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '20px', width: '100%' },
  label: { marginBottom: '8px', fontSize: '14px', color: '#34495E', fontWeight: '700' },
  
  // Nâng cấp hiển thị ô Input
  input: { 
    width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #B0BEC5', 
    fontSize: '15px', outline: 'none', backgroundColor: '#FFFFFF', color: '#1A252F', 
    fontWeight: '500', boxSizing: 'border-box', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' 
  },
  passwordWrapper: { position: 'relative', display: 'flex', width: '100%' },
  inputPassword: { 
    width: '100%', padding: '14px', paddingRight: '50px', borderRadius: '8px', 
    border: '1px solid #B0BEC5', fontSize: '15px', outline: 'none', backgroundColor: '#FFFFFF', 
    color: '#1A252F', fontWeight: '500', boxSizing: 'border-box', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' 
  },
  
  eyeButton: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '5px', color: '#7F8C8D' },
  errorBox: { padding: '12px', backgroundColor: '#FDEDEC', color: '#C0392B', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #FADBD8', width: '100%', boxSizing: 'border-box', lineHeight: '1.4' },
  button: { width: '100%', padding: '14px', backgroundColor: '#1F4E78', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }
};