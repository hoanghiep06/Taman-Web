import React from 'react';
import { getFinalStatus } from '../utils/patrolHelpers';
import { theme } from '../utils/theme';

export const AssetItemCard = ({ asset, isSelected, uploadStatus, onToggleSelect, onOpenMissing, onOpenPreview }) => {
  const dbStatus = asset.current_status;
  const finalStatus = getFinalStatus(asset, uploadStatus);
  const isSuccess = finalStatus === 'Success';
  const isMissing = finalStatus === 'Missing';
  const isProcessing = finalStatus === 'Processing';
  const isError = finalStatus === 'Error';

  const canViewImage = dbStatus === 'Xanh' || dbStatus === 'Success';

  const renderStatusBadge = () => {
    if (isProcessing) return <span style={{...styles.badge, ...styles.badgeProcessing}}>🔄 Đang nén ảnh lên Drive...</span>;
    if (isSuccess) return <span style={{...styles.badge, ...styles.badgeSuccess}}>✓ Đã nộp ({asset.inspected_at || 'Vừa xong'})</span>;
    if (isMissing) return <span style={{...styles.badge, ...styles.badgeMissing}}>⚠️ Đã báo mất {asset.inspected_at ? `(${asset.inspected_at})` : ''}</span>;
    if (isError) return <span style={{...styles.badge, ...styles.badgeError}}>❌ Lỗi ảnh, hãy chụp lại</span>;
    return <span style={{...styles.badge, ...styles.badgeUnchecked}}>Chưa kiểm kê</span>;
  };

  return (
    <div
      style={{
        ...styles.assetItemCard,
        borderColor: isSelected ? theme.color.primary : theme.color.border,
        backgroundColor: isSelected ? theme.color.primaryTint : isMissing ? theme.color.warningTintSoft : theme.color.surface,
        opacity: isProcessing ? 0.6 : 1,
        cursor: isProcessing ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !isProcessing && onToggleSelect(asset.asset_id)}
    >
      <div style={styles.cardMainInfo}>
        <div style={{
          ...styles.checkbox,
          backgroundColor: isSelected ? theme.color.primary : theme.color.surface,
          borderColor: isSelected ? theme.color.primary : theme.color.borderStrong,
        }}>
          {isSelected && <span style={styles.checkMark}>✓</span>}
        </div>

        <div style={styles.textDetails}>
          <span style={styles.assetName}>{asset.asset_name}</span>
          <div style={styles.metaInfoRow}>
            <span style={styles.idSubtext}>Mã: #{asset.asset_id}</span>
            {asset.note && <span style={styles.noteSubtext}>• Ghi chú: {asset.note}</span>}
          </div>
          <div style={{marginTop: '6px'}}>{renderStatusBadge()}</div>
        </div>
      </div>

      <div style={styles.actionRightBlock}>
        {canViewImage && asset.log_id && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPreview(asset.log_id, asset.asset_name); }}
            style={styles.previewBtn}
          >
            🖼️ Xem ảnh
          </button>
        )}

        {!isProcessing && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMissing(asset.asset_id); }}
            style={isMissing ? styles.actionBtnUpdate : styles.actionBtn}
          >
            {isMissing ? 'Sửa báo mất' : 'Báo mất'}
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  assetItemCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: theme.radius.lg, border: '1.5px solid', boxShadow: theme.shadow.sm, transition: 'all 0.15s ease', position: 'relative' },
  cardMainInfo: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  checkbox: { width: '22px', height: '22px', borderRadius: theme.radius.sm, border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' },
  checkMark: { color: '#FFF', fontSize: '13px', fontWeight: 'bold' },
  textDetails: { display: 'flex', flexDirection: 'column', gap: '2px' },
  assetName: { fontSize: '15px', fontWeight: '700', color: theme.color.ink },
  metaInfoRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' },
  idSubtext: { fontSize: '11px', color: theme.color.inkMuted, fontWeight: '500' },
  noteSubtext: { fontSize: '11px', color: theme.color.warningDark, fontWeight: '500' },
  badge: { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: theme.radius.sm, display: 'inline-block' },
  badgeUnchecked: { backgroundColor: theme.color.surfaceMuted, color: theme.color.inkTertiary },
  badgeProcessing: { backgroundColor: theme.color.infoTint, color: theme.color.infoDark },
  badgeSuccess: { backgroundColor: theme.color.successTint, color: theme.color.successDark },
  badgeMissing: { backgroundColor: theme.color.warningTint, color: theme.color.warningDark },
  badgeError: { backgroundColor: theme.color.dangerTint, color: theme.color.dangerDark },
  actionRightBlock: { display: 'flex', gap: '6px', alignItems: 'center', zIndex: 10 },
  actionBtn: { padding: '6px 12px', backgroundColor: theme.color.surface, color: theme.color.danger, border: `1px solid ${theme.color.dangerTint}`, borderRadius: theme.radius.sm, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  actionBtnUpdate: { padding: '6px 12px', backgroundColor: theme.color.surface, color: theme.color.warningDark, border: '1px solid #FDE68A', borderRadius: theme.radius.sm, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  previewBtn: { padding: '6px 12px', backgroundColor: theme.color.primaryTint, color: theme.color.primaryDark, border: '1px solid #BAE6FD', borderRadius: theme.radius.sm, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
};