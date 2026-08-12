/* ===========================================================
   ADMIN
=========================================================== */

export const ADMIN_STATS = {
    elders: 128,
    managers: 4,
    doctors: 8,
    caregivers: 32,
    coordinators: 6,
};

export const ADMIN_PEOPLE = {
    elders: [
        { id: 1, name: "Nguyễn Văn A", gender: "Nam", facility: "Cơ sở A", role: "Cụ", detail: "Phòng A101", health: "Ổn định" },
        { id: 2, name: "Trần Thị B", gender: "Nữ", facility: "Cơ sở A", role: "Cụ", detail: "Phòng A102", health: "Cần chú ý" },
        { id: 3, name: "Lê Văn C", gender: "Nam", facility: "Cơ sở B", role: "Cụ", detail: "Phòng B203", health: "Nhập viện" },
        { id: 4, name: "Phạm Thị D", gender: "Nữ", facility: "Cơ sở A", role: "Cụ", detail: "Phòng A103", health: "Ổn định" },
        { id: 5, name: "Hoàng Văn E", gender: "Nam", facility: "Cơ sở B", role: "Cụ", detail: "Phòng B201", health: "Ổn định" },
    ],
    managers: [
        { id: 11, name: "Nguyễn Văn Manager", gender: "Nam", facility: "Cơ sở A", role: "Manager", detail: "Đang hoạt động" },
        { id: 12, name: "Trần Thị Manager", gender: "Nữ", facility: "Cơ sở B", role: "Manager", detail: "Đang hoạt động" },
        { id: 13, name: "Lê Văn Manager 2", gender: "Nam", facility: "Cơ sở A", role: "Manager", detail: "Nghỉ phép" },
        { id: 14, name: "Phạm Thị Manager 3", gender: "Nữ", facility: "Cơ sở B", role: "Manager", detail: "Đang hoạt động" },
    ],
    doctors: [
        { id: 21, name: "BS. Nguyễn Văn D", gender: "Nam", facility: "Cơ sở A", role: "Doctor", detail: "Khoa Nội" },
        { id: 22, name: "BS. Trần Thị E", gender: "Nữ", facility: "Cơ sở B", role: "Doctor", detail: "Khoa Nội" },
        { id: 23, name: "BS. Lê Văn F", gender: "Nam", facility: "Cơ sở A", role: "Doctor", detail: "Khoa Tim mạch" },
        { id: 24, name: "BS. Hoàng Thị G", gender: "Nữ", facility: "Cơ sở B", role: "Doctor", detail: "Khoa Thần kinh" },
        { id: 25, name: "BS. Phạm Văn H", gender: "Nam", facility: "Cơ sở A", role: "Doctor", detail: "Khoa Cơ xương khớp" },
        { id: 26, name: "BS. Vũ Thị I", gender: "Nữ", facility: "Cơ sở B", role: "Doctor", detail: "Khoa Nội" },
        { id: 27, name: "BS. Đặng Văn K", gender: "Nam", facility: "Cơ sở A", role: "Doctor", detail: "Khoa Nội tổng quát" },
        { id: 28, name: "BS. Bùi Thị L", gender: "Nữ", facility: "Cơ sở B", role: "Doctor", detail: "Khoa Da liễu" },
    ],
    caregivers: [
        { id: 31, name: "Phạm Văn F", gender: "Nam", facility: "Cơ sở A", role: "Caregiver", detail: "Ca sáng" },
        { id: 32, name: "Lê Thị G", gender: "Nữ", facility: "Cơ sở A", role: "Caregiver", detail: "Ca chiều" },
        { id: 33, name: "Nguyễn Văn M", gender: "Nam", facility: "Cơ sở B", role: "Caregiver", detail: "Ca sáng" },
        { id: 34, name: "Trần Thị N", gender: "Nữ", facility: "Cơ sở B", role: "Caregiver", detail: "Ca đêm" },
    ],
    coordinators: [
        { id: 41, name: "Nguyễn Thị H", gender: "Nữ", facility: "Cơ sở A", role: "Coordinator", detail: "Điều phối tầng 1" },
        { id: 42, name: "Phạm Thị I", gender: "Nữ", facility: "Cơ sở B", role: "Coordinator", detail: "Điều phối tầng 2" },
        { id: 43, name: "Lê Văn J", gender: "Nam", facility: "Cơ sở A", role: "Coordinator", detail: "Điều phối khu A" },
        { id: 44, name: "Hoàng Văn K", gender: "Nam", facility: "Cơ sở B", role: "Coordinator", detail: "Điều phối khu B" },
        { id: 45, name: "Vũ Thị L", gender: "Nữ", facility: "Cơ sở A", role: "Coordinator", detail: "Điều phối ca đêm" },
        { id: 46, name: "Đặng Văn M", gender: "Nam", facility: "Cơ sở B", role: "Coordinator", detail: "Điều phối ca sáng" },
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
    {
        id: 6,
        type: "danger",
        title: "Tài khoản bị vô hiệu hóa",
        message: "Tài khoản coordinator.vu đã bị vô hiệu hóa theo yêu cầu quản trị.",
        time: "3 giờ trước",
    },
    {
        id: 7,
        type: "info",
        title: "Đặt lại mật khẩu",
        message: "Tài khoản doctor.tran đã được đặt lại mật khẩu.",
        time: "3 giờ 30 phút trước",
    },
];

export const ADMIN_ACTIVITIES = [
    { id: 1, user: "Admin", action: "Tạo tài khoản", target: "caregiver.pham", time: "19:40" },
    { id: 2, user: "Admin", action: "Thay đổi role", target: "caregiver.le → Coordinator", time: "19:25" },
    { id: 3, user: "Manager Nguyễn", action: "Cập nhật thông tin", target: "Phòng A102", time: "19:10" },
    { id: 4, user: "Admin", action: "Khóa tài khoản", target: "doctor.nguyen", time: "18:55" },
    { id: 5, user: "Admin", action: "Tạo tài khoản", target: "doctor.tran", time: "18:30" },
    { id: 6, user: "Manager Trần", action: "Cập nhật phòng", target: "Phòng B203", time: "18:10" },
    { id: 7, user: "Admin", action: "Xoá tài khoản", target: "caregiver.old", time: "17:45" },
    { id: 8, user: "Doctor Nguyễn", action: "Cập nhật hồ sơ", target: "Cụ Nguyễn Văn A", time: "17:20" },
];

/* ===========================================================
   MANAGER — RESIDENTS
=========================================================== */

export const MANAGER_RESIDENTS = {
    total: 128,
    admitted: 4,
    attention: 7,
    appointments: 9,
};

export const MANAGER_ELDERS_LIST = [
    { id: 1, name: "Nguyễn Văn A", gender: "Nam", area: "Khu A", room: "P.101", healthStatus: "Ổn định" },
    { id: 2, name: "Trần Thị B", gender: "Nữ", area: "Khu A", room: "P.102", healthStatus: "Cần chú ý" },
    { id: 3, name: "Lê Văn C", gender: "Nam", area: "Khu B", room: "P.203", healthStatus: "Nhập viện" },
    { id: 4, name: "Phạm Văn D", gender: "Nam", area: "Khu B", room: "P.205", healthStatus: "Ổn định" },
    { id: 5, name: "Hoàng Thị E", gender: "Nữ", area: "Khu A", room: "P.103", healthStatus: "Ổn định" },
    { id: 6, name: "Vũ Văn F", gender: "Nam", area: "Khu A", room: "P.104", healthStatus: "Cần chú ý" },
];

export const MANAGER_ADMITTED_LIST = [
    { id: 1, name: "Nguyễn Văn A", room: "P.101", reason: "Theo dõi huyết áp", since: "05/08/2026" },
    { id: 2, name: "Lê Văn C", room: "P.203", reason: "Theo dõi SpO₂", since: "07/08/2026" },
    { id: 3, name: "Trần Văn G", room: "P.206", reason: "Sốt cao, theo dõi nhiễm trùng", since: "09/08/2026" },
    { id: 4, name: "Phạm Thị H", room: "P.301", reason: "Hạ đường huyết", since: "10/08/2026" },
];

export const MANAGER_ATTENTION_LIST = [
    { id: 1, name: "Nguyễn Văn A", room: "P.101", condition: "Huyết áp cao 160/100 mmHg" },
    { id: 2, name: "Trần Thị B", room: "P.102", condition: "Nhiệt độ cao 38.1°C" },
    { id: 3, name: "Lê Văn C", room: "P.203", condition: "SpO₂ thấp 93%" },
    { id: 4, name: "Vũ Văn F", room: "P.104", condition: "Nhịp tim không đều" },
    { id: 5, name: "Đặng Thị I", room: "P.205", condition: "Đau ngực nhẹ" },
    { id: 6, name: "Bùi Văn K", room: "P.302", condition: "Chóng mặt, mất thăng bằng" },
    { id: 7, name: "Ngô Thị L", room: "P.401", condition: "Phù chân, nghi ngờ suy tim" },
];

export const MANAGER_APPOINTMENTS_LIST = [
    { id: 1, name: "Nguyễn Văn A", datetime: "09:30 11/08/2026", doctor: "BS. Nguyễn Văn D", type: "Tái khám" },
    { id: 2, name: "Trần Thị B", datetime: "14:00 11/08/2026", doctor: "BS. Trần Thị E", type: "Theo dõi" },
    { id: 3, name: "Lê Văn C", datetime: "10:00 12/08/2026", doctor: "BS. Nguyễn Văn D", type: "Khám định kỳ" },
    { id: 4, name: "Phạm Văn D", datetime: "08:30 13/08/2026", doctor: "BS. Lê Văn F", type: "Xét nghiệm" },
    { id: 5, name: "Hoàng Thị E", datetime: "11:00 14/08/2026", doctor: "BS. Trần Thị E", type: "Siêu âm" },
    { id: 6, name: "Vũ Văn F", datetime: "14:30 15/08/2026", doctor: "BS. Hoàng Thị G", type: "Điện tim" },
    { id: 7, name: "Đặng Thị I", datetime: "09:00 16/08/2026", doctor: "BS. Nguyễn Văn D", type: "Khám tim mạch" },
    { id: 8, name: "Bùi Văn K", datetime: "15:00 17/08/2026", doctor: "BS. Phạm Văn H", type: "Vật lý trị liệu" },
    { id: 9, name: "Ngô Thị L", datetime: "10:30 18/08/2026", doctor: "BS. Trần Thị E", type: "Siêu âm tim" },
];

/* ===========================================================
   MANAGER — STAFF
=========================================================== */

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
        { name: "Hoàng Thị N", role: "Doctor", status: "active" },
        { name: "Vũ Văn P", role: "Caregiver", status: "active" },
        { name: "Đặng Thị Q", role: "Caregiver", status: "inactive" },
    ],
};

/* ===========================================================
   MANAGER — HEALTHCARE
=========================================================== */

export const MANAGER_HEALTH_ALERTS = [
    { id: 1, name: "Nguyễn Văn A", condition: "Huyết áp cao", value: "160/100 mmHg", severity: "danger" },
    { id: 2, name: "Trần Thị B", condition: "Nhiệt độ cao", value: "38.1°C", severity: "danger" },
    { id: 3, name: "Lê Văn C", condition: "SpO₂ thấp", value: "93%", severity: "warning" },
    { id: 4, name: "Vũ Văn F", condition: "Nhịp tim không đều", value: "110 bpm", severity: "danger" },
    { id: 5, name: "Đặng Thị I", condition: "Đường huyết cao", value: "180 mg/dL", severity: "warning" },
];

export const MANAGER_MEDICATIONS = [
    { name: "Nguyễn Văn A", medicine: "Thuốc huyết áp", time: "12:35" },
    { name: "Trần Thị B", medicine: "Thuốc ho", time: "13:00" },
    { name: "Lê Văn C", medicine: "Vitamin D", time: "14:00" },
    { name: "Phạm Văn D", medicine: "Thuốc tiểu đường", time: "14:30" },
];

/* ===========================================================
   MANAGER — ROOMS
=========================================================== */

export const MANAGER_ROOMS = [
    { area: "Khu A", room: "P.101", status: "Trống", beds: "2 giường" },
    { area: "Khu A", room: "P.102", status: "Trống", beds: "1 giường" },
    { area: "Khu A", room: "P.103", status: "Đầy", beds: "0 giường" },
    { area: "Khu A", room: "P.104", status: "Đầy", beds: "0 giường" },
    { area: "Khu B", room: "P.201", status: "Trống", beds: "2 giường" },
    { area: "Khu B", room: "P.202", status: "Đầy", beds: "0 giường" },
    { area: "Khu B", room: "P.203", status: "Đầy", beds: "0 giường" },
    { area: "Khu B", room: "P.205", status: "Trống", beds: "1 giường" },
];

/* ===========================================================
   MANAGER — INCOMPLETE TASKS
   status: "processing" (xanh) | "pending" (vàng) | "missed" (đỏ - qua ca) | "overdue" (đỏ - quá hạn)
=========================================================== */

export const MANAGER_INCOMPLETE_TASKS = [
    {
        id: "TASK-001",
        task: "Đo sinh hiệu",
        elder: "Nguyễn Văn A",
        room: "P.101",
        time: "09:30",
        status: "processing",
    },
    {
        id: "TASK-002",
        task: "Kiểm tra phòng",
        elder: "Trần Thị B",
        room: "P.102",
        time: "10:00",
        status: "pending",
    },
    {
        id: "TASK-003",
        task: "Phát thuốc buổi sáng",
        elder: "Lê Văn C",
        room: "P.203",
        time: "08:00",
        status: "missed",
    },
    {
        id: "TASK-004",
        task: "Hỗ trợ vật lý trị liệu",
        elder: "Phạm Văn D",
        room: "P.205",
        time: "07:30",
        status: "overdue",
    },
    {
        id: "TASK-005",
        task: "Thay băng vết thương",
        elder: "Vũ Văn F",
        room: "P.104",
        time: "11:00",
        status: "pending",
    },
];

/* ===========================================================
   DOCTOR
=========================================================== */

export const DOCTOR_STATS = {
    elders: 128,
    appointments: 3,
    notifications: 5,
};

export const DOCTOR_ELDERS_LIST = [
    {
        id: 1,
        name: "Nguyễn Văn A",
        room: "P.103",
        note: "Huyết áp cao",
        health: "Cần chú ý",
    },
    {
        id: 2,
        name: "Trần Thị B",
        room: "P.104",
        note: "SpO₂ thấp",
        health: "Cần chú ý",
    },
    {
        id: 3,
        name: "Lê Văn C",
        room: "P.205",
        note: "Theo dõi SpO₂",
        health: "Báo động",
    },
    {
        id: 4,
        name: "Phạm Thị D",
        room: "P.201",
        note: "Khám định kỳ",
        health: "Ổn định",
    },
    {
        id: 5,
        name: "Hoàng Văn E",
        room: "P.301",
        note: "Ổn định",
        health: "Ổn định",
    },
    {
        id: 6,
        name: "Vũ Thị F",
        room: "P.302",
        note: "Đường huyết cao",
        health: "Cần chú ý",
    },
];


export const DOCTOR_NOTIFICATIONS = [
    { id: 1, title: "Kết quả xét nghiệm mới", detail: "Nguyễn Văn A - Xét nghiệm máu", time: "10 phút trước" },
    { id: 2, title: "Nhắc lịch hẹn", detail: "Cuộc hẹn với Trần Thị B lúc 14:00", time: "30 phút trước" },
    { id: 3, title: "Báo cáo mới từ caregiver", detail: "Đã cập nhật tình trạng cụ Lê Văn C", time: "1 giờ trước" },
    { id: 4, title: "Chỉ số bất thường", detail: "SpO₂ cụ Trần Thị B giảm còn 92%", time: "1 giờ 30 phút trước" },
    { id: 5, title: "Nhắc nhở kê đơn", detail: "Đơn thuốc cụ Phạm Thị D sắp hết hạn", time: "2 giờ trước" },
];

export const DOCTOR_ALERTS = [
    { id: 1, name: "Nguyễn Văn A", room: "P.103", condition: "Huyết áp 160/100", severity: "danger" },
    { id: 2, name: "Trần Thị B", room: "P.104", condition: "SpO₂ 92%", severity: "danger" },
    { id: 3, name: "Lê Văn C", room: "P.205", condition: "Nhiệt độ 37.8°C", severity: "warning" },
    { id: 4, name: "Vũ Thị F", room: "P.302", condition: "Đường huyết 180 mg/dL", severity: "warning" },
];

/* Appointments — length phải khớp với DOCTOR_STATS.appointments */
export const DOCTOR_APPOINTMENTS = [
    { id: 1, time: "09:30", elder: "Lê Văn C", room: "P.205", type: "Khám định kỳ" },
    { id: 2, time: "10:30", elder: "Nguyễn Văn A", room: "P.103", type: "Tái khám" },
    { id: 3, time: "14:00", elder: "Trần Thị B", room: "P.104", type: "Theo dõi" },
];

export const DOCTOR_CARE_REPORTS = [
    {
        id: 1,
        caregiver: "Nguyễn Thị Lan",
        elder: "Trần Thị B",
        activity: "Đo huyết áp",
        note: "Huyết áp cao hơn bình thường",
        time: "08:40",
    },
    {
        id: 2,
        caregiver: "Phạm Văn Nam",
        elder: "Nguyễn Văn A",
        activity: "Cho uống thuốc",
        note: "Đã uống đủ liều",
        time: "08:20",
    },
    {
        id: 3,
        caregiver: "Lê Thị Hoa",
        elder: "Lê Văn C",
        activity: "Đo SpO₂",
        note: "SpO₂ thấp, đã báo cáo ngay",
        time: "09:00",
    },
    {
        id: 4,
        caregiver: "Nguyễn Thị Lan",
        elder: "Phạm Thị D",
        activity: "Hỗ trợ vận động",
        note: "Cụ yếu, cần hỗ trợ nhiều hơn",
        time: "09:30",
    },
];

/* ===========================================================
   COORDINATOR
=========================================================== */

export const COORDINATOR_STATS = {
    elders: 128,
    tasks: 86,
    notifications: 8,
};

export const COORDINATOR_ELDERS_LIST = [
    { id: 1, name: "Nguyễn Văn A", area: "Khu A", room: "P.101" },
    { id: 2, name: "Trần Thị B", area: "Khu A", room: "P.102" },
    { id: 3, name: "Lê Văn C", area: "Khu B", room: "P.203" },
    { id: 4, name: "Phạm Văn D", area: "Khu B", room: "P.205" },
    { id: 5, name: "Hoàng Thị E", area: "Khu A", room: "P.103" },
];

export const COORDINATOR_NOTIFICATIONS = [
    { id: 1, title: "Task quá hạn", detail: "TASK-003 - Phát thuốc buổi sáng", time: "20 phút trước" },
    { id: 2, title: "Task mới được giao", detail: "TASK-004 - Kiểm tra phòng B201", time: "45 phút trước" },
    { id: 3, title: "Nhân viên báo vắng", detail: "Caregiver Phạm Văn K không có mặt ca sáng", time: "1 giờ trước" },
];

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
        assignee: "Nguyễn Thị Lan",
        elder: "Nguyễn Văn A",
        time: "09:30",
        date: "11/08/2026",
        task: "Đo sinh hiệu",
    },
    {
        id: "TASK-002",
        status: "Đang làm",
        assignee: "Phạm Văn Nam",
        elder: "Trần Thị B",
        time: "10:00",
        date: "11/08/2026",
        task: "Hỗ trợ vệ sinh",
    },
    {
        id: "TASK-003",
        status: "Quá hạn",
        assignee: "Lê Thị Hoa",
        elder: "Lê Văn C",
        time: "08:30",
        date: "11/08/2026",
        task: "Phát thuốc buổi sáng",
    },
    {
        id: "TASK-004",
        status: "Chưa làm",
        assignee: "Nguyễn Thị Lan",
        elder: "Phạm Văn D",
        time: "11:00",
        date: "11/08/2026",
        task: "Kiểm tra phòng B201",
    },
    {
        id: "TASK-005",
        status: "Đang làm",
        assignee: "Phạm Văn Nam",
        elder: "Hoàng Thị E",
        time: "11:30",
        date: "11/08/2026",
        task: "Hỗ trợ ăn trưa",
    },
    {
        id: "TASK-006",
        status: "Chưa làm",
        assignee: "Lê Thị Hoa",
        elder: "Vũ Văn F",
        time: "14:00",
        date: "11/08/2026",
        task: "Đo nhiệt độ",
    },
];

export const COORDINATOR_ATTENTION = [
    {
        id: 1,
        title: "7 công việc quá hạn",
        description: "Cần phân công hoặc xử lý ngay.",
        type: "danger",
        time: "08:30",
    },
    {
        id: 2,
        title: "3 công việc chưa được phân công",
        description: "Chưa có caregiver phụ trách.",
        type: "warning",
        time: "09:00",
    },
    {
        id: 3,
        title: "2 nhân viên không hoạt động",
        description: "Cần kiểm tra tình trạng ca trực.",
        type: "warning",
        time: "09:15",
    },
    {
        id: 4,
        title: "SpO₂ cụ Lê Văn C xuống thấp",
        description: "Cần bố trí caregiver theo dõi ngay.",
        type: "danger",
        time: "09:30",
    },
];

export const COORDINATOR_SCHEDULE = [
    { id: 1, time: "08:00", title: "Kiểm tra sinh hiệu", location: "Khu A" },
    { id: 2, time: "09:00", title: "Hoạt động buổi sáng", location: "Phòng sinh hoạt" },
    { id: 3, time: "10:30", title: "Khám định kỳ cụ Lê Văn C", location: "Phòng khám" },
    { id: 4, time: "11:30", title: "Hỗ trợ ăn trưa", location: "Tầng 1, Tầng 2" },
    { id: 5, time: "14:00", title: "Hoạt động vận động", location: "Sân viện" },
    { id: 6, time: "15:30", title: "Kiểm tra thuốc buổi chiều", location: "Khu B" },
    { id: 7, time: "16:00", title: "Bàn giao ca chiều", location: "Phòng điều phối" },
];

/* ===========================================================
   CAREGIVER
=========================================================== */

export const CAREGIVER_STATS = {
    elders: 12,
    tasks: 18,
    notifications: 2,
};

export const CAREGIVER_ELDERS_LIST = [
    { id: 1, name: "Nguyễn Văn C", room: "P.103", health: "Ổn định" },
    { id: 2, name: "Nguyễn Thị D", room: "P.104", health: "Cần chú ý" },
    { id: 3, name: "Trần F", room: "P.205", health: "Ổn định" },
    { id: 4, name: "Lê G", room: "P.201", health: "Ổn định" },
    { id: 5, name: "Phạm Thị H", room: "P.202", health: "Nhập viện" },
    { id: 6, name: "Hoàng Văn I", room: "P.301", health: "Ổn định" },
];

export const CAREGIVER_NOTIFICATIONS = [
    { id: 1, title: "Lưu ý mới từ bác sĩ", detail: "Không cho cụ D ăn cá trong 5 ngày", time: "15 phút trước" },
    { id: 2, title: "Nhắc nhở task", detail: "Đo chỉ số cho cụ D lúc 08:30", time: "40 phút trước" },
];

export const CAREGIVER_SHIFT = {
    name: "Ca sáng",
    start: "07:00",
    end: "15:00",
};

export const CAREGIVER_TASKS = [
    {
        id: 1,
        time: "08:00",
        task: "Cho cụ C uống thuốc A",
        elder: "Nguyễn Văn C",
        room: "P.103",
        type: "now",
        status: "pending",
    },
    {
        id: 2,
        time: "08:30",
        task: "Đo chỉ số sinh hiệu",
        elder: "Nguyễn Thị D",
        room: "P.104",
        type: "next",
        status: "pending",
    },
    {
        id: 3,
        time: "09:30",
        task: "Hỗ trợ ăn sáng",
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
    {
        id: 5,
        time: "11:00",
        task: "Phát thuốc buổi trưa",
        elder: "Hoàng Văn I",
        room: "P.301",
        type: "normal",
        status: "pending",
    },
    {
        id: 6,
        time: "12:00",
        task: "Hỗ trợ ăn trưa",
        elder: "Nguyễn Văn C",
        room: "P.103",
        type: "normal",
        status: "pending",
    },
    {
        id: 7,
        time: "14:00",
        task: "Đo huyết áp",
        elder: "Phạm Thị H",
        room: "P.202",
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
        elder: "Cụ D",
        note: "Không cho ăn cá trong 5 ngày, dị ứng hải sản.",
    },
    {
        id: 2,
        time: "11:00",
        date: "08/08/2026",
        author: "Manager Nguyễn",
        elder: "Cụ C",
        note: "Theo dõi lượng nước uống trong ngày, tối thiểu 1.5L.",
    },
    {
        id: 3,
        time: "14:00",
        date: "09/08/2026",
        author: "BS. Trần Thị E",
        elder: "Cụ H",
        note: "Hạn chế vận động mạnh sau khi mổ. Kiểm tra vết thương mỗi 6 tiếng.",
    },
];

/* ===========================================================
   NOTIFICATIONS — Per-role user notifications (kiểu Facebook)
   type: "danger" | "warning" | "info"
=========================================================== */

const NOTIFICATIONS_BY_ROLE = {
    admin: [
        {
            id: 1,
            type: "danger",
            title: "Tài khoản bị khóa",
            message: "Tài khoản doctor.nguyen bị khóa do đăng nhập sai nhiều lần.",
            time: "5 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "danger",
            title: "Đăng nhập bất thường",
            message: "Phát hiện đăng nhập từ IP lạ vào tài khoản manager.tran.",
            time: "20 phút trước",
            read: false,
        },
        {
            id: 3,
            type: "warning",
            title: "Tài khoản chưa gán role",
            message: "3 tài khoản mới chưa được gán vai trò.",
            time: "1 giờ trước",
            read: false,
        },
        {
            id: 4,
            type: "info",
            title: "Hệ thống bảo trì",
            message: "Lịch bảo trì hệ thống vào 02:00 ngày 12/08/2026.",
            time: "2 giờ trước",
            read: true,
        },
        {
            id: 5,
            type: "info",
            title: "Tài khoản mới",
            message: "3 tài khoản mới được tạo trong 24 giờ qua.",
            time: "3 giờ trước",
            read: true,
        },
    ],

    manager: [
        {
            id: 1,
            type: "danger",
            title: "Cảnh báo sức khỏe khẩn",
            message: "SpO₂ cụ Trần Thị B xuống còn 91%, cần can thiệp ngay.",
            time: "3 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "danger",
            title: "Nhân viên vắng ca",
            message: "Caregiver Phạm Văn K không trình diện ca sáng.",
            time: "30 phút trước",
            read: false,
        },
        {
            id: 3,
            type: "warning",
            title: "Task quá hạn",
            message: "TASK-003 Phát thuốc cụ Lê Văn C đã quá giờ 2 tiếng.",
            time: "45 phút trước",
            read: false,
        },
        {
            id: 4,
            type: "warning",
            title: "Phòng cần kiểm tra",
            message: "Phòng P.202 khu B chưa được kiểm tra định kỳ tuần này.",
            time: "2 giờ trước",
            read: true,
        },
        {
            id: 5,
            type: "info",
            title: "Thông báo bệnh viện",
            message: "Buổi họp nhân viên định kỳ vào 15:00 ngày 12/08/2026.",
            time: "3 giờ trước",
            read: true,
        },
    ],

    doctor: [
        {
            id: 1,
            type: "danger",
            title: "Chỉ số bất thường",
            message: "SpO₂ cụ Trần Thị B giảm còn 92%, cần kiểm tra ngay.",
            time: "10 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "danger",
            title: "Huyết áp cụ Nguyễn Văn A",
            message: "Huyết áp 160/100 mmHg — vượt ngưỡng an toàn.",
            time: "25 phút trước",
            read: false,
        },
        {
            id: 3,
            type: "warning",
            title: "Kết quả xét nghiệm",
            message: "Kết quả xét nghiệm máu cụ Phạm Thị D cần xem xét.",
            time: "1 giờ trước",
            read: false,
        },
        {
            id: 4,
            type: "info",
            title: "Nhắc lịch hẹn",
            message: "Cuộc hẹn với cụ Trần Thị B lúc 14:00 hôm nay.",
            time: "2 giờ trước",
            read: true,
        },
        {
            id: 5,
            type: "info",
            title: "Đơn thuốc sắp hết hạn",
            message: "Đơn thuốc cụ Lê Văn C cần gia hạn trước 15/08/2026.",
            time: "4 giờ trước",
            read: true,
        },
    ],

    coordinator: [
        {
            id: 1,
            type: "danger",
            title: "Task khẩn cần xử lý",
            message: "TASK-003 Phát thuốc buổi sáng đã quá hạn 2 tiếng.",
            time: "5 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "warning",
            title: "Ca trực thiếu nhân lực",
            message: "Ca sáng thiếu 2 caregiver do nghỉ đột xuất.",
            time: "20 phút trước",
            read: false,
        },
        {
            id: 3,
            type: "warning",
            title: "Lịch trình chưa giao",
            message: "3 task hôm nay chưa được phân công cho ai.",
            time: "1 giờ trước",
            read: false,
        },
        {
            id: 4,
            type: "info",
            title: "Thông báo từ Manager",
            message: "Họp đánh giá ca trực lúc 17:00 hôm nay.",
            time: "2 giờ trước",
            read: true,
        },
        {
            id: 5,
            type: "info",
            title: "Cập nhật lịch khám",
            message: "Lịch khám cụ Lê Văn C được dời sang 10:30.",
            time: "3 giờ trước",
            read: true,
        },
        {
            id: 6,
            type: "danger",
            title: "Admin điều chỉnh tài khoản",
            message: "Admin đã thay đổi quyền của tài khoản coordinator.vu.",
            time: "4 giờ trước",
            read: false,
        },
        {
            id: 7,
            type: "info",
            title: "Thông báo bệnh viện",
            message: "Quy trình mới về phát thuốc được áp dụng từ 12/08/2026.",
            time: "5 giờ trước",
            read: true,
        },
        {
            id: 8,
            type: "warning",
            title: "Báo cáo ca chưa nộp",
            message: "Báo cáo ca chiều hôm qua chưa được hoàn thành.",
            time: "6 giờ trước",
            read: false,
        },
    ],

    caregiver: [
        {
            id: 1,
            type: "danger",
            title: "Task khẩn cấp",
            message: "Đo chỉ số sinh hiệu cụ Nguyễn Thị D ngay lập tức.",
            time: "2 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "warning",
            title: "Lưu ý từ bác sĩ",
            message: "Không cho cụ D ăn cá hoặc hải sản trong 5 ngày tới.",
            time: "15 phút trước",
            read: false,
        },
        {
            id: 3,
            type: "info",
            title: "Thông báo từ Manager",
            message: "Họp ngắn 5 phút trước khi bàn giao ca lúc 15:00.",
            time: "1 giờ trước",
            read: true,
        },
    ],

    carestaff: [
        {
            id: 1,
            type: "danger",
            title: "Task khẩn cấp",
            message: "Đo chỉ số sinh hiệu cụ Nguyễn Thị D ngay lập tức.",
            time: "2 phút trước",
            read: false,
        },
        {
            id: 2,
            type: "warning",
            title: "Lưu ý từ bác sĩ",
            message: "Không cho cụ D ăn cá hoặc hải sản trong 5 ngày tới.",
            time: "15 phút trước",
            read: false,
        },
    ],
};

/**
 * Trả về danh sách thông báo theo role.
 * @param {string} role - role của user
 * @returns {Array}
 */
export const getRoleNotifications = (role) => {
    const key = String(role || "").toLowerCase().replace(/[\s_-]/g, "");
    return NOTIFICATIONS_BY_ROLE[key] ?? [];
};