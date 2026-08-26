import { FacilityInfo } from "../Common/FacilityInfo/FacilityInfo";

import { CaregiverOverview } from "./CaregiverOverview/CaregiverOverview";
import { CurrentShift } from "./CurrentShift/CurrentShift";
import { DoctorInstructions } from "./DoctorInstructions/DoctorInstructions";
import { TodayTasks } from "./TodayTasks/TodayTasks";

import styles from "./CaregiverDashboard.module.css";

export const CaregiverDashboard = () => {
    return (
        <div className={styles.container}>
            <FacilityInfo />

            <CaregiverOverview />

            <div className={styles.grid}>
                <CurrentShift />
                <DoctorInstructions />
            </div>

            <TodayTasks />
        </div>
    );
};