# services/backup_service.py
import subprocess
import os
import logging
from urllib.parse import urlparse, unquote # 🔥 ĐÃ NẠP: unquote để giải mã ký tự đặc biệt (%40 -> @)
from core.config import settings

# Các bảng KHÔNG cần backup DỮ LIỆU trong bản backup phục hồi thảm họa (disaster recovery):
EXCLUDE_DATA_TABLES = ["nonces", "login_logs"]

# Timeout an toàn cho thao tác dump/restore (giây) -> tránh treo worker vĩnh viễn
DB_OPERATION_TIMEOUT = 900  # 15 phút


def _get_db_connection_parts():
    """
    Tách chuỗi DATABASE_URL thành các thành phần riêng (host/port/user/db/password).
    Bổ sung unquote để giải mã triệt để ký tự đặc biệt của mật khẩu trước khi đưa vào CLI.
    """
    db_url = getattr(settings, "DATABASE_URL", os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/postgres"))
    parsed = urlparse(db_url)
    
    # 🔥 BỌC GIÁP CHÍ MẠNG: unquote sẽ dịch ngược %40%40 thành @@, giúp pg_dump xác thực thành công
    decoded_user = unquote(parsed.username) if parsed.username else "postgres"
    decoded_password = unquote(parsed.password) if parsed.password else ""
    
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": decoded_user,
        "password": decoded_password,
        "dbname": (parsed.path or "/postgres").lstrip("/"),
    }


def execute_database_dump() -> bytes:
    """
    Kết xuất bản dump SQL bằng pg_dump, đã tối ưu cho mục tiêu Disaster Recovery:
    """
    parts = _get_db_connection_parts()
    env = os.environ.copy()
    env["PGPASSWORD"] = parts["password"] # Mật khẩu thô đã giải mã sạch bách sẽ được nạp tại đây

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