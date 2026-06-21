import axiosClient from '../../../api/axiosClient';

export const backupApi = {
  // 1. Lấy danh sách file backup trên Drive
  getBackupList: () => {
    return axiosClient.get('/admin/system/backup/list');
  },

  // 2. Kích hoạt sao lưu thủ công cấp tốc
  triggerManualBackup: () => {
    return axiosClient.post('/admin/system/backup/manual-run');
  },

  // 3a. Khôi phục trực tiếp từ Google Drive ID
  restoreFromDrive: (driveFileId) => {
    return axiosClient.post(`/admin/system/backup/restore?drive_file_id=${driveFileId}`);
  },

  // 3b. Khôi phục từ file .sql tải lên từ máy tính
  restoreFromFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/admin/system/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 4. Reset toàn bộ hệ thống (Nguy hiểm)
  resetDatabase: () => {
    return axiosClient.post('/admin/system/backup/reset-database');
  }
};