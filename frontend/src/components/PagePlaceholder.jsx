import styles from "./PagePlaceholder.module.css";

export const PagePlaceholder = ({ title, icon = "🚧", description }) => {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrap}>
                <span className={styles.icon}>{icon}</span>
            </div>

            <div className={styles.textGroup}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.description}>
                    {description || "Màn hình này sẽ được phát triển ở Sprint tiếp theo."}
                </p>
            </div>

            <span className={styles.badge}>Đang xây dựng</span>
        </div>
    );
};