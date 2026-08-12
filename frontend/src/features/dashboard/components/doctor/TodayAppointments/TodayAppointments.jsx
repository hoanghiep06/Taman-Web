import { DOCTOR_APPOINTMENTS } from "../../../mock/dashboardMockData";
import styles from "./TodayAppointments.module.css";

export const TodayAppointments = () => {
    // Chỉ hiện 3 cuộc hẹn tiếp theo
    const visibleAppointments = DOCTOR_APPOINTMENTS.slice(0, 3);

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h2>Cuộc hẹn hôm nay</h2>
            </div>

            <div className={styles.list}>
                {visibleAppointments.map((appointment, idx) => (
                    <div key={appointment.id || idx} className={styles.item}>
                        <time className={styles.time}>{appointment.time}</time>

                        <div className={styles.info}>
                            <strong>{appointment.elder}</strong>
                            <span>
                                {appointment.room} · {appointment.type}
                            </span>
                        </div>
                    </div>
                ))}

                {!visibleAppointments.length && (
                    <p className={styles.emptyMessage}>
                        Không có lịch hẹn nào hôm nay.
                    </p>
                )}
            </div>
        </section>
    );
};