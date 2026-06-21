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

  return (
    <div style={styles.sectionBlock}>
      <div style={styles.sectionHeader}>
        <div style={styles.elderTitleBox}>
          <div style={{...styles.avatar, backgroundColor: group.isElder ? theme.color.primaryTint : theme.color.surfaceMuted}}>
            <span style={styles.avatarIcon}>{group.isElder ? '👵' : '📦'}</span>
          </div>
          <div style={styles.titleTextBlock}>
            <span style={styles.elderNameText}>{group.title}</span>
            <div style={styles.miniProgressRow}>
              <div style={styles.miniBarBg}>
                <div style={{...styles.miniBarFill, width: `${percent}%`, backgroundColor: isDone ? theme.color.success : theme.color.primary}} />
              </div>
              <span style={{...styles.miniProgressText, color: isDone ? theme.color.successDark : theme.color.inkTertiary}}>{done}/{total}</span>
            </div>
          </div>
        </div>
      </div>

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
  sectionBlock: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: `1.5px solid ${theme.color.border}` },
  elderTitleBox: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  avatar: { width: '34px', height: '34px', borderRadius: theme.radius.pill, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarIcon: { fontSize: '16px' },
  titleTextBlock: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  elderNameText: { fontSize: '15px', fontWeight: '700', color: theme.color.ink },
  miniProgressRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  miniBarBg: { width: '64px', height: '5px', backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.pill, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: theme.radius.pill, transition: 'width 0.4s ease' },
  miniProgressText: { fontSize: '11px', fontWeight: '700' },
  assetList: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2px' },
};