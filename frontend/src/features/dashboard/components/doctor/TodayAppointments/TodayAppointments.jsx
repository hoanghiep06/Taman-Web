import { UnderDevelopment } from "../../ui/DashboardUI";
import styles from "./TodayAppointments.module.css";

export const TodayAppointments = () => {
    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Cuộc hẹn hôm nay</h2>
            </div>

            <UnderDevelopment message="Tính năng lịch hẹn đang được phát triển." />
        </section>
    );
};