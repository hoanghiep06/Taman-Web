# assets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
import pytz
from database import get_db
from models import Asset, Room, Elder, Shift, InspectionLog

router = APIRouter(prefix="/assets", tags=["Staff: Danh sách đi tuần"])

@router.get("/rooms")
def get_all_rooms_with_patrol_progress(db: Session = Depends(get_db)):
    """
    API LẤY DANH SÁCH PHÒNG KÈM TIẾN ĐỘ CA TRỰC HIỆN TẠI (ĐÃ SỬA CHUẨN):
    - Đã xóa hàm cũ bị trùng lặp route gây nuốt dữ liệu.
    - Bổ sung trường 'total_assets' và 'inspected_count' cho từng thực thể phòng.
    - Giúp Frontend render hiệu ứng ngập nước xanh lá trực quan ở màn hình sảnh.
    """
    # 1. Lấy toàn bộ danh sách phòng hệ thống
    rooms = db.query(Room).order_by(Room.room_number).all()
    
    # 2. Tìm phiên ca trực đang mở (Open) hiện hành
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    
    results = []
    
    # 3. Quét qua từng phòng để tính toán tiến độ ngay trên RAM / Query tối ưu
    for room in rooms:
        # Tính tổng số tài sản đang hoạt động (Active) trong phòng này
        total_assets = db.query(Asset).filter(
            Asset.room_id == room.id,
            Asset.status == "Active"
        ).count()
        
        inspected_count = 0
        
        # Nếu có ca trực đang mở và phòng có đồ đạc, tiến hành đếm số đồ đã kiểm kê
        if shift and total_assets > 0:
            # Tạo subquery lấy danh sách ID tài sản đang hoạt động của riêng phòng này
            room_asset_ids = db.query(Asset.id).filter(
                Asset.room_id == room.id,
                Asset.status == "Active"
            ).subquery()
            
            # Đếm số lượng log kiểm kê có trạng thái is_latest = True trong ca trực
            inspected_count = db.query(InspectionLog).filter(
                InspectionLog.shift_id == shift.id,
                InspectionLog.asset_id.in_(room_asset_ids),
                InspectionLog.is_latest == True
            ).count()
            
        # Đóng gói bản tin JSON chuẩn mực cho Frontend mapping dữ liệu
        results.append({
            "room_id": room.id,
            "room_number": room.room_number,
            "description": room.description,
            "total_assets": total_assets,
            "inspected_count": inspected_count
        })
        
    return results


@router.get("/rooms/{room_number}")
def get_assets_by_room(room_number: str, db: Session = Depends(get_db)):
    """
    Lấy danh sách toàn bộ tài sản đang hoạt động thuộc về một số phòng cụ thể.
    ĐỒNG BỘ TIẾN ĐỘ LUỒNG ĐI TUẦN: Trả về thêm 'total_assets' và 'inspected_count' 
    để Frontend chạy hiệu ứng thanh phần trăm tiến độ trực quan theo thời gian thực.
    """
    # 1. Tìm thực thể phòng từ bảng rooms dựa trên số phòng (ví dụ: "4")
    room = db.query(Room).filter(Room.room_number == room_number).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phòng số '{room_number}' trên hệ thống."
        )
    
    # 2. Tìm ca trực đang mở (Open) hiện tại của hệ thống
    shift = db.query(Shift).filter(Shift.status == "Open").order_by(Shift.created_at.desc()).first()
    
    # 3. Truy vấn danh sách tài sản thuộc phòng bằng kỹ thuật joinedload tối ưu mạng
    assets = db.query(Asset).options(joinedload(Asset.elder)).filter(
        Asset.room_id == room.id,
        Asset.status == "Active"
    ).order_by(Asset.elder_id, Asset.asset_name).all()
    
    # 4. Tìm kiếm trạng thái đi tuần mới nhất của các tài sản này lên RAM
    log_dict = {}
    latest_logs = [] # Khởi tạo danh sách log trống để phục vụ tính toán tiến độ
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    
    if shift and assets:
        asset_ids = [asset.id for asset in assets]
        latest_logs = db.query(InspectionLog).filter(
            InspectionLog.shift_id == shift.id,
            InspectionLog.asset_id.in_(asset_ids),
            InspectionLog.is_latest == True
        ).all()
        # Chuyển mảng log thành cấu trúc Dictionary để tra cứu nhanh với độ phức tạp O(1)
        log_dict = {log.asset_id: log for log in latest_logs}
    
    # ──── TÍNH TOÁN TIẾN ĐỘ ĐI TUẦN NGAY TRÊN RAM (TỐI ƯU HÓA IO, KHÔNG TỐN CÂU SQL COUNT) ────
    total_assets = len(assets)
    inspected_count = len(latest_logs)
    
    # 5. Đóng gói dữ liệu kết hợp động giữa danh mục gốc và nhật ký đi tuần theo ca
    assets_list = []
    for asset in assets:
        log = log_dict.get(asset.id)
        
        current_status = "Unchecked"
        inspected_at = None
        log_id = None
        note = None
        
        if log:
            current_status = log.status
            log_id = log.id
            note = log.note
            if log.created_at:
                inspected_at = log.created_at.astimezone(tz).strftime("%H:%M:%S")
                
        assets_list.append({
          "asset_id": asset.id,
          "asset_name": asset.asset_name,
          "room_number": room.room_number,
          "catalog_status": asset.status,
          "current_status": current_status,
          "inspected_at": inspected_at,
          "log_id": log_id,
          "note": note,
          "elder_id": asset.elder_id,
          "elder_name": asset.elder.full_name if asset.elder else "Tài sản chung của phòng"
        })
        
    return {
        "total_assets": total_assets,
        "inspected_count": inspected_count,
        "assets": assets_list
    }