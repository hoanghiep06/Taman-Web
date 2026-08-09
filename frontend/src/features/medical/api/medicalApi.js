/**
 * Mock API cho feature `medical` (overview / records / healthChecks / prescriptions / medicines / diseases).
 * Dữ liệu lưu trong bộ nhớ (mất khi reload trang) — chỉ dùng để dựng khung UI.
 *
 * Khi backend sẵn sàng: thay nội dung từng hàm bằng axiosClient.get/post/put/delete
 * tương ứng, GIỮ NGUYÊN chữ ký hàm (tên + tham số + shape trả về) để không phải sửa
 * lại code trong các page.
 */

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const genId = (() => {
    let counter = 1000;
    return () => ++counter;
})();

/* ============================================================
   MEDICINES — Danh mục thuốc
   ============================================================ */

let medicines = [
    { id: 1, name: "Amlodipine 5mg", unit: "Viên", dosageForm: "Viên nén", note: "Hạ huyết áp", status: "active" },
    { id: 2, name: "Paracetamol 500mg", unit: "Viên", dosageForm: "Viên nén", note: "Hạ sốt, giảm đau", status: "active" },
    { id: 3, name: "Vitamin D3", unit: "Viên", dosageForm: "Viên nang", note: "Bổ sung vitamin", status: "active" },
    { id: 4, name: "Metformin 500mg", unit: "Viên", dosageForm: "Viên nén", note: "Tiểu đường type 2", status: "active" },
    { id: 5, name: "Insulin Mixtard", unit: "Lọ", dosageForm: "Dung dịch tiêm", note: "Bảo quản lạnh 2-8°C", status: "inactive" },
];

export const medicinesApi = {
    list: async () => {
        await delay();
        return [...medicines];
    },
    create: async (payload) => {
        await delay();
        const item = { id: genId(), status: "active", ...payload };
        medicines = [item, ...medicines];
        return item;
    },
    update: async (id, payload) => {
        await delay();
        medicines = medicines.map((m) => (m.id === id ? { ...m, ...payload } : m));
        return medicines.find((m) => m.id === id);
    },
    remove: async (id) => {
        await delay();
        medicines = medicines.filter((m) => m.id !== id);
        return { success: true };
    },
    removeMany: async (ids) => {
        await delay();
        medicines = medicines.filter((m) => !ids.includes(m.id));
        return { success: true };
    },
};

/* ============================================================
   DISEASES — Danh mục bệnh
   ============================================================ */

let diseases = [
    { id: 1, name: "Tăng huyết áp", icdCode: "I10", description: "Huyết áp tâm thu ≥ 140mmHg", status: "active" },
    { id: 2, name: "Đái tháo đường type 2", icdCode: "E11", description: "Rối loạn chuyển hóa đường huyết", status: "active" },
    { id: 3, name: "Viêm khớp", icdCode: "M13", description: "Viêm các khớp, thường gặp ở người cao tuổi", status: "active" },
    { id: 4, name: "Sa sút trí tuệ", icdCode: "F03", description: "Suy giảm nhận thức tiến triển", status: "active" },
];

export const diseasesApi = {
    list: async () => {
        await delay();
        return [...diseases];
    },
    create: async (payload) => {
        await delay();
        const item = { id: genId(), status: "active", ...payload };
        diseases = [item, ...diseases];
        return item;
    },
    update: async (id, payload) => {
        await delay();
        diseases = diseases.map((d) => (d.id === id ? { ...d, ...payload } : d));
        return diseases.find((d) => d.id === id);
    },
    remove: async (id) => {
        await delay();
        diseases = diseases.filter((d) => d.id !== id);
        return { success: true };
    },
    removeMany: async (ids) => {
        await delay();
        diseases = diseases.filter((d) => !ids.includes(d.id));
        return { success: true };
    },
};

/* ============================================================
   MEDICAL RECORDS — Hồ sơ bệnh án
   ============================================================ */

let medicalRecords = [
    { id: 1, elderName: "Nguyễn Văn A", room: "A101", diagnosis: "Tăng huyết áp", doctor: "BS. Trần Văn Hải", date: "2026-07-20", status: "active" },
    { id: 2, elderName: "Trần Thị B", room: "A102", diagnosis: "Đái tháo đường type 2", doctor: "BS. Trần Văn Hải", date: "2026-07-15", status: "active" },
    { id: 3, elderName: "Lê Văn C", room: "A103", diagnosis: "Viêm khớp", doctor: "BS. Nguyễn Thị Mai", date: "2026-06-30", status: "resolved" },
];

export const medicalRecordsApi = {
    list: async () => {
        await delay();
        return [...medicalRecords];
    },
    create: async (payload) => {
        await delay();
        const item = { id: genId(), status: "active", ...payload };
        medicalRecords = [item, ...medicalRecords];
        return item;
    },
    update: async (id, payload) => {
        await delay();
        medicalRecords = medicalRecords.map((r) => (r.id === id ? { ...r, ...payload } : r));
        return medicalRecords.find((r) => r.id === id);
    },
    remove: async (id) => {
        await delay();
        medicalRecords = medicalRecords.filter((r) => r.id !== id);
        return { success: true };
    },
};

/* ============================================================
   HEALTH CHECKS — Lịch sử khám sức khỏe
   ============================================================ */

let healthChecks = [
    { id: 1, elderName: "Nguyễn Văn A", room: "A101", checkDate: "2026-08-01", result: "warning", doctor: "BS. Trần Văn Hải", note: "Huyết áp hơi cao, theo dõi thêm" },
    { id: 2, elderName: "Trần Thị B", room: "A102", checkDate: "2026-07-28", result: "normal", doctor: "BS. Trần Văn Hải", note: "Ổn định" },
    { id: 3, elderName: "Lê Văn C", room: "A103", checkDate: "2026-07-25", result: "danger", doctor: "BS. Nguyễn Thị Mai", note: "Cần tái khám gấp" },
];

export const healthChecksApi = {
    list: async () => {
        await delay();
        return [...healthChecks];
    },
    create: async (payload) => {
        await delay();
        const item = { id: genId(), ...payload };
        healthChecks = [item, ...healthChecks];
        return item;
    },
    update: async (id, payload) => {
        await delay();
        healthChecks = healthChecks.map((h) => (h.id === id ? { ...h, ...payload } : h));
        return healthChecks.find((h) => h.id === id);
    },
    remove: async (id) => {
        await delay();
        healthChecks = healthChecks.filter((h) => h.id !== id);
        return { success: true };
    },
};

/* ============================================================
   PRESCRIPTIONS — Đơn thuốc
   ============================================================ */

let prescriptions = [
    {
        id: 1,
        elderName: "Nguyễn Văn A",
        room: "A101",
        date: "2026-08-01",
        doctor: "BS. Trần Văn Hải",
        status: "active",
        items: [{ medicineName: "Amlodipine 5mg", dosage: "1 viên/ngày, sau ăn sáng" }],
    },
    {
        id: 2,
        elderName: "Trần Thị B",
        room: "A102",
        date: "2026-07-28",
        doctor: "BS. Trần Văn Hải",
        status: "active",
        items: [
            { medicineName: "Metformin 500mg", dosage: "2 viên/ngày, sau ăn" },
            { medicineName: "Vitamin D3", dosage: "1 viên/ngày" },
        ],
    },
    {
        id: 3,
        elderName: "Lê Văn C",
        room: "A103",
        date: "2026-06-30",
        doctor: "BS. Nguyễn Thị Mai",
        status: "completed",
        items: [{ medicineName: "Paracetamol 500mg", dosage: "1 viên khi sốt trên 38.5°C" }],
    },
];

export const prescriptionsApi = {
    list: async () => {
        await delay();
        return [...prescriptions];
    },
    create: async (payload) => {
        await delay();
        const item = { id: genId(), status: "active", ...payload };
        prescriptions = [item, ...prescriptions];
        return item;
    },
    update: async (id, payload) => {
        await delay();
        prescriptions = prescriptions.map((p) => (p.id === id ? { ...p, ...payload } : p));
        return prescriptions.find((p) => p.id === id);
    },
    remove: async (id) => {
        await delay();
        prescriptions = prescriptions.filter((p) => p.id !== id);
        return { success: true };
    },
};

/* ============================================================
   OVERVIEW — Dashboard tổng hợp sức khỏe
   ============================================================ */

export const overviewApi = {
    getSummary: async () => {
        await delay();
        return {
            stats: [
                { title: "Hồ sơ bệnh án đang theo dõi", value: medicalRecords.filter((r) => r.status === "active").length, color: "#2563EB" },
                { title: "Đơn thuốc đang dùng", value: prescriptions.filter((p) => p.status === "active").length, color: "#16A34A" },
                { title: "Cần tái khám gấp", value: healthChecks.filter((h) => h.result === "danger").length, color: "#DC2626" },
            ],
            recentChecks: [...healthChecks]
                .sort((a, b) => new Date(b.checkDate) - new Date(a.checkDate))
                .slice(0, 5),
        };
    },
};

export const medicalApi = {
    overview: overviewApi,
    records: medicalRecordsApi,
    healthChecks: healthChecksApi,
    prescriptions: prescriptionsApi,
    medicines: medicinesApi,
    diseases: diseasesApi,
};

export default medicalApi;