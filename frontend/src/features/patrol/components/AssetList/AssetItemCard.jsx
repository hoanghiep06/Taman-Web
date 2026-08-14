import React from 'react';
import styles from './AssetItemCard.module.css';

export const AssetItemCard = ({
  asset,
  isSelected,
  uploadStatus,
  onToggleSelect,
  onOpenMissing,
  onOpenPreview
}) => {
  const finalStatus = uploadStatus[asset.asset_id] || asset.current_status;

  const isSuccess = finalStatus === 'Xanh' || finalStatus === 'Success';
  const isMissing = finalStatus === 'Vang' || finalStatus === 'Missing';
  const isProcessing = finalStatus === 'Dang_Xu_Ly' || finalStatus === 'processing';
  const isError = finalStatus === 'Loi_Upload' || finalStatus === 'error';

  const cardClasses = [
    styles.card,
    isSelected ? styles.selected : '',
    isMissing ? styles.missing : '',
    isSuccess ? styles.success : '',
    isProcessing ? styles.processing : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={() => !isProcessing && onToggleSelect(asset.asset_id)}>
      {/* KHỐI NỘI DUNG CHÍNH (TRÁI) */}
      <div className={styles.leftContent}>
        {!isProcessing ? (
          <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}>
            {isSelected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        ) : (
          <div className={styles.processingSpinner} />
        )}

        <div className={styles.metaBlock}>
          <span className={styles.assetName}>{asset.asset_name}</span>
          
          {isSuccess && (
            <span className={styles.timeTag}>
              ✓ Đã kiểm kê ({asset.inspected_at || 'Mới cập nhật'})
            </span>
          )}

          {isError && (
            <span className={styles.errorTag}>
              Lỗi đồng bộ. Chạm để chụp lại
            </span>
          )}
        </div>
      </div>

      {/* KHỐI HÀNH ĐỘNG (PHẢI / XUỐNG DÒNG KHI MÀN HÌNH NHỎ) */}
      <div className={styles.rightActions}>
        {isProcessing && (
          <span className={styles.statusPillInfo}>Đang tải lên...</span>
        )}

        {isMissing && (
          <div className={styles.missingWrapper}>
            <span className={styles.missingBadge} title={asset.note}>
              📝 {asset.note || 'Báo mất'}
            </span>
            <button
              type="button"
              className={styles.editMissingBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMissing(asset.asset_id);
              }}
            >
              Sửa lý do
            </button>
          </div>
        )}

        {isSuccess && asset.log_id && (
          <button
            type="button"
            className={styles.viewImgBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview(asset.log_id, asset.asset_name);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Xem ảnh</span>
          </button>
        )}

        {!isSuccess && !isMissing && !isProcessing && (
          <button
            type="button"
            className={styles.reportMissingBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMissing(asset.asset_id);
            }}
          >
            Báo mất
          </button>
        )}
      </div>
    </div>
  );
};