import styles from "./TodayTasks.module.css";
import { UnderDevelopment } from "../../ui/DashboardUI";

export const TodayTasks = () => {
    return (
        <section className={styles.card}>
            <h2>Công việc hôm nay</h2>
            <UnderDevelopment message="Tính năng quản lý công việc đang được phát triển." />
        </section>
    );
};