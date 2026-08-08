import styles from "./MedicalWebLayout.module.css";

export const MedicalWebLayout = ({ children }) => (
    <div className={styles.container}>{children}</div>
);