import { useState, useEffect } from "react";
import { Notification } from "../Notification/Notification";
import { dashboardApi } from "../../../api/dashboardApi";

import styles from "./DashboardHeader.module.css";

const SHIFT_TYPE_LABEL = {
    Sang: "Ca Sáng",
    Toi: "Ca Tối",
};

export const DashboardHeader = ({
    userName,
    role,
    date,
    facility,
}) => {
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardApi.getCurrentShift()
            .then((data) => setCurrentShift(data))
            .catch((err) => {
                console.error("Lỗi tải ca trực hiện tại:", err);
                setCurrentShift(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const renderShiftLabel = () => {
        if (loading) return "Đang tải...";
        if (!currentShift || !currentShift.is_active) return "Không có ca trực";

        const typeLabel = SHIFT_TYPE_LABEL[currentShift.shift_type] || currentShift.shift_type;
        return `${typeLabel} (${currentShift.start_time} - ${currentShift.end_time})`;
    };

    return (
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>
                    Xin chào, {userName}
                </h1>

                <p className={styles.subtitle}>
                    {role}
                </p>
            </div>

            <div className={styles.right}>

                <div className={styles.shift}>
                    {renderShiftLabel()}
                </div>

                <div className={styles.date}>
                    {date}
                </div>

                <Notification role={role} />
            </div>
        </div>
    );
};