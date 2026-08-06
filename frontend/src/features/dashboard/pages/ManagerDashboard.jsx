import { RoleDashboard } from "./RoleDashboard";
import { ROLES } from "../../../utils/constants";

const ACTIONS = [
    { icon:"📅",label:"Ca trực",path:"/shifts"},
    { icon:"📋",label:"Phân công",path:"/assignments"},
    { icon:"🧑‍⚕️",label:"Nhân viên",path:"/staffs"},
    { icon:"🧓",label:"Người cao tuổi",path:"/elders"},
    { icon:"🏠",label:"Phòng",path:"/rooms"},
    { icon:"📊",label:"Báo cáo",path:"/reports"},
];

export const ManagerDashboard=()=>(
    <RoleDashboard
        role={ROLES.MANAGER}
        userName="Quản lý"
        actions={ACTIONS}
    />
);