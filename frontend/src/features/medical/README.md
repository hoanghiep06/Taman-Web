features/medical/
├── api/
│   └── medicalApi.js                    # API y tế

├── hooks/
│   ├── useMedicines.js                  # Logic quản lý thuốc
│   ├── useDiseases.js                   # Logic quản lý bệnh
│   ├── useMedicalRecords.js             # Logic hồ sơ bệnh án
│   ├── useHealthChecks.js               # Logic khám sức khỏe
│   ├── usePrescriptions.js              # Logic đơn thuốc
│   └── useHealthOverview.js             # Logic dữ liệu tổng quan sức khỏe

├── components/
│   ├── MedicineFormModal.jsx            # Form thuốc
│   ├── DiseaseFormModal.jsx             # Form bệnh
│   ├── MedicalRecordFormModal.jsx       # Form hồ sơ bệnh án
│   ├── HealthCheckFormModal.jsx         # Form khám sức khỏe
│   └── PrescriptionFormModal.jsx        # Form đơn thuốc

├── layouts/
│   ├── MedicalWebLayout.jsx             # Layout Desktop/Web
│   └── MedicalMobileLayout.jsx          # Layout Mobile

└── pages/
    ├── HealthDashboardPage.jsx          # Dashboard sức khỏe
    ├── MedicalRecordPage.jsx            # Trang hồ sơ bệnh án
    ├── HealthCheckPage.jsx              # Trang khám sức khỏe
    ├── PrescriptionPage.jsx             # Trang đơn thuốc
    ├── MedicinePage.jsx                 # Trang thuốc
    └── DiseasePage.jsx                  # Trang bệnh