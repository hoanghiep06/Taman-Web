# assets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
import pytz # BỔ SUNG: Xử lý múi giờ Việt Nam để hiển thị mốc thời gian thực khi reset trang
from database import get_db
from models import Asset, Room, Elder, Shift, InspectionLog # BỔ SUNG: Import thêm bảng Shift và InspectionLog để đối chiếu ca trực

router = APIRouter(prefix="/assets", tags=["Staff: Danh sách đi tuần"])

@router.get("/rooms")
def get_all_rooms(db: Session = Depends(get_db)):
    """
    Lấy danh sách tất cả các phòng hiện có trong hệ thống để nhân viên 
    chọn khu vực trước khi bắt đầu đi tuần.
    """
    rooms = db.query(Room).order_by(Room.room_number).all()
    
    return [
        {
            "room_id": room.id,
            "room_number": room.room_number,
            "description": room.description
        }
        for room in rooms
    ]


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
    inspected_count = len(latest_logs) # Vì đã lọc is_latest = True nên len này chính là số lượng đồ đã tương tác
    
    # 5. Đóng gói dữ liệu kết hợp động giữa danh mục gốc và nhật ký đi tuần theo ca
    assets_list = []
    for asset in assets:
        log = log_dict.get(asset.id)
        
        # Cấu hình các giá trị mặc định của trạng thái đi tuần ca trực hiện tại
        current_status = "Unchecked" # Mặc định là Đỏ tươi (Chưa đụng vào)
        inspected_at = None
        log_id = None
        note = None
        
        # Nếu tài sản này đã được nhân viên tương tác trong ca trực hiện tại
        if log:
            current_status = log.status # Đồng bộ đúng hệ màu: Xanh, Vang, Dang_Xu_Ly, Loi_Upload
            log_id = log.id
            note = log.note
            if log.created_at:
                inspected_at = log.created_at.astimezone(tz).strftime("%H:%M:%S")
                
        assets_list.append({
          "asset_id": asset.id,
          "asset_name": asset.asset_name,
          "room_number": room.room_number,
          "catalog_status": asset.status, # Trạng thái tĩnh hoạt động của đồ vật trong kho
          
          # ──── CÁC TRƯỜNG DỮ LIỆU BỔ SUNG ĐỂ PHỤC VỤ GIỮ TRẠNG THÁI KHI RESET ────
          "current_status": current_status, # Giao diện hứng trường này để tô màu: Xanh/Vang/Dang_Xu_Ly/Loi_Upload/Unchecked
          "inspected_at": inspected_at,     # Mốc thời gian thực thực hiện hành động để hiện lên UI
          "log_id": log_id,                 # ID của bản ghi log kiểm kê
          "note": note,                     # Nội dung giải trình báo mất nếu có
          
          "elder_id": asset.elder_id,
          "elder_name": asset.elder.full_name if asset.elder else "Tài sản chung của phòng"
        })
        
    # ──── TRẢ VỀ CẤU TRÚC BỌC WRAPPER OBJECT CHUẨN RESTFUL DÀNH CHO DASHBOARD UI ────
    return {
        "total_assets": total_assets,
        "inspected_count": inspected_count,
        "assets": assets_list
    }