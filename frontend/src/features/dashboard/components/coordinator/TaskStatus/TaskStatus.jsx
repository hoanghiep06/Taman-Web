import { useMemo, useState } from "react";

import { COORDINATOR_TASKS } from "../../../mock/dashboardMockData";
import { Section, DetailListModal, StatusBadge, EmptyState } from "../../ui/DashboardUI";

import uiStyles from "../../ui/DashboardUI.module.css";
import styles from "./TaskStatus.module.css";

const parseTaskDateTime = (task) => {
    const [day, month, year] = task.date.split("/").map(Number);
    const [hours, minutes] = task.time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
};

export const TaskStatus = () => {
    const [showModal, setShowModal] = useState(false);

    // 3 công việc gần nhất kể từ thời điểm hiện tại
    const upcomingTasks = useMemo(() => {
        const now = new Date();
        const sorted = [...COORDINATOR_TASKS].sort(
            (a, b) => parseTaskDateTime(a) - parseTaskDateTime(b)
        );
        const upcoming = sorted.filter((task) => parseTaskDateTime(task) >= now);

        // Nếu hết việc sắp tới trong ngày, fallback về 3 việc gần nhất đã qua
        return (upcoming.length ? upcoming : sorted.slice(-3).reverse()).slice(0, 3);
    }, []);

    // Toàn bộ, sắp xếp mới nhất -> cũ nhất cho modal
    const sortedTasks = useMemo(() => {
        return [...COORDINATOR_TASKS].sort(
            (a, b) => parseTaskDateTime(b) - parseTaskDateTime(a)
        );
    }, []);

    return (
        <Section
            title="Tình trạng công việc"
            onTitleClick={() => setShowModal(true)}
            right={
                <button
                    type="button"
                    className={uiStyles.linkButton}
                    onClick={() => setShowModal(true)}
                >
                    Xem chi tiết
                </button>
            }
        >
            <div className={styles.list}>
                {upcomingTasks.map((task) => (
                    <div key={task.id} className={styles.item}>
                        <div className={styles.mainRow}>
                            <strong>{task.task}</strong>
                            <span>{task.assignee}</span>
                        </div>

                        <div className={styles.subRow}>
                            <span className={styles.time}>{task.time}</span>
                            <StatusBadge status={task.status} />
                        </div>
                    </div>
                ))}

                {!upcomingTasks.length && (
                    <EmptyState message="Không có công việc nào." />
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Toàn bộ tình trạng công việc"
                    items={sortedTasks}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(t) => t.task}
                    renderSecondary={(t) => `${t.assignee} · ${t.elder} · ${t.time} (${t.date})`}
                    renderBadge={(t) => <StatusBadge status={t.status} />}
                    enableSearch
                    searchKeys={["date", "time", "assignee", "elder"]}
                    enableFilter
                    filterKey="status"
                    filterLabel="trạng thái"
                />
            )}
        </Section>
    );
};