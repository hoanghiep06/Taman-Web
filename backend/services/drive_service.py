import os
import re
import pytz
import logging
import io
from datetime import datetime, timedelta
from typing import List, Optional

from core.config import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
ROOT_FOLDER_ID = settings.GOOGLE_DRIVE_ROOT_FOLDER_ID

# Khởi tạo đối tượng Credentials tĩnh
creds = Credentials(
    token=None,
    refresh_token=settings.GOOGLE_REFRESH_TOKEN,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    scopes=SCOPES
)

def get_drive_service():
    """Lazy Loading & Auto-Recovery kết nối Google Drive API."""
    try:
        if not creds or not creds.valid:
            creds.refresh(Request())
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logging.error(f"[DRIVE CONNECT FATAL]: Không thể làm mới token Google API: {str(e)}")
        raise Exception("Google Drive API chưa sẵn sàng.")


def sanitize_filename(name: str) -> str:
    """Loại bỏ ký tự đặc biệt, thay khoảng trắng bằng gạch dưới."""
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


# =========================================================================
# 1. TẢI ẢNH ĐI TUẦN (LƯU VÀO: Tâm An -> [Tên Cơ Sở] -> InspectionImage)
# =========================================================================
def upload_image_to_drive(
    file_bytes: bytes, 
    facility_name: str,       # VD: "Co_So_1_Thu_Duc"
    shift_date: str, 
    shift_type: str, 
    room_number: str, 
    asset_names: List[str]
) -> str:
    """Đẩy ảnh kiểm kê đi tuần vào đúng thư mục Cơ sở / InspectionImage trên Cloud."""
    service = get_drive_service()

    # 1. Định vị Thư mục Cơ sở & Thư mục InspectionImage bên trong
    facility_folder_id = get_or_create_folder(sanitize_filename(facility_name), ROOT_FOLDER_ID)
    inspection_base_id = get_or_create_folder("InspectionImage", facility_folder_id)

    # 2. Xây dựng cấu trúc cây bên trong InspectionImage (Ngày -> Ca -> Phòng)
    date_folder_name = str(shift_date).replace("-", "")
    shift_folder_name = f"Ca_{shift_type}"
    room_folder_name = f"Phong_{room_number}"
    
    date_folder_id = get_or_create_folder(date_folder_name, inspection_base_id)
    shift_folder_id = get_or_create_folder(shift_folder_name, date_folder_id)
    room_folder_id = get_or_create_folder(room_folder_name, shift_folder_id)

    # 3. Chuẩn hóa tên tệp và Upload
    sanitized_names = [sanitize_filename(name) for name in asset_names]
    assets_prefix = "__".join(sanitized_names)
    if len(assets_prefix) > 150:
        assets_prefix = assets_prefix[:150] + "_va_nhieu_do_khac"
    
    filename = f"{assets_prefix}_{int(datetime.now().timestamp())}.jpg"
    
    file_metadata = {'name': filename, 'parents': [room_folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='image/jpeg', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    
    return file.get('webViewLink')


# =========================================================================
# 2. TẢI ẢNH TOA THUỐC (LƯU VĨNH VIỄN VÀO: Tâm An -> [Tên Cơ Sở] -> Health -> Prescriptions)
# =========================================================================
def upload_prescription_to_drive(file_bytes: bytes, facility_name: str, elder_name: str) -> str:
    """Đẩy file ảnh Toa thuốc vào thư mục Cơ sở / Health / Prescriptions (KHÔNG BỊ XÓA TỰ ĐỘNG)."""
    service = get_drive_service()

    facility_folder_id = get_or_create_folder(sanitize_filename(facility_name), ROOT_FOLDER_ID)
    health_folder_id = get_or_create_folder("Health", facility_folder_id)
    prescriptions_folder_id = get_or_create_folder("Prescriptions", health_folder_id)

    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ToaThuoc_{sanitize_filename(elder_name)}_{date_str}.jpg"

    file_metadata = {'name': filename, 'parents': [prescriptions_folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='image/jpeg', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()

    return file.get('webViewLink')


def upload_backup_file_to_drive(file_bytes: bytes, filename: str) -> str:
    """
    Đẩy các file Excel lưu trữ (AuditLog, InspectionLog, LoginLog) 
    vào thư mục /tmp trên Google Drive để giải phóng bộ nhớ DB.
    """
    service = get_drive_service()

    # Tạo hoặc lấy thư mục 'tmp' ở thư mục gốc Google Drive
    tmp_base_id = get_or_create_folder("tmp", ROOT_FOLDER_ID)
    
    file_metadata = {
        'name': filename,
        'parents': [tmp_base_id]
    }
    
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes), 
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        resumable=True
    )
    
    file = service.files().create(
        body=file_metadata, 
        media_body=media, 
        fields='id, webViewLink'
    ).execute()
    
    return file.get('webViewLink')


# =========================================================================
# 3. 🔥 DỌN DẸP TỰ ĐỘNG (CHỈ XÓA TRONG /InspectionImage CỦA CÁC CƠ SỞ)
# =========================================================================
def cleanup_old_drive_folders(days: int = 7):
    """
    CRONJOB DỌN DẸP BỘ NHỚ AN TOÀN:
    - CHỈ QUÉT VÀ XÓA các thư mục con trong 'InspectionImage' cũ hơn X ngày.
    - TỰ ĐỘNG BỎ QUA toàn bộ các thư mục 'Health', 'Prescriptions', Excel, Backup, v.v.
    """
    try:
        service = get_drive_service()
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        cutoff_date = datetime.now(tz) - timedelta(days=days)
        cutoff_date_str = cutoff_date.isoformat()

        logging.info(f"[DRIVE CLEANUP]: Bắt đầu quét dẹp ảnh kiểm kê cũ hơn {days} ngày (trước {cutoff_date_str})...")

        # 1. Truy vấn lấy tất cả các thư mục con trong Root (Danh sách các Cơ sở)
        facility_query = f"'{ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        facility_results = service.files().list(q=facility_query, fields="files(id, name)").execute()
        facilities = facility_results.get('files', [])

        deleted_count = 0

        for fac in facilities:
            if fac['name'] == "backup":
                # Bỏ qua thư mục backup vĩnh viễn ở gốc
                continue

            # 2. Tìm thư mục 'InspectionImage' bên trong Cơ sở này
            insp_query = f"name='InspectionImage' and '{fac['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
            insp_results = service.files().list(q=insp_query, fields="files(id, name)").execute()
            insp_folders = insp_results.get('files', [])

            if not insp_folders:
                continue

            insp_folder_id = insp_folders[0]['id']

            # 3. Tìm các thư mục ngày (YYYYMMDD) bên trong InspectionImage cũ hơn cutoff_date
            old_folders_query = f"modifiedTime < '{cutoff_date_str}' and '{insp_folder_id}' in parents and trashed=false"
            old_results = service.files().list(q=old_folders_query, fields="files(id, name)").execute()
            old_items = old_results.get('files', [])

            for item in old_items:
                service.files().delete(fileId=item['id']).execute()
                deleted_count += 1
                logging.info(f"[DRIVE CLEANUP SUCCESS]: Đã xóa thư mục ảnh kiểm kê cũ: {fac['name']}/InspectionImage/{item['name']}")

        logging.info(f"[DRIVE CLEANUP COMPLETE]: Hoàn tất. Tổng số thư mục InspectionImage đã dọn dẹp: {deleted_count}")

    except Exception as e:
        logging.error(f"[DRIVE CLEANUP ERROR]: Lỗi khi dọn dẹp ảnh kiểm kê: {e}")


# =========================================================================
# 4. TRUY XUẤT & XỬ LÝ FILE PHỤ TRỢ (PUBLIC VIEW & BACKUP)
# =========================================================================
def extract_file_id_from_url(url: str) -> Optional[str]:
    match = re.search(r'/d/([^/]+)', url)
    if match: return match.group(1)
    match = re.search(r'id=([^&]+)', url)
    if match: return match.group(1)
    return None


def download_file_bytes_from_drive(file_id: str) -> bytes:
    service = get_drive_service()
    return service.files().get_media(fileId=file_id).execute()


def upload_db_backup_to_drive(file_bytes: bytes, filename: str) -> str:
    """Đẩy file sao lưu SQL (.sql) bảo mật vào thư mục /backup vĩnh viễn ở Root."""
    service = get_drive_service()

    backup_base_id = get_or_create_folder("backup", ROOT_FOLDER_ID)
    file_metadata = {
        'name': filename,
        'parents': [backup_base_id]
    }
    
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='text/plain', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')


def cleanup_old_db_backups(keep_count: int = 10 ):
    """Chính sách giữ lại đúng N bản sao lưu Database SQL mới nhất trong thư mục /backup."""
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
            logging.warning(f"[DRIVE RETENTION]: Phát hiện {len(files)} bản backup. Tiến hành xóa các bản cũ...")
            
            for old_file in files_to_delete:
                service.files().delete(fileId=old_file['id']).execute()
                logging.info(f"[DRIVE RETENTION SUCCESS]: Đã xóa bản sao lưu SQL cũ: {old_file['name']}")
        else:
            logging.info(f"[DRIVE RETENTION]: Hiện có {len(files)} bản backup SQL, nằm trong ngưỡng an toàn.")
            
    except Exception as e:
        logging.error(f"[DRIVE RETENTION ERROR]: Lỗi dọn dẹp bản backup cũ: {e}")


def list_db_backups_from_drive():
    """Truy vấn danh sách toàn bộ file backup (.sql) trên Cloud[cite: 10]."""
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