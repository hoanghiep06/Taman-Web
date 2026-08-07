import { RoleDashboard } from "./RoleDashboard";
import { ROLES } from "../../../utils/constants";

const ACTIONS = [
    { icon:"❤️",label:"Đo sinh hiệu",path:"/vitals"},
    { icon:"🧓",label:"Người cao tuổi",path:"/elders"},
    { icon:"🛏️",label:"Tài sản",path:"/assets"},
    { icon:"📝",label:"Ghi chú",path:"/notes"},
];

export const CareStaffDashboard=()=>(
    <RoleDashboard
        role={ROLES.CARESTAFF}
        userName="Nhân viên chăm sóc"
        actions={ACTIONS}
    />
);