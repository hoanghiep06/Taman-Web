# Cấu trúc Thư mục & Chức năng các File - Viện Dưỡng Lão Tâm An (Taman-Web)

Tài liệu này mô tả chi tiết từng file trong hệ thống. Hệ thống được xây dựng theo mô hình **Client-Server** với kiến trúc phân lớp rõ ràng.

---

## 📌 Sơ đồ Cấu trúc Tổng quan

```text
Taman-Web/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── constants.py
│   │   ├── dependencies.py
│   │   ├── limiter.py
│   │   ├── scheduler.py
│   │   └── security.py
│   ├── database/
│   │   ├── migrations/
│   │   │   └── init_db.sql
│   │   └── seeds/
│   │       └── seed_admin.py
│   ├── middleware/
│   │   └── ip_whitelist.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── admin_data.py
│   │   ├── admin_entities.py
│   │   ├── admin_history.py
│   │   ├── admin_rooms.py
│   │   ├── admin_settings.py
│   │   ├── admin_users.py
│   │   ├── assets.py
│   │   ├── auth.py
│   │   ├── dashboard.py
│   │   ├── elders.py
│   │   ├── facilities.py
│   │   ├── health.py
│   │   ├── inspections.py
│   │   ├── rooms.py
│   │   ├── system.py
│   │   └── users.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── backup_service.py
│   │   ├── drive_service.py
│   │   ├── email_service.py
│   │   ├── image_service.py
│   │   └── shift_service.py
│   ├── Dockerfile
│   ├── __init__.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   ├── seed_data.py
│   └── test_db.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosClient.js
│   │   │   └── inventoryAPI.js
│   │   ├── assets/
│   │   │   └── hero.png
│   │   ├── components/
│   │   │   ├── nav/
│   │   │   │   ├── NavItem.jsx
│   │   │   │   └── NavItem.module.css
│   │   │   ├── table/
│   │   │   │   ├── ActionButton.jsx
│   │   │   │   ├── ActionButton.module.css
│   │   │   │   ├── BulkActionBar.jsx
│   │   │   │   ├── BulkActionBar.module.css
│   │   │   │   ├── GroupHeaderRow.jsx
│   │   │   │   ├── GroupHeaderRow.module.css
│   │   │   │   ├── Table.jsx
│   │   │   │   └── Table.module.css
│   │   │   ├── FileUploadBox.jsx
│   │   │   ├── FileUploadBox.module.css
│   │   │   ├── ImportDataModal.jsx
│   │   │   ├── ImportDataModal.module.css
│   │   │   ├── Modal.jsx
│   │   │   ├── Modal.module.css
│   │   │   ├── Pagination.jsx
│   │   │   ├── Pagination.module.css
│   │   │   ├── SearchInput.jsx
│   │   │   ├── SearchInput.module.css
│   │   │   ├── StatChip.jsx
│   │   │   ├── StatChip.module.css
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── StatusBadge.module.css
│   │   │   ├── TabBar.jsx
│   │   │   └── TabBar.module.css
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── api/
│   │   │   │   │   └── authApi.js
│   │   │   │   └── pages/
│   │   │   │       ├── LoginPage.jsx
│   │   │   │       ├── LoginPage.module.css
│   │   │   │       ├── ResetPasswordPage.jsx
│   │   │   │       └── ResetPasswordPage.module.css
│   │   │   ├── backup/
│   │   │   │   ├── api/
│   │   │   │   │   └── backupApi.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── BackupList.jsx
│   │   │   │   │   ├── Backuplist.module.css
│   │   │   │   │   ├── DangerZoneCard.jsx
│   │   │   │   │   ├── DangerZoneCard.module.css
│   │   │   │   │   ├── RestoreModal.jsx
│   │   │   │   │   ├── RestoreModal.module.css
│   │   │   │   │   └── RestoreUploadModal.jsx
│   │   │   │   └── pages/
│   │   │   │       ├── BackupPage.jsx
│   │   │   │       └── Backuppage.module.css
│   │   │   ├── catalog/
│   │   │   │   ├── api/
│   │   │   │   │   └── catalogApi.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── AssetFormModal.jsx
│   │   │   │   │   ├── AssetFormModal.module.css
│   │   │   │   │   ├── AssetManagerTab.jsx
│   │   │   │   │   ├── AssetManagerTab.module.css
│   │   │   │   │   ├── ElderFormModal.jsx
│   │   │   │   │   ├── ElderFormModal.module.css
│   │   │   │   │   ├── ElderManagerTab.jsx
│   │   │   │   │   ├── ElderManagerTab.module.css
│   │   │   │   │   ├── RoomFormModal.jsx
│   │   │   │   │   ├── RoomFormModal.module.css
│   │   │   │   │   ├── RoomManagerTab.jsx
│   │   │   │   │   └── RoomManagerTab.module.css
│   │   │   │   └── pages/
│   │   │   │       ├── CatalogPage.jsx
│   │   │   │       └── CatalogPage.module.css
│   │   │   ├── dashboard/
│   │   │   │   ├── api/
│   │   │   │   │   └── dashboardApi.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── AuditGalleryModal.jsx
│   │   │   │   │   ├── AuditGalleryModal.module.css
│   │   │   │   │   ├── GlobalHistoryTab.jsx
│   │   │   │   │   ├── GlobalHistoryTab.module.css
│   │   │   │   │   ├── OverviewTab.jsx
│   │   │   │   │   ├── Overviewtab.module.css
│   │   │   │   │   ├── RoomMatrixTab.jsx
│   │   │   │   │   ├── RoomMatrixTab.module.css
│   │   │   │   │   ├── SecurityLogsTab.jsx
│   │   │   │   │   ├── SecurityLogsTab.module.css
│   │   │   │   │   ├── ShiftHistoryTab.jsx
│   │   │   │   │   └── ShiftHistoryTab.module.css
│   │   │   │   └── pages/
│   │   │   │       ├── DashboardPage.jsx
│   │   │   │       └── DashboardPage.module.css
│   │   │   ├── patrol/
│   │   │   │   ├── api/
│   │   │   │   │   └── patrolApi.js
│   │   │   │   ├── components/
│   │   │   │   │   ├── AssetItemCard.jsx
│   │   │   │   │   ├── AssetItemCard.module.css
│   │   │   │   │   ├── ElderSection.jsx
│   │   │   │   │   ├── ElderSection.module.css
│   │   │   │   │   ├── ImagePreviewModal.jsx
│   │   │   │   │   ├── ImagePreviewModal.module.css
│   │   │   │   │   ├── MissingReportModal.jsx
│   │   │   │   │   ├── MissingReportModal.module.css
│   │   │   │   │   ├── PatrolHeader.jsx
│   │   │   │   │   ├── PatrolHeader.module.css
│   │   │   │   │   ├── ProgressSection.jsx
│   │   │   │   │   ├── ProgressSection.module.css
│   │   │   │   │   ├── SearchBar.jsx
│   │   │   │   │   └── SearchBar.module.css
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useBackgroundQueue.js
│   │   │   │   ├── pages/
│   │   │   │   │   ├── PatrolHistoryPage.jsx
│   │   │   │   │   ├── PatrolHistoryPage.module.css
│   │   │   │   │   ├── PatrolSessionPage.jsx
│   │   │   │   │   ├── PatrolSessionPage.module.css
│   │   │   │   │   ├── RoomListPage.jsx
│   │   │   │   │   └── RoomListPage.module.css
│   │   │   │   └── utils/
│   │   │   │       ├── patrolHelpers.js
│   │   │   │       └── theme.js
│   │   │   ├── settings/
│   │   │   │   ├── api/
│   │   │   │   │   └── settingsApi.js
│   │   │   │   └── pages/
│   │   │   │       ├── SystemSettingsPage.jsx
│   │   │   │       └── SystemSettingsPage.module.css
│   │   │   └── users/
│   │   │       ├── api/
│   │   │       │   └── usersApi.js
│   │   │       ├── components/
│   │   │       │   ├── CreateUserModal.jsx
│   │   │       │   ├── CreateUserModal.module.css
│   │   │       │   ├── UserHistoryModal.jsx
│   │   │       │   └── UserHistoryModal.module.css
│   │   │       └── pages/
│   │   │           ├── UserManagementPage.jsx
│   │   │           └── UserManagementPage.module.css
│   │   ├── hooks/
│   │   │   ├── useIsDesktop.js
│   │   │   └── useMediaQuery.js
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminLayout.module.css
│   │   │   ├── StaffLayout.jsx
│   │   │   └── StaffLayout.module.css
│   │   ├── routes/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── utils/
│   │   │   ├── breakpoints.js
│   │   │   ├── constants.js
│   │   │   ├── imageUtils.js
│   │   │   └── localCache.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── Dockerfile
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── .env
├── .env.example
├── .gitignore
├── README.md
├── Structure.md
├── TỔNG QUAN DỰ ÁN.docx
├── docker-compose.yml
├── note.txt
└── package.json
```

---

## 📂 Chi tiết Từng File trong Dự án

### 1. Thư mục Gốc (Root Workspace)

*   [docker-compose.yml](file:///d:/Tai/Projects/Taman-Web/docker-compose.yml): Cấu hình Docker Compose để khởi chạy 3 dịch vụ: `taman-db` (Postgres 15), `taman-backend` (FastAPI), và `taman-frontend` (React/Vite). Tự động cài đặt dependencies và thiết lập healthcheck DB.
*   `.env` / `.env.example`: Chứa các biến môi trường cấu hình (Database URL, Secret Key, Drive API, SMTP...).
*   [package.json](file:///d:/Tai/Projects/Taman-Web/package.json): Khai báo phụ thuộc gốc phục vụ một số tác vụ mã hóa mật khẩu ở môi trường dev.
*   [README.md](file:///d:/Tai/Projects/Taman-Web/README.md): Hướng dẫn thiết lập môi trường và khởi chạy dự án cho lập trình viên.
*   `TỔNG QUAN DỰ ÁN.docx`: Tài liệu mô tả nghiệp vụ chung của hệ thống.
*   `note.txt`: File ghi chú nhanh của lập trình viên về các đầu việc cần làm.

---

### 2. Backend (`/backend`)

Thư mục chứa mã nguồn Server Python sử dụng FastAPI và PostgreSQL.

#### 📁 Phân hệ Cốt lõi (`/backend/core`)
*   [backend/core/config.py](file:///d:/Tai/Projects/Taman-Web/backend/core/config.py): Đọc cấu hình hệ thống từ file `.env` bằng Pydantic Settings, định cấu hình cho Database, JWT, Drive API và Mail SMTP.
*   [backend/core/constants.py](file:///d:/Tai/Projects/Taman-Web/backend/core/constants.py): Định nghĩa các hằng số dùng chung của hệ thống (Vai trò người dùng, trạng thái vật tư, ca trực, tình trạng phòng).
*   [backend/core/dependencies.py](file:///d:/Tai/Projects/Taman-Web/backend/core/dependencies.py): Cung cấp các Dependency Injection cho FastAPI, lấy kết nối cơ sở dữ liệu (`get_db`) và kiểm tra/lấy thông tin User hiện tại từ token JWT (`get_current_user`).
*   [backend/core/limiter.py](file:///d:/Tai/Projects/Taman-Web/backend/core/limiter.py): Khởi tạo và thiết lập bộ giới hạn tần suất gửi request (Rate Limiter) sử dụng `slowapi`.
*   [backend/core/scheduler.py](file:///d:/Tai/Projects/Taman-Web/backend/core/scheduler.py): Quản lý tiến trình lập lịch chạy ngầm `APScheduler` để tự động hóa: backup database lên Drive, rà soát đồng bộ ca trực, quét lỗi thiết bị, gửi mail báo cáo.
*   [backend/core/security.py](file:///d:/Tai/Projects/Taman-Web/backend/core/security.py): Xử lý băm mật khẩu bằng `bcrypt` và tạo/xác thực JSON Web Token (JWT).

#### 📁 Cơ sở dữ liệu & Di cư (`/backend/database`)
*   [backend/database/migrations/init_db.sql](file:///d:/Tai/Projects/Taman-Web/backend/database/migrations/init_db.sql): File chứa mã SQL tạo bảng và cấu trúc cơ sở dữ liệu ban đầu cho PostgreSQL.
*   [backend/database/seeds/seed_admin.py](file:///d:/Tai/Projects/Taman-Web/backend/database/seeds/seed_admin.py): Script Python hỗ trợ chèn tài khoản Quản trị viên (Admin) mặc định vào cơ sở dữ liệu mới.

#### 📁 Middleware kiểm soát (`/backend/middleware`)
*   [backend/middleware/ip_whitelist.py](file:///d:/Tai/Projects/Taman-Web/backend/middleware/ip_whitelist.py): Middleware lọc địa chỉ IP của request, chỉ cho phép các IP nằm trong danh sách Whitelist truy cập vào các API quản trị của hệ thống.

#### 📁 Định tuyến API (`/backend/routes`)
*   [backend/routes/auth.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/auth.py): Xử lý các request đăng nhập, refresh token, đăng xuất và yêu cầu đặt lại mật khẩu.
*   [backend/routes/users.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/users.py): Endpoint cho phép người dùng tự lấy profile hoặc cập nhật mật khẩu cá nhân.
*   [backend/routes/admin_users.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/admin_users.py): API cho Admin quản trị tài khoản nhân viên (CRUD, bật/tắt kích hoạt, reset mật khẩu).
*   [backend/routes/facilities.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/facilities.py): API quản lý danh sách cơ sở dưỡng lão và phân khu (Zone).
*   [backend/routes/rooms.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/rooms.py): API cho phép xem phòng và phân bố phòng của người cao tuổi.
*   [backend/routes/admin_rooms.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/admin_rooms.py): Endpoint dành cho Admin quản lý phòng (Thêm/Sửa/Xóa phòng, sắp xếp giường ở).
*   [backend/routes/elders.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/elders.py): Endpoint quản lý thông tin hành chính của người cao tuổi.
*   [backend/routes/health.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/health.py): API ghi chép chỉ số sinh hiệu (huyết áp, nhịp tim...), quản lý bệnh án nền, đơn thuốc của người già.
*   [backend/routes/assets.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/assets.py): API quản lý tài sản, trang thiết bị trong các phòng (Thêm mới tài sản, khai báo hư hỏng).
*   [backend/routes/inspections.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/inspections.py): API ghi nhận báo cáo kết quả kiểm tra phòng, tuần tra an ninh và kiểm định tài sản định kỳ.
*   [backend/routes/system.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/system.py): API thực hiện các thao tác hệ thống như kiểm tra trạng thái (health check), backup dữ liệu, khôi phục hệ thống và tải tệp backup.
*   [backend/routes/admin_settings.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/admin_settings.py): API quản lý thiết lập giờ ca trực và danh sách IP whitelist.
*   [backend/routes/admin_data.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/admin_data.py): API hỗ trợ nhập dữ liệu hàng loạt từ Excel/CSV hoặc xuất dữ liệu báo cáo ra file Excel.
*   [backend/routes/admin_history.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/admin_history.py): API truy vấn lịch sử hoạt động hệ thống và báo cáo bàn giao ca trực.
*   [backend/routes/dashboard.py](file:///d:/Tai/Projects/Taman-Web/backend/routes/dashboard.py): Cung cấp các dữ liệu thống kê tổng hợp số lượng, trạng thái, biểu đồ phục vụ màn hình dashboard chính.

#### 📁 Dịch vụ Nghiệp vụ (`/backend/services`)
*   [backend/services/auth_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/auth_service.py): Logic xử lý nghiệp vụ đăng nhập của hệ thống.
*   [backend/services/backup_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/backup_service.py): Thực hiện tạo file SQL backup DB PostgreSQL cục bộ và logic phục hồi dữ liệu từ file SQL được chỉ định.
*   [backend/services/drive_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/drive_service.py): Kết nối tới Google Drive API để đồng bộ hóa và lưu trữ các file backup DB lên Cloud an toàn.
*   [backend/services/email_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/email_service.py): Kết nối SMTP để tự động gửi thông báo hoặc cảnh báo sinh hiệu bất thường qua email cho bác sĩ hoặc người thân.
*   [backend/services/image_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/image_service.py): Dịch vụ xử lý ảnh đầu vào (cắt, nén dung lượng, lưu trữ ảnh thẻ người già, ảnh kiểm tra vật tư tuần tra).
*   [backend/services/shift_service.py](file:///d:/Tai/Projects/Taman-Web/backend/services/shift_service.py): Logic xử lý đồng bộ ca trực theo thời gian thực (JIT), kiểm tra phân chia kíp trực tự động giữa các ca sáng và tối.

#### 📄 Các File Gốc Backend
*   [backend/main.py](file:///d:/Tai/Projects/Taman-Web/backend/main.py): Khởi tạo FastAPI app, cấu hình CORS, tích hợp Middleware giới hạn tốc độ request, đăng ký các router API và vòng đời lifespan (đồng bộ ca trực JIT, khởi chạy scheduler chạy ngầm).
*   [backend/database.py](file:///d:/Tai/Projects/Taman-Web/backend/database.py): Cấu hình cơ sở dữ liệu SQLAlchemy, thiết lập pool kết nối và SessionLocal.
*   [backend/models.py](file:///d:/Tai/Projects/Taman-Web/backend/models.py): Khai báo tất cả các DB ORM models tương ứng với cấu trúc PostgreSQL.
*   [backend/schemas.py](file:///d:/Tai/Projects/Taman-Web/backend/schemas.py): Định nghĩa các lớp Pydantic Schemas làm khung dữ liệu đầu vào/đầu ra cho API.
*   [backend/seed_data.py](file:///d:/Tai/Projects/Taman-Web/backend/seed_data.py): Chứa mã nguồn Python chèn dữ liệu mẫu phong phú phục vụ môi trường chạy thử nghiệm.
*   [backend/test_db.py](file:///d:/Tai/Projects/Taman-Web/backend/test_db.py): Script nhỏ kiểm tra nhanh kết nối backend đến DB.
*   [backend/requirements.txt](file:///d:/Tai/Projects/Taman-Web/backend/requirements.txt): Danh sách thư viện Python cần cài đặt.
*   [backend/Dockerfile](file:///d:/Tai/Projects/Taman-Web/backend/Dockerfile): File build Docker container cho Backend.

---

### 3. Frontend (`/frontend`)

Thư mục mã nguồn client chạy React sử dụng công cụ đóng gói Vite.

#### 📁 Thư mục API (`/frontend/src/api`)
*   [frontend/src/api/axiosClient.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/api/axiosClient.js): Khởi tạo Axios instance dùng chung, tự động đính kèm token xác thực vào tiêu đề request, kiểm soát lỗi tập trung (xử lý token hết hạn).
*   [frontend/src/api/inventoryAPI.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/api/inventoryAPI.js): Gọi API quản lý vật tư trong kho dưỡng lão.

#### 📁 Thư mục Quản lý State toàn cục (`/frontend/src/contexts`)
*   [frontend/src/contexts/AuthContext.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/contexts/AuthContext.jsx): React Context quản lý trạng thái đăng nhập, lưu thông tin người dùng và token hiện tại, cung cấp hàm đăng nhập/đăng xuất cho toàn bộ app.

#### 📁 Bố cục Trang (`/frontend/src/layouts`)
*   [frontend/src/layouts/AdminLayout.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/layouts/AdminLayout.jsx): Bố cục trang quản trị (Admin/Manager) có thanh điều hướng Sidebar bên trái và thanh Header điều phối thông tin bên trên.
*   [frontend/src/layouts/AdminLayout.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/layouts/AdminLayout.module.css): CSS Module tạo kiểu giao diện Sidebar và Header cho Admin.
*   [frontend/src/layouts/StaffLayout.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/layouts/StaffLayout.jsx): Bố cục trang dành riêng cho nhân viên đi tuần tra (Caregiver/Security) được tinh chỉnh gọn gàng, tối ưu trên màn hình nhỏ.
*   [frontend/src/layouts/StaffLayout.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/layouts/StaffLayout.module.css): CSS Module tạo kiểu giao diện tối giản cho nhân viên.

#### 📁 Định tuyến (`/frontend/src/routes`)
*   [frontend/src/routes/ProtectedRoute.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/routes/ProtectedRoute.jsx): Route bảo vệ kiểm tra quyền truy cập của người dùng. Nếu chưa đăng nhập hoặc không đủ quyền truy cập (ví dụ nhân viên thường vào trang Admin), hệ thống tự động chuyển hướng về trang phù hợp.

#### 📁 Custom Hooks (`/frontend/src/hooks`)
*   [frontend/src/hooks/useMediaQuery.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/hooks/useMediaQuery.js): Theo dõi sự thay đổi kích thước màn hình theo thời gian thực để hỗ trợ Responsive.
*   [frontend/src/hooks/useIsDesktop.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/hooks/useIsDesktop.js): Hook kiểm tra xem thiết bị hiện tại có phải là máy tính để bàn (Desktop) hay không.

#### 📁 Tiện ích dùng chung (`/frontend/src/utils`)
*   [frontend/src/utils/breakpoints.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/utils/breakpoints.js): Định nghĩa các mốc kích thước màn hình responsive chuẩn của hệ thống.
*   [frontend/src/utils/constants.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/utils/constants.js): Lưu trữ các hằng số hiển thị UI (nhãn vai trò, màu sắc trạng thái, v.v.).
*   [frontend/src/utils/imageUtils.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/utils/imageUtils.js): Các hàm bổ trợ xử lý ảnh (convert Base64, nén nhẹ ảnh trước khi upload).
*   [frontend/src/utils/localCache.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/utils/localCache.js): Quản lý ghi/đọc dữ liệu cache vào `localStorage` có thời hạn hết hiệu lực.

#### 📁 Components Dùng Chung (`/frontend/src/components`)
*   [frontend/src/components/Modal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/Modal.jsx): Component khung hộp thoại popup dùng chung.
*   [frontend/src/components/Modal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/Modal.module.css): Định kiểu cho modal (nền mờ, hiệu ứng scale).
*   [frontend/src/components/Pagination.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/Pagination.jsx): Component phân trang danh sách.
*   [frontend/src/components/Pagination.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/Pagination.module.css): Định kiểu cho thanh phân trang.
*   [frontend/src/components/SearchInput.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/SearchInput.jsx): Ô tìm kiếm kèm icon và nút xóa nhanh nội dung tìm kiếm.
*   [frontend/src/components/SearchInput.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/SearchInput.module.css): Định kiểu ô nhập tìm kiếm.
*   [frontend/src/components/StatChip.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/StatChip.jsx): Thẻ nhỏ hiển thị nhanh một số liệu thống kê kèm biểu tượng.
*   [frontend/src/components/StatChip.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/StatChip.module.css): Định kiểu cho thẻ StatChip.
*   [frontend/src/components/StatusBadge.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/StatusBadge.jsx): Component hiển thị thẻ trạng thái có màu tương ứng (Bình thường, cảnh báo...).
*   [frontend/src/components/StatusBadge.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/StatusBadge.module.css): Định kiểu cho status badge.
*   [frontend/src/components/TabBar.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/TabBar.jsx): Component thanh tabs chuyển đổi qua lại giữa các nội dung khác nhau.
*   [frontend/src/components/TabBar.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/TabBar.module.css): Định kiểu thanh tabs.
*   [frontend/src/components/FileUploadBox.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/FileUploadBox.jsx): Giao diện kéo thả tệp tin để tải ảnh hoặc tệp excel lên.
*   [frontend/src/components/FileUploadBox.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/FileUploadBox.module.css): Định kiểu cho vùng kéo thả file.
*   [frontend/src/components/ImportDataModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/ImportDataModal.jsx): Hộp thoại popup phục vụ nhập dữ liệu mẫu từ file Excel hàng loạt.
*   [frontend/src/components/ImportDataModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/ImportDataModal.module.css): Định kiểu giao diện import Excel.
*   [frontend/src/components/nav/NavItem.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/nav/NavItem.jsx): Nút liên kết đại diện cho một mục menu điều hướng trong Sidebar.
*   [frontend/src/components/nav/NavItem.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/nav/NavItem.module.css): Định kiểu cho NavItem (bao gồm cả trạng thái hoạt động active).
*   [frontend/src/components/table/Table.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/Table.jsx): Component bảng hiển thị dữ liệu lưới, tự động phân trang và chọn dòng.
*   [frontend/src/components/table/Table.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/Table.module.css): Định kiểu cho bảng dữ liệu.
*   [frontend/src/components/table/ActionButton.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/ActionButton.jsx): Nút thực thi nhanh một thao tác ngay trên dòng dữ liệu (Edit, Delete...).
*   [frontend/src/components/table/ActionButton.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/ActionButton.module.css): Định kiểu nút Action.
*   [frontend/src/components/table/BulkActionBar.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/BulkActionBar.jsx): Thanh hiển thị dưới chân bảng khi người dùng chọn nhiều dòng dữ liệu để xử lý hàng loạt.
*   [frontend/src/components/table/BulkActionBar.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/BulkActionBar.module.css): Định kiểu thanh Bulk Action.
*   [frontend/src/components/table/GroupHeaderRow.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/GroupHeaderRow.jsx): Dòng tiêu đề phân nhóm dữ liệu (ví dụ: gộp phòng theo Phân khu).
*   [frontend/src/components/table/GroupHeaderRow.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/components/table/GroupHeaderRow.module.css): Định kiểu cho dòng phân nhóm.

#### 📁 Thư mục Tài nguyên Tĩnh (`/frontend/src/assets`)
*   `frontend/src/assets/hero.png`: Ảnh nền dùng ở trang đăng nhập Login.

---

### 4. Phân hệ Tính Năng của Client (`/frontend/src/features`)

Ứng dụng chia nhỏ mã nguồn thành các module tính năng nghiệp vụ.

#### 🔐 Module Xác thực (`/frontend/src/features/auth`)
*   [frontend/src/features/auth/api/authApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/auth/api/authApi.js): Quản lý các hàm gọi API đăng nhập, đổi mật khẩu từ Server.
*   [frontend/src/features/auth/pages/LoginPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/auth/pages/LoginPage.jsx): Trang đăng nhập hệ thống chính có form điền thông tin và xác nhận.
*   [frontend/src/features/auth/pages/LoginPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/auth/pages/LoginPage.module.css): CSS Module tạo giao diện trang đăng nhập (gồm nền kính glassmorphism, hiệu ứng chuyển màu...).
*   [frontend/src/features/auth/pages/ResetPasswordPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/auth/pages/ResetPasswordPage.jsx): Trang buộc nhân viên đặt lại mật khẩu mới khi đăng nhập lần đầu tiên để đảm bảo tính an toàn.
*   [frontend/src/features/auth/pages/ResetPasswordPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/auth/pages/ResetPasswordPage.module.css): CSS Module định kiểu cho trang reset mật khẩu.

#### 👥 Module Tài khoản & Phân quyền (`/frontend/src/features/users`)
*   [frontend/src/features/users/api/usersApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/api/usersApi.js): Các hàm gọi API quản lý tài khoản nhân viên.
*   [frontend/src/features/users/components/CreateUserModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/components/CreateUserModal.jsx): Hộp thoại điền thông tin để tạo mới hoặc cập nhật tài khoản nhân viên.
*   [frontend/src/features/users/components/CreateUserModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/components/CreateUserModal.module.css): CSS định kiểu cho form Create User.
*   [frontend/src/features/users/components/UserHistoryModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/components/UserHistoryModal.jsx): Hộp thoại xem lịch sử đăng nhập, hoạt động chi tiết của một tài khoản nhân viên.
*   [frontend/src/features/users/components/UserHistoryModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/components/UserHistoryModal.module.css): CSS định kiểu danh sách lịch sử hoạt động.
*   [frontend/src/features/users/pages/UserManagementPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/pages/UserManagementPage.jsx): Trang chính quản lý nhân sự, hiển thị danh sách tài khoản, hỗ trợ tìm kiếm, khóa tài khoản, phân quyền và xem lịch sử.
*   [frontend/src/features/users/pages/UserManagementPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/users/pages/UserManagementPage.module.css): CSS định kiểu bố cục trang quản lý tài khoản.

#### 📂 Module Quản lý Danh mục (`/frontend/src/features/catalog`)
*   [frontend/src/features/catalog/api/catalogApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/api/catalogApi.js): Chứa các hàm gọi API liên quan đến quản lý phòng, tài sản, và người cao tuổi.
*   [frontend/src/features/catalog/components/AssetManagerTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/AssetManagerTab.jsx): Tab quản lý vật tư thiết bị trong các phòng.
*   [frontend/src/features/catalog/components/AssetManagerTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/AssetManagerTab.module.css): CSS định kiểu quản lý tài sản.
*   [frontend/src/features/catalog/components/AssetFormModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/AssetFormModal.jsx): Form popup thêm mới/chỉnh sửa thông tin thiết bị, mã tài sản và phòng bàn giao.
*   [frontend/src/features/catalog/components/AssetFormModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/AssetFormModal.module.css): CSS cho form thiết bị.
*   [frontend/src/features/catalog/components/ElderManagerTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/ElderManagerTab.jsx): Tab hiển thị và quản lý hồ sơ người cao tuổi sống tại viện dưỡng lão.
*   [frontend/src/features/catalog/components/ElderManagerTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/ElderManagerTab.module.css): CSS định kiểu quản lý người già.
*   [frontend/src/features/catalog/components/ElderFormModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/ElderFormModal.jsx): Form popup điền thông tin người cao tuổi (ảnh thẻ, thông tin hành chính, bệnh nền, thông tin liên lạc người thân).
*   [frontend/src/features/catalog/components/ElderFormModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/ElderFormModal.module.css): CSS định kiểu form người già.
*   [frontend/src/features/catalog/components/RoomManagerTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/RoomManagerTab.jsx): Tab hiển thị và quản lý các phòng ở của viện dưỡng lão.
*   [frontend/src/features/catalog/components/RoomManagerTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/RoomManagerTab.module.css): CSS định kiểu quản lý phòng.
*   [frontend/src/features/catalog/components/RoomFormModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/RoomFormModal.jsx): Form popup thêm mới hoặc sửa thông tin số phòng, phân khu trực thuộc và ghi chú về phòng.
*   [frontend/src/features/catalog/components/RoomFormModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/components/RoomFormModal.module.css): CSS định kiểu form phòng.
*   [frontend/src/features/catalog/pages/CatalogPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/pages/CatalogPage.jsx): Trang danh mục chứa cấu trúc 3 tab chính: quản lý phòng, tài sản và người cao tuổi.
*   [frontend/src/features/catalog/pages/CatalogPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/catalog/pages/CatalogPage.module.css): CSS định kiểu cho trang Catalog.

#### 📊 Module Dashboard & Thống kê (`/frontend/src/features/dashboard`)
*   [frontend/src/features/dashboard/api/dashboardApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/api/dashboardApi.js): Cung cấp các hàm gọi API tổng hợp dữ liệu thống kê, biểu đồ sinh hiệu, log và ca trực.
*   [frontend/src/features/dashboard/components/OverviewTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/OverviewTab.jsx): Tab tổng quan hiển thị các khối số liệu thống kê trực quan và biểu đồ tăng trưởng số ca tuần tra/lỗi thiết bị.
*   [frontend/src/features/dashboard/components/Overviewtab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/Overviewtab.module.css): CSS định kiểu cho trang tổng quan (Overview).
*   [frontend/src/features/dashboard/components/RoomMatrixTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/RoomMatrixTab.jsx): Sơ đồ ma trận các phòng hiển thị trực quan trạng thái phòng (Bình thường, có sự cố, có người già sinh hiệu bất thường...).
*   [frontend/src/features/dashboard/components/RoomMatrixTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/RoomMatrixTab.module.css): CSS định kiểu sơ đồ ma trận phòng.
*   [frontend/src/features/dashboard/components/ShiftHistoryTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/ShiftHistoryTab.jsx): Tab hiển thị lịch sử phân công và các bản báo cáo bàn giao ca trực có chữ ký số của nhân viên và điều phối viên.
*   [frontend/src/features/dashboard/components/ShiftHistoryTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/ShiftHistoryTab.module.css): CSS định kiểu báo cáo ca trực.
*   [frontend/src/features/dashboard/components/SecurityLogsTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/SecurityLogsTab.jsx): Tab kiểm tra lịch sử nhật ký đăng nhập của tất cả nhân viên.
*   [frontend/src/features/dashboard/components/SecurityLogsTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/SecurityLogsTab.module.css): CSS định kiểu cho logs đăng nhập.
*   [frontend/src/features/dashboard/components/GlobalHistoryTab.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/GlobalHistoryTab.jsx): Nhật ký tổng hợp tiến trình kiểm định tài sản, thiết bị.
*   [frontend/src/features/dashboard/components/GlobalHistoryTab.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/GlobalHistoryTab.module.css): CSS định kiểu nhật ký chung.
*   [frontend/src/features/dashboard/components/AuditGalleryModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/AuditGalleryModal.jsx): Hộp thoại thư viện trưng bày hình ảnh chứng cứ hư hỏng thiết bị hoặc tuần tra bất thường được chụp bởi nhân viên.
*   [frontend/src/features/dashboard/components/AuditGalleryModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/components/AuditGalleryModal.module.css): CSS định kiểu thư viện ảnh.
*   [frontend/src/features/dashboard/pages/DashboardPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/pages/DashboardPage.jsx): Trang Dashboard chính tích hợp toàn bộ các tab con: Tổng quan, sơ đồ ma trận phòng, lịch sử ca trực và log bảo mật.
*   [frontend/src/features/dashboard/pages/DashboardPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/dashboard/pages/DashboardPage.module.css): CSS định kiểu cho trang Dashboard.

#### 🚶‍♂️ Module Tuần tra & Ghi nhận Sức khỏe (`/frontend/src/features/patrol`)
*   [frontend/src/features/patrol/api/patrolApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/api/patrolApi.js): Gọi API phục vụ nhân viên đi tuần phòng, đo sinh hiệu người già, cập nhật tình trạng thiết bị.
*   [frontend/src/features/patrol/hooks/useBackgroundQueue.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/hooks/useBackgroundQueue.js): Custom hook thiết lập chế độ làm việc offline (ngoại tuyến). Nếu thiết bị mất mạng khi đi tuần tra, báo cáo sẽ lưu vào hàng đợi của trình duyệt và tự động gửi đồng bộ lên server khi có mạng trở lại.
*   [frontend/src/features/patrol/utils/patrolHelpers.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/utils/patrolHelpers.js): Các hàm bổ trợ xử lý dữ liệu và định dạng biểu mẫu tuần tra.
*   [frontend/src/features/patrol/utils/theme.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/utils/theme.js): Định nghĩa màu sắc hiển thị riêng cho phân hệ giao diện tuần tra di động.
*   [frontend/src/features/patrol/components/AssetItemCard.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/AssetItemCard.jsx): Thẻ hiển thị một trang thiết bị trong phòng giúp nhân viên tick chọn trạng thái (Bình thường/Hỏng) kèm nút tải ảnh chứng minh.
*   [frontend/src/features/patrol/components/AssetItemCard.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/AssetItemCard.module.css): CSS định kiểu thẻ vật tư tuần tra.
*   [frontend/src/features/patrol/components/ElderSection.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ElderSection.jsx): Vùng giao diện hiển thị danh sách người già trong phòng để nhập nhanh các chỉ số sinh hiệu (Huyết áp, nhịp tim, nhiệt độ, SPO2).
*   [frontend/src/features/patrol/components/ElderSection.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ElderSection.module.css): CSS định kiểu phần người cao tuổi.
*   [frontend/src/features/patrol/components/PatrolHeader.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/PatrolHeader.jsx): Thanh tiêu đề thông tin ca trực của nhân viên khi đi tuần tra.
*   [frontend/src/features/patrol/components/PatrolHeader.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/PatrolHeader.module.css): CSS định kiểu cho Patrol Header.
*   [frontend/src/features/patrol/components/ProgressSection.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ProgressSection.jsx): Hiển thị phần trăm tiến độ đã kiểm tra các phòng trong ca trực hiện tại.
*   [frontend/src/features/patrol/components/ProgressSection.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ProgressSection.module.css): CSS định kiểu phần trăm tiến độ.
*   [frontend/src/features/patrol/components/SearchBar.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/SearchBar.jsx): Thanh tìm kiếm phòng cần tuần tra nhanh chóng.
*   [frontend/src/features/patrol/components/SearchBar.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/SearchBar.module.css): CSS định kiểu cho thanh search.
*   [frontend/src/features/patrol/components/ImagePreviewModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ImagePreviewModal.jsx): Hộp thoại xem trước ảnh chụp kiểm định tài sản tuần tra.
*   [frontend/src/features/patrol/components/ImagePreviewModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/ImagePreviewModal.module.css): CSS định kiểu cho modal xem ảnh.
*   [frontend/src/features/patrol/components/MissingReportModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/MissingReportModal.jsx): Hộp thoại ghi nhận khi nhân viên đi kiểm tra và phát hiện bị mất mát thiết bị.
*   [frontend/src/features/patrol/components/MissingReportModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/components/MissingReportModal.module.css): CSS định kiểu báo mất thiết bị.
*   [frontend/src/features/patrol/pages/RoomListPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/RoomListPage.jsx): Trang chính hiển thị danh sách các phòng và trạng thái tuần tra (Chưa kiểm tra, Đang kiểm tra, Đã hoàn thành) trong ca.
*   [frontend/src/features/patrol/pages/RoomListPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/RoomListPage.module.css): CSS định kiểu trang danh sách phòng tuần tra.
*   [frontend/src/features/patrol/pages/PatrolSessionPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/PatrolSessionPage.jsx): Trang thực thi tuần tra một phòng cụ thể. Nhân viên cập nhật thông tin thiết bị phòng đó và đo chỉ số sinh hiệu cho người cao tuổi đang cư trú.
*   [frontend/src/features/patrol/pages/PatrolSessionPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/PatrolSessionPage.module.css): CSS định kiểu trang phiên tuần tra phòng.
*   [frontend/src/features/patrol/pages/PatrolHistoryPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/PatrolHistoryPage.jsx): Trang hiển thị nhật ký lịch sử các ca tuần tra phòng trước đây.
*   [frontend/src/features/patrol/pages/PatrolHistoryPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/patrol/pages/PatrolHistoryPage.module.css): CSS định kiểu cho trang lịch sử tuần tra.

#### ⚙️ Module Thiết lập Hệ thống (`/frontend/src/features/settings`)
*   [frontend/src/features/settings/api/settingsApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/settings/api/settingsApi.js): Gọi API cập nhật cấu hình giờ giấc ca trực và lọc IP.
*   [frontend/src/features/settings/pages/SystemSettingsPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/settings/pages/SystemSettingsPage.jsx): Trang quản lý cấu hình hệ thống (Thay đổi khung thời gian ca trực sáng/tối chuẩn, quản lý bật/tắt danh sách IP được cho phép đăng nhập).
*   [frontend/src/features/settings/pages/SystemSettingsPage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/settings/pages/SystemSettingsPage.module.css): CSS định kiểu cho trang cấu hình hệ thống.

#### 💾 Module Sao lưu & Phục hồi (`/frontend/src/features/backup`)
*   [frontend/src/features/backup/api/backupApi.js](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/api/backupApi.js): Gọi API phục vụ tạo mới bản sao lưu, khôi phục hệ thống hoặc xóa các bản sao lưu đã cũ.
*   [frontend/src/features/backup/components/BackupList.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/BackupList.jsx): Component hiển thị bảng danh sách các bản backup SQL (ngày tạo, dung lượng, trạng thái lưu Drive) kèm nút tải xuống/phục hồi nhanh.
*   [frontend/src/features/backup/components/Backuplist.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/Backuplist.module.css): CSS định kiểu danh sách file backup.
*   [frontend/src/features/backup/components/DangerZoneCard.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/DangerZoneCard.jsx): Thẻ hiển thị các chức năng nhạy cảm có nguy cơ mất mát dữ liệu (xóa toàn bộ, phục hồi từ file).
*   [frontend/src/features/backup/components/DangerZoneCard.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/DangerZoneCard.module.css): CSS định kiểu vùng Danger Zone.
*   [frontend/src/features/backup/components/RestoreModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/RestoreModal.jsx): Hộp thoại popup yêu cầu người dùng xác nhận khôi phục DB (cần nhập mật khẩu Admin để xác thực độ an toàn).
*   [frontend/src/features/backup/components/RestoreModal.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/RestoreModal.module.css): CSS định kiểu cho modal restore.
*   [frontend/src/features/backup/components/RestoreUploadModal.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/components/RestoreUploadModal.jsx): Hộp thoại cho phép người dùng kéo thả file SQL sao lưu bên ngoài máy tính lên để khôi phục cơ sở dữ liệu hệ thống.
*   [frontend/src/features/backup/pages/BackupPage.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/pages/BackupPage.jsx): Trang chính quản lý tính năng sao lưu dữ liệu, tích hợp danh sách file sao lưu và Danger Zone.
*   [frontend/src/features/backup/pages/Backuppage.module.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/features/backup/pages/Backuppage.module.css): CSS định kiểu bố cục trang backup.

---

### 5. Các File Cấu hình và Chạy ứng dụng (`/frontend/src/` gốc)

*   [frontend/src/main.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/main.jsx): Điểm khởi chạy của React app, liên kết ứng dụng với phần tử `#root` trong file HTML và bọc ứng dụng trong chế độ StrictMode của React.
*   [frontend/src/App.jsx](file:///d:/Tai/Projects/Taman-Web/frontend/src/App.jsx): Component gốc điều phối toàn bộ đường dẫn định tuyến (Routing) của ứng dụng bằng `react-router-dom`, đồng thời tích hợp `AuthContext` và quản lý phân luồng giao diện giữa Layout của Admin và Layout của nhân viên.
*   [frontend/src/App.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/App.css): Định nghĩa một số kiểu dáng bố cục cơ bản của ứng dụng.
*   [frontend/src/index.css](file:///d:/Tai/Projects/Taman-Web/frontend/src/index.css): File CSS nền tảng chứa cấu trúc thiết lập thiết kế chung (Design Tokens), định nghĩa các biến màu sắc (CSS Variables HSL), phông chữ toàn cục (Inter/Outfit), định dạng cho thanh cuộn và các hiệu ứng chuyển đổi mượt mà.
