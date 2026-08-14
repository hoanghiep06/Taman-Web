import { useEffect, useState } from "react";

import { dashboardApi } from "../../../api/dashboardApi";
import { AlertItem, EmptyState, DetailListModal } from "../../ui/DashboardUI";

import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./SystemAlert.module.css";

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
};

export const SystemAlert = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await dashboardApi.getDashboardData();
                setIncidents(data?.recent_incidents || []);
            } catch (err) {
                setError("Không thể tải cảnh báo hệ thống.");
                console.error("SystemAlert fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Cảnh báo hệ thống</h2>
                <p className={styles.loadingText}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Cảnh báo hệ thống</h2>
                <p className={styles.errorText}>{error}</p>
            </section>
        );
    }

    // Chỉ hiện các ca trực thực sự có phát sinh mất/thất lạc đồ
    const alertIncidents = incidents.filter(
        (item) => item.missing_count > 0 || item.lost_count > 0
    );

    const recentAlerts = alertIncidents.slice(0, 3);

    const toAlertItem = (incident) => ({
        type: incident.lost_count > 0 ? "danger" : "warning",
        title: `Ca ${incident.shift_type} · ${formatDate(incident.shift_date)}`,
        message: `${incident.missing_count} món chưa tìm thấy · ${incident.lost_count} món báo mất trong tổng ${incident.total_assets} tài sản.`,
        time: formatDate(incident.created_at),
    });

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Cảnh báo hệ thống</h2>

                {alertIncidents.length > 0 && (
                    <button
                        type="button"
                        className={styles.viewAllButton}
                        onClick={() => setShowAllModal(true)}
                    >
                        Xem tất cả
                    </button>
                )}
            </div>

            <div className={uiStyles.alertList}>
                {recentAlerts.map((incident) => (
                    <AlertItem key={incident.shift_id} item={toAlertItem(incident)} />
                ))}

                {!alertIncidents.length && (
                    <EmptyState message="Không có cảnh báo nào cần xử lý." />
                )}
            </div>

            {showAllModal && (
                <DetailListModal
                    title="Toàn bộ cảnh báo hệ thống"
                    items={alertIncidents}
                    onClose={() => setShowAllModal(false)}
                    renderPrimary={(incident) => `Ca ${incident.shift_type} · ${formatDate(incident.shift_date)}`}
                    renderSecondary={(incident) =>
                        `${incident.missing_count} món chưa tìm thấy · ${incident.lost_count} món báo mất / ${incident.total_assets} tài sản`
                    }
                    enableSearch
                />
            )}
        </section>
    );
};