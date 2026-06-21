# services/image_service.py
from PIL import Image, ImageDraw, ImageFont, ImageOps
from io import BytesIO
from datetime import datetime
from core.constants import MAX_PIXEL, MAXIMUM_RESOLUTION
import pytz
import os

Image.MAX_IMAGE_PIXELS = MAX_PIXEL

def get_short_name(full_name: str) -> str:
    """Rút gọn tên để watermark không bị tràn."""
    parts = full_name.split()
    if len(parts) > 1:
        # Lấy Họ + Tên chính: 'Nguyễn Văn A' -> 'Nguyễn A'
        return f"{parts[0]} {parts[-1]}"
    return full_name

def process_and_compress_image(file_bytes: bytes, staff_name: str) -> bytes:
    img = Image.open(BytesIO(file_bytes)).convert("RGB")
    img = ImageOps.exif_transpose(img)
    
    img.thumbnail(MAXIMUM_RESOLUTION, Image.Resampling.LANCZOS)
    
    # Chuẩn bị vẽ
    draw = ImageDraw.Draw(img)
    width, height = img.size
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_str = datetime.now(tz).strftime("%d/%m/%Y %H:%M:%S")
    
    # 1. Định dạng nội dung (Tiếng Việt không dấu)
    short_name = get_short_name(staff_name)
    watermark_text = f" Tam An | {now_str} | NV: {short_name} "
    
    # 2. Tạo dải nền đen mờ (Overlay) ở góc dưới
    # Rectangle: [x0, y0, x1, y1]
    overlay_height = int(height * 0.08) # Dải nền chiếm 8% chiều cao ảnh
    draw.rectangle([0, height - overlay_height, width, height], fill=(0, 0, 0, 180))
    
    # 3. Tối ưu Font chữ
    font = ImageFont.load_default()
    try:
        # Thử nạp font chữ rõ nét hơn nếu có sẵn trong hệ thống
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if os.path.exists(font_path):
            font = ImageFont.truetype(font_path, size=int(height * 0.04))
    except:
        pass

    # 4. Vẽ chữ lên dải nền
    # Căn giữa chữ trên dải nền
    text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    x_pos = (width - text_width) // 2
    y_pos = height - overlay_height + (overlay_height - (text_bbox[3] - text_bbox[1])) // 2
    
    draw.text((x_pos, y_pos), watermark_text, fill="white", font=font)
    
    # 5. Nén ảnh
    output = BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    
    return output.getvalue()