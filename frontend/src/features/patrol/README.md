src/features/patrol/
├── api/
│   └── patrolApi.js              # Nơi định nghĩa toàn bộ API calls (axios) nối với BE mới (Lấy phòng, lấy đồ đạc, upload ảnh, báo mất, lấy link ảnh...).
│
├── components/                     # Các UI Component dùng riêng cho nghiệp vụ đi tuần
│   ├── FacilitySelector/         
│   │   └── FacilitySelector.jsx  # (Dành cho Admin/Manager = Null) Component chọn Cơ sở (Dropdown/Tabs). Gắn chặt với việc cập nhật `facility_id` để filter phòng.
│   ├── RoomGrid/
│   │   ├── RoomGrid.jsx          # Component bọc danh sách lưới các phòng.
│   │   └── RoomCard.jsx          # Thẻ phòng (Giữ lại UI hiệu ứng nước ngập % tiến độ kiểm kê).
│   ├── AssetList/
│   │   ├── ElderSection.jsx      # Component gom nhóm danh sách đồ đạc theo từng Cụ (hoặc đồ dùng chung).
│   │   └── AssetItemCard.jsx     # Thẻ hiển thị 1 món đồ. Sẽ chứa logic phân quyền UI: NVCS thì hiện checkbox chọn/báo mất, Manager thì hiện thêm nút xem ảnh minh chứng.
│   ├── FloatingCamera/
│   │   └── FloatingActionBar.jsx # Thanh công cụ nổi ở đáy màn hình. Khi chọn nhiều đồ sẽ hiện nút "📸 Chụp ảnh ngay".
│   └── Modals/
│       ├── MissingReportModal.jsx# Modal nhập lý do khi báo mất đồ.
│       └── ImagePreviewModal.jsx # Modal hiển thị ảnh kiểm kê minh chứng (Dùng JWT token bảo mật 15 phút từ BE).
│
├── hooks/                          # Custom Hooks chứa Business Logic & Data Fetching
│   ├── usePatrolRooms.js         # Hook (React Query) fetch danh sách phòng, tự động handle tham số `facility_id` và polling tiến độ live.
│   ├── usePatrolAssets.js        # Hook fetch đồ đạc trong 1 phòng, tự động thêm param `requires_inspection_only=true`.
│   └── useBackgroundQueue.js     # Logic xử lý hàng đợi nén ảnh và upload ngầm (Background Task). Tối ưu để không làm kẹt UI khi mạng yếu.
│
├── pages/                          # Các màn hình chính (Được route trực tiếp từ App.jsx)
│   ├── RoomSelectionPage.jsx     # Trang cấp 1 (Gatekeeper). Xác định Role để hiển thị bộ lọc Cơ sở -> Render danh sách Phân khu / Phòng.
│   └── PatrolSessionPage.jsx     # Trang cấp 2 (Vào phòng). Render danh sách đồ đạc, xử lý logic gom nhóm, thao tác chụp ảnh / báo mất.
│
├── store/                          # State Management nội bộ của module
│   └── patrolStore.js            # Zustand store (hoặc Context) lưu trữ toàn cục các state như: Mảng ảnh đang upload ngầm, selectedAssetIds... giúp điều dưỡng thoát ra phòng khác ảnh vẫn up.
│
└── utils/
    ├── patrolHelpers.js          # Các hàm hỗ trợ: Gom nhóm array phẳng thành Object theo elder_id, map màu Status (Xanh, Vàng, Đỏ).
    └── imageUtils.js             # Tiện ích client-side: Resize ảnh trước khi gửi đi, check dung lượng, xoay ảnh EXIF (nếu cần).