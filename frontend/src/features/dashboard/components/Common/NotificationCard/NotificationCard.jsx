import styles from "./NotificationCard.module.css";

const TYPE_ICON = {
    danger: "🔴",
    warning: "🟡",
    info: "🔵",
    success: "🟢",
};

export const NotificationCard = ({
    notification,
    onRead,
}) => {
    return (
        <button
            className={`${styles.item} ${
                !notification.read ? styles.unread : ""
            }`}
            onClick={onRead}
        >
            <div className={styles.icon}>
                {TYPE_ICON[notification.type] || "🔵"}
            </div>

            <div className={styles.content}>
                <div className={styles.title}>
                    {notification.title}
                </div>

                <div className={styles.message}>
                    {notification.message}
                </div>

                <div className={styles.time}>
                    {notification.time}
                </div>
            </div>

            {!notification.read && (
                <span className={styles.dot} />
            )}
        </button>
    );
};