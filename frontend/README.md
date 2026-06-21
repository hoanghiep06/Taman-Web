taman-inventory-fe/
├── src/
│   ├── api/                          # [GLOBAL] Cấu hình trục xương sống API
│   │   └── axiosClient.js            # Axios instance, interceptors xử lý Token/Lỗi toàn cục
│   │
│   ├── components/                   # [GLOBAL] UI Components dùng chung toàn hệ thống
│   │   ├── Elements/                 # Button, Input, Select, Spinner, Badge tiêu chuẩn
│   │   ├── Layout/                   # AdminLayout (Web), StaffLayout (Mobile)
│   │   └── Feedback/                 # Toast, Modal xác nhận, Giao diện trống (EmptyState)
│   │
│   ├── hooks/                        # [GLOBAL] Custom Hooks dùng chung liên phân hệ
│   │   ├── useAuth.js                # Tiêu thụ ngữ cảnh AuthContext nhanh
│   │   └── useLocalStorage.js        # Tiêu chuẩn hóa việc đọc/ghi LocalStorage
│   │
│   ├── utils/                        # [GLOBAL] Tiện ích nội bộ
│   │   ├── constants.js              # Định nghĩa mã màu UI (#2ECC71, #F1C40F), Enum Roles
│   │   └── formatters.js             # Format ngày tháng, chuỗi ký tự
│   │
│   ├── contexts/                     # Quản lý trạng thái toàn cục lớp trên
│   │   └── AuthContext.jsx           # Lưu session đăng nhập, phân quyền Role hiện tại
│   │
│   ├── routes/                       # Quản lý luồng định tuyến điều hướng
│   │   ├── AppRoutes.jsx             # Bản đồ phân nhánh router
│   │   └── ProtectedRoute.jsx        # Bộ lọc chặn quyền truy cập (Guard)
│   │
│   │── features/                     # 📦 NƠI CHỨA CÁC PHÂN HỆ TÍNH NĂNG CHÍNH
│   │   │
│   │   ├── auth/                     # 1. Tính năng Xác thực & Đổi mật khẩu
│   │   │   ├── api/authApi.js
│   │   │   ├── components/           # LoginForm, ForceResetModal
│   │   │   └── pages/                # LoginPage.jsx, ResetPasswordPage.jsx
│   │   │
│   │   ├── dashboard/                # 2. Trang chủ Giám sát Ca trực (Admin/Manager)
│   │   │   ├── api/dashboardApi.js
│   │   │   ├── components/           # ProgressCard, RecentIncidentsTable, LogTable
│   │   │   └── pages/                # DashboardPage.jsx
│   │   │
│   │   ├── patrol/                   # 3. Phân hệ Đi Tuần & Kiểm kê (Staff)
│   │   │   ├── api/patrolApi.js
│   │   │   ├── hooks/                # useBackgroundQueue.js (Xử lý hàng đợi upload ảnh ngầm)
│   │   │   ├── components/           # RoomCardGrid, AssetCheckboxList, CameraCapture
│   │   │   └── pages/                # RoomListPage.jsx, PatrolSessionPage.jsx
│   │   │
│   │   ├── incidents/                # 4. Nghiệp vụ Báo mất & Giải trình (Staff/Admin)
│   │   │   ├── api/incidentsApi.js
│   │   │   ├── components/           # MissingFormModal, IncidentDetailTooltip
│   │   │   └── pages/                # IncidentListPage.jsx
│   │   │
│   │   ├── users/                    # 5. Quản lý Tài khoản nhân sự (Admin/Manager)
│   │   │   ├── api/usersApi.js
│   │   │   ├── components/           # UserTable, CreateUserModal (Xử lý ẩn/hiện nút bấm)
│   │   │   └── pages/                # UserManagementPage.jsx
│   │   │
│   │   ├── entities/                 # 6. Quản lý Thực thể (Phòng, Cụ già, Tài sản lẻ)
│   │   │   ├── api/entitiesApi.js
│   │   │   ├── components/           # RoomCrud, ElderCrud, AssetCrud
│   │   │   └── pages/                # EntityManagementPage.jsx
│   │   │
│   │   └── data-management/          # 7. Quản trị & Nhập xuất Ma trận dữ liệu
│   │       ├── api/dataApi.js
│   │       ├── components/           # DragDropExcel, BackupTriggerButton
│   │       └── pages/                # DataControlPage.jsx
│   │
│   ├── App.jsx
│   └── main.jsx