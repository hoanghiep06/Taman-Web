import styles from "./RecentActivity.module.css";

const ACTIVITIES = [
    {
        id: 1,
        user: "Admin",
        action: "Tạo tài khoản",
        target: "Nguyễn Văn C",
        time: "10 phút trước",
    },
    {
        id: 2,
        user: "Manager A",
        action: "Cập nhật phòng",
        target: "Phòng A102",
        time: "25 phút trước",
    },
    {
        id: 3,
        user: "Doctor A",
        action: "Cập nhật bệnh án",
        target: "Nguyễn Văn A",
        time: "40 phút trước",
    },
];

export const RecentActivity = () => {
    return (
        <div className={styles.card}>

            <div className={styles.header}>
                <div>
                    <span>Audit</span>
                    <h3>Hoạt động gần đây</h3>
                </div>

                <button>Xem tất cả</button>
            </div>

            <div>
                {ACTIVITIES.map((activity) => (
                    <div
                        key={activity.id}
                        className={styles.item}
                    >
                        <div className={styles.avatar}>
                            {activity.user.charAt(0)}
                        </div>

                        <div>
                            <strong>{activity.user}</strong>

                            <p>
                                {activity.action} —{" "}
                                {activity.target}
                            </p>

                            <span>{activity.time}</span>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};