import { Link } from "react-router-dom";

import { StatusBadge } from "../../../components/StatusBadge";

import { useIsDesktop } from "../../../hooks/useIsDesktop";
import { useHealthOverview } from "../hooks/useHealthOverview";
import { MedicalWebLayout } from "../layouts/MedicalWebLayout";
import { MedicalMobileLayout } from "../layouts/MedicalMobileLayout";

import styles from "./HealthDashboardPage.module.css";

const RESULT_LABEL = {
    normal: { label: "Bình thường", variant: "success" },
    warning: { label: "Cần theo dõi", variant: "warning" },
    danger: { label: "Cần tái khám gấp", variant: "danger" },
};

const QUICK_LINKS = [
    { to: "/medical-record", icon: "📋", label: "Hồ sơ bệnh án" },
    { to: "/health-check", icon: "🔍", label: "Lịch sử khám" },
    { to: "/prescriptions", icon: "💊", label: "Đơn thuốc" },
    { to: "/medicines", icon: "💊", label: "Danh mục thuốc" },
    { to: "/diseases", icon: "🩺", label: "Danh mục bệnh" },
];

export const HealthDashboardPage = () => {
    const { summary, loading } = useHealthOverview();
    const isDesktop = useIsDesktop();
    const Layout = isDesktop ? MedicalWebLayout : MedicalMobileLayout;

    return (
        <Layout>
            <div className={styles.header}>
                <h1 className={styles.title}>Theo dõi sức khỏe</h1>
                <p className={styles.subtitle}>Tổng quan tình trạng sức khỏe người cao tuổi trong hệ thống</p>
            </div>

            <div className={styles.statistics}>
                {loading && <div className={styles.loadingCard}>Đang tải thống kê...</div>}

                {!loading &&
                    summary.stats.map((item) => (
                        <div key={item.title} className={styles.statCard}>
                            <span className={styles.statValue} style={{ color: item.color }}>
                                {item.value}
                            </span>
                            <span className={styles.statTitle}>{item.title}</span>
                        </div>
                    ))}
            </div>

            <div className={styles.grid}>
                <div className={styles.panel}>
                    <h2 className={styles.panelTitle}>Lần khám gần đây</h2>

                    {loading && <p className={styles.muted}>Đang tải...</p>}

                    {!loading && summary.recentChecks.length === 0 && (
                        <p className={styles.muted}>Chưa có dữ liệu khám sức khỏe</p>
                    )}

                    {!loading && summary.recentChecks.length > 0 && (
                        <ul className={styles.checkList}>
                            {summary.recentChecks.map((check) => (
                                <li key={check.id} className={styles.checkItem}>
                                    <div>
                                        <span className={styles.checkName}>{check.elderName}</span>
                                        <span className={styles.checkMeta}>
                                            Phòng {check.room} · {check.checkDate}
                                        </span>
                                    </div>
                                    <StatusBadge variant={RESULT_LABEL[check.result]?.variant || "neutral"}>
                                        {RESULT_LABEL[check.result]?.label || check.result}
                                    </StatusBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.panel}>
                    <h2 className={styles.panelTitle}>Truy cập nhanh</h2>

                    <div className={styles.quickLinks}>
                        {QUICK_LINKS.map((link) => (
                            <Link key={link.to} to={link.to} className={styles.quickLink}>
                                <span className={styles.quickLinkIcon}>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};