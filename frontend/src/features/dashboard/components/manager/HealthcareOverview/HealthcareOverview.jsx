import { useEffect, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import { DetailListModal, StatusBadge } from "../../ui/DashboardUI";
import styles from "./HealthcareOverview.module.css";

const formatVital = (v) =>
    `HA ${v.bp_systolic}/${v.bp_diastolic} · Mạch ${v.pulse} · SpO2 ${v.spo2}% · Nhiệt độ ${v.temperature}°C`;

export const HealthcareOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [vitalsData, eldersData] = await Promise.all([
                    dashboardApi.getVitalsHistory({ limit_days: 1 }),
                    dashboardApi.getElders(),
                ]);

                const elderById = (eldersData || []).reduce((acc, e) => {
                    acc[e.id] = e;
                    return acc;
                }, {});

                const abnormal = (vitalsData || [])
                    .filter((v) => v.is_abnormal)
                    .map((v) => ({
                        ...v,
                        elder_name: elderById[v.elder_id]?.full_name ?? `Cụ #${v.elder_id}`,
                    }))
                    .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));

                setAlerts(abnormal);
            } catch (err) {
                setError("Không thể tải cảnh báo sức khỏe.");
                console.error("HealthcareOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const visibleAlerts = alerts.slice(0, 3);

    if (loading) {
        return (
            <section className={styles.card}>
                <h2>Tình hình y tế</h2>
                <p className={styles.emptyMessage}>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.card}>
                <h2>Tình hình y tế</h2>
                <p className={styles.emptyMessage}>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Tình hình y tế</h2>

                {alerts.length > 0 && (
                    <button type="button" className={styles.viewAllButton} onClick={() => setShowModal(true)}>
                        Xem tất cả
                    </button>
                )}
            </div>

            <div className={styles.list}>
                {visibleAlerts.map((item) => (
                    <div key={item.id} className={`${styles.item} ${styles.warning}`}>
                        <div className={styles.info}>
                            <strong>{item.elder_name}</strong>
                            <span>{formatVital(item)}</span>
                        </div>
                        <StatusBadge status="Chỉ số bất thường" />
                    </div>
                ))}

                {!alerts.length && (
                    <p className={styles.emptyMessage}>Không có cảnh báo sức khỏe nào hôm nay.</p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Cảnh báo sức khỏe (chỉ số bất thường hôm nay)"
                    items={alerts}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(item) => item.elder_name}
                    renderSecondary={(item) => formatVital(item)}
                    renderBadge={() => <StatusBadge status="Chỉ số bất thường" />}
                    enableSearch
                />
            )}
        </section>
    );
};