import styles from "./ResidentSummary.module.css";

export const ResidentSummary = ({ facility = "Cơ sở" }) => {
    return (
        <div className={styles.card}>
            <span className={styles.label}>Cơ sở đang làm việc</span>
            <strong className={styles.facility}>{facility}</strong>
        </div>
    );
};