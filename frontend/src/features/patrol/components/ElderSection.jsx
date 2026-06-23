import React from 'react';
import { AssetItemCard } from './AssetItemCard';
import { getFinalStatus } from '../utils/patrolHelpers';
import { theme } from '../utils/theme';

export const ElderSection = ({ group, selectedAssetIds, uploadStatus, onToggleSelect, onOpenMissing, onOpenPreview }) => {
  const total = group.assets.length;
  const done = group.assets.filter(a => {
    const s = getFinalStatus(a, uploadStatus);
    return s === 'Success' || s === 'Missing';
  }).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const isDone = total > 0 && done === total;

  // Phối màu linh hoạt: Khu vực Cụ già -> Banner xanh dương dịu | Tài sản chung -> Banner xám tinh tế
  const headerBg = group.isElder ? '#F0F9FF' : '#F8FAFC';
  const headerBorder = group.isElder ? '1px solid #BAE6FD' : '1px solid #E2E8F0';
  const nameColor = group.isElder ? '#0369A1' : '#334155';

  return (
    <div style={{
      ...styles.sectionBlock,
      // Viền bao bọc toàn bộ khu vực của một Cụ để tách biệt với người khác
      borderColor: isDone ? '#BBF7D0' : '#E2E8F0', 
      backgroundColor: isDone ? '#F9FBF9' : '#FFFFFF'
    }}>
      {/* KHU VỰC HIỆN TÊN NCT (Đã nâng cấp thành dạng Banner nổi bật) */}
      <div style={{
        ...styles.sectionHeader,
        backgroundColor: headerBg,
        border: headerBorder
      }}>
        <div style={styles.elderTitleBox}>
          <div style={{
            ...styles.avatar, 
            backgroundColor: group.isElder ? '#E0F2FE' : '#E2E8F0'
          }}>
            <span style={styles.avatarIcon}>{group.isElder ? '👵' : '📦'}</span>
          </div>
          
          <div style={styles.titleTextBlock}>
            <span style={{...styles.elderNameText, color: nameColor}}>
              {group.isElder ? `${group.title}` : group.title}
            </span>
            
            {/* Thanh tiến độ mini nằm gọn bên trong Banner tên */}
            <div style={styles.miniProgressRow}>
              <div style={styles.miniBarBg}>
                <div style={{
                  ...styles.miniBarFill, 
                  width: `${percent}%`, 
                  backgroundColor: isDone ? '#22C55E' : '#0284C7'
                }} />
              </div>
              <span style={{
                ...styles.miniProgressText, 
                color: isDone ? '#16A34A' : '#64748B'
              }}>
                {isDone ? `✅ Xong (${done}/${total})` : `Tiến độ: ${done}/${total}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH ĐỒ ĐẠC CỦA CỤ (Nằm gọn bên trong Card bao) */}
      <div style={styles.assetList}>
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

const styles = {
  // Đóng gói toàn bộ cụm thành một chiếc Card nổi bần bật
  sectionBlock: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '4px',
    padding: '12px',
    borderRadius: '16px',
    border: '1.5px solid',
    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)',
    transition: 'all 0.2s ease',
    width: '100%',
    boxSizing: 'border-box'
  },
  
  // Biến dòng Header cũ thành một cái hộp Banner bo góc sang trọng
  sectionHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '10px 12px', 
    borderRadius: '12px',
    boxSizing: 'border-box',
    width: '100%',
    marginBottom: '6px'
  },
  
  elderTitleBox: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, width: '100%' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarIcon: { fontSize: '18px' },
  titleTextBlock: { display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 },
  
  // Đẩy cỡ chữ tên cụ to lên, chữ dày đậm siêu dễ đọc
  elderNameText: { fontSize: '15.5px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  miniProgressRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  miniBarBg: { width: '60px', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 },
  miniBarFill: { height: '100%', borderRadius: '10px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
  miniProgressText: { fontSize: '11px', fontWeight: '700' },
  
  assetList: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
};