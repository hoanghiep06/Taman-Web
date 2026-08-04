import { RoleDashboard } from "./RoleDashboard";
import { ROLES } from "../../../utils/constants";

const ACTIONS = [
    { icon:"👥",label:"Quản lý tài khoản",path:"/users"},
    { icon:"🧑‍⚕️",label:"Quản lý nhân sự",path:"/staffs"},
    { icon:"🧓",label:"Quản lý người cao tuổi",path:"/elders"},
    { icon:"🏠",label:"Quản lý phòng",path:"/rooms"},
    { icon:"📅",label:"Quản lý ca trực",path:"/shifts"},
    { icon:"📋",label:"Phân công",path:"/assignments"},
    { icon:"🛏️",label:"Quản lý tài sản",path:"/assets"},
    { icon:"💊",label:"Thuốc",path:"/medicines"},
    { icon:"🩺",label:"Bệnh",path:"/diseases"},
    { icon:"📊",label:"Báo cáo",path:"/reports"},
    { icon:"⚙️",label:"Cấu hình",path:"/settings"},
];

export const AdminDashboard=()=>(
    <RoleDashboard
        role={ROLES.ADMIN}
        userName="Administrator"
        actions={ACTIONS}
    />
);