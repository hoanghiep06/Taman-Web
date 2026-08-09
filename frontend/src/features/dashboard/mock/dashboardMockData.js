export const ADMIN_STATS = {
    elders: 128,
    managers: 4,
    doctors: 8,
    caregivers: 32,
    coordinators: 6,
};

export const ADMIN_PEOPLE = {
    elders: [
        { id: 1, name: "Nguyễn Văn A", facility: "Cơ sở A", role: "Cụ", detail: "Phòng A101" },
        { id: 2, name: "Trần Thị B", facility: "Cơ sở A", role: "Cụ", detail: "Phòng A102" },
        { id: 3, name: "Lê Văn C", facility: "Cơ sở B", role: "Cụ", detail: "Phòng B203" },
    ],
    managers: [
        { id: 11, name: "Nguyễn Văn Manager", facility: "Cơ sở A", role: "Manager", detail: "Đang hoạt động" },
        { id: 12, name: "Trần Thị Manager", facility: "Cơ sở B", role: "Manager", detail: "Đang hoạt động" },
    ],
    doctors: [
        { id: 21, name: "BS. Nguyễn Văn D", facility: "Cơ sở A", role: "Doctor", detail: "Khoa Nội" },
        { id: 22, name: "BS. Trần Thị E", facility: "Cơ sở B", role: "Doctor", detail: "Khoa Nội" },
    ],
    caregivers: [
        { id: 31, name: "Phạm Văn F", facility: "Cơ sở A", role: "Caregiver", detail: "Ca sáng" },
        { id: 32, name: "Lê Thị G", facility: "Cơ sở A", role: "Caregiver", detail: "Ca chiều" },
    ],
    coordinators: [
        { id: 41, name: "Nguyễn Thị H", facility: "Cơ sở A", role: "Coordinator", detail: "Điều phối tầng 1" },
        { id: 42, name: "Phạm Thị I", facility: "Cơ sở B", role: "Coordinator", detail: "Điều phối tầng 2" },
    ],
};

export const ADMIN_ALERTS = [
    {
        id: 1,
        type: "danger",
        title: "Tài khoản bị khóa",
        message: "Tài khoản doctor.nguyen đã bị khóa sau nhiều lần đăng nhập sai.",
        time: "10 phút trước",
    },
    {
        id: 2,
        type: "info",
        title: "Tài khoản mới được tạo",
        message: "Tài khoản caregiver.pham vừa được tạo.",
        time: "25 phút trước",
    },
    {
        id: 3,
        type: "warning",
        title: "Tài khoản chưa gán role",
        message: "Tài khoản user_103 chưa được gán vai trò.",
        time: "40 phút trước",
    },
    {
        id: 4,
        type: "danger",
        title: "Đăng nhập bất thường",
        message: "Tài khoản manager.tran đăng nhập từ nhiều thiết bị.",
        time: "1 giờ trước",
    },
    {
        id: 5,
        type: "warning",
        title: "Thay đổi role",
        message: "Role của caregiver.le đã được thay đổi thành Coordinator.",
        time: "2 giờ trước",
    },
];

export const ADMIN_ACTIVITIES = [
    {
        id: 1,
        user: "Admin",
        action: "Tạo tài khoản",
        target: "caregiver.pham",
        time: "19:40",
    },
    {
        id: 2,
        user: "Admin",
        action: "Thay đổi role",
        target: "caregiver.le → Coordinator",
        time: "19:25",
    },
    {
        id: 3,
        user: "Manager Nguyễn",
        action: "Cập nhật thông tin",
        target: "Phòng A102",
        time: "19:10",
    },
    {
        id: 4,
        user: "Admin",
        action: "Khóa tài khoản",
        target: "doctor.nguyen",
        time: "18:55",
    },
    {
        id: 5,
        user: "Admin",
        action: "Tạo tài khoản",
        target: "doctor.tran",
        time: "18:30",
    },
    {
        id: 6,
        user: "Manager Trần",
        action: "Cập nhật phòng",
        target: "Phòng B203",
        time: "18:10",
    },
];

export const MANAGER_RESIDENTS = {
    total: 128,
    admitted: 4,
    attention: 7,
    appointments: 9,
};

export const MANAGER_STAFF = {
    shift: "Ca sáng",
    start: "08:00",
    end: "16:00",
    active: 27,
    inactive: 3,
    total: 30,
    members: [
        { name: "Nguyễn Văn F", role: "Caregiver", status: "active" },
        { name: "Trần Thị G", role: "Caregiver", status: "active" },
        { name: "Lê Văn H", role: "Coordinator", status: "active" },
        { name: "Phạm Văn K", role: "Caregiver", status: "inactive" },
        { name: "Nguyễn Thị M", role: "Caregiver", status: "active" },
    ],
};

export const MANAGER_HEALTH_ALERTS = [
    {
        id: 1,
        name: "Nguyễn Văn A",
        condition: "Huyết áp cao",
        value: "160/100 mmHg",
        severity: "danger",
    },
    {
        id: 2,
        name: "Trần Thị B",
        condition: "Nhiệt độ cao",
        value: "38.1°C",
        severity: "danger",
    },
    {
        id: 3,
        name: "Lê Văn C",
        condition: "SpO₂ thấp",
        value: "93%",
        severity: "warning",
    },
];

export const MANAGER_MEDICATIONS = [
    {
        name: "Nguyễn Văn A",
        medicine: "Thuốc huyết áp",
        time: "12:35",
    },
    {
        name: "Trần Thị B",
        medicine: "Thuốc ho",
        time: "13:00",
    },
    {
        name: "Lê Văn C",
        medicine: "Vitamin D",
        time: "14:00",
    },
];

export const MANAGER_ROOMS = [
    { area: "Khu A", room: "P.101", status: "Trống", beds: "2 giường" },
    { area: "Khu A", room: "P.102", status: "Trống", beds: "1 giường" },
    { area: "Khu A", room: "P.103", status: "Đầy", beds: "0 giường" },
    { area: "Khu B", room: "P.201", status: "Trống", beds: "2 giường" },
    { area: "Khu B", room: "P.202", status: "Đầy", beds: "0 giường" },
    { area: "Khu B", room: "P.203", status: "Đầy", beds: "0 giường" },
];

export const MANAGER_INCOMPLETE_TASKS = [
    {
        id: "TASK-001",
        task: "Đo sinh hiệu",
        elder: "Nguyễn Văn A",
        room: "P.101",
        time: "09:30",
        status: "Chưa hoàn thành",
    },
    {
        id: "TASK-002",
        task: "Kiểm tra phòng",
        elder: "Trần Thị B",
        room: "P.102",
        time: "10:00",
        status: "Đang làm",
    },
];

export const DOCTOR_STATS = {
    elders: 128,
    appointments: 8,
    notifications: 5,
};

export const DOCTOR_ALERTS = [
    {
        id: 1,
        name: "Nguyễn Văn A",
        room: "P.103",
        condition: "Huyết áp 160/100",
        severity: "danger",
    },
    {
        id: 2,
        name: "Trần Thị B",
        room: "P.104",
        condition: "SpO₂ 92%",
        severity: "danger",
    },
    {
        id: 3,
        name: "Lê Văn C",
        room: "P.205",
        condition: "Nhiệt độ 37.8°C",
        severity: "warning",
    },
];

export const DOCTOR_APPOINTMENTS = [
    { time: "09:30", elder: "Dũng", room: "P.103", type: "Khám định kỳ" },
    { time: "10:30", elder: "Nguyễn Văn A", room: "P.104", type: "Tái khám" },
    { time: "14:00", elder: "Trần Thị B", room: "P.205", type: "Theo dõi" },
];

export const DOCTOR_CARE_REPORTS = [
    {
        caregiver: "A - Caregiver",
        elder: "B - Cụ",
        activity: "Đã dùng thuốc",
        time: "11:59",
    },
    {
        caregiver: "C - Caregiver",
        elder: "D - Cụ",
        activity: "Đo sinh hiệu",
        time: "11:45",
    },
    {
        caregiver: "E - Caregiver",
        elder: "F - Cụ",
        activity: "Hoạt động đi bộ",
        time: "10:30",
    },
];

export const COORDINATOR_STATS = {
    elders: 128,
    tasks: 86,
    notifications: 8,
};

export const COORDINATOR_TASK_STATS = {
    total: 86,
    doing: 17,
    overdue: 7,
    pending: 12,
    completed: 50,
};

export const COORDINATOR_TASKS = [
    {
        id: "TASK-001",
        status: "Chưa làm",
        elder: "Nguyễn Văn A",
        time: "09:30",
        date: "19/08/2026",
        task: "Đo sinh hiệu",
    },
    {
        id: "TASK-002",
        status: "Đang làm",
        elder: "Trần Thị B",
        time: "10:00",
        date: "19/08/2026",
        task: "Hỗ trợ vệ sinh",
    },
    {
        id: "TASK-003",
        status: "Quá hạn",
        elder: "Lê Văn C",
        time: "08:30",
        date: "19/08/2026",
        task: "Phát thuốc",
    },
    {
        id: "TASK-004",
        status: "Chưa làm",
        elder: "Phạm Văn D",
        time: "11:00",
        date: "19/08/2026",
        task: "Kiểm tra phòng",
    },
];

export const COORDINATOR_ATTENTION = [
    {
        id: 1,
        title: "7 công việc quá hạn",
        description: "Cần phân công hoặc xử lý ngay.",
        type: "danger",
    },
    {
        id: 2,
        title: "3 công việc chưa được phân công",
        description: "Chưa có caregiver phụ trách.",
        type: "warning",
    },
    {
        id: 3,
        title: "2 nhân viên không hoạt động",
        description: "Cần kiểm tra tình trạng ca trực.",
        type: "warning",
    },
];

export const COORDINATOR_SCHEDULE = [
    { time: "08:00", title: "Kiểm tra sinh hiệu", location: "Khu A" },
    { time: "09:00", title: "Hoạt động buổi sáng", location: "Phòng sinh hoạt" },
    { time: "10:30", title: "Khám định kỳ", location: "Phòng khám" },
    { time: "14:00", title: "Hoạt động vận động", location: "Sân viện" },
];

export const CAREGIVER_STATS = {
    elders: 12,
    tasks: 18,
    notifications: 2,
};

export const CAREGIVER_SHIFT = {
    name: "Ca sáng",
    start: "07:00",
    end: "15:00",
};

export const CAREGIVER_TASKS = [
    {
        id: 1,
        time: "08:00",
        task: "Thuốc A",
        elder: "Nguyễn Văn C",
        room: "P.103",
        type: "now",
        status: "pending",
    },
    {
        id: 2,
        time: "08:30",
        task: "Đo chỉ số",
        elder: "Nguyễn Thị D",
        room: "P.104",
        type: "next",
        status: "pending",
    },
    {
        id: 3,
        time: "09:30",
        task: "Breakfast",
        elder: "Trần F",
        room: "P.205",
        type: "normal",
        status: "pending",
    },
    {
        id: 4,
        time: "10:30",
        task: "Hỗ trợ đi bộ",
        elder: "Lê G",
        room: "P.201",
        type: "normal",
        status: "pending",
    },
];

export const CAREGIVER_NOTES = [
    {
        id: 1,
        time: "09:30",
        date: "08/08/2026",
        author: "Bác sĩ A",
        elder: "Cụ B",
        note: "Không cho ăn cá trong 5 ngày",
    },
    {
        id: 2,
        time: "11:00",
        date: "08/08/2026",
        author: "Manager Nguyễn",
        elder: "Cụ D",
        note: "Theo dõi lượng nước uống trong ngày",
    },
];