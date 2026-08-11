import styles from "./ResidentSummary.module.css";

export const ResidentSummary = ({
    total = 0,
    facility = "Cơ sở",
}) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <span className={styles.label}>
                        Người cao tuổi
                    </span>

                    <h2>{total}</h2>
                </div>

                <div className={styles.icon}>
                    👴
                </div>
            </div>

            <div className={styles.facility}>
                <span>Cơ sở đang làm việc</span>

                <strong>{facility}</strong>
            </div>
        </div>
    );
};