import styles from "./StaffSchedule.module.css";

// TODO: nối API ca trực thật (shift_service.py) khi backend sẵn sàng
const MOCK_SCHEDULE = [
    { name: "Nguyễn Thị E", shift: "Ca sáng", time: "06:00 - 14:00" },
    { name: "Phạm Văn F", shift: "Ca chiều", time: "14:00 - 22:00" },
    { name: "Đỗ Thị G", shift: "Ca đêm", time: "22:00 - 06:00" },
];

export const StaffSchedule = () => (
    <div className={styles.card}>
        <h3 className={styles.title}>Lịch trực nhân viên hôm nay</h3>
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Nhân viên</th>
                    <th>Ca</th>
                    <th>Thời gian</th>
                </tr>
            </thead>
            <tbody>
                {MOCK_SCHEDULE.map((row) => (
                    <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.shift}</td>
                        <td>{row.time}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);