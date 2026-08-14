import { useEffect, useState } from "react";

import { dashboardApi } from "../../../api/dashboardApi";
import { StatCard, DetailListModal, StatusBadge } from "../../ui/DashboardUI";

import styles from "./DoctorOverview.module.css";

const STATUS_PRIORITY = { "Báo động": 1, "Cần chú ý": 2, "Ổn định": 3 };

const getHealthStatus = (elder) => {
    if (elder.has_abnormal_vital) return "Báo động";
    if ((elder.doctor_attention_reasons || []).length > 0) return "Cần chú ý";
    return "Ổn định";
};

export const DoctorOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elders, setElders] = useState([]);
    const [activeView, setActiveView] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dashboardApi.getDoctorDashboard();
                setElders(data || []);
            } catch (err) {
                setError("Không thể tải dữ liệu tổng quan.");
                console.error("DoctorOverview fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const eldersWithStatus = elders
        .map((e) => ({ ...e, health: getHealthStatus(e) }))
        .sort((a, b) => STATUS_PRIORITY[a.health] - STATUS_PRIORITY[b.health]);

    const attentionElders = eldersWithStatus.filter((e) => e.health !== "Ổn định");

    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;

    return (
        <>
            <div className={styles.grid}>
                <StatCard
                    title="Tổng số cụ"
                    value={elders.length}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setActiveView("elders")}
                />

                <StatCard
                    title="Cần chú ý"
                    value={attentionElders.length}
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => setActiveView("attention")}
                />
            </div>

            {activeView === "elders" && (
                <DetailListModal
                    title="Danh sách cụ"
                    items={eldersWithStatus}
                    onClose={() => setActiveView(null)}
                    renderPrimary={(p) => p.elder_name}
                    renderSecondary={(p) => `Phòng ${p.room_number}`}
                    renderBadge={(p) => <StatusBadge status={p.health} />}
                    enableSearch
                    searchKeys={["room_number", "health"]}
                    enableFilter
                    filterKey="health"
                    filterLabel="tình trạng"
                    filterOptions={["Báo động", "Cần chú ý", "Ổn định"]}
                />
            )}

            {activeView === "attention" && (
                <DetailListModal
                    title="Cụ cần chú ý"
                    items={attentionElders}
                    onClose={() => setActiveView(null)}
                    renderPrimary={(p) => p.elder_name}
                    renderSecondary={(p) => `Phòng ${p.room_number} · ${(p.doctor_attention_reasons || []).join(", ")}`}
                    renderBadge={(p) => <StatusBadge status={p.health} />}
                    enableSearch
                />
            )}
        </>
    );
};