import { RoleDashboard } from "./RoleDashboard";
import { ROLES } from "../../../utils/constants";

const ACTIONS = [
    { icon:"📅",label:"Ca trực",path:"/shifts"},
    { icon:"📋",label:"Phân công",path:"/assignments"},
    { icon:"👥",label:"Điều phối",path:"/coordinator"},
    { icon:"🏠",label:"Phòng",path:"/rooms"},
    { icon:"📊",label:"Theo dõi",path:"/reports"},
];

export const CoordinatorDashboard=()=>(
    <RoleDashboard
        role={ROLES.COORDINATOR}
        userName="Điều phối"
        actions={ACTIONS}
    />
);