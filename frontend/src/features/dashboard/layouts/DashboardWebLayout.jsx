import styles from "./DashboardWebLayout.module.css";

export const DashboardWebLayout = ({ children }) => (
    <div className={styles.container}>{children}</div>
);