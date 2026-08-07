import styles from "./PrescriptionHistory.module.css";

// TODO: nối API đơn thuốc thật khi backend sẵn sàng
const MOCK_PRESCRIPTIONS = [
    { elder: "Nguyễn Văn A", medicine: "Amlodipine 5mg", date: "05/08/2026" },
    { elder: "Trần Thị B", medicine: "Paracetamol 500mg", date: "04/08/2026" },
    { elder: "Lê Văn C", medicine: "Vitamin D3", date: "03/08/2026" },
];

export const PrescriptionHistory = () => (
    <div className={styles.card}>
        <h3 className={styles.title}>Đơn thuốc gần đây</h3>
        <ul className={styles.list}>
            {MOCK_PRESCRIPTIONS.map((item, index) => (
                <li key={index} className={styles.item}>
                    <span className={styles.elder}>{item.elder}</span>
                    <span className={styles.medicine}>{item.medicine}</span>
                    <span className={styles.date}>{item.date}</span>
                </li>
            ))}
        </ul>
    </div>
);