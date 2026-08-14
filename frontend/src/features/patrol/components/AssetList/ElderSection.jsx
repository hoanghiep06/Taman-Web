import React from 'react';
import { AssetItemCard } from './AssetItemCard';
import styles from './ElderSection.module.css';

export const ElderSection = ({ 
  group, 
  selectedAssetIds, 
  uploadStatus, 
  onToggleSelect, 
  onOpenMissing, 
  onOpenPreview 
}) => {
  const total = group.assets.length;
  
  // Tính toán số lượng đã kiểm kê xong (Màu Xanh: Đã nộp ảnh, Màu Vàng: Đã báo mất)
  const done = group.assets.filter((a) => {
    // Ưu tiên trạng thái upload local trước (Optimistic UI), nếu không có thì lấy status gốc từ BE
    const finalStatus = uploadStatus[a.asset_id] || a.current_status;
    return ['Xanh', 'Success', 'Vang', 'Missing'].includes(finalStatus);
  }).length;
  
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const isDone = total > 0 && done === total;

  return (
    <div className={`${styles.sectionBlock} ${isDone ? styles.sectionDone : ''}`}>
      <div className={`${styles.sectionHeader} ${group.isElder ? styles.headerElder : styles.headerShared}`}>
        <div className={styles.titleBox}>
          <div className={`${styles.avatar} ${group.isElder ? styles.avatarElder : styles.avatarShared}`}>
            <span className={styles.avatarIcon}>{group.isElder ? '👵' : '📦'}</span>
          </div>

          <div className={styles.titleTextBlock}>
            <span className={`${styles.nameText} ${group.isElder ? styles.nameElder : styles.nameShared}`}>
              {group.title}
            </span>

            <div className={styles.miniProgressRow}>
              <div className={styles.miniBarBg}>
                <div
                  className={`${styles.miniBarFill} ${isDone ? styles.miniBarDone : styles.miniBarActive}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className={`${styles.miniProgressText} ${isDone ? styles.miniTextDone : styles.miniTextActive}`}>
                {isDone ? `✅ Xong (${done}/${total})` : `Tiến độ: ${done}/${total}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.assetList}>
        {group.assets.map((asset) => (
          <AssetItemCard
            key={asset.asset_id}
            asset={asset}
            isSelected={selectedAssetIds.includes(asset.asset_id)}
            uploadStatus={uploadStatus}
            onToggleSelect={onToggleSelect}
            onOpenMissing={onOpenMissing}
            onOpenPreview={onOpenPreview}
          />
        ))}
      </div>
    </div>
  );
};