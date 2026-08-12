import { useState } from "react";
import { DetailListModal, StatusBadge } from "../../ui/DashboardUI";
import styles from "./TodayTasks.module.css";

// tasks + onToggleStatus được truyền từ CaregiverDashboard (state đã lift lên)
export const TodayTasks = ({ tasks, onToggleStatus }) => {
    const [showModal, setShowModal] = useState(false);

    // Mặc định hiện 3 công việc
    const visibleTasks = tasks.slice(0, 3);

    const StatusToggle = ({ task }) => (
        <button
            type="button"
            className={styles.statusToggle}
            onClick={() => onToggleStatus(task.id)}
        >
            <StatusBadge
                status={task.status === "completed" ? "Đã hoàn thành" : "Chưa hoàn thành"}
            />
        </button>
    );

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h2>Công việc hôm nay</h2>
                    <span className={styles.count}>{tasks.length} công việc</span>
                </div>

                <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={() => setShowModal(true)}
                >
                    Xem tất cả
                </button>
            </div>

            <div className={styles.list}>
                {visibleTasks.map((task) => (
                    <div key={task.id} className={styles.item}>
                        <strong className={styles.time}>{task.time}</strong>

                        <div className={styles.info}>
                            <span className={styles.taskName}>
                                Cho cụ {task.elder} uống {task.task}
                            </span>
                            <small>{task.room}</small>
                        </div>

                        <StatusToggle task={task} />
                    </div>
                ))}

                {!tasks.length && (
                    <p className={styles.emptyMessage}>Không có công việc nào hôm nay.</p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Toàn bộ công việc hôm nay"
                    items={tasks}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(task) => `Cho cụ ${task.elder} uống ${task.task}`}
                    renderSecondary={(task) => `${task.time} · ${task.room}`}
                    renderBadge={(task) => <StatusToggle task={task} />}
                    enableSearch
                    searchKeys={["elder", "room"]}
                />
            )}
        </section>
    );
};