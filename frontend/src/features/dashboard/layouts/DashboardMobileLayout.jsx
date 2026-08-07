import styles from "./DashboardMobileLayout.module.css";

export const DashboardMobileLayout = ({ children }) => (
    <div className={styles.container}>{children}</div>
);