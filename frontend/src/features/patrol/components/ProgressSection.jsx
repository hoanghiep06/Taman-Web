import React from 'react';
import styles from './ProgressSection.module.css';

export const ProgressSection = ({ completedCount, totalCount, onNextRoom, nextRoomName, isFinished }) => {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.text}>
          Tiến độ phòng <b className={styles.strong}>{completedCount}/{totalCount}</b> món
        </span>
        <span className={`${styles.percent} ${isFinished ? styles.percentDone : styles.percentActive}`}>{percent}%</span>
      </div>
      <div className={styles.barBg}>
        <div className={`${styles.barFill} ${isFinished ? styles.barDone : styles.barActive}`} style={{ width: `${percent}%` }} />
      </div>

      {isFinished && (
        <button onClick={onNextRoom} className={styles.nextRoomBtn}>
          {nextRoomName ? `🎉 Chuyển đến Phòng ${nextRoomName}` : '🎉 Hoàn tất kiểm kê — Về sảnh'}
          <span className={styles.arrow}>→</span>
        </button>
      )}
    </div>
  );
};