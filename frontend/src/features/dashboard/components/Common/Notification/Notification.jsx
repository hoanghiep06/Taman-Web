import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../../../contexts/AuthContext";
import { NotificationCard } from "../NotificationCard/NotificationCard";
import { getRoleNotifications } from "../../../mock/dashboardMockData";

import styles from "./Notification.module.css";

export const Notification = () => {
    const { user } = useAuth();
    const role = user?.role;
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setNotifications(getRoleNotifications(role));
    }, [role]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <button
                type="button"
                className={styles.bellButton}
                onClick={() => setOpen((prev) => !prev)}
            >
                🔔
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount}</span>
                )}
            </button>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <h3>Thông báo</h3>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className={styles.markAllButton}
                                onClick={markAllAsRead}
                            >
                                Đánh dấu đã đọc tất cả
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length > 0 ? (
                            notifications.map((n) => (
                                <NotificationCard
                                    key={n.id}
                                    notification={n}
                                    onRead={() => markAsRead(n.id)}
                                />
                            ))
                        ) : (
                            <p className={styles.empty}>Không có thông báo nào.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};