import styles from "./MobileHeader.module.css";

export const MobileHeader = () => {
    return (
        <header className={styles.header}>
            <button className={styles.iconButton}>
                ☰
            </button>

            <div className={styles.title}>
                TÂM AN
            </div>

            <button className={styles.iconButton}>
                👤
            </button>
        </header>
    );
};