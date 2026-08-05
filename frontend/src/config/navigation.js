import { ROLES } from "../utils/constants";

export const SIDEBAR_MENU = {

    [ROLES.ADMIN]: [

        {
            title: "Dashboard",
            icon: "🏠",
            path: "/dashboard"
        },

        {
            title: "Quản lý tài khoản",
            icon: "👤",
            path: "/users"
        },

        {
            title: "Quản lý nhân sự",
            icon: "👨‍⚕️",
            path: "/staffs"
        },

        {
            title: "Quản lý người cao tuổi",
            icon: "👴",
            path: "/elders"
        },

        {
            title: "Quản lý phòng",
            icon: "🏠",
            path: "/rooms"
        },

        {
            title: "Quản lý ca trực",
            icon: "📅",
            path: "/shifts"
        },

        {
            title: "Phân công",
            icon: "📋",
            path: "/assignments"
        },

        {
            title: "Quản lý tài sản",
            icon: "🛏️",
            path: "/assets"
        },

        {
            title: "Quản lý thuốc",
            icon: "💊",
            path: "/medicines"
        },

        {
            title: "Quản lý bệnh",
            icon: "🩺",
            path: "/diseases"
        },

        {
            title: "Báo cáo",
            icon: "📊",
            path: "/reports"
        },

        {
            title: "Hệ thống",
            icon: "⚙️",
            path: "/settings"
        }

    ],

    [ROLES.MANAGER]: [

        {
            title: "Dashboard",
            icon: "🏠",
            path: "/dashboard"
        },

        {
            title: "Nhân sự",
            icon: "👨‍⚕️",
            path: "/staffs"
        },

        {
            title: "Người cao tuổi",
            icon: "👴",
            path: "/elders"
        },

        {
            title: "Phòng",
            icon: "🏠",
            path: "/rooms"
        },

        {
            title: "Ca trực",
            icon: "📅",
            path: "/shifts"
        },

        {
            title: "Phân công",
            icon: "📋",
            path: "/assignments"
        },

        {
            title: "Báo cáo",
            icon: "📊",
            path: "/reports"
        }

    ],

    [ROLES.DOCTOR]: [

        {
            title: "Dashboard",
            icon: "🏠",
            path: "/dashboard"
        },

        {
            title: "Người cao tuổi",
            icon: "👴",
            path: "/elders"
        },

        {
            title: "Thuốc",
            icon: "💊",
            path: "/medicines"
        },

        {
            title: "Bệnh",
            icon: "🩺",
            path: "/diseases"
        }

    ],

    [ROLES.COORDINATOR]: [

        {
            title: "Dashboard",
            icon: "🏠",
            path: "/dashboard"
        },

        {
            title: "Ca trực",
            icon: "📅",
            path: "/shifts"
        },

        {
            title: "Phân công",
            icon: "📋",
            path: "/assignments"
        }

    ],

    [ROLES.CARESTAFF]: [

        {
            title: "Dashboard",
            icon: "🏠",
            path: "/dashboard"
        },

        {
            title: "Danh sách cụ",
            icon: "👴",
            path: "/elders"
        },

        {
            title: "Đo sinh hiệu",
            icon: "❤️",
            path: "/vitals"
        },

        {
            title: "Tài sản",
            icon: "🛏️",
            path: "/assets"
        }

    ]

};