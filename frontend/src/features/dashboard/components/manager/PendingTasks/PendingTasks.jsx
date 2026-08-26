import { UnderDevelopment } from "../../ui/DashboardUI";
import styles from "./PendingTasks.module.css";

export const PendingTasks = () => {
    return (
        <section className={styles.card}>
            <h2>Công việc chưa hoàn thành</h2>
            <UnderDevelopment message="Tính năng quản lý công việc đang được phát triển." />
        </section>
    );
};