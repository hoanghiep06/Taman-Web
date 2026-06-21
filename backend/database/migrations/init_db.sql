-- =========================================================================
-- HỆ THỐNG QUẢN TRỊ TOÀN VẸN CƠ SỞ DỮ LIỆU SẢN XUẤT - VIỆN DƯỠNG LÃO TÂM AN
-- Khởi tạo Schema sạch, ràng buộc khóa ngoại chặt chẽ và tối ưu hóa hiệu năng
-- =========================================================================

-- Tự động dọn sạch cấu trúc cũ nếu tồn tại khi chạy độc lập
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.shift_settings CASCADE;
DROP TABLE IF EXISTS public.shift_summaries CASCADE;
DROP TABLE IF EXISTS public.inspection_logs CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.elders CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.nonces CASCADE;
DROP TABLE IF EXISTS public.login_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =========================================================================
-- PHÂN HỆ 1: BẢO MẬT, TÀI KHOẢN VÀ TRUY VẾT HỆ THỐNG
-- =========================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff')),
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT
);

CREATE TABLE nonces (
    id VARCHAR(36) PRIMARY KEY, -- ĐỒNG BỘ: Chuyển sang String(36) lưu UUID từ Python
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =========================================================================
-- PHÂN HỆ 2: QUẢN LÝ THỰC THỂ (PHÒNG ỐC, CỤ GIÀ & DANH MỤC VẬT TƯ)
-- =========================================================================

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

-- =========================================================================
-- PHÂN HỆ 3: NGHIỆP VỤ CA TRỰC, TUẦN TRA ĐI TUẦN VÀ CHỐT SỐ LIỆU ĐỐI SOÁT
-- =========================================================================

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('Sang', 'Toi')),
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Submitted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (shift_date, shift_type)
);

CREATE TABLE inspection_logs (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    nonce_id VARCHAR(36) REFERENCES nonces(id) ON DELETE SET NULL, -- ĐỒNG BỘ: Kiểu chuỗi UUID giống model
    status VARCHAR(20) NOT NULL CHECK (status IN ('Xanh', 'Vang', 'Dang_Xu_Ly', 'Loi_Upload')),
    image_url TEXT,
    note TEXT,
    version INT DEFAULT 1,
    is_latest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_summaries (
    id SERIAL PRIMARY KEY,
    shift_id INT REFERENCES shifts(id) ON DELETE CASCADE UNIQUE,
    total_assets INT NOT NULL,
    inspected_count INT NOT NULL,
    missing_count INT NOT NULL,
    lost_count INT NOT NULL,
    missing_asset_ids INT[] DEFAULT '{}',
    lost_asset_ids INT[] DEFAULT '{}',
    is_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE shift_settings (
    id INT PRIMARY KEY DEFAULT 1,
    morning_start VARCHAR(5) NOT NULL,
    morning_end VARCHAR(5) NOT NULL,
    evening_start VARCHAR(5) NOT NULL,
    evening_end VARCHAR(5) NOT NULL
);

-- BỔ SUNG: Khởi tạo cấu trúc bảng Nhật ký bất biến (Audit Logs) hoàn chỉnh
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload TEXT
);

-- =========================================================================
-- PHÂN HỆ 4: TẠO CÁC CHỈ MỤC INDEXES ĐỂ TỐI ƯU HÓA TRA CỨU TỐC ĐỘ CAO
-- =========================================================================

CREATE INDEX idx_inspection_logs_latest ON inspection_logs (shift_id, asset_id) WHERE is_latest = TRUE;
CREATE INDEX idx_assets_room ON assets (room_id);
CREATE INDEX idx_shift_summaries_created ON shift_summaries (created_at DESC);

-- =========================================================================
-- PHÂN HỆ 5: KHỞI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN TỐI CAO (ADMIN) GỐC KHI DEPLOY
-- Chú ý - Ten dang nhap la admin / Mat khau khoi tao la 123456
-- =========================================================================

INSERT INTO users (
    username, 
    password_hash, 
    full_name, 
    role, 
    is_active, 
    must_change_password, 
    created_at, 
    updated_at
)
VALUES (
    'admin', 
    '$2b$12$6Nl7bV6gC5G7QvIOnm.TneY26u70vSgM0qE8C/b/mU7uGgEby7bfe', 
    'Quản Trị Viên Hệ Thống', 
    'Admin', 
    TRUE, 
    TRUE, 
    NOW(), 
    NOW()
) 
ON CONFLICT (username) DO NOTHING;