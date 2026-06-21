import React, { useState, useEffect } from 'react';
import { settingsApi } from '../api/settingsApi';

export const SystemSettingsPage = () => {
  const [shiftTimes, setShiftTimes] = useState({
    morning_start: '', morning_end: '', evening_start: '', evening_end: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // State cho nút Refresh

  const fetchSettings = async () => {
    try {
      const data = await settingsApi.getShiftTimes();
      setShiftTimes({
        morning_start: data.morning_start || '',
        morning_end: data.morning_end || '',
        evening_start: data.evening_start || '',
        evening_end: data.evening_end || ''
      });
    } catch (err) {
      setShiftTimes({ morning_start: '06:00', morning_end: '14:00', evening_start: '18:00', evening_end: '02:00' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSaveShiftTimes = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await settingsApi.updateShiftTimes(shiftTimes);
      alert('✅ Đã lưu cấu hình khung giờ ca trực thành công!');
    } catch (err) {
      alert('❌ Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  // ──── HÀM XỬ LÝ LÀM MỚI CA TRỰC TỪ API BẠN VỪA VIẾT ────
  const handleRefreshShift = async () => {
    setIsRefreshing(true);
    try {
      const res = await settingsApi.refreshCurrentShift();
      alert(`✅ KẾT QUẢ ĐỒNG BỘ:\n${res.message}`);
    } catch (err) {
      alert(`❌ Lỗi đồng bộ ca trực: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChange = (e) => {
    setShiftTimes({ ...shiftTimes, [e.target.name]: e.target.value });
  };

  if (loading) return <div style={styles.loading}>Đang tải cấu hình hệ thống...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>⚙️ Cấu Hình Hệ Thống</h2>
        <p style={styles.subtitle}>Quản lý các tham số vận hành cốt lõi của trung tâm</p>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>🕒 Thiết Lập Khung Giờ Ca Trực</h3>
            <p style={styles.cardDesc}>Hệ thống sẽ dựa vào khung giờ này để tự động chốt ca và gửi báo cáo.</p>
          </div>

          <form onSubmit={handleSaveShiftTimes} style={styles.form}>
            <div style={styles.shiftBlock}>
              <h4 style={styles.shiftTitle}>🌅 CA SÁNG</h4>
              <div style={styles.timeRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Giờ bắt đầu</label>
                  <input type="time" name="morning_start" value={shiftTimes.morning_start} onChange={handleChange} required style={styles.timeInput} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Giờ kết thúc</label>
                  <input type="time" name="morning_end" value={shiftTimes.morning_end} onChange={handleChange} required style={styles.timeInput} />
                </div>
              </div>
            </div>

            <div style={styles.shiftBlock}>
              <h4 style={styles.shiftTitle}>🌃 CA TỐI</h4>
              <div style={styles.timeRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Giờ bắt đầu</label>
                  <input type="time" name="evening_start" value={shiftTimes.evening_start} onChange={handleChange} required style={styles.timeInput} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Giờ kết thúc</label>
                  <input type="time" name="evening_end" value={shiftTimes.evening_end} onChange={handleChange} required style={styles.timeInput} />
                </div>
              </div>
            </div>

            {/* ĐÃ BỔ SUNG NÚT REFRESH CA TRỰC */}
            <div style={styles.formFooter}>
              <button 
                type="button" 
                style={styles.refreshBtn} 
                onClick={handleRefreshShift}
                disabled={isRefreshing}
              >
                {isRefreshing ? '⏳ Đang xử lý...' : '🔄 Áp Dụng & Đồng Bộ Ca Ngay'}
              </button>

              <button type="submit" style={styles.saveBtn} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : '💾 Lưu Cấu Hình Khung Giờ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' },
  title: { margin: '0 0 8px 0', fontSize: '24px', color: '#0F172A', fontWeight: '800' },
  subtitle: { margin: 0, fontSize: '14px', color: '#64748B' },
  content: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' },
  card: { backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  cardHeader: { backgroundColor: '#F8FAFC', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' },
  cardTitle: { margin: '0 0 6px 0', fontSize: '16px', color: '#0F172A', fontWeight: '700' },
  cardDesc: { margin: 0, fontSize: '13px', color: '#64748B' },
  form: { padding: '20px' },
  shiftBlock: { backgroundColor: '#F1F5F9', padding: '16px', borderRadius: '8px', marginBottom: '16px' },
  shiftTitle: { margin: '0 0 12px 0', fontSize: '14px', color: '#1E3A8A', fontWeight: '800', letterSpacing: '0.5px' },
  timeRow: { display: 'flex', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { marginBottom: '6px', fontSize: '12px', color: '#475569', fontWeight: '600' },
  timeInput: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '16px', fontWeight: '600', color: '#0F172A', cursor: 'pointer' },
  
  // Thay đổi layout footer để chứa 2 nút
  formFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  
  refreshBtn: { padding: '12px 20px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
  saveBtn: { padding: '12px 24px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  
  loading: { padding: '40px', textAlign: 'center', color: '#64748B', fontWeight: '500' }
};