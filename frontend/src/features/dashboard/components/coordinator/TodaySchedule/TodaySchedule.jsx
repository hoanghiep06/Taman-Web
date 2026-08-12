import { useMemo, useState } from "react";
import { COORDINATOR_SCHEDULE } from "../../../mock/dashboardMockData";
import { Section, DetailListModal } from "../../ui/DashboardUI";
import styles from "./TodaySchedule.module.css";

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
};

export const TodaySchedule = () => {
    const [showModal, setShowModal] = useState(false);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Filter tasks from current time onwards, sorted ascending
    const upcomingTasks = useMemo(() => {
        return COORDINATOR_SCHEDULE
            .filter((item) => timeToMinutes(item.time) >= currentMinutes)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }, [currentMinutes]);

    const visibleTasks = upcomingTasks.slice(0, 3);

    // Sort all schedule for the modal
    const allSortedSchedule = useMemo(() => {
        return [...COORDINATOR_SCHEDULE].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }, []);

    return (
        <Section
            title="Lịch trình hôm nay"
            onTitleClick={() => setShowModal(true)}
            right={
                <button
                    type="button"
                    style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "13px"
                    }}
                    onClick={() => setShowModal(true)}
                >
                    Xem toàn bộ
                </button>
            }
        >
            <div className={styles.list} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {visibleTasks.map((item) => (
                    <div
                        key={item.id}
                        className={styles.item}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            padding: "10px 12px",
                            borderBottom: "1px solid #f1f5f9"
                        }}
                    >
                        <time style={{ color: "#2563eb", fontWeight: "700", width: "50px" }}>{item.time}</time>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ color: "#0f172a" }}>{item.title}</strong>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{item.location}</span>
                        </div>
                    </div>
                ))}

                {!visibleTasks.length && (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "16px" }}>
                        Không còn công việc nào trong phần còn lại của ngày.
                    </p>
                )}
            </div>

            {showModal && (
                <DetailListModal
                    title="Toàn bộ lịch trình hôm nay"
                    items={allSortedSchedule}
                    onClose={() => setShowModal(false)}
                    renderPrimary={(item) => `${item.time} - ${item.title}`}
                    renderSecondary={(item) => `Địa điểm: ${item.location}`}
                />
            )}
        </Section>
    );
};