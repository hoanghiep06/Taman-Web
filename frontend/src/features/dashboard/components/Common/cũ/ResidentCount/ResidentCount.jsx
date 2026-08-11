import styles from "./ResidentCount.module.css";

export const ResidentCount = ({ count = 0, facility = "Cơ sở" }) => {
    return (
        <div className={styles.card}>
            <div className={styles.icon}>👥</div>

            <div className={styles.content}>
                <span className={styles.label}>
                    Người cao tuổi
                </span>

                <strong className={styles.value}>
                    {count}
                </strong>

                <span className={styles.facility}>
                    {facility}
                </span>
            </div>
        </div>
    );
};