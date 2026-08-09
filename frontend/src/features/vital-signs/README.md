├── vital-signs/                      # [TÍNH NĂNG 1] THEO DÕI SINH HIỆU & CẢNH BÁO
│   ├── api/
│   │   └── vitalSignsApi.js          # API chỉ số sinh hiệu & cân nặng
│   ├── hooks/
│   │   └── useVitalSignsData.js      # Hook quản lý danh sách sinh hiệu & cảnh báo
│   ├── components/
│   │   ├── VitalAlertList.jsx        # Danh sách cảnh báo bất thường
│   │   ├── ElderSearchFilter.jsx     # Thanh tìm kiếm & bộ lọc người cao tuổi
│   │   ├── ElderGridSelect.jsx       # Lưới hiển thị phòng & người cao tuổi
│   │   ├── VitalModal.jsx            # Modal đo/sửa sinh hiệu & cân nặng
│   │   └── VitalAndWeightForm.jsx    # Form nhập chỉ số
│   ├── layouts/
│   │   ├── VitalSignsWebLayout.jsx
│   │   └── VitalSignsMobileLayout.jsx
│   └── pages/
│       └── VitalSignsPage.jsx        # Trang chính