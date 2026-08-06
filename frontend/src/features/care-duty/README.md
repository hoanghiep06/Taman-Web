src/features/care-duty/
├── api/
│   └── careDutyApi.js              # Gọi API lấy sinh hiệu, gửi chỉ số, chốt báo cáo ca
│
├── hooks/
│   ├── useCareDutyData.ts          # Hook lấy dữ liệu sinh hiệu & cảnh báo trong ca
│   └── useHandoverReport.ts        # Hook đóng gói & gửi Báo cáo giao ca
│
├── components/                     # THƯ VIỆN KHỐI LEGO (WIDGETS)
│   ├── VitalInputForm.tsx          # Form nhập chỉ số sinh hiệu (Huyết áp, đường huyết...)
│   ├── VitalAlertList.tsx          # Danh sách cảnh báo đỏ chỉ số bất thường
│   ├── HandoverReportForm.tsx      # Form nhập mô tả & chốt ca (DÀNH RIÊNG CHO COORDINATOR)
│   └── ShiftReportView.tsx         # Khối xem lại báo cáo ca trực đã chốt (Doctor/Manager xem)
│
├── layouts/                        # KHUNG GIAO DIỆN RESPONSIVE
│   ├── CareDutyWebLayout.tsx       # Khung hiển thị màn hình Ngang (Web)
│   └── CareDutyMobileLayout.tsx    # Khung hiển thị màn hình Dọc (App Mobile)
│
└── pages/
    └── CareDutyPage.tsx            # TRANG TỔNG HỢP (Nơi ghép nối theo Role & Device)