import { RoleDashboard } from "./RoleDashboard";
import { ROLES } from "../../../utils/constants";

const ACTIONS = [
    { icon:"🩺",label:"Hồ sơ sức khỏe",path:"/medical-records"},
    { icon:"❤️",label:"Sinh hiệu",path:"/vitals"},
    { icon:"💊",label:"Đơn thuốc",path:"/medicines"},
    { icon:"🧓",label:"Người cao tuổi",path:"/elders"},
    { icon:"📊",label:"Báo cáo sức khỏe",path:"/reports"},
];

export const DoctorDashboard=()=>(
    <RoleDashboard
        role={ROLES.DOCTOR}
        userName="Bác sĩ"
        actions={ACTIONS}
    />
);