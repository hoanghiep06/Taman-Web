-- Active: 1781062898840@@127.0.0.1@5432@postgres
-- ==========================================
-- 1. BẢNG USERS & BẢNG LOGS (BẢO MẬT & TRUY VẾT)
-- ==========================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Đã đổi từ pin_code_hash sang password_hash
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff')),
    is_active BOOLEAN DEFAULT TRUE,      -- Khóa/Mở tài khoản ngay lập tức
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45) NOT NULL,     -- Lưu IP Public để đối chiếu nội bộ Tâm An
    user_agent TEXT                      -- Lưu thông tin thiết bị/trình duyệt
);

-- ==========================================
-- 2. BẢNG ROOMS, ELDERS & ASSETS (QUẢN LÝ THỰC THỂ)
-- ==========================================

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE elders (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(150) NOT NULL,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    elder_id INT REFERENCES elders(id) ON DELETE SET NULL, 
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. BẢNG SHIFTS & INSPECTION LOGS (NGHIỆP VỤ KIỂM KÊ)
-- ==========================================

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('Sang', 'Toi')),
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (shift_date, shift_type) -- Đảm bảo 1 ngày chỉ có 1 ca Sáng, 1 ca Tối
);

CREATE TABLE inspection_logs (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Xanh', 'Vang')), 
    image_url TEXT,                         -- Ảnh tải lên Google Drive
    note TEXT,                              -- Ghi chú bắt buộc khi báo Mất (Vàng)
    version INT DEFAULT 1,                  -- Quản lý số lần chụp lại
    is_latest BOOLEAN DEFAULT TRUE,         -- Đánh dấu bản mới nhất để hiển thị
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. TẠO INDEXES (TỐI ƯU HIỆU NĂNG)
-- ==========================================

-- Tối ưu khi query dữ liệu bản ghi mới nhất trong 1 ca trực để load lên app nhanh
CREATE INDEX idx_inspection_logs_latest ON inspection_logs (shift_id, asset_id) WHERE is_latest = TRUE;

-- Tối ưu load danh sách đồ đạc theo phòng
CREATE INDEX idx_assets_room ON assets (room_id);

-- Tối ưu truy vấn lịch sử đăng nhập khi có sự cố spam
CREATE INDEX idx_login_logs_user_time ON login_logs (user_id, login_time DESC);


-- BẢNG LƯU TRỮ BÁO CÁO CHỐT CA & SỰ CỐ ĐỒ ĐẠC (PHỤC VỤ DASHBOARD & GMAIL)
CREATE TABLE shift_summaries (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id) ON DELETE CASCADE UNIQUE,
    total_assets INT NOT NULL,            -- Tổng số tài sản hoạt động lúc chốt ca
    inspected_count INT NOT NULL,         -- Số lượng đã kiểm kê thực tế (Xanh + Vàng)

    -- Thống kê phục vụ hiển thị nhanh trên Dashboard %
    missing_count INT NOT NULL,           -- Số lượng tài sản bị bỏ sót (Chưa kiểm)
    lost_count INT NOT NULL,              -- Số lượng tài sản bị báo mất (Màu Vàng)


    -- Lưu trữ Snapshot danh sách ID tài sản để phục vụ truy vết lịch sử cố định
    missing_asset_ids INT[] DEFAULT '{}', -- Mảng chứa ID các tài sản bị bỏ sót
    lost_asset_ids INT[] DEFAULT '{}',    -- Mảng chứa ID các tài sản bị báo mất
    
    -- Trạng thái kiểm soát luồng gửi tin
    is_email_sent BOOLEAN DEFAULT FALSE,  -- Đánh dấu đã bắn mail cảnh báo về Gmail chưa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo Index để Admin load lịch sử Dashboard theo thời gian nhanh nhất
CREATE INDEX idx_shift_summaries_created ON shift_summaries (created_at DESC);


CREATE TABLE shift_settings (
    id INT PRIMARY KEY DEFAULT 1,
    morning_start VARCHAR(5) NOT NULL,
    morning_end VARCHAR(5) NOT NULL,
    evening_start VARCHAR(5) NOT NULL,
    evening_end VARCHAR(5) NOT NULL
);

ALTER TABLE inspection_logs DROP CONSTRAINT IF EXISTS inspection_logs_status_check;

ALTER TABLE inspection_logs ADD CONSTRAINT inspection_logs_status_check 
CHECK (status IN ('Xanh', 'Vang', 'Dang_Xu_Ly', 'Loi_Upload'));