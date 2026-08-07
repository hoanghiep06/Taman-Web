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

const CareDutyPage = lazy(() =>
    import("./features/care-duty/pages/CareDutyPage").then((m) => ({
        default: m.CareDutyPage,
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
    import("./features/health/pages/HealthDashboardPage").then((m) => ({
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
    import("./features/medicines/pages/MedicinePage").then((m) => ({
        default: m.MedicinePage,
    }))
);

const DiseasePage = lazy(() =>
    import("./features/diseases/pages/DiseasePage").then((m) => ({
        default: m.DiseasePage,
    }))
);

const ReportPage = lazy(() =>
    import("./features/reports/pages/ReportPage").then((m) => ({
        default: m.ReportPage,
    }))
);

const VitalPage = lazy(() =>
    import("./features/vitals/pages/VitalPage").then((m) => ({
        default: m.VitalPage,
    }))
);


const IncidentPage = lazy(() =>
    import("./features/incidents/pages/IncidentPage").then((m) => ({
        default: m.IncidentPage,
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
        axiosClient.get("/health/dashboard-live").catch(() => {});
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

                        <Route
                            element={
                                <ProtectedRoute
                                    allowedRoles={[
                                        ROLES.ADMIN,
                                        ROLES.MANAGER,
                                        ROLES.DOCTOR,
                                        ROLES.COORDINATOR,
                                        ROLES.CARESTAFF,
                                    ]}
                                >
                                    <ResponsiveLayout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Dashboard */}
<<<<<<< HEAD
                            <Route path="/dashboard" element={<AdminDashboard />} />
                            <Route path="/manager" element={<ManagerDashboard />} />
                            <Route path="/doctor" element={<DoctorDashboard />} />
                            <Route path="/coordinator" element={<CoordinatorDashboard />} />
                            <Route path="/care-staff" element={<CareStaffDashboard />} />
=======

                            <Route path="/dashboard" element={<DashboardPage />} />
>>>>>>> dc910b6 (feat(FE): thêm code cho phần dashboard và sửa code dashboard của App.jsx)

                            {/* Modules */}
                            <Route path="/care-duty" element={<CareDutyPage />} />
                            <Route path="/shifts" element={<CareDutyPage />} />
                            
                            <Route path="/users" element={<UserManagementPage />} />
                            <Route path="/elders" element={<ElderListPage />} />
                            <Route path="/staffs" element={<StaffListPage />} />
                            <Route path="/assignments" element={<AssignmentPage />} />
                            <Route path="/health" element={<HealthDashboardPage />} />
                            <Route path="/health-check" element={<HealthCheckPage />} />
                            <Route path="/medical-record" element={<MedicalRecordPage />} />
                            <Route path="/prescriptions" element={<PrescriptionPage />} />
                            <Route path="/medicines" element={<MedicinePage />} />
                            <Route path="/diseases" element={<DiseasePage />} />
                            <Route path="/reports" element={<ReportPage />} />
                            <Route path="/vitals" element={<VitalPage />} />
                            <Route path="/incident" element={<IncidentPage />} />
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