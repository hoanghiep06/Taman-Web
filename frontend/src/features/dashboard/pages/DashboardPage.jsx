import { useContext } from "react";

import { AuthContext } from "../../../contexts/AuthContext";
import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { ROLES, ROLE_LABELS } from "../../../utils/constants";

import { DashboardWebLayout } from "../layouts/DashboardWebLayout";
import { DashboardMobileLayout } from "../layouts/DashboardMobileLayout";

import { DashboardHeader } from "../components/Common/DashboardHeader/DashboardHeader";
import { StatisticCard } from "../components/Common/StatisticCard/StatisticCard";
import { ShiftOverviewCard } from "../components/Common/ShiftOverviewCard/ShiftOverviewCard";
import { VitalAlertList } from "../components/Common/VitalAlertList/VitalAlertList";
import { ElderCard } from "../components/Common/ElderCard/ElderCard";

import { RevenueChart } from "../components/admin/RevenueChart/RevenueChart";
import { SystemLogCard } from "../components/admin/SystemLogCard/SystemLogCard";
import { PatientQueue } from "../components/doctor/PatientQueue/PatientQueue";
import { PrescriptionHistory } from "../components/doctor/PrescriptionHistory/PrescriptionHistory";
import { StaffSchedule } from "../components/manager/StaffSchedule/StaffSchedule";

import styles from "./DashboardPage.module.css";

// TODO: nối dashboardApi.js khi backend sẵn sàng
const MOCK_STATISTICS = [
    { title: "Người cao tuổi", value: 82, color: "#2563EB" },
    { title: "Nhân sự", value: 34, color: "#16A34A" },
    { title: "Cảnh báo", value: 3, color: "#DC2626" },
];

const MOCK_ALERTS = [
    { name: "Nguyễn Văn A", message: "Huyết áp cao" },
    { name: "Trần Thị B", message: "Nhịp tim bất thường" },
];

const MOCK_ELDERS = [
    { name: "Nguyễn Văn A", room: "A101", heartRate: "78 bpm", bloodPressure: "120/80", temperature: "36.7°C" },
    { name: "Trần Thị B", room: "A102", heartRate: "95 bpm", bloodPressure: "145/95", temperature: "37.8°C" },
    { name: "Lê Văn C", room: "A103", heartRate: "82 bpm", bloodPressure: "118/79", temperature: "36.5°C" },
];

const RoleWidgets = ({ role }) => {
    switch (role) {
        case ROLES.ADMIN:
            return (
                <>
                    <RevenueChart />
                    <SystemLogCard />
                </>
            );
        case ROLES.DOCTOR:
            return (
                <>
                    <PatientQueue />
                    <PrescriptionHistory />
                </>
            );
        case ROLES.MANAGER:
            return <StaffSchedule />;
        default:
            // Coordinator / CareStaff: chưa có widget riêng, làm sau
            return null;
    }
};

export const DashboardPage = () => {
    const { user } = useContext(AuthContext);
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? DashboardWebLayout : DashboardMobileLayout;

    const role = user?.role;
    const userName = ROLE_LABELS[role] || "Người dùng";

    return (
        <Layout>
            <DashboardHeader
                role={role}
                userName={userName}
                shift="Ca sáng"
                date={new Date().toLocaleDateString("vi-VN")}
            />

            <div className={styles.statistics}>
                {MOCK_STATISTICS.map((item) => (
                    <StatisticCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        color={item.color}
                    />
                ))}
            </div>

            <div className={styles.middle}>
                <ShiftOverviewCard shift="Ca sáng" start="08:00" end="16:00" completed={65} />
                <VitalAlertList alerts={MOCK_ALERTS} />
            </div>

            {role && (
                <div className={styles.roleWidgets}>
                    <RoleWidgets role={role} />
                </div>
            )}

            <div className={styles.elderSection}>
                <h2>Sức khỏe người cao tuổi</h2>
                <div className={styles.elderGrid}>
                    {MOCK_ELDERS.map((elder) => (
                        <ElderCard key={elder.room} elder={elder} />
                    ))}
                </div>
            </div>
        </Layout>
    );
};