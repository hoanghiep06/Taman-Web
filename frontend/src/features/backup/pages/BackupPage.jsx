import React, { useState, useEffect } from 'react';
import { backupApi } from '../api/backupApi';
import { BackupList } from '../components/BackupList';
import { RestoreModal } from '../components/RestoreModal'; // Import Component Mới
import { DangerZoneCard } from '../components/DangerZoneCard';

export const BackupPage = () => {
  const [backups, setBackups] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isManualRunning, setIsManualRunning] = useState(false);
  
  // State quản lý Modal
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [initialDriveId, setInitialDriveId] = useState(null);

  const fetchBackups = async () => {
    setLoadingList(true);
    try {
      const res = await backupApi.getBackupList();
      setBackups(res.backups || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách DB", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleManualBackup = async () => {
    setIsManualRunning(true);
    try {
      const res = await backupApi.triggerManualBackup();
      alert(`✅ ${res.message}\nLink Drive: ${res.drive_url}`);
      fetchBackups();
    } catch (err) {
      alert("❌ Lỗi sao lưu: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsManualRunning(false);
    }
  };

  // Mở modal và tự động điền sẵn ID nếu bấm từ bảng danh sách
  const handleOpenRestoreModal = (driveId = null) => {
    setInitialDriveId(driveId);
    setIsRestoreModalOpen(true);
  };

  // Hàm xử lý Khôi phục từ Drive (Được gọi từ bên trong Modal)
  const handleRestoreFromDrive = async (driveId) => {
    try {
      alert("Đang kích hoạt quy trình khóa DB và tạo Snapshot dự phòng an toàn. Vui lòng đợi...");
      const res = await backupApi.restoreFromDrive(driveId);
      setIsRestoreModalOpen(false);
      alert(`✅ ${res.message}\n(Đã lưu bản dự phòng trước ghi đè: ${res.pre_restore_safety_backup_url})`);
      window.location.reload(); 
    } catch (err) {
      alert("❌ Lỗi khôi phục Cloud: " + (err.response?.data?.detail || "Lỗi mạng hoặc Timeout."));
    }
  };

  // Hàm xử lý Khôi phục từ File Local (Được gọi từ bên trong Modal)
  const handleRestoreFromFile = async (file) => {
    try {
      alert("Đang tải file lên và khởi chạy tiến trình phục hồi. Vui lòng đợi...");
      const res = await backupApi.restoreFromFile(file);
      setIsRestoreModalOpen(false);
      alert(`✅ ${res.message}\n(Đã lưu bản dự phòng trước ghi đè: ${res.pre_restore_safety_backup_url})`);
      window.location.reload();
    } catch (err) {
      alert("❌ Lỗi khôi phục Local File: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleHardReset = async () => {
    try {
      alert("Đang thực thi lệnh Drop All và Seed Admin. Vui lòng không tắt trình duyệt!");
      const res = await backupApi.resetDatabase();
      alert(`✅ HOÀN TẤT!\n${res.message}\n(Snapshot an toàn: ${res.emergency_safety_backup_url})`);
      localStorage.removeItem('token'); 
      window.location.href = '/login'; 
    } catch (err) {
      alert("❌ Lỗi khi Reset System: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>💾 Quản Trị Dữ Liệu & Khôi Phục (Disaster Recovery)</h2>
          <p style={styles.subtitle}>Bảo vệ an toàn cơ sở dữ liệu hệ thống, khôi phục thảm họa hoặc di chuyển máy chủ.</p>
        </div>
        
        <div style={styles.actionGroup}>
          <button 
            style={styles.uploadBtn} 
            onClick={() => handleOpenRestoreModal()} // Mở Modal trống (Chế độ mặc định tải file)
          >
            ⚡ Mở Cổng Khôi Phục Dữ Liệu
          </button>
          
          <button 
            style={isManualRunning ? styles.backupBtnLoading : styles.backupBtn} 
            onClick={handleManualBackup} 
            disabled={isManualRunning}
          >
            {isManualRunning ? '⏳ ĐANG TẠO BẢN SAO LƯU...' : '💾 SAO LƯU LÊN DRIVE NGAY'}
          </button>
        </div>
      </div>

      <BackupList 
        backups={backups} 
        loading={loadingList} 
        onOpenRestoreModalWithId={handleOpenRestoreModal} // Truyền hàm mở Modal kèm ID vào Bảng
      />

      <DangerZoneCard onHardReset={handleHardReset} />

      {/* MODAL KHÔI PHỤC TOÀN DIỆN */}
      <RestoreModal 
        isOpen={isRestoreModalOpen} 
        onClose={() => setIsRestoreModalOpen(false)} 
        onRestoreFile={handleRestoreFromFile} 
        onRestoreDrive={handleRestoreFromDrive}
        backups={backups}
        initialDriveId={initialDriveId}
      />
    </div>
  );
};

const styles = {
  container: { fontFamily: "-apple-system, sans-serif", maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { margin: '0 0 6px 0', fontSize: '24px', color: '#0F172A', fontWeight: '800' },
  subtitle: { margin: 0, fontSize: '14px', color: '#64748B' },
  actionGroup: { display: 'flex', gap: '12px' },
  uploadBtn: { padding: '10px 18px', backgroundColor: '#F8FAFC', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  backupBtn: { padding: '10px 18px', backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' },
  backupBtnLoading: { padding: '10px 18px', backgroundColor: '#6EE7B7', color: '#064E3B', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'wait' }
};