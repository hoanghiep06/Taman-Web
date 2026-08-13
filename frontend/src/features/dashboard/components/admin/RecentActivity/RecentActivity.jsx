import { useEffect, useState } from "react";

import { dashboardApi } from "../../../api/dashboardApi";
import { EmptyState, DetailListModal } from "../../ui/DashboardUI";

import styles from "./RecentActivity.module.css";

const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });
};

export const RecentActivity = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activities, setActivities] = useState([]);
    const [showAllModal, setShowAllModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [logsData, usersData] = await Promise.all([
                    dashboardApi.getLoginLogs({ limit: 50 }),
                    dashboardApi.getUsers(),
                ]);

                const users = usersData || [];
                const userById = users.reduce((acc, u) => {
                    acc[u.id] = u;
                    return acc;
                }, {});

                const logs = (logsData || [])
                    .map((log) => ({
                        ...log,
                        user: userById[log.user_id] || null,
                    }))
                    .sort((a, b) => new Date(b.login_time) - new Date(a.login_time));

                setActivities(logs);
            } catch (err) {
                setError("Không thể tải hoạt động gần đây.");
                console.error("RecentActivity fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getName = (log) =>
        log.user?.full_name ?? log.user?.username ?? `User #${log.user_id}`;

    const recentActivities = activities.slice(0, 3);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Hoạt động gần đây</h2>
                <p className={styles.loadingText}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Hoạt động gần đây</h2>
                <p className={styles.errorText}>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Hoạt động gần đây</h2>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowAllModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {recentActivities.map((log) => (
                    <div key={log.id} className={styles.item}>
                        <div className={styles.info}>
                            <strong>{getName(log)}</strong>
                            <span>Đăng nhập từ IP {log.ip_address}</span>
                        </div>

                        <small>{formatTime(log.login_time)}</small>
                    </div>
                ))}

                {!recentActivities.length && <EmptyState message="Chưa có hoạt động nào." />}
            </div>

            {showAllModal && (
                <DetailListModal
                    title="Toàn bộ hoạt động đăng nhập"
                    items={activities}
                    onClose={() => setShowAllModal(false)}
                    renderPrimary={(log) => getName(log)}
                    renderSecondary={(log) => `IP ${log.ip_address} · ${formatTime(log.login_time)}`}
                    enableSearch
                />
            )}
        </section>
    );
};