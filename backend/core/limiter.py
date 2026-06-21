from slowapi import Limiter
from slowapi.util import get_remote_address

# Khởi tạo bộ giới hạn tần suất, sử dụng IP của Client làm chìa khóa định danh (key_func)
limiter = Limiter(key_func=get_remote_address)