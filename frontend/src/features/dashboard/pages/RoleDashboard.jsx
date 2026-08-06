import { DashboardHeader } from "../components/DashboardHeader/DashboardHeader";
import { StatisticCard } from "../components/StatisticCard/StatisticCard";
import { ShiftOverviewCard } from "../components/ShiftOverviewCard/ShiftOverviewCard";
import { VitalAlertList } from "../components/VitalAlertList/VitalAlertList";
import { ElderCard } from "../components/ElderCard/ElderCard";

import styles from "./RoleDashboard.module.css";

export const RoleDashboard = ({
    role,
    userName = "Người dùng",
}) => {

    const statistics = [
        {
            title: "Người cao tuổi",
            value: 82,
            color: "#2563EB"
        },
        {
            title: "Nhân sự",
            value: 34,
            color: "#16A34A"
        },
        {
            title: "Cảnh báo",
            value: 3,
            color: "#DC2626"
        }
    ];

    const alerts = [
        {
            name: "Nguyễn Văn A",
            message: "Huyết áp cao"
        },
        {
            name: "Trần Thị B",
            message: "Nhịp tim bất thường"
        }
    ];

    const elders = [
        {
            name: "Nguyễn Văn A",
            room: "A101",
            heartRate: "78 bpm",
            bloodPressure: "120/80",
            temperature: "36.7°C"
        },
        {
            name: "Trần Thị B",
            room: "A102",
            heartRate: "95 bpm",
            bloodPressure: "145/95",
            temperature: "37.8°C"
        },
        {
            name: "Lê Văn C",
            room: "A103",
            heartRate: "82 bpm",
            bloodPressure: "118/79",
            temperature: "36.5°C"
        }
    ];

    return (

        <div className={styles.container}>

            <DashboardHeader
                role={role}
                userName={userName}
                shift="Ca sáng"
                date={new Date().toLocaleDateString("vi-VN")}
            />

            <div className={styles.statistics}>

                {
                    statistics.map(item => (

                        <StatisticCard
                            key={item.title}
                            title={item.title}
                            value={item.value}
                            color={item.color}
                        />

                    ))
                }

            </div>

            <div className={styles.middle}>

                <ShiftOverviewCard
                    shift="Ca sáng"
                    start="08:00"
                    end="16:00"
                    completed={65}
                />

                <VitalAlertList
                    alerts={alerts}
                />

            </div>

            <div className={styles.elderSection}>

                <h2>Sức khỏe người cao tuổi</h2>

                <div className={styles.elderGrid}>

                    {
                        elders.map(elder => (

                            <ElderCard
                                key={elder.room}
                                elder={elder}
                            />

                        ))
                    }

                </div>

            </div>

        </div>

    );

};