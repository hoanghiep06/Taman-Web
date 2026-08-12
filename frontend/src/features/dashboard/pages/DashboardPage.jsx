import { useMemo } from "react";

import { useAuth } from "../../../contexts/AuthContext";
import { useIsDesktop } from "../../../hooks/useIsDesktop";

import { DashboardWebLayout } from "../layouts/DashboardWebLayout";
import { DashboardMobileLayout } from "../layouts/DashboardMobileLayout";
import { DashboardHeader } from "../components/Common/DashboardHeader/DashboardHeader";

import { AdminDashboard } from "../components/admin/AdminDashboard";
import { ManagerDashboard } from "../components/manager/ManagerDashboard";
import { DoctorDashboard } from "../components/doctor/DoctorDashboard";
import { CoordinatorDashboard } from "../components/coordinator/CoordinatorDashboard";
import { CaregiverDashboard } from "../components/caregiver/CaregiverDashboard";

import styles from "./DashboardPage.module.css";

const ROLE_NAMES = {
    admin: "Admin",
    manager: "Manager",
    doctor: "Doctor",
    coordinator: "Coordinator",
    caregiver: "Caregiver",
};

const normalizeRole = (role) => {
    if (!role) return "";
    return String(role)
        .toLowerCase()
        .replace(/[\s_-]/g, "");
};

const EmptyState = ({ message = "Không có dữ liệu" }) => (
    <div
        style={{
            padding: "30px",
            color: "#64748b",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
        }}
    >
        {message}
    </div>
);

export const DashboardPage = () => {
    const { user } = useAuth();
    const isDesktop = useIsDesktop();

    const Layout = isDesktop
        ? DashboardWebLayout
        : DashboardMobileLayout;

    const role = normalizeRole(user?.role);
    const roleLabel = ROLE_NAMES[role] || "Người dùng";

    // Admin quản trị toàn hệ thống, không gắn với 1 cơ sở cụ thể
    const isAdmin = role === "admin";

    const renderDashboard = () => {
        switch (role) {
            case "admin":
                return <AdminDashboard />;
            case "manager":
                return <ManagerDashboard />;
            case "doctor":
                return <DoctorDashboard />;
            case "coordinator":
                return <CoordinatorDashboard />;
            case "caregiver":
                return <CaregiverDashboard />;
            default:
                return (
                    <EmptyState message={`Dashboard cho role "${user?.role}" chưa được cấu hình.`} />
                );
        }
    };

    return (
        <Layout>
            <DashboardHeader
                role={user?.role}
                userName={user?.name || roleLabel}
                shift="Ca sáng"
                date={new Date().toLocaleDateString("vi-VN")}
                facility={isAdmin ? undefined : "Cơ sở Tâm An - Quận 1"}
            />

            <div className={styles.dashboard}>
                {renderDashboard()}
            </div>
        </Layout>
    );
};