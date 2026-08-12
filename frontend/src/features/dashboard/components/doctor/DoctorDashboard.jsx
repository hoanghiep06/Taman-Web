import { FacilityInfo } from "../Common/FacilityInfo/FacilityInfo";

import { DoctorOverview } from "./DoctorOverview/DoctorOverview";
import { PatientStatus } from "./PatientStatus/PatientStatus";
import { TodayAppointments } from "./TodayAppointments/TodayAppointments";
import { CaregiverReports } from "./CaregiverReports/CaregiverReports";

import styles from "./DoctorDashboard.module.css";

export const DoctorDashboard = () => {
    return (
        <div className={styles.container}>
            <FacilityInfo />

            <DoctorOverview />

            <div className={styles.grid}>
                <PatientStatus />
                <TodayAppointments />
            </div>

            <CaregiverReports />
        </div>
    );
};