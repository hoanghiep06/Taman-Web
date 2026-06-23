import React from 'react';
import { theme } from '../utils/theme';

export const ProgressSection = ({ completedCount, totalCount, onNextRoom, nextRoomName, isFinished }) => {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <div style={styles.progressSection}>
      <div style={styles.progressHeader}>
        <span style={styles.progressText}>Tiến độ phòng <b style={styles.progressStrong}>{completedCount}/{totalCount}</b> món</span>
        <span style={{...styles.progressPercent, color: isFinished ? theme.color.successDark : theme.color.primaryDark}}>
          {percent}%
        </span>
      </div>
      <div style={styles.progressBarBg}>
        <div style={{...styles.progressBarFill, width: `${percent}%`, backgroundColor: isFinished ? theme.color.success : theme.color.primary}}></div>
      </div>

      {isFinished && (
        <button onClick={onNextRoom} style={styles.nextRoomBtn}>
          {nextRoomName ? `🎉 Chuyển đến Phòng ${nextRoomName}` : '🎉 Hoàn tất kiểm kê — Về sảnh'}
          <span style={styles.nextRoomArrow}>→</span>
        </button>
      )}
    </div>
  );
};

const styles = {
  progressSection: {
    backgroundColor: theme.color.surface, padding: '14px 16px', borderRadius: theme.radius.xl,
    marginBottom: '10px', boxShadow: theme.shadow.sm, border: `1px solid ${theme.color.border}`,
  },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' },
  progressText: { fontSize: '13px', fontWeight: '500', color: theme.color.inkSecondary },
  progressStrong: { color: theme.color.ink, fontWeight: '800' },
  progressPercent: { fontSize: '15px', fontWeight: '800' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.pill, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: theme.radius.pill, transition: 'width 0.4s ease' },
  nextRoomBtn: {
    marginTop: '12px', width: '100%', padding: '12px', backgroundColor: theme.color.success, color: '#FFF',
    border: 'none', borderRadius: theme.radius.md, fontWeight: '700', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    boxShadow: '0 4px 12px -2px rgba(22,163,74,0.4)',
  },
  nextRoomArrow: { fontSize: '15px' },
};