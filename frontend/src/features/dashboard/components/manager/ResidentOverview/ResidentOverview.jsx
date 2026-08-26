import { useEffect, useState } from "react";
import { dashboardApi } from "../../../api/dashboardApi";
import {
    StatCard,
    DetailListModal,
    StatusBadge,
    Modal,
    UnderDevelopment,
} from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./ResidentOverview.module.css";

const formatVital = (v) =>
    `HA ${v.bp_systolic}/${v.bp_diastolic} · Mạch ${v.pulse} · SpO2 ${v.spo2}% · Nhiệt độ ${v.temperature}°C`;

export const ResidentOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elders, setElders] = useState([]);
    const [attentionList, setAttentionList] = useState([]);

    // "all" | "admitted" | "attention" | "appointments" | null
    const [view, setView] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [eldersData, vitalsData] = await Promise.all([
                    dashboardApi.getElders(),
                    dashboardApi.getVitalsHistory({ limit_days: 1 }),
                ]);

                const elderById = (eldersData || []).reduce((acc, e) => {
                    acc[e.id] = e;
                    return acc;
                }, {});

                // Mỗi cụ chỉ tính 1 lần dù có nhiều chỉ số bất thường trong ngày
                const attentionMap = new Map();
                (vitalsData || [])
                    .filter((v) => v.is_abnormal)
                    .forEach((v) => {
                        if (!attentionMap.has(v.elder_id)) {
                            attentionMap.set(v.elder_id, {
                                ...v,
                                elder_name: elderById[v.elder_id]?.full_name ?? `Cụ #${v.elder_id}`,
                            });
                        }
                    });

                setElders(eldersData || []);
                setAttentionList(Array.from(attentionMap.values()));
            } catch (err) {
                setError("Không thể tải dữ liệu người cao tuổi.");
                console.error("ResidentOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <section className={styles.section}>
                <h2>Người cao tuổi</h2>
                <p>Đang tải...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section className={styles.section}>
                <h2>Người cao tuổi</h2>
                <p>{error}</p>
            </section>
        );
    }

    return (
        <section className={styles.section}>
            <h2>Người cao tuổi</h2>

            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={elders.length}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setView("all")}
                />

                <StatCard
                    title="Đang nhập viện"
                    value="—"
                    icon="🏥"
                    color="#0891b2"
                    onClick={() => setView("admitted")}
                />

                <StatCard
                    title="Cần chú ý"
                    value={attentionList.length}
                    icon="⚠️"
                    color="#dc2626"
                    onClick={() => setView("attention")}
                />

                <StatCard
                    title="Có lịch khám"
                    value="—"
                    icon="📅"
                    color="#7c3aed"
                    onClick={() => setView("appointments")}
                />
            </div>

            {view === "all" && (
                <DetailListModal
                    title="Danh sách tất cả cụ"
                    items={elders}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.full_name}
                    renderSecondary={(p) => `Giới tính: ${p.gender ?? "—"}`}
                    enableSearch
                />
            )}

            {view === "admitted" && (
                <Modal title="Danh sách cụ đang nhập viện" onClose={() => setView(null)}>
                    <UnderDevelopment message="Tính năng theo dõi nhập viện đang được phát triển." />
                </Modal>
            )}

            {view === "attention" && (
                <DetailListModal
                    title="Danh sách cụ cần chú ý (chỉ số bất thường hôm nay)"
                    items={attentionList}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.elder_name}
                    renderSecondary={(p) => formatVital(p)}
                    renderBadge={() => <StatusBadge status="Cần chú ý" />}
                    enableSearch
                />
            )}

            {view === "appointments" && (
                <Modal title="Danh sách cụ có lịch khám" onClose={() => setView(null)}>
                    <UnderDevelopment message="Tính năng lịch khám đang được phát triển." />
                </Modal>
            )}
        </section>
    );
};