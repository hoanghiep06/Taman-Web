import { useCallback } from 'react';
import { patrolApi } from '../api/patrolApi';
import { usePatrolStore } from '../store/patrolStore'; // Nhớ đổi tên thư mục Store -> store nếu bạn đã đổi ở bước trước

export const useBackgroundQueue = () => {
  const uploadStatus = usePatrolStore((state) => state.uploadStatus);
  const setUploadStatus = usePatrolStore((state) => state.setUploadStatus);
  const incrementTask = usePatrolStore((state) => state.incrementTask);
  const decrementTask = usePatrolStore((state) => state.decrementTask);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const processUploadInBackground = useCallback(async (assetIds, file, nonceId, maxRetries = 2) => {
    incrementTask();

    setUploadStatus((prev) => {
      const updated = { ...prev };
      assetIds.forEach((id) => { updated[id] = 'Dang_Xu_Ly'; });
      return updated;
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_ids_str', JSON.stringify(assetIds));
    formData.append('nonce_id', nonceId);

    let attempt = 0;
    let success = false;

    while (attempt <= maxRetries && !success) {
      try {
        await patrolApi.uploadMultiAssets(formData);
        success = true;
        
        setUploadStatus((prev) => {
          const updated = { ...prev };
          assetIds.forEach((id) => { updated[id] = 'Xanh'; });
          return updated;
        });
      } catch (error) {
        // 🔥 BẮT LỖI ANTI-SPAM (400) TỪ BACKEND
        if (error.response && error.response.status === 400) {
            // Hiển thị dòng chữ: "Tài sản X vừa chụp. Vui lòng đợi..." từ Backend truyền lên
            alert(`⚠️ ${error.response.data.detail || 'Thao tác quá nhanh, vui lòng đợi!'}`);
            
            setUploadStatus((prev) => {
              const updated = { ...prev };
              // Đưa về trạng thái Lỗi để người dùng biết mà ấn chụp lại sau khi hết thời gian chờ
              assetIds.forEach((id) => { updated[id] = 'Loi_Upload'; });
              return updated;
            });
            break; // Bẻ gãy vòng lặp retry ngay lập tức
        }

        // Lỗi rớt mạng thông thường -> Tiếp tục retry
        attempt++;
        console.warn(`Lỗi tải ảnh (Lần ${attempt}):`, error);
        
        if (attempt <= maxRetries) {
          await delay(2000); 
        } else {
          setUploadStatus((prev) => {
            const updated = { ...prev };
            assetIds.forEach((id) => { updated[id] = 'Loi_Upload'; });
            return updated;
          });
        }
      }
    }
    
    decrementTask();
  }, [setUploadStatus, incrementTask, decrementTask]);

  return { uploadStatus, processUploadInBackground, setUploadStatus };
};