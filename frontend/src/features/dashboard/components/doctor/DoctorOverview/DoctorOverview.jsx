import { useState } from "react";

import {
    DOCTOR_STATS,
    DOCTOR_ELDERS_LIST,
    DOCTOR_APPOINTMENTS,
    DOCTOR_NOTIFICATIONS,
} from "../../../mock/dashboardMockData";
import { StatCard, DetailListModal, StatusBadge } from "../../ui/DashboardUI";

import styles from "./DoctorOverview.module.css";

/* Thứ tự ưu tiên tình trạng: Báo động -> Cần chú ý -> Ổn định */
const STATUS_PRIORITY = {
    "Báo động": 1,
    "Cần chú ý": 2,
    "Ổn định": 3,
};

const sortedElders = [...DOCTOR_ELDERS_LIST].sort(
    (a, b) => (STATUS_PRIORITY[a.health] ?? 99) - (STATUS_PRIORITY[b.health] ?? 99)
);

const VIEW_CONFIG = {
    elders: {
        title: "Danh sách cụ",
        data: sortedElders,
        renderPrimary: (p) => p.name,
        renderSecondary: (p) => `Phòng ${p.room} · ${p.note}`,
        renderBadge: (p) => <StatusBadge status={p.health} />,
        enableSearch: true,
        searchKeys: ["room", "health"],
        enableFilter: true,
        filterKey: "health",
        filterLabel: "tình trạng",
        filterOptions: ["Báo động", "Cần chú ý", "Ổn định"],
    },
    appointments: {
        title: "Cuộc hẹn hôm nay",
        data: DOCTOR_APPOINTMENTS,
        renderPrimary: (a) => a.elder,
        renderSecondary: (a) => `${a.time} · Phòng ${a.room} · ${a.type}`,
    },
    notifications: {
        title: "Thông báo",
        data: DOCTOR_NOTIFICATIONS,
        renderPrimary: (n) => n.title,
        renderSecondary: (n) => `${n.detail} · ${n.time}`,
    },
};

export const DoctorOverview = () => {
    // "elders" | "appointments" | "notifications" | null
    const [activeView, setActiveView] = useState(null);

    const config = activeView ? VIEW_CONFIG[activeView] : null;

    return (
        <>
            <div className={styles.grid}>
                <StatCard
                    title="Tổng số cụ"
                    value={DOCTOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setActiveView("elders")}
                />

                <StatCard
                    title="Cuộc hẹn hôm nay"
                    value={DOCTOR_STATS.appointments}
                    icon="📅"
                    color="#059669"
                    onClick={() => setActiveView("appointments")}
                />

                <StatCard
                    title="Thông báo"
                    value={DOCTOR_STATS.notifications}
                    icon="🔔"
                    color="#ea580c"
                    onClick={() => setActiveView("notifications")}
                />
            </div>

            {config && (
                <DetailListModal
                    title={config.title}
                    items={config.data}
                    onClose={() => setActiveView(null)}
                    renderPrimary={config.renderPrimary}
                    renderSecondary={config.renderSecondary}
                    renderBadge={config.renderBadge}
                    enableSearch={config.enableSearch}
                    searchKeys={config.searchKeys}
                    enableFilter={config.enableFilter}
                    filterKey={config.filterKey}
                    filterLabel={config.filterLabel}
                    filterOptions={config.filterOptions}
                />
            )}
        </>
    );
};