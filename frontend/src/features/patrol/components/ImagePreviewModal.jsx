import { Modal } from '../../../components/Modal';
import styles from './ImagePreviewModal.module.css';

export const ImagePreviewModal = ({ isOpen, imageUrl, assetName, isLoading, onClose, onCopyLink }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={`Ảnh minh chứng · ${assetName}`}
      footer={
        <div className={styles.footerActions}>
          <button onClick={() => onCopyLink(imageUrl)} className={styles.copyLinkBtn}>
            🔗 Sao chép liên kết ảnh
          </button>
          <button onClick={onClose} className={styles.closeTextBtn}>
            Đóng
          </button>
        </div>
      }
    >
      <div className={styles.imageContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>Đang tải ảnh...</div>
        ) : (
          <img src={imageUrl} alt="Minh chứng" className={styles.previewImage} />
        )}
      </div>
    </Modal>
  );
};