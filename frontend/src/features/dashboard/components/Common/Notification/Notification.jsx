import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../../../contexts/AuthContext";
import { NotificationCard } from "../NotificationCard/NotificationCard";
import { getRoleNotifications } from "../../../mock/dashboardMockData";
import { dashboardApi } from "../../../api/dashboardApi";

import styles from "./Notification.module.css";

const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });
};

const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN");
};

/* ── ADMIN: suy luận "đăng nhập từ IP mới" từ login-logs ── */
const buildAdminNotifications = (logs, userById) => {
    const sorted = [...logs].sort(
        (a, b) => new Date(a.login_time) - new Date(b.login_time)
    );

    const lastIpByUser = {};
    const result = [];

    sorted.forEach((log) => {
        const previousIp = lastIpByUser[log.user_id];

        if (previousIp && previousIp !== log.ip_address) {
            const user = userById[log.user_id];
            result.push({
                id: `iplog-${log.id}`,
                type: "warning",
                title: "Đăng nhập từ IP mới",
                message: `${user?.full_name ?? user?.username ?? `User #${log.user_id}`} vừa đăng nhập từ địa chỉ IP mới: ${log.ip_address}.`,
                time: formatTime(log.login_time),
                read: false,
                sortTime: log.login_time,
            });
        }

        lastIpByUser[log.user_id] = log.ip_address;
    });

    return result
        .sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime))
        .slice(0, 10);
};

/* ── DOCTOR: chỉ số sinh hiệu bất thường từ dashboard-doctor ── */
const buildDoctorNotifications = (elders) => {
    return elders
        .filter((e) => e.has_abnormal_vital || (e.doctor_attention_reasons || []).length > 0)
        .map((e) => {
            const reasons = (e.doctor_attention_reasons || []).join(", ");
            const vitalNote = e.latest_vital_signs
                ? `HA ${e.latest_vital_signs.bp_systolic}/${e.latest_vital_signs.bp_diastolic} · SpO₂ ${e.latest_vital_signs.spo2}% · Nhiệt độ ${e.latest_vital_signs.temperature}°C`
                : "";

            return {
                id: `elder-${e.elder_id}`,
                type: e.has_abnormal_vital ? "danger" : "warning",
                title: `${e.elder_name} · Phòng ${e.room_number}`,
                message: reasons || vitalNote || "Cần chú ý theo dõi.",
                time: formatTime(e.latest_vital_signs?.measured_at),
                read: false,
            };
        });
};

/* ── MANAGER / COORDINATOR / CAREGIVER: nhắc lịch cân quá hạn/sắp đến hạn ── */
const buildWeightNotifications = (dueList) => {
    return dueList
        .filter((item) => item.status_flag === "OVERDUE" || item.status_flag === "WARNING")
        .map((item) => ({
            id: `weight-${item.elder_id}`,
            type: item.status_flag === "OVERDUE" ? "danger" : "warning",
            title: `${item.elder_name} · ${item.room_number}`,
            message:
                item.status_flag === "OVERDUE"
                    ? `Đã quá hạn cân ${item.days_since_last_weight} ngày, cần cân gấp.`
                    : `Còn ${item.days_remaining} ngày là đến hạn cân định kỳ.`,
            time: item.last_weight_date ? `Cân lần cuối: ${formatDate(item.last_weight_date)}` : "Chưa từng cân",
            read: false,
        }));
};

const ROLE_NORMALIZED = (role) => String(role || "").toLowerCase().replace(/[\s_-]/g, "");

export const Notification = () => {
    const { user } = useAuth();
    const role = user?.role;
    const normalizedRole = ROLE_NORMALIZED(role);

    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                if (normalizedRole === "admin") {
                    const [logsData, usersData] = await Promise.all([
                        dashboardApi.getLoginLogs({ limit: 50 }),
                        dashboardApi.getUsers(),
                    ]);

                    const userById = (usersData || []).reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});

                    setNotifications(buildAdminNotifications(logsData || [], userById));
                    return;
                }

                if (normalizedRole === "doctor") {
                    const data = await dashboardApi.getDoctorDashboard({ only_attention_needed: true });
                    setNotifications(buildDoctorNotifications(data || []));
                    return;
                }

                if (["manager", "coordinator", "caregiver"].includes(normalizedRole)) {
                    const data = await dashboardApi.getWeightDueList();
                    setNotifications(buildWeightNotifications(data || []));
                    return;
                }

                // Role chưa có endpoint tương ứng -> giữ mock
                setNotifications(getRoleNotifications(role));
            } catch (err) {
                console.error("Notification fetch error:", err);
                // Fallback về mock nếu API lỗi, tránh khối thông báo trắng hoàn toàn
                setNotifications(getRoleNotifications(role));
            }
        };

        fetchNotifications();
    }, [role, normalizedRole]);

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