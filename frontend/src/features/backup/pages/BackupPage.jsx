import React, { useState, useEffect } from 'react';
import { backupApi } from '../api/backupApi';
import { BackupList } from '../components/BackupList';
import { RestoreModal } from '../components/RestoreModal';
import { DangerZoneCard } from '../components/DangerZoneCard';
import styles from './BackupPage.module.css';

export const BackupPage = () => {
  const [backups, setBackups] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isManualRunning, setIsManualRunning] = useState(false);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [initialDriveId, setInitialDriveId] = useState(null);

  const fetchBackups = async () => {
    setLoadingList(true);
    try {
      const res = await backupApi.getBackupList();
      setBackups(res.backups || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách DB', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleManualBackup = async () => {
    setIsManualRunning(true);
    try {
      const res = await backupApi.triggerManualBackup();
      alert(`✅ ${res.message}\nLink Drive: ${res.drive_url}`);
      fetchBackups();
    } catch (err) {
      alert('❌ Lỗi sao lưu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsManualRunning(false);
    }
  };

  const handleOpenRestoreModal = (driveId = null) => {
    setInitialDriveId(driveId);
    setIsRestoreModalOpen(true);
  };

  const handleRestoreFromDrive = async (driveId) => {
    try {
      alert('Đang kích hoạt quy trình khóa DB và tạo Snapshot dự phòng an toàn. Vui lòng đợi...');
      const res = await backupApi.restoreFromDrive(driveId);
      setIsRestoreModalOpen(false);
      alert(`✅ ${res.message}\n(Đã lưu bản dự phòng trước ghi đè: ${res.pre_restore_safety_backup_url})`);
      window.location.reload();
    } catch (err) {
      alert('❌ Lỗi khôi phục Cloud: ' + (err.response?.data?.detail || 'Lỗi mạng hoặc Timeout.'));
    }
  };

  const handleRestoreFromFile = async (file) => {
    try {
      alert('Đang tải file lên và khởi chạy tiến trình phục hồi. Vui lòng đợi...');
      const res = await backupApi.restoreFromFile(file);
      setIsRestoreModalOpen(false);
      alert(`✅ ${res.message}\n(Đã lưu bản dự phòng trước ghi đè: ${res.pre_restore_safety_backup_url})`);
      window.location.reload();
    } catch (err) {
      alert('❌ Lỗi khôi phục Local File: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleHardReset = async () => {
    try {
      alert('Đang thực thi lệnh Drop All và Seed Admin. Vui lòng không tắt trình duyệt!');
      const res = await backupApi.resetDatabase();
      alert(`✅ HOÀN TẤT!\n${res.message}\n(Snapshot an toàn: ${res.emergency_safety_backup_url})`);
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (err) {
      alert('❌ Lỗi khi Reset System: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>💾 Quản Trị Dữ Liệu &amp; Khôi Phục (Disaster Recovery)</h2>
          <p className={styles.subtitle}>Bảo vệ an toàn cơ sở dữ liệu hệ thống, khôi phục thảm họa hoặc di chuyển máy chủ.</p>
        </div>

        <div className={styles.actionGroup}>
          <button className={styles.uploadBtn} onClick={() => handleOpenRestoreModal()}>
            ⚡ Mở Cổng Khôi Phục Dữ Liệu
          </button>

          <button
            className={isManualRunning ? styles.backupBtnLoading : styles.backupBtn}
            onClick={handleManualBackup}
            disabled={isManualRunning}
          >
            {isManualRunning ? '⏳ ĐANG TẠO BẢN SAO LƯU...' : '💾 SAO LƯU LÊN DRIVE NGAY'}
          </button>
        </div>
      </div>

      <BackupList backups={backups} loading={loadingList} onOpenRestoreModalWithId={handleOpenRestoreModal} />

      <DangerZoneCard onHardReset={handleHardReset} />

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