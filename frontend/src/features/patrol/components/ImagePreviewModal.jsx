import React from 'react';
import { theme } from '../utils/theme';

export const ImagePreviewModal = ({ isOpen, imageUrl, assetName, isLoading, onClose, onCopyLink }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.previewContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.previewHeader}>
          <h4 style={styles.previewTitle}>Ảnh minh chứng · {assetName}</h4>
          <button style={styles.closeModalX} onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div style={styles.imageContainer}>
          {isLoading ? (
            <div style={styles.loadingState}>Đang tải ảnh...</div>
          ) : (
            <img src={imageUrl} alt="Minh chứng" style={styles.previewImage} />
          )}
        </div>

        <div style={styles.previewFooterActions}>
          <button onClick={() => onCopyLink(imageUrl)} style={styles.copyLinkBtn}>
            🔗 Sao chép liên kết ảnh
          </button>
          <button onClick={onClose} style={styles.closeTextBtn}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  previewContent: { backgroundColor: theme.color.surface, borderRadius: theme.radius.xxl, width: '100%', maxWidth: '360px', overflow: 'hidden', boxShadow: theme.shadow.xl },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${theme.color.surfaceMuted}` },
  previewTitle: { margin: 0, fontSize: '13.5px', fontWeight: '700', color: theme.color.ink },
  closeModalX: { background: theme.color.surfaceMuted, border: 'none', width: '26px', height: '26px', borderRadius: theme.radius.pill, fontSize: '13px', color: theme.color.inkTertiary, cursor: 'pointer' },
  imageContainer: { width: '100%', minHeight: '180px', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  loadingState: { color: 'rgba(255,255,255,0.7)', fontSize: '13px' },
  previewImage: { width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block' },
  previewFooterActions: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: theme.color.bg },
  copyLinkBtn: { width: '100%', padding: '11px', backgroundColor: theme.color.primary, color: '#FFF', border: 'none', borderRadius: theme.radius.md, fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  closeTextBtn: { width: '100%', padding: '11px', backgroundColor: theme.color.surfaceMuted, color: theme.color.inkSecondary, border: 'none', borderRadius: theme.radius.md, fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
};