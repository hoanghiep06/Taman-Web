import styles from "./MedicalMobileLayout.module.css";

export const MedicalMobileLayout = ({ children }) => (
    <div className={styles.container}>{children}</div>
);