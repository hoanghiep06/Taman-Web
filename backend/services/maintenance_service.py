import logging
from datetime import datetime
import pytz
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from database import SessionLocal
from services.shift_service import check_and_sync_shift_jit
from services.archive_service import (
    purge_expired_nonces,
    execute_full_system_cleanup,
    _cleanup_lock,
    _last_cleanup_date
)

logger = logging.getLogger("maintenance_service")

# Biến cờ nhớ ngày đã dọn dẹp
_last_daily_archive_date = None


def run_heavy_archive_task():
    """Hàm chạy ngầm qua FastAPI BackgroundTasks."""
    try:
        execute_full_system_cleanup()
    except Exception as e:
        logger.error(f"[SERVERLESS ARCHIVE ERROR]: {str(e)}")


def run_system_maintenance_jit(db: Session, background_tasks: BackgroundTasks = None):
    """
    HÀM ĐIỀU PHỐI TỰ ĐỘNG HỢP NHẤT DÀNH CHO SERVERLESS (VERCEL):
    1. Siêu nhẹ (< 50ms): Đồng bộ ca trực live + Chốt ca cũ + Xóa Nonce rác.
    2. Nặng (Excel + Drive Archive): Đẩy vào BackgroundTasks (Chỉ chạy 1 lần/ngày).
    """
    global _last_daily_archive_date

    # =========================================================================
    # TẦNG 1: TÁC VỤ SIÊU NHẸ - CHẠY TRỰC TIẾP TRONG REQUEST
    # =========================================================================
    try:
        # 1. Đồng bộ ca trực live (JIT Sync Shift)
        check_and_sync_shift_jit(db)
        
        # 2. Quét dọn Nonces OTP/Replay Attack quá hạn 10 phút
        purge_expired_nonces(db)
    except Exception as light_err:
        db.rollback()
        logger.error(f"[JIT LIGHTWEIGHT ERROR]: {str(light_err)}")

    # =========================================================================
    # TẦNG 2: TÁC VỤ NẶNG - LƯU TRỮ DRIVE & PURGE DB (THROTTLE 1 LẦN / NGÀY)
    # =========================================================================
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    today_vn = datetime.now(tz).date()

    if _last_daily_archive_date != today_vn:
        _last_daily_archive_date = today_vn
        
        if background_tasks:
            # Chạy qua BackgroundTasks chuẩn của FastAPI (Vercel hỗ trợ)
            background_tasks.add_task(run_heavy_archive_task)
            logger.info("[MAINTENANCE]: Đã lên lịch BackgroundTasks lưu trữ Drive cho hôm nay.")