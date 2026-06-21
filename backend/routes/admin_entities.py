# routes/admin_entities.py
import io
import logging
import threading
from datetime import datetime
from typing import List, Optional
from fastapi import UploadFile, File, APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from openpyxl import load_workbook
from database import get_db
from models import User, Room, Elder, Asset
from schemas import ElderCreate, ElderResponse, AssetCreate, AssetResponse
# Nạp cả get_current_user (mọi tài khoản) và get_privileged_user (chức vụ cao)
from core.dependencies import get_privileged_user, get_current_user, get_admin_user
from services.backup_service import execute_database_dump, execute_database_restore
from services.drive_service import (
    upload_db_backup_to_drive,
    download_file_bytes_from_drive,
    list_db_backups_from_drive,
    cleanup_old_db_backups,
)

logger = logging.getLogger("disaster_recovery")
# Khóa chống chạy khôi phục đồng thời: tránh 2 admin cùng bấm restore 1 lúc gây xung đột DB
_restore_lock = threading.Lock()

# ==========================================
# KHAI BÁO CÁC ROUTER RIÊNG BIỆT (GỠ BỎ DEPENDENCIES CẤP TỔNG)
# ==========================================
router_elders = APIRouter(
    prefix="/admin/elders", 
    tags=["Quản lý Người Cao Tuổi (NCT)"]
)

router_assets = APIRouter(
    prefix="/admin/assets", 
    tags=["Quản lý Tài Sản"]
)

router_backup = APIRouter(
    prefix="/admin/system/backup",
      tags=["Admin: Backup dữ liệu"])


# =========================================================================
# PHÂN HỆ NGHIỆP VỤ: QUẢN LÝ NGƯỜI CAO TUỔI (NCT)
# =========================================================================

# 1. API THÊM CỤ GIÀ MỚI (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_elders.post("", response_model=ElderResponse, status_code=status.HTTP_201_CREATED)
def create_elder(
    elder: ElderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user) # Khóa chặt chức năng ghi
):
    if elder.room_id:
        room = db.query(Room).filter(Room.id == elder.room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy phòng này")
            
    new_elder = Elder(**elder.model_dump())
    db.add(new_elder)
    db.commit()
    db.refresh(new_elder)
    return new_elder


# 2. API LẤY TOÀN BỘ DANH SÁCH CỤ GIÀ (MỞ RỘNG CHO AI CŨNG LẤY ĐƯỢC - KỂ CẢ STAFF)
@router_elders.get("", response_model=List[ElderResponse])
def get_all_elders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ĐÃ SỬA: Bất kỳ ai đăng nhập đều đọc được
):
    """
    Trả về danh sách toàn bộ các cụ trong trung tâm giúp ứng dụng di động 
    của nhân viên vẽ cấu trúc ma trận phòng ốc trực quan.
    """
    return db.query(Elder).all()


# 3. API LẤY CHI TIẾT 1 CỤ GIÀ (MỞ RỘNG CHO AI CŨNG LẤY ĐƯỢC - KỂ CẢ STAFF)
@router_elders.get("/{elder_id}", response_model=ElderResponse)
def get_elder(
    elder_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ĐÃ SỬA: Bất kỳ ai đăng nhập đều đọc được
):
    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cụ")
    return elder


# 4. API SỬA THÔNG TIN CỤ GIÀ (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_elders.put("/{elder_id}", response_model=ElderResponse)
def update_elder(
    elder_id: int, 
    elder_data: ElderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cụ")

    # Lưu lại ID phòng cũ để đối chiếu
    old_room_id = elder.room_id

    if elder_data.room_id:
        room = db.query(Room).filter(Room.id == elder_data.room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy phòng này")

    for field, value in elder_data.model_dump(exclude_unset=True).items():
        setattr(elder, field, value)

    # ──── ĐOẠN VÁ LỖI ĐỒNG BỘ: TỰ ĐỘNG DI DỜI TÀI SẢN KHI CỤ ĐỔI PHÒNG ────
    if elder.room_id != old_room_id:
        db.query(Asset).filter(Asset.elder_id == elder.id).update(
            {"room_id": elder.room_id}, 
            synchronize_session=False
        )

    db.commit()
    db.refresh(elder)
    return elder

# 5. API XÓA CỤ GIÀ (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_elders.delete("/{elder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_elder(
    elder_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user) # Khóa chặt chức năng ghi
):
    elder = db.query(Elder).filter(Elder.id == elder_id).first()
    if not elder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cụ")

    db.delete(elder)
    db.commit()


# =========================================================================
# PHÂN HỆ NGHIỆP VỤ: QUẢN LÝ DANH MỤC TÀI SẢN
# =========================================================================

# 1. API TẠO TÀI SẢN (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_assets.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset: AssetCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    asset_data = asset.model_dump()

    # ──── ĐOẠN VÁ LỖI: ÉP BUỘC ĐỒNG BỘ PHÒNG THEO CỤ GIÀ KHI TẠO MỚI ────
    if asset.elder_id:
        elder = db.query(Elder).filter(Elder.id == asset.elder_id).first()
        if not elder:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cụ già này")
        # Điền đè phòng của tài sản trùng khít với phòng của cụ quản lý
        asset_data["room_id"] = elder.room_id
        
    new_asset = Asset(**asset_data)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset


# 2. API XEM DANH SÁCH TÀI SẢN (MỞ RỘNG CHO AI CŨNG LẤY ĐƯỢC - KỂ CẢ STAFF)
@router_assets.get("", response_model=List[AssetResponse])
def get_all_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ĐÃ SỬA: Bất kỳ ai đăng nhập đều đọc được
):
    return db.query(Asset).all()


# 3. API XEM CHI TIẾT TÀI SẢN (MỞ RỘNG CHO AI CŨNG LẤY ĐƯỢC - KỂ CẢ STAFF)
@router_assets.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ĐÃ SỬA: Bất kỳ ai đăng nhập đều đọc được
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản này")
    return asset


# 4. API CẬP NHẬT TÀI SẢN (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_assets.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int, 
    asset_data: AssetCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản này")

    for field, value in asset_data.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)

    # ──── ĐOẠN VÁ LỖI: ĐỒNG BỘ PHÒNG CỦA TÀI SẢN THEO CHỦ SỞ HỮU MỚI ────
    if asset.elder_id:
        elder = db.query(Elder).filter(Elder.id == asset.elder_id).first()
        if elder:
            asset.room_id = elder.room_id

    db.commit()
    db.refresh(asset)
    return asset


# 5. API XÓA TÀI SẢN (CHỈ ADMIN/MANAGER ĐƯỢC PHÉP)
@router_assets.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user) # Khóa chặt chức năng ghi
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản này")

    db.delete(asset)
    db.commit()



@router_assets.post("/import-xlsx", status_code=status.HTTP_200_OK)
async def import_assets_from_xlsx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_privileged_user)
):
    """
    API Import danh sách vật tư theo cấu trúc Ma trận chuẩn của trung tâm Tâm An:
    - Cột A (Index 0): Số phòng (Có thể để trống nếu ở chung phòng với cụ dòng trên)
    - Cột B (Index 1): Họ và tên cụ
    - Cột C trở đi: Ô giá trị TRUE/FALSE ứng với Tên món đồ nằm ở dòng Tiêu đề 1.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Hệ thống chỉ chấp nhận file Excel định dạng .xlsx hoặc .xls"
        )

    try:
        # 1. Nạp tệp nhị phân vào bộ nhớ RAM
        file_contents = await file.read()
        wb = load_workbook(io.BytesIO(file_contents), data_only=True)
        ws = wb.active 
        
        # 2. Bóc tách danh sách tên món đồ từ Dòng tiêu đề số 1 (Header Row)
        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        headers = [str(cell).strip() if cell else "" for cell in header_row]

        processed_elders = 0
        total_assets_upserted = 0
        
        # Biến nhớ trung gian gác cổng để lưu số phòng của cụ dòng trên
        current_room_number = None

        # 3. Quét ma trận từ dòng dữ liệu số 2 trở đi
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or len(row) < 2:
                continue

            room_raw = row[0]   # Cột A: PHÒNG
            elder_raw = row[1]  # Cột B: TÊN CỤ

            # KỸ THUẬT STICKY ROOM: Nếu dòng này có số phòng mới -> Cập nhật; Nếu trống -> Thừa kế phòng dòng trên
            if room_raw is not None and str(room_raw).strip() != "":
                current_room_number = str(room_raw).strip()

            # Nếu tên cụ trống hoặc file bị lỗi không bắt được số phòng ban đầu -> Bỏ qua dòng
            if not current_room_number or elder_raw is None or str(elder_raw).strip() == "":
                continue

            elder_name = str(elder_raw).strip()

            # ──── LOGIC TẦNG 1: XỬ LÝ PHÒNG ────
            room = db.query(Room).filter(Room.room_number == current_room_number).first()
            if not room:
                room = Room(room_number=current_room_number, description=f"Phòng {current_room_number}")
                db.add(room)
                db.flush() 

            # ──── LOGIC TẦNG 2: XỬ LÝ CỤ GIÀ ────
            elder = db.query(Elder).filter(
                Elder.full_name == elder_name, 
                Elder.room_id == room.id
            ).first()
            
            if not elder:
                elder = Elder(full_name=elder_name, room_id=room.id)
                db.add(elder)
                db.flush()
            
            processed_elders += 1

            # ──── LOGIC TẦNG 3: BẢO TRÌ DỮ LIỆU CŨ (SOFT REPLACE) ────
            existing_assets = db.query(Asset).filter(Asset.elder_id == elder.id).all()
            asset_dict = {a.asset_name.lower().strip(): a for a in existing_assets}
            
            # Đưa toàn bộ trạng thái đồ đạc cũ về kho lưu trữ ẩn (Archived) để thỏa mãn Constraint
            for asset in existing_assets:
                asset.status = "Archived"

            # ──── LOGIC TẦNG 4: THUẬT TOÁN QUÉT DÀN NGANG THEO TIÊU ĐỀ ────
            # Duyệt từ cột index 2 (Cột C trở đi) ứng với các món đồ vật tư trong file
            for col_index in range(2, len(row)):
                if col_index >= len(headers):
                    break

                asset_name = headers[col_index]
                # Bỏ qua nếu cột tiêu đề bị trống hoặc vô tình trùng với cột gác cổng
                if not asset_name or asset_name in ["PHÒNG", "TÊN CỤ"]:
                    continue

                cell_val = row[col_index]
                # openpyxl tự nhận diện kiểu dữ liệu Boolean hoặc so khớp chuỗi chữ hoa "TRUE"
                is_checked = (cell_val is True) or (str(cell_val).strip().upper() == "TRUE")

                if is_checked:
                    search_key = asset_name.lower().strip()
                    
                    if search_key in asset_dict:
                        # Đồ vật đã tồn tại -> Bật kích hoạt Active trở lại
                        asset_dict[search_key].status = "Active"
                        # ĐBỔ SUNG: Đồng bộ luôn phòng mới trong trường hợp cụ đổi phòng
                        asset_dict[search_key].room_id = room.id
                    else:
                        # Món đồ mới tinh chưa từng có -> Thêm mới vào DB
                        new_asset = Asset(
                            asset_name=asset_name,
                            room_id=room.id,
                            elder_id=elder.id,
                            status="Active"
                        )
                        db.add(new_asset)
                        
                    total_assets_upserted += 1

        db.commit()

        return {
            "status": "Success",
            "message": "Đồng bộ ma trận danh mục vật tư từ file Excel thành công mỹ mãn!",
            "summary": {
                "total_elders_processed": processed_elders,
                "total_assets_active_count": total_assets_upserted
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Lỗi ma trận tệp Excel: {str(e)}"
        )
    




@router_backup.get("/list", status_code=status.HTTP_200_OK)
def get_backup_list_on_cloud(
    current_user: User = Depends(get_admin_user)
):
    """
    API đặc quyền giúp Admin xem danh sách toàn bộ các file backup hiện có trên Drive,
    bao gồm File ID, Tên file, Kích thước (bytes) và Thời gian khởi tạo để làm UI chọn file khôi phục.
    """
    try:
        backups = list_db_backups_from_drive()
        return {
            "status": "Success",
            "total_backups_found": len(backups),
            "backups": backups
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể truy vấn danh sách Cloud: {str(e)}")


@router_backup.post("/manual-run", status_code=status.HTTP_200_OK)
def trigger_manual_backup(
    current_user: User = Depends(get_admin_user)
):
    """
    API giúp Admin chủ động bấm nút "Sao lưu ngay lập tức" trước khi thực hiện các thao tác
    bảo trì hệ thống nặng, tự động đẩy lên /backup và chạy luôn bộ lọc giữ đúng 4 bản.
    """
    logger.info(f"[BACKUP] User '{current_user.username}' (id={current_user.id}) kích hoạt backup thủ công.")
    try:
        sql_bytes = execute_database_dump()
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"TamAn_Manual_DB_Backup_{timestamp_str}.sql"
        
        drive_link = upload_db_backup_to_drive(file_bytes=sql_bytes, filename=filename)
        
        # Ép dọn dẹp luôn sau khi sao lưu tay
        cleanup_old_db_backups(keep_count=4)
        
        logger.info(f"[BACKUP SUCCESS] {filename} -> {drive_link}")
        return {
            "status": "Success",
            "message": "Sao lưu thủ công cấp tốc thành công!",
            "drive_url": drive_link
        }
    except Exception as e:
        logger.error(f"[BACKUP FAILED] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router_backup.post("/restore", status_code=status.HTTP_200_OK)
def restore_database_system(
    drive_file_id: Optional[str] = Query(None, description="Truyền ID file trên Google Drive để khôi phục trực tiếp"),
    file: Optional[UploadFile] = File(None, description="Hoặc đính kèm file .sql từ máy tính cá nhân lên"),
    current_user: User = Depends(get_admin_user)
):
    """
    API CỨU HỘ TỐI CAO (Disaster Recovery):
    - Cơ chế 1: Admin truyền drive_file_id, server tự kéo file từ Google Drive về.
    - Cơ chế 2: Admin upload file cứng từ máy tính cá nhân (.sql) lên để phục hồi.

    Lớp an toàn bổ sung:
    - Khóa chống chạy đồng thời: chỉ 1 lệnh restore được thực thi tại 1 thời điểm, các
      yêu cầu khác đến trong lúc đó sẽ bị từ chối ngay (409) thay vì xếp hàng gây xung đột.
    - Tự động tạo 1 bản "snapshot an toàn" (pre-restore safety backup) của DB HIỆN TẠI và
      đẩy lên Drive TRƯỚC KHI ghi đè. Nếu không tạo được snapshot này, HỦY restore ngay lập
      tức — không liều ghi đè khi không có đường lui nếu chọn nhầm file.
    - Restore chạy trong 1 transaction duy nhất (xem backup_service.py): lỗi giữa chừng sẽ
      tự rollback toàn bộ, DB không bao giờ bị kẹt ở trạng thái nửa-khôi-phục.
    - Ghi log có actor/thời gian/nguồn file cho mọi lần restore, phục vụ truy vết sau này
      (đặc biệt quan trọng vì đây là thao tác phá hủy dữ liệu mạnh nhất trong hệ thống).
    """
    if not _restore_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Đang có một tiến trình khôi phục khác chạy, vui lòng chờ rồi thử lại."
        )

    safety_link = None
    try:
        sql_data_bytes = b""

        # Tình huống 1: Khôi phục trực tiếp bằng file ID của Google Drive
        if drive_file_id:
            logger.warning(f"[RECOVERY] User '{current_user.username}' (id={current_user.id}) khởi tạo restore từ Drive file_id='{drive_file_id}'")
            sql_data_bytes = download_file_bytes_from_drive(drive_file_id)

        # Tình huống 2: Khôi phục bằng file đính kèm nộp từ Client
        elif file:
            if not file.filename.endswith('.sql'):
                raise HTTPException(status_code=400, detail="Hệ thống chỉ chấp nhận tệp tin có định dạng .sql")
            logger.warning(f"[RECOVERY] User '{current_user.username}' (id={current_user.id}) khởi tạo restore từ file upload '{file.filename}'")
            sql_data_bytes = file.file.read()

        else:
            raise HTTPException(
                status_code=400,
                detail="Vui lòng cung cấp ít nhất một phương thức khôi phục: Truyền 'drive_file_id' hoặc Nộp tệp tin 'file'."
            )

        if not sql_data_bytes:
            raise HTTPException(status_code=400, detail="Dữ liệu file phục hồi rỗng hoặc bị lỗi.")

        # ──── BƯỚC AN TOÀN BẮT BUỘC: snapshot DB hiện tại trước khi ghi đè ────
        try:
            logger.warning("[RECOVERY] Đang tạo snapshot an toàn của DB hiện tại trước khi ghi đè...")
            safety_bytes = execute_database_dump()
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            safety_filename = f"TamAn_PreRestoreSafety_{ts}.sql"
            safety_link = upload_db_backup_to_drive(file_bytes=safety_bytes, filename=safety_filename)
            logger.warning(f"[RECOVERY] Đã lưu snapshot an toàn lên Drive: {safety_link}")
        except Exception as safety_err:
            logger.error(f"[RECOVERY ABORTED] Không tạo được snapshot an toàn nên đã HỦY restore: {safety_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Đã hủy khôi phục vì không thể tạo bản backup an toàn trước khi ghi đè: {safety_err}"
            )

        # Kích hoạt lệnh nạp ngầm nhị phân psql tái cấu trúc máy chủ (chạy trong 1 transaction)
        execute_database_restore(sql_data_bytes)

        logger.warning(f"[RECOVERY SUCCESS] User '{current_user.username}' đã khôi phục DB thành công.")
        return {
            "status": "Success",
            "message": "Hệ thống đã được khôi phục toàn vẹn nguyên bản thành công mỹ mãn!",
            "pre_restore_safety_backup_url": safety_link
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RECOVERY FATAL_ERROR] {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quy trình cứu hộ thảm họa thất bại: {str(e)}"
        )
    finally:
        _restore_lock.release()