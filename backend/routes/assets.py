# assets.py
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from openpyxl import load_workbook

from database import get_db
from models import Asset, Elder, Room, Zone, Facility, User
from schemas import AssetCreate, AssetResponse, RoleType
from core.dependencies import require_care_team, get_current_user

router = APIRouter(prefix="/api/admin/assets", tags=["5. [Quản lý] Danh Mục Tư Trang & Tài Sản"])

@router.get(
    "",
    response_model=List[AssetResponse],
    summary="Lấy danh sách Tư trang / Tài sản",
    description="""
    **Mô tả dành cho Frontend:**
    - Trả về danh sách toàn bộ tài sản trong hệ thống.
    - **Phân quyền Đa cơ sở:** Manager/NVCS thuộc Cơ sở nào thì mặc định chỉ thấy tài sản thuộc Cơ sở đó. Manager Vùng/Admin (`facility_id is None`) có thể xem toàn bộ hoặc lọc theo `facility_id`.
    - **Bộ lọc nâng cao:** 
      - `room_id`: Lọc tài sản trong 1 Phòng cụ thể.
      - `elder_id`: Lọc tất cả tư trang thuộc sở hữu của 1 Cụ.
      - `requires_inspection`: Trạng thái lọc đồ `True` (Cần NVCS đi tuần chụp ảnh) hoặc `False` (Đồ dùng lặt vặt).
    """
)
def get_all_assets(
    room_id: Optional[int] = Query(None, description="ID Phòng cần lọc"),
    elder_id: Optional[int] = Query(None, description="ID Cụ già cần xem danh mục tư trang riêng"),
    facility_id: Optional[int] = Query(None, description="ID Cơ sở (Dành cho Admin/Manager Vùng)"),
    requires_inspection: Optional[bool] = Query(None, description="Lọc theo yêu cầu đi tuần chụp ảnh (True/False)"),
    status_filter: Optional[str] = Query("Active", description="Trạng thái tài sản: 'Active' hoặc 'Archived'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    query = db.query(Asset).options(
        joinedload(Asset.elder),
        joinedload(Asset.room).joinedload(Room.zone).joinedload(Zone.facility)
    )

    # 1. Phân quyền đa cơ sở
    target_facility_id = current_user.facility_id if current_user.facility_id is not None else facility_id
    if target_facility_id is not None:
        query = query.join(Room).join(Zone).filter(Zone.facility_id == target_facility_id)

    # 2. Bộ lọc tùy chọn
    if room_id:
        query = query.filter(Asset.room_id == room_id)
    if elder_id:
        query = query.filter(Asset.elder_id == elder_id)
    if requires_inspection is not None:
        query = query.filter(Asset.requires_inspection == requires_inspection)
    if status_filter:
        query = query.filter(Asset.status == status_filter)

    assets = query.order_by(Asset.room_id, Asset.elder_id).all()

    # Đóng gói Response chứa đủ ngữ cảnh hiển thị
    results = []
    for a in assets:
        room_obj = a.room
        zone_obj = room_obj.zone if room_obj else None
        facility_obj = zone_obj.facility if zone_obj else None

        results.append(
            AssetResponse(
                id=a.id,
                asset_name=a.asset_name,
                room_id=a.room_id,
                elder_id=a.elder_id,
                contract_id=a.contract_id,
                requires_inspection=a.requires_inspection,
                status=a.status,
                created_at=a.created_at,
                elder_name=a.elder.full_name if a.elder else "Tài sản chung của phòng",
                room_number=room_obj.room_number if room_obj else "N/A",
                facility_name=facility_obj.name if facility_obj else "N/A"
            )
        )

    return results

# =========================================================================
# 2. CREATE: KHAI BÁO TƯ TRANG / TÀI SẢN MỚI
# =========================================================================
@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khai báo Tư trang / Tài sản mới",
    description="""
    **Mô tả dành cho Frontend:**
    - Sử dụng khi khai báo đồ đạc mới cho Cụ hoặc thêm thiết bị dùng chung cho Phòng.
    - **Tự động đồng bộ Phòng:** Nếu có chọn `elder_id` (tư trang riêng của Cụ), hệ thống sẽ **tự động lấy `room_id` theo đúng Phòng Cụ đó đang ở**, không lo nhân viên nhập lệch phòng[cite: 12].
    - `requires_inspection`: Tích chọn `True` nếu món đồ này giá trị cao/quan trọng (máy trợ thính, xe lăn, điện thoại...) cần NVCS chụp ảnh mỗi ca. Tích `False` nếu là đồ lặt vặt sinh hoạt.
    """
)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    asset_data = asset_in.model_dump()

    # Tự động đồng bộ room_id theo Cụ sở hữu
    if asset_in.elder_id:
        elder = db.query(Elder).options(joinedload(Elder.room)).filter(Elder.id == asset_in.elder_id).first()
        if not elder:
            raise HTTPException(status_code=404, detail="Không tìm thấy Cụ già sở hữu tài sản này!")
        
        if elder.room_id:
            asset_data["room_id"] = elder.room_id

    # Kiểm tra quyền cơ sở của phòng
    room = db.query(Room).options(joinedload(Room.zone)).filter(Room.id == asset_data["room_id"]).first()
    if not room:
        raise HTTPException(status_code=404, detail="Phòng lưu trữ tài sản không tồn tại!")

    if current_user.facility_id is not None and room.zone.facility_id != current_user.facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thêm tài sản vào Cơ sở khác!")

    new_asset = Asset(**asset_data)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)

    return AssetResponse(
        id=new_asset.id,
        asset_name=new_asset.asset_name,
        room_id=new_asset.room_id,
        elder_id=new_asset.elder_id,
        contract_id=new_asset.contract_id,
        requires_inspection=new_asset.requires_inspection,
        status=new_asset.status,
        created_at=new_asset.created_at,
        elder_name=new_asset.elder.full_name if new_asset.elder else "Tài sản chung của phòng",
        room_number=room.room_number,
        facility_name=room.zone.facility.name if (room.zone and room.zone.facility) else "N/A"
    )


# =========================================================================
# 3. READ DETAIL: XEM CHI TIẾT 1 MÓN TƯ TRANG
# =========================================================================
@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Xem chi tiết 1 món Tư trang / Tài sản",
    description="Lấy đầy đủ thuộc tính của 1 tài sản dựa vào ID (gồm Cụ sở hữu, Phòng, Cơ sở và Yêu cầu kiểm kê)."
)
def get_asset_by_id(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).options(
        joinedload(Asset.elder),
        joinedload(Asset.room).joinedload(Room.zone).joinedload(Zone.facility)
    ).filter(Asset.id == asset_id).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản này!")

    room_obj = asset.room
    zone_obj = room_obj.zone if room_obj else None

    return AssetResponse(
        id=asset.id,
        asset_name=asset.asset_name,
        room_id=asset.room_id,
        elder_id=asset.elder_id,
        contract_id=asset.contract_id,
        requires_inspection=asset.requires_inspection,
        status=asset.status,
        created_at=asset.created_at,
        elder_name=asset.elder.full_name if asset.elder else "Tài sản chung của phòng",
        room_number=room_obj.room_number if room_obj else "N/A",
        facility_name=zone_obj.facility.name if (zone_obj and zone_obj.facility) else "N/A"
    )


# =========================================================================
# 4. UPDATE: CẬP NHẬT TƯ TRANG / CHUYỂN CHỦ SỞ HỮU
# =========================================================================
@router.put(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Cập nhật thông tin Tư trang / Tài sản",
    description="""
    **Mô tả dành cho Frontend:**
    - Cho phép đổi tên món đồ, chuyển quyền sở hữu cho Cụ khác, hoặc thay đổi cờ `requires_inspection` (Bật/Tắt chế độ NVCS đi tuần chụp ảnh).
    - Tự động di dời `room_id` của tài sản theo đúng phòng của Cụ sở hữu mới.
    """
)
def update_asset(
    asset_id: int,
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản để cập nhật!")

    # Tự động cập nhật phòng theo Cụ sở hữu mới
    if asset_data.elder_id:
        elder = db.query(Elder).filter(Elder.id == asset_data.elder_id).first()
        if elder and elder.room_id:
            asset_data.room_id = elder.room_id

    for field, value in asset_data.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)

    db.commit()
    db.refresh(asset)

    room_obj = db.query(Room).options(joinedload(Room.zone).joinedload(Zone.facility)).filter(Room.id == asset.room_id).first()

    return AssetResponse(
        id=asset.id,
        asset_name=asset.asset_name,
        room_id=asset.room_id,
        elder_id=asset.elder_id,
        contract_id=asset.contract_id,
        requires_inspection=asset.requires_inspection,
        status=asset.status,
        created_at=asset.created_at,
        elder_name=asset.elder.full_name if asset.elder else "Tài sản chung của phòng",
        room_number=room_obj.room_number if room_obj else "N/A",
        facility_name=room_obj.zone.facility.name if (room_obj and room_obj.zone and room_obj.zone.facility) else "N/A"
    )


# =========================================================================
# 5. DELETE: XÓA TÀI SẢN (CHUYỂN VỀ ARCHIVED HOẶC XÓA CỨNG)
# =========================================================================
@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_200_OK,
    summary="Xóa hoặc Chuyển kho lưu trữ (Archive) tài sản",
    description="Xóa món tư trang khỏi danh mục quản lý active của phòng."
)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài sản để xóa!")

    db.delete(asset)
    db.commit()
    return {"message": f"Đã xóa thành công tài sản '{asset.asset_name}'"}


# =========================================================================
# 6. IMPORT MATRIX EXCEL: TỰ ĐỘNG ĐỒNG BỘ DANH MỤC TƯ TRANG
# =========================================================================
@router.post(
    "/import-xlsx",
    status_code=status.HTTP_200_OK,
    summary="Import danh mục Tư trang ma trận từ file Excel",
    description="""
    **Mô tả dành cho Frontend:**
    - Tải file Excel biểu mẫu Ma trận tư trang của Viện (Cột A: Phòng, Cột B: Tên Cụ, Cột C trở đi: Dấu x/✓ ứng với tên món đồ)[cite: 11, 13].
    - Hệ thống tự động bóc tách: Tạo phòng mới nếu chưa có, tạo Cụ mới nếu chưa có, và bật trạng thái `Active` cho các món tư trang được đánh dấu tích[cite: 11, 13].
    - Mặc định các tư trang import từ Ma trận sẽ được gán `requires_inspection = True` để đưa vào danh sách NVCS đi tuần chụp ảnh[cite: 13].
    """
)
async def import_assets_from_xlsx(
    file: UploadFile = File(..., description="File Excel ma trận tư trang (.xlsx/.xls)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_care_team)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Hệ thống chỉ chấp nhận file Excel định dạng .xlsx hoặc .xls!")

    try:
        contents = await file.read()
        wb = load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active

        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        headers = [str(cell).strip() if cell else "" for cell in header_row]

        processed_elders = 0
        total_assets_upserted = 0
        current_room_number = None

        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or len(row) < 2:
                continue

            room_raw, elder_raw = row[0], row[1]

            if room_raw is not None and str(room_raw).strip() != "":
                current_room_number = str(room_raw).strip()

            if not current_room_number or elder_raw is None or str(elder_raw).strip() == "":
                continue

            elder_name = str(elder_raw).strip()

            # BƯỚC 1: Xử lý Phòng (Tự động tạo nếu chưa có)
            room = db.query(Room).filter(Room.room_number == current_room_number).first()
            if not room:
                # Tìm Phân khu mặc định (Khu A) của Cơ sở
                default_zone = db.query(Zone).filter(Zone.facility_id == current_user.facility_id).first() if current_user.facility_id else db.query(Zone).first()
                
                room = Room(
                    zone_id=default_zone.id if default_zone else None,
                    room_number=current_room_number,
                    description=f"Phòng {current_room_number} tạo tự động từ Import Ma trận"
                )
                db.add(room)
                db.flush()

            # BƯỚC 2: Xử lý Cụ
            elder = db.query(Elder).filter(Elder.full_name == elder_name, Elder.room_id == room.id).first()
            if not elder:
                elder = Elder(full_name=elder_name, room_id=room.id)
                db.add(elder)
                db.flush()

            processed_elders += 1

            # BƯỚC 3: Duyệt ma trận các cột tư trang
            existing_assets = db.query(Asset).filter(Asset.elder_id == elder.id).all()
            asset_dict = {a.asset_name.lower().strip(): a for a in existing_assets}

            for col_index in range(2, len(row)):
                if col_index >= len(headers):
                    break

                asset_name = headers[col_index]
                if not asset_name or asset_name in ["PHÒNG", "TÊN CỤ"]:
                    continue

                cell_val = row[col_index]
                is_checked = (cell_val is True) or (str(cell_val).strip().upper() in ["TRUE", "1", "1.0", "X", "V", "✓", "YES"])

                if is_checked:
                    search_key = asset_name.lower().strip()
                    if search_key in asset_dict:
                        asset_dict[search_key].status = "Active"
                        asset_dict[search_key].room_id = room.id
                    else:
                        new_asset = Asset(
                            asset_name=asset_name,
                            room_id=room.id,
                            elder_id=elder.id,
                            status="Active",
                            requires_inspection=True # Mặc định yêu cầu đi tuần chụp ảnh
                        )
                        db.add(new_asset)
                    total_assets_upserted += 1

        db.commit()
        return {
            "status": "Success",
            "message": "Đồng bộ ma trận tư trang từ Excel thành công!",
            "summary": {
                "total_elders_processed": processed_elders,
                "total_assets_active": total_assets_upserted
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cấu trúc file Excel Ma trận: {str(e)}")


# =========================================================================
# 7. LẤY TOÀN BỘ TƯ TRANG / TÀI SẢN THEO PHÒNG ĐÍCH DANH
# =========================================================================
@router.get(
    "/room/{room_id}",
    response_model=List[AssetResponse],
    summary="Lấy danh sách Tư trang / Tài sản theo ID Phòng",
    description="""
    **Mô tả dành cho Frontend:**
    - Trả về tất cả các món tư trang (cả đồ cá nhân của các Cụ và đồ dùng chung) nằm trong `room_id` này.
    - Dùng cho màn hình Quản lý Phòng để hiển thị danh mục thiết bị/tư trang đang có trong phòng.
    """
)
def get_assets_by_room_id(
    room_id: int,
    requires_inspection_only: bool = Query(False, description="Nếu True: Chỉ lấy đồ BẮT BUỘC kiểm kê đi tuần"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng này!")

    query = db.query(Asset).options(
        joinedload(Asset.elder),
        joinedload(Asset.room).joinedload(Room.zone).joinedload(Zone.facility)
    ).filter(Asset.room_id == room_id, Asset.status == "Active")

    if requires_inspection_only:
        query = query.filter(Asset.requires_inspection == True)

    assets = query.order_by(Asset.elder_id, Asset.asset_name).all()

    results = []
    for a in assets:
        room_obj = a.room
        zone_obj = room_obj.zone if room_obj else None
        facility_obj = zone_obj.facility if zone_obj else None

        results.append(
            AssetResponse(
                id=a.id,
                asset_name=a.asset_name,
                room_id=a.room_id,
                elder_id=a.elder_id,
                contract_id=a.contract_id,
                requires_inspection=a.requires_inspection,
                status=a.status,
                created_at=a.created_at,
                elder_name=a.elder.full_name if a.elder else "Tài sản chung của phòng",
                room_number=room_obj.room_number if room_obj else "N/A",
                facility_name=facility_obj.name if facility_obj else "N/A"
            )
        )
    return results


# =========================================================================
# LẤY TOÀN BỘ TƯ TRANG / TÀI SẢN THEO CƠ SỞ ĐÍCH DANH
# =========================================================================
@router.get(
    "/facility/{facility_id}",
    response_model=List[AssetResponse],
    summary="Lấy danh sách Tư trang / Tài sản theo ID Cơ sở",
    description="""
    **Mô tả dành cho Frontend:**
    - Trả về toàn bộ tư trang thuộc về tất cả các Phòng/Khu nằm trong `facility_id` được chọn.
    - Dùng cho Manager/Admin xem Báo cáo tổng kiểm kê tài sản cấp Cơ sở.
    """
)
def get_assets_by_facility_id(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra quyền truy cập cơ sở
    if current_user.facility_id is not None and current_user.facility_id != facility_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem danh mục tài sản của Cơ sở khác!")

    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Không tìm thấy Cơ sở này!")

    assets = db.query(Asset).options(
        joinedload(Asset.elder),
        joinedload(Asset.room).joinedload(Room.zone).joinedload(Zone.facility)
    ).join(Room).join(Zone).filter(
        Zone.facility_id == facility_id,
        Asset.status == "Active"
    ).order_by(Asset.room_id, Asset.elder_id).all()

    results = []
    for a in assets:
        room_obj = a.room
        zone_obj = room_obj.zone if room_obj else None

        results.append(
            AssetResponse(
                id=a.id,
                asset_name=a.asset_name,
                room_id=a.room_id,
                elder_id=a.elder_id,
                contract_id=a.contract_id,
                requires_inspection=a.requires_inspection,
                status=a.status,
                created_at=a.created_at,
                elder_name=a.elder.full_name if a.elder else "Tài sản chung của phòng",
                room_number=room_obj.room_number if room_obj else "N/A",
                facility_name=facility.name
            )
        )
    return results