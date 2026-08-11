import styles from "./Notification.module.css";

export const Notification = ({
    count = 0,
    notifications = [],
}) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h3>Thông báo</h3>
                    <span>
                        {count} thông báo mới
                    </span>
                </div>

                <div className={styles.bell}>
                    🔔
                </div>
            </div>

            <div className={styles.list}>
                {notifications.length === 0 ? (
                    <div className={styles.empty}>
                        Không có thông báo mới
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={styles.item}
                        >
                            <div className={styles.dot} />

                            <div>
                                <p>
                                    {notification.title}
                                </p>

                                <span>
                                    {notification.time}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};