import { useState } from "react";

import { CAREGIVER_STATS, CAREGIVER_NOTIFICATIONS } from "../../../mock/dashboardMockData";
import { StatCard, DetailListModal, StatusBadge } from "../../ui/DashboardUI";

import uiStyles from "../../ui/DashboardUI.module.css";

// tasks: mảng công việc đã được lift state từ CaregiverDashboard (có status "completed" | "pending")
export const CaregiverOverview = ({ tasks }) => {
    // "all" | "pending" | "completed" | "notifications" | null
    const [view, setView] = useState(null);

    const completedTasks = tasks.filter((t) => t.status === "completed");
    const pendingTasks = tasks.filter((t) => t.status !== "completed");

    const VIEW_CONFIG = {
        all: { title: "Tất cả công việc hôm nay", data: tasks },
        pending: { title: "Công việc chưa hoàn thành", data: pendingTasks },
        completed: { title: "Công việc đã hoàn thành", data: completedTasks },
        notifications: { title: "Thông báo mới", data: CAREGIVER_NOTIFICATIONS },
    };

    const config = view ? VIEW_CONFIG[view] : null;
    const isTaskView = view === "all" || view === "pending" || view === "completed";

    return (
        <section>
            <h2>Tổng quan ca trực</h2>

            <div className={uiStyles.statistics}>
                <StatCard
                    title="Công việc hôm nay"
                    value={tasks.length}
                    icon="📋"
                    color="#2563eb"
                    onClick={() => setView("all")}
                />

                <StatCard
                    title="Đã hoàn thành"
                    value={completedTasks.length}
                    icon="✅"
                    color="#15803d"
                    onClick={() => setView("completed")}
                />

                <StatCard
                    title="Cần thực hiện"
                    value={pendingTasks.length}
                    icon="⏳"
                    color="#b45309"
                    onClick={() => setView("pending")}
                />

                <StatCard
                    title="Thông báo mới"
                    value={CAREGIVER_STATS.notifications}
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => setView("notifications")}
                />
            </div>

            {config && isTaskView && (
                <DetailListModal
                    title={config.title}
                    items={config.data}
                    onClose={() => setView(null)}
                    renderPrimary={(task) => `Cho cụ ${task.elder} uống ${task.task}`}
                    renderSecondary={(task) => `${task.time} · ${task.room}`}
                    renderBadge={(task) => (
                        <StatusBadge
                            status={task.status === "completed" ? "Đã hoàn thành" : "Chưa hoàn thành"}
                        />
                    )}
                    enableSearch
                    searchKeys={["elder", "room"]}
                />
            )}

            {config && view === "notifications" && (
                <DetailListModal
                    title={config.title}
                    items={config.data}
                    onClose={() => setView(null)}
                    renderPrimary={(item) => item.title}
                    renderSecondary={(item) => `${item.detail} · ${item.time}`}
                    enableSearch
                />
            )}
        </section>
    );
};