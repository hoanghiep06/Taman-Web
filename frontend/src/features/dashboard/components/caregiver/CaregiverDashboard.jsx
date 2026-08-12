import { useState } from "react";
import { FacilityInfo } from "../Common/FacilityInfo/FacilityInfo";

import { CaregiverOverview } from "./CaregiverOverview/CaregiverOverview";
import { CurrentShift } from "./CurrentShift/CurrentShift";
import { DoctorInstructions } from "./DoctorInstructions/DoctorInstructions";
import { TodayTasks } from "./TodayTasks/TodayTasks";

import { CAREGIVER_TASKS } from "../../mock/dashboardMockData";

import styles from "./CaregiverDashboard.module.css";

export const CaregiverDashboard = () => {
    const [tasks, setTasks] = useState(
        CAREGIVER_TASKS.map((t) => ({ ...t, status: t.status || "pending" }))
    );

    const toggleTaskStatus = (taskId) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId
                    ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
                    : t
            )
        );
    };

    const completedCount = tasks.filter((t) => t.status === "completed").length;

    return (
        <div className={styles.container}>
            <FacilityInfo />

            <CaregiverOverview tasks={tasks} />

            <div className={styles.grid}>
                <CurrentShift completedCount={completedCount} totalCount={tasks.length} />
                <DoctorInstructions />
            </div>

            <TodayTasks tasks={tasks} onToggleStatus={toggleTaskStatus} />
        </div>
    );
};