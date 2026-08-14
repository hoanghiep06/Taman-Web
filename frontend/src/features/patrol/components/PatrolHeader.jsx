import React from 'react';
import styles from './PatrolHeader.module.css';

export const PatrolHeader = ({ roomNumber, onBack, onPrevRoom, onNextRoom, hasPrev, hasNext }) => (
  <header className={styles.header}>
    {/* Nút quay lại sảnh */}
    <button onClick={onBack} className={styles.backBtn} aria-label="Quay lại danh sách phòng">
      <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className={styles.backText}>Phòng</span>
    </button>
    
    {/* Cụm điều hướng trung tâm (Segment Pill) */}
    <div className={styles.navContainer}>
      <button 
        className={styles.arrowBtn} 
        onClick={onPrevRoom} 
        disabled={!hasPrev}
        title="Phòng trước"
        aria-label="Phòng trước"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className={styles.centerBadge}>
        <span className={styles.badgeLabel}>Đang kiểm kê</span>
        <h3 className={styles.roomTitle}>Phòng {roomNumber || '...'}</h3>
      </div>

      <button 
        className={styles.arrowBtn} 
        onClick={onNextRoom} 
        disabled={!hasNext}
        title="Phòng tiếp theo"
        aria-label="Phòng tiếp theo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    {/* Spacer tạo cân đối thị giác */}
    <div className={styles.spacer} />
  </header>
);