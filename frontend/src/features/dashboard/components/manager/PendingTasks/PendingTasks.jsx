import { MANAGER_INCOMPLETE_TASKS } from "../../../mock/dashboardMockData";
import styles from "./PendingTasks.module.css";

const STATUS_MAP = {
    processing: {
        label: "Đang thực hiện",
        color: "#15803d",
        bg: "#dcfce7",
    },
    pending: {
        label: "Chưa thực hiện",
        color: "#b45309",
        bg: "#fef3c7",
    },
    missed: {
        label: "Chưa thực hiện qua ca",
        color: "#b91c1c",
        bg: "#fee2e2",
    },
    overdue: {
        label: "Quá hạn",
        color: "#b91c1c",
        bg: "#fee2e2",
    },
};

export const PendingTasks = () => {
    return (
        <section className={styles.card}>
            <h2>Công việc chưa hoàn thành</h2>

            <div className={styles.list} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {MANAGER_INCOMPLETE_TASKS.map((task) => {
                    const statusInfo = STATUS_MAP[task.status] || {
                        label: task.status,
                        color: "#64748b",
                        bg: "#f1f5f9",
                    };

                    return (
                        <div
                            key={task.id}
                            className={styles.item}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                borderBottom: "1px solid #f1f5f9"
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <strong style={{ color: "#0f172a", fontSize: "14px" }}>{task.task}</strong>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    {task.elder} · {task.room} · Lúc {task.time}
                                </span>
                            </div>

                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px 10px",
                                    borderRadius: "999px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: statusInfo.color,
                                    backgroundColor: statusInfo.bg,
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {statusInfo.label}
                            </span>
                        </div>
                    );
                })}

                {!MANAGER_INCOMPLETE_TASKS.length && (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "16px" }}>Không có công việc chưa hoàn thành.</p>
                )}
            </div>
        </section>
    );
};