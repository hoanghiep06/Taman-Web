import styles from "./DashboardHeader.module.css";

export const DashboardHeader = ({
    userName,
    role,
    shift,
    date,
}) => {
    return (
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>
                    Xin chào, {userName}
                </h1>

                <p className={styles.subtitle}>
                    {role}
                </p>
            </div>

            <div className={styles.right}>
                <div className={styles.shift}>
                    {shift}
                </div>

                <div className={styles.date}>
                    {date}
                </div>
            </div>
        </div>
    );
};