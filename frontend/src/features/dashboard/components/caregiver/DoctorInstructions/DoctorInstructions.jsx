import styles from "./DoctorInstructions.module.css";
import { UnderDevelopment } from "../../ui/DashboardUI";

export const DoctorInstructions = () => {
    return (
        <section className={styles.card}>
            <h2>Chỉ dẫn của bác sĩ</h2>
            <UnderDevelopment message="Tính năng chỉ dẫn từ bác sĩ đang được phát triển." />
        </section>
    );
};