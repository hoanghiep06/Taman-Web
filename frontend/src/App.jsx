import React, { Suspense, lazy, useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import axiosClient from "./api/axiosClient";

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";

import { LoginPage } from "./features/auth/pages/LoginPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";

import { ResponsiveLayout } from "./layouts/ResponsiveLayout";

import { ROLES } from "./utils/constants";

/* =========================
   DASHBOARD
========================= */

const DashboardPage = lazy(() =>
    import("./features/dashboard/pages/DashboardPage").then((m) => ({
        default: m.DashboardPage,
    }))
);

/* =========================
   MODULE PAGES
========================= */

const VitalSignsPage = lazy(() =>
    import("./features/vital-signs/pages/VitalSignsPage").then((m) => ({
        default: m.VitalSignsPage,
    }))
);

const ShiftHandoverPage = lazy(() =>
    import("./features/shift-handover/pages/ShiftHandoverPage").then((m) => ({
        default: m.ShiftHandoverPage,
    }))
);

const UserManagementPage = lazy(() =>
    import("./features/users/pages/UserManagementPage").then((m) => ({
        default: m.UserManagementPage,
    }))
);

const ElderListPage = lazy(() =>
    import("./features/elders/pages/ElderListPage").then((m) => ({
        default: m.ElderListPage,
    }))
);

const StaffListPage = lazy(() =>
    import("./features/staffs/pages/StaffListPage").then((m) => ({
        default: m.StaffListPage,
    }))
);

const AssignmentPage = lazy(() =>
    import("./features/assignments/pages/AssignmentPage").then((m) => ({
        default: m.AssignmentPage,
    }))
);

const HealthDashboardPage = lazy(() =>
    import("./features/medical/pages/HealthDashboardPage").then((m) => ({
        default: m.HealthDashboardPage,
    }))
);

const HealthCheckPage = lazy(() =>
    import("./features/medical/pages/HealthCheckPage").then((m) => ({
        default: m.HealthCheckPage,
    }))
);

const MedicalRecordPage = lazy(() =>
    import("./features/medical/pages/MedicalRecordPage").then((m) => ({
        default: m.MedicalRecordPage,
    }))
);

const PrescriptionPage = lazy(() =>
    import("./features/medical/pages/PrescriptionPage").then((m) => ({
        default: m.PrescriptionPage,
    }))
);

const MedicinePage = lazy(() =>
    import("./features/medical/pages/MedicinePage").then((m) => ({
        default: m.MedicinePage,
    }))
);

const DiseasePage = lazy(() =>
    import("./features/medical/pages/DiseasePage").then((m) => ({
        default: m.DiseasePage,
    }))
);

const ReportPage = lazy(() =>
    import("./features/reports/pages/ReportPage").then((m) => ({
        default: m.ReportPage,
    }))
);

const VitalPage = lazy(() =>
    import("./features/vital-signs/pages/VitalSignsPage").then((m) => ({
        default: m.VitalPage,
    }))
);

/* ── PATROL PAGES (ĐIỀU HƯỚNG THEO ROLE) ── */
const PatrolRouter = lazy(() =>
    import("./features/patrol/PatrolRouter").then((m) => ({
        default: m.PatrolRouter,
    }))
);

const RoomSelectionPage = lazy(() =>
    import("./features/patrol/pages/RoomSelectionPage").then((m) => ({
        default: m.RoomSelectionPage,
    }))
);

const PatrolSessionPage = lazy(() =>
    import("./features/patrol/pages/PatrolSessionPage").then((m) => ({
        default: m.PatrolSessionPage,
    }))
);

const BackupPage = lazy(() =>
    import("./features/backup/pages/BackupPage").then((m) => ({
        default: m.BackupPage,
    }))
);

const SystemSettingsPage = lazy(() =>
    import("./features/settings/pages/SystemSettingsPage").then((m) => ({
        default: m.SystemSettingsPage,
    }))
);

/* ========================= */

const Loading = () => (
    <div style={{ padding: 50, textAlign: "center" }}>
        Đang tải...
    </div>
);

function App() {
    useEffect(() => {
        axiosClient.get("/health").catch(() => {});
    }, []);

    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<Loading />}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route
                            path="/force-reset"
                            element={
                                <ProtectedRoute>
                                    <ResetPasswordPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* ROUTE CHÍNH CÓ LAYOUT */}
                        <Route
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        ROLES.ADMIN,
                                        ROLES.MANAGER,
                                        ROLES.DOCTOR,
                                        ROLES.COORDINATOR,
                                        ROLES.CAREGIVER,
                                    ]}
                                >
                                    <ResponsiveLayout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Dashboard */}
                            <Route path="/dashboard" element={<DashboardPage />} />

                            {/* Modules */}
                            <Route path="/vitals" element={<VitalSignsPage />} />
                            <Route path="/shifts" element={<ShiftHandoverPage />} />
                            <Route path="/reports" element={<ReportPage />} />

                            <Route path="/users" element={<UserManagementPage />} />
                            <Route
                                path="/elders"
                                element={
                                    <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.DOCTOR]}>
                                        <ElderListPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/staffs" element={<StaffListPage />} />
                            <Route path="/assignments" element={<AssignmentPage />} />
                            <Route path="/health" element={<HealthDashboardPage />} />
                            <Route path="/health-check" element={<HealthCheckPage />} />
                            <Route path="/medical-record" element={<MedicalRecordPage />} />
                            <Route path="/prescriptions" element={<PrescriptionPage />} />
                            <Route path="/medicines" element={<MedicinePage />} />
                            <Route path="/diseases" element={<DiseasePage />} />

                            {/* ── ROUTE ĐIỀU HƯỚNG ĐI TUẦN THEO VAI TRÒ ── */}
                            <Route path="/patrol" element={<PatrolRouter />} />
                            
                            {/* Đường dẫn phụ nếu Admin muốn bấm "Vào chế độ đi tuần" */}
                            <Route path="/patrol/rooms" element={<RoomSelectionPage />} />
                            
                            {/* Chi tiết bên trong 1 phòng */}
                            <Route path="/patrol/room/:roomId" element={<PatrolSessionPage />} />
                            
                            <Route path="/backup" element={<BackupPage />} />
                            <Route path="/settings" element={<SystemSettingsPage />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;