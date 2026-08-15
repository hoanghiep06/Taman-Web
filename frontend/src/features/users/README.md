# 📁 Feature: Users — Quản Lý Nhân Sự Hệ Thống

Module này chứa toàn bộ logic, giao diện và lời gọi API phục vụ cho chức năng **quản lý tài khoản nhân sự** của quản trị viên và quản lý cơ sở.

---

## 🗂️ Cấu Trúc Thư Mục

```
src/features/users/
│
├── api/
│   └── usersApi.js                  # Tập hợp các hàm gọi API quản lý user (CRUD + import Excel + xem lịch sử)
│
├── components/
│   ├── CreateUserModal.jsx          # Modal form tạo tài khoản nhân sự mới (nhập username, họ tên, mật khẩu, chức vụ)
│   ├── CreateUserModal.module.css   # Style CSS riêng cho CreateUserModal
│   ├── UserHistoryModal.jsx         # Modal xem hồ sơ hoạt động chi tiết của một nhân sự (3 tab: kiểm kê / đăng nhập / audit)
│   └── UserHistoryModal.module.css  # Style CSS riêng cho UserHistoryModal
│
└── pages/
    ├── UserManagementPage.jsx       # Trang chính quản lý nhân sự: danh sách, tìm kiếm, khóa/mở, xóa, import Excel
    └── UserManagementPage.module.css # Style CSS cho trang UserManagementPage
```

---

## 📄 Mô Tả Chi Tiết Từng File

### `api/usersApi.js`
Định nghĩa object `usersApi` chứa tất cả các hàm giao tiếp với backend qua `axiosClient`:

| Hàm | Endpoint | Mô tả |
|-----|----------|-------|
| `getAllUsers()` | `GET /admin/users` | Lấy toàn bộ danh sách tài khoản trong hệ thống |
| `createUser(userData)` | `POST /admin/users` | Tạo tài khoản nhân sự mới |
| `toggleLockUser(userId)` | `PUT /admin/users/:id/toggle-lock` | Khóa hoặc mở khóa một tài khoản |
| `deleteUser(userId)` | `DELETE /admin/users/:id` | Xóa vĩnh viễn một tài khoản |
| `importUsersExcel(file)` | `POST /admin/users/import-xlsx` | Import hàng loạt nhân sự từ file `.xlsx` |
| `getComprehensiveHistory(userId)` | `GET /admin/users/:id/comprehensive-history` | Lấy toàn bộ lịch sử hoạt động của một nhân sự |

---

### `components/CreateUserModal.jsx`
Modal hiển thị form **tạo tài khoản mới**. Nhận các props:
- `isOpen` — trạng thái hiển thị modal
- `onClose` — callback đóng modal
- `onSave(formData)` — callback gửi dữ liệu form lên trang cha
- `currentUserRole` — vai trò người dùng hiện tại (dùng để ẩn/hiện option Admin)

Các trường trong form: `username`, `full_name`, `password`, `role`.  
Chức vụ có thể chọn là **Staff**, **Manager**, hoặc **Admin** (chỉ Admin mới thấy option Admin).

---

### `components/CreateUserModal.module.css`
File CSS module đi kèm với `CreateUserModal.jsx`, định nghĩa các class: `inputGroup`, `label`, `input`, `select`, `modalActions`, `cancelBtn`, `saveBtn`.

---

### `components/UserHistoryModal.jsx`
Modal xem **hồ sơ hoạt động chi tiết** của một nhân sự, chia thành 3 tab:

| Tab | Key | Nội dung |
|-----|-----|---------|
| 📋 Lịch Trình Kiểm Kê | `inspection` | Lịch sử quét tài sản theo ca trực (trạng thái: Đã nộp ảnh / Báo mất / Lỗi Upload) |
| 🔐 Lịch Sử Đăng Nhập | `login` | Thời gian, địa chỉ IP, thiết bị/trình duyệt đăng nhập |
| ⚙️ Vết Hệ Thống (Audit) | `audit` | Các thao tác hệ thống: hành động, mã mục tiêu, payload |

Dữ liệu được fetch từ `usersApi.getComprehensiveHistory()` mỗi khi modal mở.

---

### `components/UserHistoryModal.module.css`
File CSS module đi kèm với `UserHistoryModal.jsx`, định nghĩa style cho bảng dữ liệu, badge trạng thái (`badgeSuccess`, `badgeWarning`, `badgeError`), tag ca trực, và layout tab.

---

### `pages/UserManagementPage.jsx`
**Trang trung tâm** của module Users. Chức năng bao gồm:
- Tải và hiển thị danh sách toàn bộ nhân sự dưới dạng bảng
- **Tìm kiếm** theo tên, tên đăng nhập hoặc chức vụ (filter phía client)
- **Khóa / Mở khóa** tài khoản (gọi `toggleLockUser`)
- **Xóa vĩnh viễn** tài khoản (gọi `deleteUser`)
- Mở modal **Tạo tài khoản** (`CreateUserModal`)
- Mở modal **Import Excel** (`ImportDataModal` từ shared components)
- Mở modal **Xem lịch sử** (`UserHistoryModal`)
- Phân quyền hiển thị: Manager không thể chỉnh sửa tài khoản Admin

---

### `pages/UserManagementPage.module.css`
File CSS module cho `UserManagementPage.jsx`, định nghĩa style cho: `container`, `actionBar`, `tableCard`, `table`, badge chức vụ (`roleAdmin`, `roleManager`, `roleStaff`), badge trạng thái (`statusActive`, `statusLocked`), và nhóm nút hành động (`btnGroup`, `btnHistory`, `btnLock`, `btnUnlock`, `btnDelete`).
