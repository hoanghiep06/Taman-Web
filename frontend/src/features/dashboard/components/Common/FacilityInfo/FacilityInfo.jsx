import styles from "./FacilityInfo.module.css";

export const FacilityInfo = ({
    facilityName = "Cơ sở Tâm An - Quận 1",
}) => {
    return (
        <section className={styles.card}>
            <div className={styles.icon}>🏥</div>

            <div>
                <div className={styles.label}>
                    Cơ sở đang làm việc
                </div>

                <div className={styles.name}>
                    {facilityName}
                </div>
            </div>
        </section>
    );
};