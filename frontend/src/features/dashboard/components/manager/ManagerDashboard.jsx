import { FacilityInfo } from "../Common/FacilityInfo/FacilityInfo";

import { ResidentOverview } from "./ResidentOverview/ResidentOverview";
import { StaffOverview } from "./StaffOverview/StaffOverview";
import { HealthcareOverview } from "./HealthcareOverview/HealthcareOverview";
import { RoomOverview } from "./RoomOverview/RoomOverview";
import { PendingTasks } from "./PendingTasks/PendingTasks";

import styles from "./ManagerDashboard.module.css";

export const ManagerDashboard = () => {
    return (
        <div className={styles.container}>
            <FacilityInfo />

            <ResidentOverview />

            <div className={styles.grid}>
                <StaffOverview />
                <HealthcareOverview />
            </div>

            <div className={styles.grid}>
                <RoomOverview />
                <PendingTasks />
            </div>
        </div>
    );
};