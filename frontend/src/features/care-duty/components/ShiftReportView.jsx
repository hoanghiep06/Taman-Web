import React from 'react';
import styles from './ShiftReportView.module.css';

export const ShiftReportView = ({ report }) => {
  if (!report) return null;

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>BÁO CÁO ĐÃ CHỐT</span>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            CƠ SỞ: {report.facility_name}
          </h2>
        </div>
        <span className={styles.doneBadge}>✓ Đã hoàn tất</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
        <div>
          <strong>Người báo cáo:</strong> {report.reporter_name}
        </div>
        <div>
          <strong>Diễn biến trong ca:</strong>
          <pre className={styles.descBox}>
            {report.formatted_elder_descriptions}
          </pre>
        </div>
        <div>
          <strong>Hướng xử lý / Lưu ý ca sau:</strong>
          <p className={styles.guideBox}>
            {report.handover_notes}
          </p>
        </div>
      </div>
    </div>
  );
};