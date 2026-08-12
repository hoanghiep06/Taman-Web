import { AdminOverview } from "./AdminOverview/AdminOverview";
import { SystemAlert } from "./SystemAlert/SystemAlert";
import { RecentActivity } from "./RecentActivity/RecentActivity";

import { TwoColumns } from "../ui/DashboardUI";

export const AdminDashboard = () => {
    return (
        <>
            <AdminOverview />

            <TwoColumns>
                <SystemAlert />
                <RecentActivity />
            </TwoColumns>
        </>
    );
};