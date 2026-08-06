import React from 'react';
import styles from './VitalAlertList.module.css';

export const VitalAlertList = ({ alerts = [] }) => {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className={styles.alertContainer}>
            <div className={styles.alertHeader}>
                <h3 className={styles.alertTitle}>
                    <span>🚨</span> CẢNH BÁO CẦN CHÚ Ý TRONG CA ({alerts.length})
                </h3>
                <span className={styles.badgeAuto}>Cảnh báo tự động</span>
            </div>

            <div className={styles.alertGrid}>
                {alerts.map((item, idx) => (
                    <div key={idx} className={styles.alertCard}>
                        <div>
                            <div className={styles.roomTag}>Phòng {item.roomNumber}</div>
                            <div className={styles.elderName}>{item.elderName}</div>
                        </div>
                        <div className={styles.issueBadge}>
                            ⚠️ {item.issueDetail}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};