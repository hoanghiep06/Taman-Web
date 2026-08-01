# ==========================================
# 1. NGƯỠNG BÁO ĐỘNG SINH HIỆU (VITAL SIGNS THRESHOLDS)
# ==========================================
VITAL_LIMITS = {
    "SPO2_WARNING": 95.0,           # SPO2 dưới 95% là bất thường
    "BP_SYSTOLIC_HIGH": 150,        # Huyết áp tâm thu cao > 150
    "BP_DIASTOLIC_HIGH": 90,        # Huyết áp tâm trương cao > 90
    "BP_SYSTOLIC_LOW": 90,          # Huyết áp tâm thu thấp < 90
    "BP_DIASTOLIC_LOW": 60,         # Huyết áp tâm trương thấp < 60
    "TEMP_FEVER": 37.5,             # Sốt nhẹ
    "TEMP_ALARM": 38.5,             # Sốt cao báo động khẩn cấp
    "PULSE_FAST": 100,              # Mạch nhanh > 100 lần/phút
    "PULSE_SLOW": 60,               # Mạch chậm < 60 lần/phút
}

# Cấu hình giờ giấc mặc định ban đầu cho ca Sáng và ca Tối
DEFAULT_SHIFT_SETTINGS = {
    "morning_start": "04:00",
    "morning_end": "13:00",
    "evening_start": "14:00",
    "evening_end": "23:00"
}


# ==========================================
# 3. NGHỆP VỤ ĐI TUẦN & NONCE
# ==========================================
NONCE_EXPIRE_SECONDS = 300          # Mã Nonce checkout phòng hết hạn trong 5 phút
MAX_INSPECTION_HISTORY_LIMIT = 150  # Giới hạn số record lịch sử trả về tối đa

# CẤU HÌNH WORKER
MAX_RETRY = 3      # Số lần gửi lại tối đa khi bị lỗi 
DELAY_SECONDS = 5  # Khoảng cách mỗi lần gửi

# Upload ảnh
UPLOAD_IMG_EXPIRE_TIMES: int = 5 # TTL Khi xin upload ảnh
MAX_SIZE_MB = 10 # MB
MAX_PIXEL = 120_000_000
MAXIMUM_RESOLUTION = (2048, 2048)

# Xem Ảnh Chụp (Manager)
TIME_WATCH_IMG = 15 # 15 phút xem ảnh bằng TTL
TIME_DELAY_SUBMIT = 30   # ĐỘ DELAY mỗi lần nộp (chống spam) (đơn vị giây)
DAY_OF_RESEEING = 2 # Số ngày TỐI ĐA nhân viên có thể xem lại ảnh CỦA CHÍNH MÌNH chụp

# ==========================================
# 4. QUY ƯỚC ĐẶT TÊN FILE DRIVE (FOLDER CONTRACT)
# ==========================================
FILE_NAMING_CONVENTIONS = {
    "CONTRACT_DOC": "_HopDong",
    "TEMPORARY_RESIDENCE": "_TamTru",
    "LIQUIDATION": "_ThanhLy",
    "CANCEL_RESIDENCE": "_HuyTamTru",
    "ELDER_CCCD": "_CCCD_NCT",
    "RELATIVE_CCCD": "_CCCD_NguoiNha",
}




# ==========================================
# 5. Giới hạn số lượng ngày xem lại báo cáo ca trực
# ==========================================
max_allowed_days_max = 15
max_allowed_days_for_staff = 5

