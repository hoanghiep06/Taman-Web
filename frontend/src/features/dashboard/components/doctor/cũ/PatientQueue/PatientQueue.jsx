import styles from "./PatientQueue.module.css";

// TODO: nối API hàng đợi khám thật (routes/health.py) khi backend sẵn sàng
const MOCK_QUEUE = [
    { name: "Nguyễn Văn A", room: "A101", reason: "Kiểm tra huyết áp", waiting: "5 phút" },
    { name: "Trần Thị B", room: "A102", reason: "Tái khám định kỳ", waiting: "12 phút" },
    { name: "Lê Văn C", room: "A103", reason: "Sốt nhẹ", waiting: "20 phút" },
];

export const PatientQueue = () => (
    <div className={styles.card}>
        <h3 className={styles.title}>Hàng đợi khám hôm nay</h3>
        <div className={styles.list}>
            {MOCK_QUEUE.map((patient) => (
                <div key={patient.room} className={styles.row}>
                    <div className={styles.info}>
                        <span className={styles.name}>{patient.name}</span>
                        <span className={styles.reason}>
                            {patient.reason} · Phòng {patient.room}
                        </span>
                    </div>
                    <span className={styles.waiting}>{patient.waiting}</span>
                </div>
            ))}
        </div>
    </div>
);