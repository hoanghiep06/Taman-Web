import { useState } from "react";
import { MANAGER_HEALTH_ALERTS } from "../../../mock/dashboardMockData";
import { DetailListModal, StatusBadge } from "../../ui/DashboardUI";
import styles from "./HealthcareOverview.module.css";

export const HealthcareOverview = () => {
    const [showModal, setShowModal] = useState(false);

    // Sort: danger first, then warning
    const sortedAlerts = [...MANAGER_HEALTH_ALERTS].sort((a, b) => {
        const severityA = a.severity === "danger" ? 0 : 1;
        const severityB = b.severity === "danger" ? 0 : 1;
        return severityA - severityB;
    });

    const visibleAlerts = sortedAlerts.slice(0, 3);

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Tình hình y tế</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {visibleAlerts.map((item) => {
                    const isDanger = item.severity === "danger";
                    return (
                        <div
                            key={item.id}
                            className={`${styles.item} ${isDanger ? styles.danger : styles.warning}`}
                        >
                            <div className={styles.info}>
                                <strong>{item.name}</strong>
                                <span>{item.condition} · {item.value}</span>
                            </div>

                            <StatusBadge
                                status={isDanger ? "Báo động đỏ" : "Cần theo dõi"}
                            />
                        </div>
                    );
                })}

                {!sortedAlerts.length && (
                    <p className={styles.emptyMessage}>Không có cảnh báo sức khỏe nào.</p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Cảnh báo sức khỏe (Đỏ & Vàng)"
                    items={sortedAlerts}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(item) => item.name}
                    renderSecondary={(item) => `${item.condition} · Chỉ số: ${item.value}`}
                    renderBadge={(item) => (
                        <StatusBadge
                            status={item.severity === "danger" ? "Báo động đỏ" : "Cần theo dõi"}
                        />
                    )}
                />
            )}
        </section>
    );
};