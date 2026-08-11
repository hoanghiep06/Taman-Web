import styles from "./SystemAlert.module.css";

const ALERTS = [
    {
        id: 1,
        type: "danger",
        title: "Tài khoản bị khóa",
        message: "Nguyễn Văn B đã bị khóa",
        time: "5 phút trước",
    },
    {
        id: 2,
        type: "info",
        title: "Tài khoản mới",
        message: "Trần Văn C vừa được tạo tài khoản",
        time: "15 phút trước",
    },
    {
        id: 3,
        type: "warning",
        title: "Chưa gán role",
        message: "Tài khoản user_103 chưa được gán role",
        time: "25 phút trước",
    },
    {
        id: 4,
        type: "danger",
        title: "Đăng nhập bất thường",
        message: "Tài khoản doctor01 đăng nhập từ nhiều thiết bị",
        time: "40 phút trước",
    },
    {
        id: 5,
        type: "warning",
        title: "Thay đổi role",
        message: "Tài khoản staff_02 chuyển từ Caregiver → Coordinator",
        time: "1 giờ trước",
    },
];

export const SystemAlert = () => {
    return (
        <div className={styles.card}>

            <div className={styles.header}>
                <div>
                    <span>Cảnh báo</span>
                    <h3>Cảnh báo hệ thống</h3>
                </div>

                <strong>{ALERTS.length}</strong>
            </div>

            <div className={styles.list}>

                {ALERTS.map((alert) => (
                    <div
                        key={alert.id}
                        className={`${styles.item} ${styles[alert.type]}`}
                    >
                        <div className={styles.icon}>
                            {alert.type === "danger"
                                ? "!"
                                : alert.type === "warning"
                                    ? "⚠"
                                    : "i"}
                        </div>

                        <div>
                            <strong>{alert.title}</strong>

                            <p>{alert.message}</p>

                            <span>{alert.time}</span>
                        </div>
                    </div>
                ))}

            </div>

        </div>
    );
};