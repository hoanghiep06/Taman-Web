backend/routes/
├── __init__.py
├── auth.py          # [1] Đăng nhập & Hồ sơ cá nhân (Chuyển từ auth.py, users.py cũ)
├── users.py         # [2] Quản lý Tài khoản (Chuyển từ admin_users.py cũ)
├── facilities.py    # [3] Quản lý Cơ sở (Facility) & Phân khu (Zone) [MỚI FOR MVP2]
├── rooms.py         # [4] Quản lý Phòng (Chuyển từ admin_rooms.py cũ)
├── elders.py        # [5] Quản lý NCT & Hồ sơ sức khỏe (Chuyển từ admin_entities.py cũ)
├── health.py        # [6] Quản lý Y tế: Sinh hiệu, Toa thuốc, Diễn biến [MỚI FOR MVP2]
├── assets.py        # [7] Quản lý Tư trang & Import Xlsx (Chuyển từ admin_entities.py cũ)
├── inspections.py   # [8] Nghiệp vụ Đi tuần, Nonce, Upload ảnh (Chuyển từ inspections.py & assets.py cũ)
├── operations.py    # [9] Vận hành: Kho, Bếp, Bảo vệ, Người thân [MỚI FOR MVP2]
├── contracts.py     # [10] Quản lý Hợp đồng & OCR Drive Folder [MỚI FOR MVP2]
├── system.py        # [11] Backup/Restore & Cấu hình ca (Chuyển từ admin_data.py, admin_settings.py cũ)
└── dashboard.py     # [12] Dashboard & Audit Logs (Chuyển từ dashboard.py cũ)