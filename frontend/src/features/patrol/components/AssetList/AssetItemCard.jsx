
import React from 'react';
import { StatusBadge } from '../../../../components/StatusBadge';
import { ActionButton } from '../../../../components/table/ActionButton';
import styles from './AssetItemCard.module.css';

export const AssetItemCard = ({ asset, isSelected, uploadStatus, onToggleSelect, onOpenMissing, onOpenPreview }) => {
  // Ưu tiên trạng thái upload local trước, nếu không có thì lấy status từ Backend
  const finalStatus = uploadStatus[asset.asset_id] || asset.current_status;

  const isSuccess = finalStatus === 'Xanh' || finalStatus === 'Success';
  const isMissing = finalStatus === 'Vang' || finalStatus === 'Missing';
  const isProcessing = finalStatus === 'Dang_Xu_Ly' || finalStatus === 'processing';
  const isError = finalStatus === 'Loi_Upload' || finalStatus === 'error';
  const isUnchecked = finalStatus === 'Unchecked';

  // Nút hành động tương ứng với thực trạng đồ vật
  const renderActions = () => {
    if (isProcessing) {
      return <StatusBadge variant="info">🔄 Đang đẩy lên mây...</StatusBadge>;
    }

    if (isSuccess && asset.log_id) {
      return (
        <ActionButton variant="primary" onClick={(e) => { e.stopPropagation(); onOpenPreview(asset.log_id, asset.asset_name); }}>
          🖼️ Xem ảnh
        </ActionButton>
      );
    }

    if (isMissing) {
      return (
        <div className={styles.missingInfo}>
          <span className={styles.missingNote}>📝 Lý do: {asset.note}</span>
          <ActionButton variant="warning" onClick={(e) => { e.stopPropagation(); onOpenMissing(asset.asset_id); }}>
            Sửa báo mất
          </ActionButton>
        </div>
      );
    }

    // Nếu Unchecked hoặc Error (Cần chụp lại)
    return (
      <ActionButton variant="danger" onClick={(e) => { e.stopPropagation(); onOpenMissing(asset.asset_id); }}>
        Báo mất
      </ActionButton>
    );
  };

  const cardClass = `${styles.card} ${isSelected ? styles.cardSelected : ''} ${isMissing ? styles.cardMissing : ''}`;

  return (
    <div className={cardClass} onClick={() => !isProcessing && onToggleSelect(asset.asset_id)}>
      <div className={styles.mainInfo}>
        
        {/* 2. Mở khóa Checkbox: Cho phép hiện ô tick ở mọi trạng thái trừ lúc đang xử lý */}
        {!isProcessing && (
          <div className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}>
            {isSelected && <span className={styles.checkMark}>✓</span>}
          </div>
        )}

        <div className={styles.textDetails}>
          <span className={styles.assetName}>{asset.asset_name}</span>
          {isSuccess && <span className={styles.timeSubtext}>✓ Cập nhật: {asset.inspected_at}</span>}
          {isError && <span className={styles.errorText}>❌ Lỗi tải ảnh. Vui lòng chọn và chụp lại!</span>}
        </div>
      </div>

      <div className={styles.actionRightBlock}>
        {renderActions()}
      </div>
    </div>
  );
};