import { useState, useCallback } from 'react';
import { patrolApi } from '../api/patrolApi';

export const useBackgroundQueue = () => {
  // Trạng thái: { [assetId]: 'processing' | 'success' | 'error' | 'missing' }
  const [uploadStatus, setUploadStatus] = useState({});

  const processUploadInBackground = useCallback(async (assetIds, file, nonceId) => {
    // 1. Chuyển sang màu Xám (Đang xử lý ngầm)
    setUploadStatus((prev) => {
      const updated = { ...prev };
      assetIds.forEach((id) => { updated[id] = 'processing'; });
      return updated;
    });

    // 2. Gói form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_ids_str', JSON.stringify(assetIds));
    formData.append('nonce_id', nonceId);

    try {
      // 3. Gửi lên hàng đợi
      await patrolApi.uploadMultiAssets(formData);
      
      // 4. Thành công -> Đổi màu Xanh
      setUploadStatus((prev) => {
        const updated = { ...prev };
        assetIds.forEach((id) => { updated[id] = 'success'; });
        return updated;
      });
    } catch (error) {
      console.error('Lỗi tải ảnh:', error);
      // Lỗi -> Đổi màu Đỏ để nhân viên biết đường chụp lại
      setUploadStatus((prev) => {
        const updated = { ...prev };
        assetIds.forEach((id) => { updated[id] = 'error'; });
        return updated;
      });
    }
  }, []);

  return { uploadStatus, processUploadInBackground, setUploadStatus };
};