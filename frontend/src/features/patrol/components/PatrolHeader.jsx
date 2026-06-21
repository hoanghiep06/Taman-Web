import React from 'react';
import { theme } from '../utils/theme';

export const PatrolHeader = ({ roomNumber, onBack }) => (
  <header style={styles.header}>
    <button onClick={onBack} style={styles.backBtn} aria-label="Quay lại danh sách phòng">
      <span style={styles.backIcon}>‹</span>
      <span>Phòng</span>
    </button>
    <div style={styles.titleBlock}>
      <span style={styles.eyebrow}>Đang kiểm kê</span>
      <h3 style={styles.title}>Phòng {roomNumber}</h3>
    </div>
    <div style={styles.spacer} />
  </header>
);

const styles = {
  header: {
    position: 'sticky', top: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', marginBottom: '12px',
    backgroundColor: theme.color.bg,
    borderBottom: `1px solid ${theme.color.border}`,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '2px',
    background: 'none', border: 'none', color: theme.color.primary,
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    padding: '6px 4px', minWidth: '60px',
  },
  backIcon: { fontSize: '20px', lineHeight: 1, marginTop: '-1px' },
  titleBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  eyebrow: { fontSize: '10.5px', fontWeight: '600', color: theme.color.inkMuted, textTransform: 'uppercase', letterSpacing: '0.04em' },
  title: { margin: 0, fontSize: '17px', fontWeight: '800', color: theme.color.ink },
  spacer: { width: '60px' },
};