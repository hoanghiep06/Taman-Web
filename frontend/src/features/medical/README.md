features/medical/
├── README.md # File này
├── api/
│ └── medicalApi.js # Gọi API cho cả 4 domain con (chưa code, đang làm khung UI trước)
└── pages/
├── overview/
│ └── HealthDashboardPage.jsx # /health — Dashboard tổng hợp sức khỏe
├── records/
│ ├── MedicalRecordPage.jsx # /medical-record — Hồ sơ bệnh án
│ └── HealthCheckPage.jsx # /health-check — Lịch sử khám sức khỏe
├── prescriptions/
│ └── PrescriptionPage.jsx # /prescriptions — Quản lý đơn thuốc
├── medicines/
│ └── MedicinePage.jsx # /medicines — Danh mục thuốc
└── diseases/
└── DiseasePage.jsx # /diseases — Danh mục bệnh