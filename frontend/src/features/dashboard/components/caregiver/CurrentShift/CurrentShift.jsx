import styles from "./CurrentShift.module.css";

// completedCount/totalCount nhận từ CaregiverDashboard (cùng nguồn state với TodayTasks)
export const CurrentShift = ({ completedCount, totalCount }) => {
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <section className={styles.card}>
            <h2>Ca trực hiện tại</h2>

            <div className={styles.info}>
                <div>
                    <span>Ca</span>
                    <strong>Ca sáng</strong>
                </div>

                <div>
                    <span>Thời gian</span>
                    <strong>08:00 - 16:00</strong>
                </div>

                <div>
                    <span>Tiến độ</span>
                    <strong>{progress}%</strong>
                </div>
            </div>
        </section>
    );
};