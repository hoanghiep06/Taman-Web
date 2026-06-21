# Cấu hình giờ giấc mặc định ban đầu cho ca Sáng và ca Tối
DEFAULT_SHIFT_SETTINGS = {
    "morning_start": "04:00",
    "morning_end": "11:00",
    "evening_start": "14:00",
    "evening_end": "22:00"
}


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