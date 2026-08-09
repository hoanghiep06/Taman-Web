shift-handover/                   # [TÍNH NĂNG 2] QUẢN LÝ BÁO CÁO GIAO CA
    ├── api/
    │   └── shiftHandoverApi.js       # API giao ca, cập nhật & tra cứu lịch sử
    ├── components/
    │   ├── HandoverReportForm.jsx    # Form tạo / chỉnh sửa báo cáo giao ca
    │   ├── ShiftReportView.jsx       # Hiển thị báo cáo & xuất ảnh JPG
    │   └── ShiftReportHistoryModal.jsx # Modal tra cứu lịch sử bàn giao ca
    ├── layouts/
    │   ├── ShiftHandoverWebLayout.jsx
    │   └── ShiftHandoverMobileLayout.jsx
    └── pages/
        └── ShiftHandoverPage.jsx     # Trang chính (/reports hoặc /shift-handover)