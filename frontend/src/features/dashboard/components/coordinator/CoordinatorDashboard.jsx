import { FacilityInfo } from "../Common/FacilityInfo/FacilityInfo";

import { CoordinatorOverview } from "./CoordinatorOverview/CoordinatorOverview";
import { TaskStatus } from "./TaskStatus/TaskStatus";
import { AttentionTasks } from "./AttentionTasks/AttentionTasks";
import { TodaySchedule } from "./TodaySchedule/TodaySchedule";

import styles from "./CoordinatorDashboard.module.css";

export const CoordinatorDashboard = () => {
    return (
        <div className={styles.container}>
            <FacilityInfo />

            <CoordinatorOverview />

            <div className={styles.grid}>
                <TaskStatus />
                <AttentionTasks />
            </div>

            <TodaySchedule />
        </div>
    );
};