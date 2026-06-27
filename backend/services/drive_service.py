# services/drive_service.py
import os
import re
import pytz
import logging
import io
from datetime import datetime, timedelta
from typing import List

from core.config import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
ROOT_FOLDER_ID = settings.GOOGLE_DRIVE_ROOT_FOLDER_ID

# Khởi tạo đối tượng Credentials tĩnh ở tầng module (Chưa gọi refresh mạng ở đây để tránh crash khởi động)
creds = Credentials(
    token=None,
    refresh_token=settings.GOOGLE_REFRESH_TOKEN,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    scopes=SCOPES
)

def get_drive_service():
    """
    Cơ chế Lazy Loading & Auto-Recovery: 
    Cấp phát và refresh kết nối động mỗi khi có yêu cầu, chống chết luồng khi mạng chập chờn.
    """
    try:
        # Nếu token hết hạn hoặc chưa kích hoạt, tiến hành làm mới tự động
        if not creds or not creds.valid:
            creds.refresh(Request())
        
        # Khởi tạo một instance service mới cho luồng chạy hiện tại
        service = build('drive', 'v3', credentials=creds)
        return service
    except Exception as e:
        logging.error(f"[DRIVE CONNECT FATAL]: Không thể làm mới token hoặc kết nối Google API: {str(e)}")
        raise Exception("Google Drive API chưa sẵn sàng.")


def sanitize_filename(name: str) -> str:
    """Thay khoảng trắng bằng gạch dưới, loại bỏ ký tự nhạy cảm và dấu nháy trong tên file."""
    name = name.replace(" ", "_")
    name = name.replace("'", "")
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    return name

def get_or_create_folder(folder_name: str, parent_id: str) -> str:
    """Tìm thư mục theo tên trong thư mục cha. Nếu chưa có thì tự động tạo mới."""
    service = get_drive_service()

    safe_name = folder_name.replace("'", "\\'")
    query = f"mimeType='application/vnd.google-apps.folder' and '{parent_id}' in parents and name='{safe_name}' and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    items = results.get('files', [])
    
    if items:
        return items[0]['id']
        
    folder_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    folder = service.files().create(body=folder_metadata, fields='id').execute()
    return folder.get('id')

def upload_image_to_drive(file_bytes: bytes, shift_date: str, shift_type: str, room_number: str, asset_names: List[str]) -> str:
    """Đẩy file lên thư mục 2TB cá nhân phân tách vào thư mục con /ProveImage."""
    service = get_drive_service()

    # 1. Định vị và khóa mục tiêu vào folder cha cố định
    PI_base_id = get_or_create_folder("ProveImage", ROOT_FOLDER_ID)

    # 2. Xây dựng cấu trúc hình cây bên trong folder
    date_folder_name = str(shift_date).replace("-", "")
    shift_folder_name = f"Ca_{shift_type}"
    room_folder_name = f"Phong_{room_number}"
    
    date_folder_id = get_or_create_folder(date_folder_name, PI_base_id)
    shift_folder_id = get_or_create_folder(shift_folder_name, date_folder_id)
    room_folder_id = get_or_create_folder(room_folder_name, shift_folder_id)

    # 3. Chuẩn hóa tên tệp
    sanitized_names = [sanitize_filename(name) for name in asset_names]
    assets_prefix = "__".join(sanitized_names)
    if len(assets_prefix) > 150:
        assets_prefix = assets_prefix[:150] + "_va_nhieu_do_khac"
    
    filename = f"{assets_prefix}_{int(datetime.now().timestamp())}.jpg"
    
    file_metadata = {
        'name': filename,
        'parents': [room_folder_id]
    }
    
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='image/jpeg', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    
    return file.get('webViewLink')

def cleanup_old_drive_folders(days: int = 7):
    """Cronjob tự động dọn dẹp ảnh cũ, CHỈ QUÉT TRONG FOLDER /ProveImage để bảo vệ tệp backup."""
    try:
        service = get_drive_service()
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        cutoff_date = datetime.now(tz) - timedelta(days=days)
        cutoff_date_str = cutoff_date.isoformat()

        PI_base_id = get_or_create_folder("ProveImage", ROOT_FOLDER_ID)
        query = f"modifiedTime < '{cutoff_date_str}' and '{PI_base_id}' in parents and trashed = false"
        logging.info(f"Bắt đầu dọn dẹp Google Drive nội bộ folder /ProveImage cũ hơn {cutoff_date_str}...")
        
        results = service.files().list(q=query, fields="files(id, name)", pageSize=100).execute()
        items = results.get('files', [])

        if not items:
            logging.info(f"Drive Cleanup: Không có thư mục rác nào cũ hơn {days} ngày trong /ProveImage.")
            return

        deleted_count = 0
        for item in items:
            service.files().delete(fileId=item['id']).execute()
            deleted_count += 1
            
        logging.info(f"Drive Cleanup: Hoàn tất xóa vĩnh viễn {deleted_count} thư mục hình ảnh cũ.")

    except Exception as e:
        logging.error(f"Lỗi khi chạy Cronjob dọn bộ nhớ Drive: {e}")

def extract_file_id_from_url(url: str) -> str | None:
    match = re.search(r'/d/([^/]+)', url)
    if match:
        return match.group(1)
    match = re.search(r'id=([^&]+)', url)
    if match:
        return match.group(1)
    return None

def download_file_bytes_from_drive(file_id: str) -> bytes:
    service = get_drive_service()
    return service.files().get_media(fileId=file_id).execute()

def upload_backup_file_to_drive(file_bytes: bytes, filename: str) -> str:
    """Đẩy file Excel hoặc báo cáo phụ trợ vào thư mục tạm /tmp trên Cloud."""
    service = get_drive_service()

    tmp_base_id = get_or_create_folder("tmp", ROOT_FOLDER_ID)
    file_metadata = {
        'name': filename,
        'parents': [tmp_base_id]
    }
    
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')

def upload_db_backup_to_drive(file_bytes: bytes, filename: str) -> str:
    """Đẩy file lõi sao lưu SQL (.sql) bảo mật vào thư mục /backup vĩnh viễn."""
    service = get_drive_service()

    backup_base_id = get_or_create_folder("backup", ROOT_FOLDER_ID)
    file_metadata = {
        'name': filename,
        'parents': [backup_base_id]
    }
    
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='text/plain', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')


def cleanup_old_db_backups(keep_count: int = 4):
    """Chính sách lưu trữ thông minh bản backup cũ."""
    try:
        service = get_drive_service()
        backup_base_id = get_or_create_folder("backup", ROOT_FOLDER_ID)
        
        query = f"'{backup_base_id}' in parents and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name, modifiedTime)",
            orderBy="modifiedTime desc",
            pageSize=100
        ).execute()
        
        files = results.get('files', [])
        
        if len(files) > keep_count:
            files_to_delete = files[keep_count:]
            logging.warning(f"[DRIVE RETENTION]: Phát hiện {len(files)} bản backup. Tiến hành giải phóng bộ nhớ...")
            
            for old_file in files_to_delete:
                service.files().delete(fileId=old_file['id']).execute()
                logging.info(f"[DRIVE RETENTION SUCCESS]: Đã xóa bản sao lưu cũ: {old_file['name']}")
        else:
            logging.info(f"[DRIVE RETENTION]: Hiện có {len(files)} bản backup, nằm trong ngưỡng an toàn.")
            
    except Exception as e:
        logging.error(f"Lỗi hệ thống khi dọn dẹp bản backup cũ trên Drive: {e}")


def list_db_backups_from_drive():
    """Truy vấn lấy danh sách toàn bộ các file backup (.sql) trên Cloud."""
    service = get_drive_service()
    backup_base_id = get_or_create_folder("backup", ROOT_FOLDER_ID)
    query = f"'{backup_base_id}' in parents and trashed = false"
    
    results = service.files().list(
        q=query,
        fields="files(id, name, size, modifiedTime)",
        orderBy="modifiedTime desc",
        pageSize=50
    ).execute()
    
    return results.get('files', [])