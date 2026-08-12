import { useState } from "react";
import {
    MANAGER_ELDERS_LIST,
    MANAGER_ADMITTED_LIST,
    MANAGER_ATTENTION_LIST,
    MANAGER_APPOINTMENTS_LIST,
} from "../../../mock/dashboardMockData";
import {
    StatCard,
    DetailListModal,
    StatusBadge
} from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./ResidentOverview.module.css";

export const ResidentOverview = () => {
    // "all" | "admitted" | "attention" | "appointments" | null
    const [view, setView] = useState(null);

    return (
        <section className={styles.section}>
            <h2>Người cao tuổi</h2>

            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={MANAGER_ELDERS_LIST.length}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setView("all")}
                />

                <StatCard
                    title="Đang nhập viện"
                    value={MANAGER_ADMITTED_LIST.length}
                    icon="🏥"
                    color="#0891b2"
                    onClick={() => setView("admitted")}
                />

                <StatCard
                    title="Cần chú ý"
                    value={MANAGER_ATTENTION_LIST.length}
                    icon="⚠️"
                    color="#dc2626"
                    onClick={() => setView("attention")}
                />

                <StatCard
                    title="Có lịch khám"
                    value={MANAGER_APPOINTMENTS_LIST.length}
                    icon="📅"
                    color="#7c3aed"
                    onClick={() => setView("appointments")}
                />
            </div>

            {view === "all" && (
                <DetailListModal
                    title="Danh sách tất cả cụ"
                    items={MANAGER_ELDERS_LIST}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `Giới tính: ${p.gender}`}
                    renderBadge={(p) => <StatusBadge status={p.healthStatus} />}
                />
            )}

            {view === "admitted" && (
                <DetailListModal
                    title="Danh sách cụ đang nhập viện"
                    items={MANAGER_ADMITTED_LIST}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `Phòng: ${p.room} · Lý do: ${p.reason} · Từ ngày: ${p.since}`}
                />
            )}

            {view === "attention" && (
                <DetailListModal
                    title="Danh sách cụ cần chú ý"
                    items={MANAGER_ATTENTION_LIST}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `Phòng: ${p.room} · Tình trạng: ${p.condition}`}
                    renderBadge={() => <StatusBadge status="Cần chú ý" />}
                />
            )}

            {view === "appointments" && (
                <DetailListModal
                    title="Danh sách cụ có lịch khám"
                    items={MANAGER_APPOINTMENTS_LIST}
                    onClose={() => setView(null)}
                    renderPrimary={(p) => p.name}
                    renderSecondary={(p) => `Thời gian: ${p.datetime} · Bác sĩ: ${p.doctor} · Loại: ${p.type}`}
                />
            )}
        </section>
    );
};