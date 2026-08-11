import styles from "./SystemLogCard.module.css";

// TODO: nối API audit log thật (admin_history.py) khi backend sẵn sàng
const MOCK_LOGS = [
    { time: "09:12", message: "Admin đã tạo tài khoản mới cho nhân viên Nguyễn Văn D" },
    { time: "08:47", message: "Hệ thống tự động sao lưu dữ liệu thành công" },
    { time: "08:15", message: "Quản lý cập nhật lịch ca trực tuần này" },
];

export const SystemLogCard = () => (
    <div className={styles.card}>
        <h3 className={styles.title}>Nhật ký hệ thống gần đây</h3>
        <ul className={styles.list}>
            {MOCK_LOGS.map((log, index) => (
                <li key={index} className={styles.item}>
                    <span className={styles.time}>{log.time}</span>
                    <span className={styles.message}>{log.message}</span>
                </li>
            ))}
        </ul>
    </div>
);