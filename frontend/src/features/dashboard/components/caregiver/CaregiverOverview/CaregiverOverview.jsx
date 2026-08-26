import { useState } from "react";

import { StatCard, Modal, UnderDevelopment } from "../../ui/DashboardUI";
import uiStyles from "../../ui/DashboardUI.module.css";

export const CaregiverOverview = () => {
    // "all" | "pending" | "completed" | "notifications" | null
    const [view, setView] = useState(null);

    const VIEW_TITLE = {
        all: "Tất cả công việc hôm nay",
        pending: "Công việc chưa hoàn thành",
        completed: "Công việc đã hoàn thành",
        notifications: "Thông báo mới",
    };

    return (
        <section>
            <h2>Tổng quan ca trực</h2>

            <div className={uiStyles.statistics}>
                <StatCard
                    title="Công việc hôm nay"
                    value="—"
                    icon="📋"
                    color="#2563eb"
                    onClick={() => setView("all")}
                />

                <StatCard
                    title="Đã hoàn thành"
                    value="—"
                    icon="✅"
                    color="#15803d"
                    onClick={() => setView("completed")}
                />

                <StatCard
                    title="Cần thực hiện"
                    value="—"
                    icon="⏳"
                    color="#b45309"
                    onClick={() => setView("pending")}
                />

                <StatCard
                    title="Thông báo mới"
                    value="—"
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => setView("notifications")}
                />
            </div>

            {view && (
                <Modal title={VIEW_TITLE[view]} onClose={() => setView(null)}>
                    <UnderDevelopment
                        message={
                            view === "notifications"
                                ? "Tính năng thông báo đang được phát triển."
                                : "Tính năng quản lý công việc đang được phát triển."
                        }
                    />
                </Modal>
            )}
        </section>
    );
};