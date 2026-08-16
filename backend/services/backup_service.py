import subprocess
import os
import logging
from urllib.parse import urlparse, unquote
from core.config import settings

# Bảng tạm thời/không cần thiết trong bản sao lưu khôi phục thảm họa
EXCLUDE_DATA_TABLES = ["nonces", "login_logs"]

# Timeout an toàn cho thao tác dump/restore (15 phút)
DB_OPERATION_TIMEOUT = 900


def _get_db_connection_parts():
    """
    Tách chuỗi DATABASE_URL thành host/port/user/db/password.
    Sử dụng unquote để giải mã ký tự đặc biệt trong mật khẩu.
    """
    db_url = getattr(settings, "DATABASE_URL", os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"))
    parsed = urlparse(db_url)
    
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
    Kết xuất toàn bộ Database ra luồng nhị phân SQL (.sql) bằng pg_dump.
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
        raise Exception(f"Lệnh pg_dump bị timeout sau {DB_OPERATION_TIMEOUT}s.")

    if process.returncode != 0:
        error_msg = process.stderr.decode('utf-8', errors='ignore')
        raise Exception(f"pg_dump thất bại: {error_msg}")

    return process.stdout


def execute_database_restore(sql_bytes: bytes) -> bool:
    """
    Nạp luồng SQL ngược trở lại Database thông qua psql.
    Tự động gỡ bỏ các chỉ thị không tương thích giữa các phiên bản Postgres.
    """
    # Khử lỗi không tương thích giữa các bản PostgreSQL mới (VD: PG17 transaction_timeout)
    if b"SET transaction_timeout = 0;" in sql_bytes:
        sql_bytes = sql_bytes.replace(
            b"SET transaction_timeout = 0;", 
            b"-- SET transaction_timeout = 0;"
        )

    parts = _get_db_connection_parts()
    env = os.environ.copy()
    env["PGPASSWORD"] = parts["password"]

    cmd = [
        "psql",
        "-h", parts["host"], "-p", parts["port"],
        "-U", parts["user"], "-d", parts["dbname"],
        "--set", "ON_ERROR_STOP=1",
        "-1", # Chạy toàn bộ trong 1 transaction an toàn (All or Nothing)
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
            f"Khôi phục thất bại (Đã tự động ROLLBACK, DB giữ nguyên trạng thái cũ): {error_msg}"
        )

    return True