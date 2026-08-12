import { useState } from "react";

import { StatCard, DetailListModal, DetailFieldsModal, StatusBadge } from "../../ui/DashboardUI";
import {
    COORDINATOR_STATS,
    COORDINATOR_ELDERS_LIST,
    COORDINATOR_TASKS,
    COORDINATOR_NOTIFICATIONS,
} from "../../../mock/dashboardMockData";

import uiStyles from "../../ui/DashboardUI.module.css";

export const CoordinatorOverview = () => {
    // "elders" | "tasks" | "notifications" | null
    const [detailType, setDetailType] = useState(null);
    const [selectedElder, setSelectedElder] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);

    return (
        <>
            <div className={uiStyles.statistics}>
                <StatCard
                    title="Tổng số cụ"
                    value={COORDINATOR_STATS.elders}
                    icon="👴"
                    color="#2563eb"
                    onClick={() => setDetailType("elders")}
                />

                <StatCard
                    title="Công việc hôm nay"
                    value={COORDINATOR_STATS.tasks}
                    icon="📋"
                    color="#ea580c"
                    onClick={() => setDetailType("tasks")}
                />

                <StatCard
                    title="Thông báo"
                    value={COORDINATOR_STATS.notifications}
                    icon="🔔"
                    color="#dc2626"
                    onClick={() => setDetailType("notifications")}
                />
            </div>

            {detailType === "elders" && (
                <DetailListModal
                    title="Danh sách các cụ"
                    items={COORDINATOR_ELDERS_LIST}
                    onClose={() => setDetailType(null)}
                    onItemClick={(elder) => setSelectedElder(elder)}
                    renderPrimary={(elder) => elder.name}
                    renderSecondary={(elder) => `${elder.area} · ${elder.room}`}
                    enableSearch
                    enableFilter
                    filterKey="area"
                    filterLabel="khu vực"
                />
            )}

            {detailType === "tasks" && (
                <DetailListModal
                    title="Công việc hôm nay"
                    items={COORDINATOR_TASKS}
                    onClose={() => setDetailType(null)}
                    onItemClick={(task) => setSelectedTask(task)}
                    renderPrimary={(task) => task.task}
                    renderSecondary={(task) => `${task.assignee} · ${task.time} (${task.date})`}
                    renderBadge={(task) => <StatusBadge status={task.status} />}
                    enableSearch
                    searchKeys={["assignee", "elder"]}
                    enableFilter
                    filterKey="status"
                    filterLabel="trạng thái"
                />
            )}

            {detailType === "notifications" && (
                <DetailListModal
                    title="Thông báo"
                    items={COORDINATOR_NOTIFICATIONS}
                    onClose={() => setDetailType(null)}
                    renderPrimary={(item) => item.title}
                    renderSecondary={(item) => `${item.detail} · ${item.time}`}
                    enableSearch
                />
            )}

            {selectedElder && (
                <DetailFieldsModal
                    title="Thông tin cụ"
                    avatarLabel={selectedElder.name.charAt(0)}
                    onClose={() => setSelectedElder(null)}
                    fields={[
                        { label: "Họ tên", value: selectedElder.name },
                        { label: "Khu vực", value: selectedElder.area },
                        { label: "Phòng", value: selectedElder.room },
                    ]}
                />
            )}

            {selectedTask && (
                <DetailFieldsModal
                    title="Chi tiết công việc"
                    onClose={() => setSelectedTask(null)}
                    fields={[
                        { label: "Công việc", value: selectedTask.task },
                        { label: "Cụ", value: selectedTask.elder },
                        { label: "Người thực hiện", value: selectedTask.assignee },
                        { label: "Chức vụ", value: selectedTask.assigneeRole || "Caregiver" },
                        { label: "Thời gian", value: `${selectedTask.time} (${selectedTask.date})` },
                        { label: "Trạng thái", value: selectedTask.status },
                    ]}
                />
            )}
        </>
    );
};