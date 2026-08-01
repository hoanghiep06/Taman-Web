import React from 'react';
import { getFinalStatus } from '../utils/patrolHelpers';
import { StatusBadge } from '../../../components/StatusBadge';
import { ActionButton } from '../../../components/table/ActionButton';
import styles from './AssetItemCard.module.css';

const STATUS_BADGE = {
  Processing: { variant: 'info', text: '🔄 Đang nén ảnh lên Drive...' },
  Success: { variant: 'success' },
  Missing: { variant: 'warning' },
  Error: { variant: 'danger', text: '❌ Lỗi ảnh, hãy chụp lại' },
};

export const AssetItemCard = ({ asset, isSelected, uploadStatus, onToggleSelect, onOpenMissing, onOpenPreview }) => {
  const dbStatus = asset.current_status;
  const finalStatus = getFinalStatus(asset, uploadStatus);
  const isSuccess = finalStatus === 'Success';
  const isMissing = finalStatus === 'Missing';
  const isProcessing = finalStatus === 'Processing';
  const isError = finalStatus === 'Error';

  const canViewImage = dbStatus === 'Xanh' || dbStatus === 'Success';

  const renderStatusBadge = () => {
    if (isProcessing) return <StatusBadge variant="info">{STATUS_BADGE.Processing.text}</StatusBadge>;
    if (isSuccess) return <StatusBadge variant="success">✓ Đã nộp ({asset.inspected_at || 'Vừa xong'})</StatusBadge>;
    if (isMissing)
      return (
        <StatusBadge variant="warning">
          ⚠️ Đã báo mất {asset.inspected_at ? `(${asset.inspected_at})` : ''}
        </StatusBadge>
      );
    if (isError) return <StatusBadge variant="danger">{STATUS_BADGE.Error.text}</StatusBadge>;
    return <StatusBadge variant="neutral">Chưa kiểm kê</StatusBadge>;
  };

  const cardClass = [
    styles.card,
    isSelected ? styles.cardSelected : isMissing ? styles.cardMissing : '',
    isProcessing ? styles.cardProcessing : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass} onClick={() => !isProcessing && onToggleSelect(asset.asset_id)}>
      <div className={styles.mainInfo}>
        <div className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}>
          {isSelected && <span className={styles.checkMark}>✓</span>}
        </div>

        <div className={styles.textDetails}>
          <span className={styles.assetName}>{asset.asset_name}</span>
          <div className={styles.metaInfoRow}>
            <span className={styles.idSubtext}>Mã: #{asset.asset_id}</span>
            {asset.note && <span className={styles.noteSubtext}>• Ghi chú: {asset.note}</span>}
          </div>
          <div className={styles.badgeRow}>{renderStatusBadge()}</div>
        </div>
      </div>

      <div className={styles.actionRightBlock}>
        {canViewImage && asset.log_id && (
          <ActionButton
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenPreview(asset.log_id, asset.asset_name);
            }}
          >
            🖼️ Ảnh
          </ActionButton>
        )}

        {!isProcessing && (
          <ActionButton
            variant={isMissing ? 'warning' : 'danger'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenMissing(asset.asset_id);
            }}
          >
            {isMissing ? 'Sửa mất' : 'Báo mất'}
          </ActionButton>
        )}
      </div>
    </div>
  );
};