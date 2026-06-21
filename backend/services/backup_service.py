# services/backup_service.py
import subprocess
import os
import logging
from urllib.parse import urlparse
from core.config import settings

# Các bảng KHÔNG cần backup DỮ LIỆU trong bản backup phục hồi thảm họa (disaster recovery):
# - nonces: bảng chống replay-attack, sống vài phút rồi tự dọn -> backup data là vô nghĩa
# - login_logs: log đăng nhập, không phải dữ liệu nghiệp vụ cốt lõi (tài sản/cụ già/ca trực)
# Tên bảng PHẢI khớp chính xác với tên bảng thật trong DB (SQLAlchemy tự pluralize tên class
# Python, vd model "Nonce" -> bảng "nonces"), nếu sai tên thì --exclude-table-data lặng lẽ
# không có tác dụng gì (pg_dump không báo lỗi khi pattern không khớp bảng nào).
# CHỈ bỏ DATA, vẫn giữ nguyên SCHEMA (cấu trúc bảng) để khi restore lên server/DB mới hoàn
# toàn trống, app không bị lỗi "table does not exist" ngay khi khởi động.
EXCLUDE_DATA_TABLES = ["nonces", "login_logs"]

# Timeout an toàn cho thao tác dump/restore (giây) -> tránh treo worker vĩnh viễn
# nếu kết nối DB gặp sự cố giữa chừng.
DB_OPERATION_TIMEOUT = 900  # 15 phút


def _get_db_connection_parts():
    """
    Tách chuỗi DATABASE_URL thành các thành phần riêng (host/port/user/db/password) thay vì
    truyền cả URL (chứa password) thẳng làm argument cho pg_dump/psql.
    Lý do: argument truyền trên command-line có thể bị đọc bởi BẤT KỲ ai chạy `ps aux`
    trên server trong lúc lệnh đang chạy -> lộ mật khẩu DB. Password sẽ được đẩy qua
    biến môi trường PGPASSWORD (khuyến nghị chính thức của PostgreSQL) thay vì argv.
    """
    db_url = getattr(settings, "DATABASE_URL", os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/postgres"))
    parsed = urlparse(db_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
        "dbname": (parsed.path or "/postgres").lstrip("/"),
    }


def execute_database_dump() -> bytes:
    """
    Kết xuất bản dump SQL bằng pg_dump, đã tối ưu cho mục tiêu Disaster Recovery:

    - --no-owner --no-acl: bỏ thông tin OWNER TO / GRANT gắn với role của server gốc.
      Nếu không có cờ này, restore lên server khác (có role Postgres khác tên) sẽ lỗi
      ngay từ những dòng đầu -> đúng mục tiêu "đổi server" của hệ thống.
    - --exclude-table-data: bỏ dữ liệu các bảng rác/không cốt lõi (xem EXCLUDE_DATA_TABLES),
      bản backup nhẹ hơn, dump/restore nhanh hơn, nhưng vẫn giữ schema đầy đủ.
    - Mật khẩu DB đẩy qua PGPASSWORD, không xuất hiện trên command-line.
    """
    parts = _get_db_connection_parts()
    env = os.environ.copy()
    env["PGPASSWORD"] = parts["password"]

    cmd = [
        "pg_dump",
        "-h", parts["host"], "-p", parts["port"],
        "-U", parts["user"], "-d", parts["dbname"],
        "-F", "p", "--clean", "--if-exists",
        "--no-owner", "--no-acl",
    ]
    for table in EXCLUDE_DATA_TABLES:
        cmd.append(f"--exclude-table-data={table}")

    try:
        process = subprocess.run(
            cmd, capture_output=True, text=False, env=env, timeout=DB_OPERATION_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        raise Exception(f"Lệnh pg_dump bị timeout sau {DB_OPERATION_TIMEOUT}s (DB quá lớn hoặc mất kết nối).")

    if process.returncode != 0:
        error_msg = process.stderr.decode('utf-8', errors='ignore')
        raise Exception(f"Lệnh pg_dump thất bại từ hệ thống: {error_msg}")

    return process.stdout


def execute_database_restore(sql_bytes: bytes) -> bool:
    """
    Nạp luồng dữ liệu thô SQL ngược trở lại Database thông qua psql.

    - --set ON_ERROR_STOP=1 + -1 (--single-transaction): toàn bộ script DROP/CREATE/INSERT
      chạy trong DUY NHẤT 1 transaction. Nếu BẤT KỲ câu lệnh nào lỗi giữa chừng, Postgres
      tự động ROLLBACK toàn bộ -> DB giữ nguyên trạng thái TRƯỚC khi restore, không bao giờ
      bị kẹt ở trạng thái "nửa khôi phục" (vừa thiếu bảng vừa thiếu data).
    - Mật khẩu DB cũng đẩy qua PGPASSWORD, không lộ trên command-line.
    """
    parts = _get_db_connection_parts()
    env = os.environ.copy()
    env["PGPASSWORD"] = parts["password"]

    cmd = [
        "psql",
        "-h", parts["host"], "-p", parts["port"],
        "-U", parts["user"], "-d", parts["dbname"],
        "--set", "ON_ERROR_STOP=1",
        "-1",
    ]

    try:
        process = subprocess.run(
            cmd, input=sql_bytes, capture_output=True, env=env, timeout=DB_OPERATION_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        raise Exception(f"Lệnh psql khôi phục bị timeout sau {DB_OPERATION_TIMEOUT}s.")

    if process.returncode != 0:
        error_msg = process.stderr.decode('utf-8', errors='ignore')
        raise Exception(
            f"Lệnh psql khôi phục dữ liệu thất bại (đã tự động ROLLBACK, "
            f"DB vẫn giữ nguyên trạng thái trước khi restore): {error_msg}"
        )

    return True