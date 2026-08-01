import React from 'react';
import styles from './PatrolHeader.module.css';

export const PatrolHeader = ({ roomNumber, onBack }) => (
  <header className={styles.header}>
    <button onClick={onBack} className={styles.backBtn} aria-label="Quay lại danh sách phòng">
      <span className={styles.backIcon}>‹</span>
      <span>Phòng</span>
    </button>
    <div className={styles.titleBlock}>
      <span className={styles.eyebrow}>Đang kiểm kê</span>
      <h3 className={styles.title}>Phòng {roomNumber}</h3>
    </div>
    <div className={styles.spacer} />
  </header>
);