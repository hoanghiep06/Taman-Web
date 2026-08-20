import os
import re
import pytz
import logging
import io
from datetime import datetime, timedelta, date
from typing import List, Optional

from core.config import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
ROOT_FOLDER_ID = settings.GOOGLE_DRIVE_ROOT_FOLDER_ID

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
    facility_name: str, 
    shift_date: str, 
    shift_type: str, 
    room_number: str, 
    asset_names: List[str]
) -> str:
    """Đẩy ảnh kiểm kê đi tuần vào đúng thư mục Cơ sở / InspectionImage trên Cloud."""
    service = get_drive_service()

    facility_folder_id = get_or_create_folder(sanitize_filename(facility_name), ROOT_FOLDER_ID)
    inspection_base_id = get_or_create_folder("InspectionImage", facility_folder_id)

    # Đặt tên folder ngày dạng YYYYMMDD (VD: 20260814)
    date_folder_name = str(shift_date).replace("-", "")
    shift_folder_name = f"Ca_{shift_type}"
    room_folder_name = f"Phong_{room_number}"
    
    date_folder_id = get_or_create_folder(date_folder_name, inspection_base_id)
    shift_folder_id = get_or_create_folder(shift_folder_name, date_folder_id)
    room_folder_id = get_or_create_folder(room_folder_name, shift_folder_id)

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
# 2. TẢI ẢNH TOA THUỐC & FILE BACKUP
# =========================================================================
def upload_prescription_to_drive(file_bytes: bytes, facility_name: str, elder_name: str) -> str:
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
    service = get_drive_service()
    tmp_base_id = get_or_create_folder("tmp", ROOT_FOLDER_ID)
    
    file_metadata = {'name': filename, 'parents': [tmp_base_id]}
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes), 
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        resumable=True
    )
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')


# =========================================================================
# 3. 🌟 DỌN DẸP TỰ ĐỘNG CHUẨN XÁC (PARSE TRỰC TIẾP TÊN THƯ MỤC YYYYMMDD)
# =========================================================================
def cleanup_old_drive_folders(days: int = 7):
    """
    CRONJOB DỌN DẸP AN TOÀN TUYỆT ĐỐI:
    - Parse tên thư mục 'YYYYMMDD' thành đối tượng Date thực tế để so sánh.
    - Không phụ thuộc vào modifiedTime của Google Drive -> Triệt tiêu 100% lỗi xóa nhầm / sót rác.
    - Tự động bỏ qua các thư mục hệ thống: 'backup', 'tmp', 'Health'...
    """
    try:
        service = get_drive_service()
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        
        # Mốc ngày hết hạn (Ví dụ: Hôm nay 14/08/2026 -> Cutoff là ngày 07/08/2026)
        cutoff_date = (datetime.now(tz) - timedelta(days=days)).date()

        logging.info(f"[DRIVE CLEANUP]: Bắt đầu quét dẹp ảnh kiểm kê tạo trước ngày {cutoff_date.strftime('%Y-%m-%d')}...")

        # 1. Lấy tất cả thư mục ở Root (Bỏ qua 'backup' và 'tmp')
        facility_query = f"'{ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        facility_results = service.files().list(q=facility_query, fields="files(id, name)").execute()
        facilities = facility_results.get('files', [])

        deleted_count = 0

        for fac in facilities:
            # Bỏ qua các thư mục không phải Cơ sở
            if fac['name'] in ["backup", "tmp"]:
                continue

            # 2. Tìm TẤT CẢ các thư mục 'InspectionImage' trong Cơ sở này
            insp_query = f"name='InspectionImage' and '{fac['id']}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
            insp_results = service.files().list(q=insp_query, fields="files(id, name)").execute()
            insp_folders = insp_results.get('files', [])

            for insp_folder in insp_folders:
                insp_folder_id = insp_folder['id']

                # 3. Lấy tất cả thư mục con (các thư mục ngày dạng YYYYMMDD) trong InspectionImage
                date_folders_query = f"'{insp_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
                date_results = service.files().list(q=date_folders_query, fields="files(id, name)").execute()
                date_folders = date_results.get('files', [])

                for df in date_folders:
                    folder_name = df['name']

                    # Kiểm tra nếu tên thư mục khớp định dạng YYYYMMDD (8 chữ số)
                    if len(folder_name) == 8 and folder_name.isdigit():
                        try:
                            # Parse chuỗi "20260806" -> date(2026, 8, 6)
                            folder_date = datetime.strptime(folder_name, "%Y%m%d").date()

                            # So sánh trực tiếp mốc ngày
                            if folder_date < cutoff_date:
                                service.files().delete(fileId=df['id']).execute()
                                deleted_count += 1
                                logging.info(f"[DRIVE CLEANUP SUCCESS]: Đã xóa thư mục ảnh quá hạn: {fac['name']}/InspectionImage/{folder_name}")
                        except ValueError:
                            continue

        logging.info(f"[DRIVE CLEANUP COMPLETE]: Hoàn tất dọn dẹp. Tổng số thư mục ngày đã xóa: {deleted_count}")

    except Exception as e:
        logging.error(f"[DRIVE CLEANUP ERROR]: Lỗi khi dọn dẹp ảnh kiểm kê: {e}")


# =========================================================================
# 4. TRUY XUẤT & XỬ LÝ FILE PHỤ TRỢ (PUBLIC VIEW & BACKUP)
# =========================================================================
def extract_file_id_from_url(url: str) -> Optional[str]:
    """
    TRÍCH XUẤT GOOGLE DRIVE FILE ID THÔNG MINH & AN TOÀN:
    - Hỗ trợ URL dạng /d/FILE_ID/view
    - Hỗ trợ URL dạng id=FILE_ID
    - Hỗ trợ chuỗi File ID trực tiếp (không chứa http/slashes)
    """
    if not url:
        return None
    
    url_str = str(url).strip()

    # 1. Trường hợp lưu trực tiếp File ID (ví dụ: '1a2b3c4d5e6f7g...')
    if re.match(r'^[a-zA-Z0-9_-]{20,}$', url_str):
        return url_str

    # 2. Định dạng chuẩn: .../file/d/FILE_ID/view...
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url_str)
    if match:
        return match.group(1)

    # 3. Định dạng query parameter: ...?id=FILE_ID...
    match = re.search(r'id=([a-zA-Z0-9_-]+)', url_str)
    if match:
        return match.group(1)

    return None


def download_file_bytes_from_drive(file_id: str) -> bytes:
    """Tải nội dung nhị phân file từ Google Drive theo file_id."""
    service = get_drive_service()
    return service.files().get_media(fileId=file_id).execute()

def upload_db_backup_to_drive(file_bytes: bytes, filename: str) -> str:
    """Đẩy file lõi sao lưu SQL (.sql) vào thư mục /backup trên Drive."""
    service = get_drive_service()
    backup_base_id = get_or_create_folder("backup", ROOT_FOLDER_ID)
    file_metadata = {'name': filename, 'parents': [backup_base_id]}
    
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='text/plain', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')


def cleanup_old_db_backups(keep_count: int = 10):
    """Xóa các bản backup cũ vượt quá ngưỡng keep_count."""
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
            for old_file in files_to_delete:
                service.files().delete(fileId=old_file['id']).execute()
                logging.info(f"[DRIVE RETENTION]: Đã xóa bản backup cũ: {old_file['name']}")
    except Exception as e:
        logging.error(f"[DRIVE RETENTION ERROR]: {str(e)}")

def list_db_backups_from_drive():
    """Truy vấn danh sách toàn bộ các file backup (.sql) trên Drive."""
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




def upload_archive_file_to_drive(
    file_bytes: bytes, 
    filename: str, 
    facility_name: Optional[str],
    subfolder_path: List[str]
) -> str:
    """
    Tải file lưu trữ lên Drive theo cây thư mục đa cơ sở:
    ROOT -> [Tên_Cơ_Sở / System_Global] -> Archives -> [Category] -> [Year] -> filename
    """
    service = get_drive_service()
    
    # 1. Thư mục Cơ sở (Nếu không thuộc cơ sở nào thì gom vào System_Global)
    root_subfolder_name = sanitize_filename(facility_name) if facility_name else "System_Global"
    facility_folder_id = get_or_create_folder(root_subfolder_name, ROOT_FOLDER_ID)
    
    # 2. Thư mục Archives bên trong Cơ sở đó
    archives_folder_id = get_or_create_folder("Archives", facility_folder_id)
    
    # 3. Tạo các tầng con (Category: Inspection_Logs / Medical_Vitals... -> Năm)
    current_parent_id = archives_folder_id
    for folder_name in subfolder_path:
        current_parent_id = get_or_create_folder(folder_name, current_parent_id)
        
    file_metadata = {'name': filename, 'parents': [current_parent_id]}
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        resumable=True
    )
    file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
    return file.get('webViewLink')



def upload_shift_handover_report_to_drive(
    file_bytes: bytes,
    facility_name: str,
    shift_date_str: str,  # Dạng YYYY-MM-DD
    filename: str         # 'Ca_Sang.xlsx' hoặc 'Ca_Toi.xlsx'
) -> str:
    """
    Tải hoặc Cập nhật file Báo cáo giao ca lên Drive:
    - Nếu file đã tồn tại trong folder ngày -> Ghi đè nội dung (In-place Update), giữ nguyên link Drive.
    - Nếu chưa có -> Tạo mới.
    """
    service = get_drive_service()
    
    # 1. Thư mục Cơ sở
    facility_folder_id = get_or_create_folder(sanitize_filename(facility_name), ROOT_FOLDER_ID)
    
    # 2. Thư mục Bao_Cao_Giao_Ca
    handover_base_id = get_or_create_folder("Bao_Cao_Giao_Ca", facility_folder_id)
    
    # 3. Thư mục Ngày định dạng DD-MM-YYYY (VD: 20-08-2026)
    try:
        dt_obj = datetime.strptime(str(shift_date_str).strip(), "%Y-%m-%d")
        date_folder_name = dt_obj.strftime("%d-%m-%Y")
    except Exception:
        date_folder_name = str(shift_date_str)

    date_folder_id = get_or_create_folder(date_folder_name, handover_base_id)
    
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        resumable=True
    )

    # 4. Kiểm tra xem file đã tồn tại trong folder ngày chưa (chống trùng lặp)
    safe_filename = filename.replace("'", "\\'")
    query = f"name='{safe_filename}' and '{date_folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    existing_files = results.get('files', [])

    if existing_files:
        # File đã có -> Cập nhật đè nội dung lên File ID hiện tại
        existing_file_id = existing_files[0]['id']
        file = service.files().update(
            fileId=existing_file_id,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        logging.info(f"[DRIVE OVERWRITE]: Đã cập nhật đè nội dung mới cho file {filename} (ID: {existing_file_id})")
    else:
        # Chưa có -> Tạo mới
        file_metadata = {'name': filename, 'parents': [date_folder_id]}
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        logging.info(f"[DRIVE CREATE]: Đã tạo file mới {filename}")

    return file.get('webViewLink')