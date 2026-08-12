# Module Dashboard - Thống kê đa quyền (Role-based)

Dưới đây là sơ đồ cấu trúc thư mục của module Dashboard (`frontend/src/features/dashboard`) và chức năng của từng file/thư mục:

```text
dashboard/
├── README.md                      # Tài liệu này (sơ đồ cấu trúc & mô tả chức năng các file)
├── api/
│   └── dashboardApi.js            # API client gọi các endpoints thống kê dữ liệu Dashboard từ Backend
├── components/
│   ├── Common/                    # Các component dùng chung cho nhiều vai trò
│   │   ├── DashboardHeader/
│   │   │   ├── DashboardHeader.jsx # Banner chào mừng ở đầu trang (hiển thị ca trực, tên user, ngày hiện tại)
│   │   │   └── DashboardHeader.module.css
│   │   ├── FacilityInfo/
│   │   │   ├── FacilityInfo.jsx   # Thẻ thông tin cơ sở dưỡng lão hiện tại đang làm việc
│   │   │   └── FacilityInfo.module.css
│   │   ├── Notification/
│   │   │   ├── Notification.jsx   # Component quản lý danh sách thông báo cá nhân (Facebook-like)
│   │   │   └── Notification.module.css
│   │   ├── NotificationCard/
│   │   │   ├── NotificationCard.jsx # Thẻ hiển thị từng dòng thông báo (đọc/chưa đọc, mức độ nguy hiểm)
│   │   │   └── NotificationCard.module.css
│   │   ├── ResidentSummary/
│   │   │   ├── ResidentSummary.jsx # Thẻ tóm tắt thông tin nhanh các cụ dưỡng lão (cũ)
│   │   │   └── ResidentSummary.module.css
│   │   └── cũ/                    # Các component dùng chung phiên bản cũ (không dùng)
│   ├── admin/                     # Dashboard dành cho Admin (Quản trị viên)
│   │   ├── AdminDashboard.jsx     # Component chính kết hợp các phần của Admin
│   │   ├── AdminDashboard.module.css
│   │   ├── AdminOverview/
│   │   │   ├── AdminOverview.jsx  # Card thống kê tổng số cụ, manager, doctor, caregiver, coordinator
│   │   │   └── AdminOverview.module.css
│   │   ├── RecentActivity/
│   │   │   ├── RecentActivity.jsx # Danh sách audit log các hoạt động quản trị gần đây
│   │   │   └── RecentActivity.module.css
│   │   ├── SystemAlert/
│   │   │   ├── SystemAlert.jsx    # Danh sách cảnh báo và lỗi hệ thống cần Admin xử lý
│   │   │   └── SystemAlert.module.css
│   │   └── cũ/                    # Thẻ thống kê/biểu đồ doanh thu cũ (không dùng)
│   ├── caregiver/                 # Dashboard dành cho Caregiver (Nhân viên chăm sóc)
│   │   ├── CaregiverDashboard.jsx # Component chính kết hợp các phần của Caregiver
│   │   ├── CaregiverDashboard.module.css
│   │   ├── CaregiverOverview/
│   │   │   ├── CaregiverOverview.jsx # Thẻ thống kê số lượng cụ chăm sóc, công việc, thông báo của caregiver
│   │   │   └── CaregiverOverview.module.css
│   │   ├── CurrentShift/
│   │   │   ├── CurrentShift.jsx   # Thẻ hiển thị thông tin ca trực hiện tại (Tên ca, giờ bắt đầu/kết thúc)
│   │   │   └── CurrentShift.module.css
│   │   ├── DoctorInstructions/
│   │   │   ├── DoctorInstructions.jsx # Danh sách các chỉ dẫn/y lệnh từ Bác sĩ và Manager
│   │   │   └── DoctorInstructions.module.css
│   │   └── TodayTasks/
│   │       ├── TodayTasks.jsx     # Danh sách công việc của caregiver hôm nay (Xem tất cả format chi tiết)
│   │       └── TodayTasks.module.css
│   │   └── cũ/
│   ├── coordinator/               # Dashboard dành cho Coordinator (Điều phối viên)
│   │   ├── CoordinatorDashboard.jsx # Component chính kết hợp các phần của Coordinator
│   │   ├── CoordinatorDashboard.module.css
│   │   ├── AttentionTasks/
│   │   │   ├── AttentionTasks.jsx # Các việc khẩn cấp cần coordinator phân công/xử lý gấp
│   │   │   └── AttentionTasks.module.css
│   │   ├── CoordinatorOverview/
│   │   │   ├── CoordinatorOverview.jsx # Thẻ thống kê tổng số cụ, task hôm nay, thông báo của coordinator
│   │   │   └── CoordinatorOverview.module.css
│   │   ├── TaskStatus/
│   │   │   ├── TaskStatus.jsx     # Tóm tắt trạng thái các công việc (Đang làm, Chưa làm, Quá hạn)
│   │   │   └── TaskStatus.module.css
│   │   └── TodaySchedule/
│   │       ├── TodaySchedule.jsx  # Lịch trình công việc phân bổ hôm nay (sắp xếp theo thời gian thực)
│   │       └── TodaySchedule.module.css
│   ├── doctor/                    # Dashboard dành cho Doctor (Bác sĩ)
│   │   ├── DoctorDashboard.jsx    # Component chính kết hợp các phần của Bác sĩ
│   │   ├── DoctorDashboard.module.css
│   │   ├── CaregiverReports/
│   │   │   ├── CaregiverReports.jsx # Bảng báo cáo hoạt động hàng ngày từ caregiver gửi lên bác sĩ
│   │   │   └── CaregiverReports.module.css
│   │   ├── DoctorOverview/
│   │   │   ├── DoctorOverview.jsx # Thẻ thống kê tổng cụ, cuộc hẹn, thông báo của bác sĩ
│   │   │   └── DoctorOverview.module.css
│   │   ├── PatientStatus/
│   │   │   ├── PatientStatus.jsx  # Theo dõi nhanh tình hình sức khoẻ lâm sàng của các cụ
│   │   │   └── PatientStatus.module.css
│   │   └── TodayAppointments/
│   │       ├── TodayAppointments.jsx # Danh sách lịch hẹn khám của bác sĩ hôm nay
│   │       └── TodayAppointments.module.css
│   │   └── cũ/
│   ├── manager/                   # Dashboard dành cho Manager (Quản lý viện)
│   │   ├── ManagerDashboard.jsx   # Component chính kết hợp các phần của Manager
│   │   ├── ManagerDashboard.module.css
│   │   ├── HealthcareOverview/
│   │   │   ├── HealthcareOverview.jsx # Theo dõi cảnh báo sinh hiệu bất thường (Mức độ Đỏ/Vàng)
│   │   │   └── HealthcareOverview.module.css
│   │   ├── PendingTasks/
│   │   │   ├── PendingTasks.jsx   # Trạng thái các công việc vận hành (Chưa làm, Đang làm, Quá hạn, Qua ca)
│   │   │   └── PendingTasks.module.css
│   │   ├── ResidentOverview/
│   │   │   ├── ResidentOverview.jsx # Thống kê số lượng các cụ (Nhập viện, Cần chú ý, Lịch khám)
│   │   │   └── ResidentOverview.module.css
│   │   ├── RoomOverview/
│   │   │   ├── RoomOverview.jsx   # Sơ đồ và bộ lọc danh sách phòng ở theo khu/phòng/trạng thái
│   │   │   └── RoomOverview.module.css
│   │   ├── StaffOverview/
│   │   │   ├── StaffOverview.jsx  # Danh sách nhân viên trong ca và trạng thái làm việc hôm nay
│   │   │   └── StaffOverview.module.css
│   │   └── cũ/
│   └── ui/                        # Các UI components dùng chung (primitives) cho Dashboard
│       ├── DashboardUI.jsx        # Tập hợp các nút, thẻ stat, modal overlay, trạng thái, danh sách chi tiết
│       └── DashboardUI.module.css # CSS Module định nghĩa giao diện chuẩn cho các UI components dùng chung
├── layouts/
│   ├── DashboardMobileLayout.jsx  # Bố cục giao diện dành cho màn hình di động/tablet
│   ├── DashboardMobileLayout.module.css
│   ├── DashboardWebLayout.jsx     # Bố cục giao diện dành cho màn hình lớn Desktop
│   └── DashboardWebLayout.module.css
├── mock/
│   └── dashboardMockData.js       # Dữ liệu giả lập tập trung cho tất cả vai trò trên Dashboard
└── pages/
    ├── DashboardPage.jsx          # Entry point điều hướng vai trò của người dùng để render đúng Dashboard component
    ├── DashboardPage.module.css   # CSS Module cho trang phân phối chính
    └── cũ/                        # Bản backup các trang cũ không sử dụng
```
