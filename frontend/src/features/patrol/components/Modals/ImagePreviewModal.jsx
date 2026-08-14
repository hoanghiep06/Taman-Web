import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/Modal';
import { patrolApi } from '../../api/patrolApi';
import styles from './ImagePreviewModal.module.css';

export const ImagePreviewModal = ({ isOpen, logId, assetName, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Chỉ gọi API fetch link ảnh khi Modal được mở và có logId hợp lệ
    if (isOpen && logId) {
      setIsLoading(true);
      setError(null);
      
      patrolApi.getInspectionImage(logId)
        .then((res) => {
          // Gán link public tạm thời từ backend trả về
          setImageUrl(res.shareable_url);
        })
        .catch((err) => {
          console.error("Lỗi lấy link ảnh:", err);
          setError("Không thể tải ảnh minh chứng hoặc ảnh đang được nén.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Clear data khi đóng Modal tránh chớp ảnh cũ
      setImageUrl('');
    }
  }, [isOpen, logId]);

  const handleCopyLink = () => {
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl)
      .then(() => alert('Đã sao chép liên kết ảnh bảo mật!'))
      .catch(() => alert('Trình duyệt không hỗ trợ sao chép.'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={`Minh chứng: ${assetName}`}
      footer={
        <div className={styles.footerActions}>
          <button 
            onClick={handleCopyLink} 
            disabled={!imageUrl || isLoading}
            className={styles.copyLinkBtn}
          >
            🔗 Sao chép liên kết chia sẻ
          </button>
          <button onClick={onClose} className={styles.closeTextBtn}>
            Đóng
          </button>
        </div>
      }
    >
      <div className={styles.imageContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner}>🔄</span> Đang giải mã hình ảnh...
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={`Ảnh kiểm kê ${assetName}`} 
            className={styles.previewImage} 
            loading="lazy" 
          />
        )}
      </div>
    </Modal>
  );
};