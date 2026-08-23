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
            path: "/patrol"
        },

        {
            title: "Đo dấu sinh hiệu",
            icon: "💊",
            path: "/vitals"
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
            path: "/users"
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
            title: "Tài sản",
            icon: "🛏️",
            path: "/patrol"
        },

        {
            title: "Phân công",
            icon: "📋",
            path: "/assignments"
        },

        {
            title: "Đo dấu sinh hiệu",
            icon: "💊",
            path: "/vitals"
        },

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
            title: "Dấu sinh hiệu",
            icon: "❤️",
            path: "/vitals"
        },

        {
            title: "Ca trực",
            icon: "📅",
            path: "/shifts"
        },

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
            title: "Đo dấu sinh hiệu",
            icon: "❤️",
            path: "/vitals"
        },

        {
            title: "Tài sản",
            icon: "🛏️",
            path: "/patrol"
        },

        {
            title: "Phân công",
            icon: "📋",
            path: "/assignments"
        }

    ],

    [ROLES.CAREGIVER]: [

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
            path: "/patrol"
        }

    ]

};