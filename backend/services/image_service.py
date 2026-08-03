from PIL import Image, ImageDraw, ImageFont, ImageOps
from io import BytesIO
from datetime import datetime
import pytz
import os
import unicodedata
from core.constants import MAX_PIXEL, MAXIMUM_RESOLUTION

Image.MAX_IMAGE_PIXELS = MAX_PIXEL

def strip_accents(text: str) -> str:
    """Chuyển tiếng Việt có dấu thành không dấu để chống lỗi ô vuông khi dùng Default Font."""
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return text.replace('đ', 'd').replace('Đ', 'D')

def get_short_name(full_name: str) -> str:
    """Rút gọn tên để watermark không bị tràn."""
    parts = full_name.split()
    if len(parts) > 1:
        return f"{parts[0]} {parts[-1]}"
    return full_name

def process_and_compress_image(file_bytes: bytes, staff_name: str) -> bytes:
    img = Image.open(BytesIO(file_bytes)).convert("RGB")
    img = ImageOps.exif_transpose(img)
    img.thumbnail(MAXIMUM_RESOLUTION, Image.Resampling.LANCZOS)
    
    draw = ImageDraw.Draw(img)
    width, height = img.size
    tz = pytz.timezone('Asia/Ho_Chi_Minh')
    now_str = datetime.now(tz).strftime("%d/%m/%Y %H:%M:%S")
    
    short_name = get_short_name(staff_name)
    raw_watermark = f" Tam An | {now_str} | NV: {short_name} "
    
    # Nạp font nét
    font = None
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, size=int(height * 0.04))
                break
            except Exception:
                pass
                
    if not font:
        font = ImageFont.load_default()
        watermark_text = strip_accents(raw_watermark) # Nếu font mặc định -> Bỏ dấu để không lỗi chữ
    else:
        watermark_text = raw_watermark

    # Vẽ dải nền đen mờ 8% chiều cao
    overlay_height = int(height * 0.08)
    draw.rectangle([0, height - overlay_height, width, height], fill=(0, 0, 0, 180))
    
    text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    x_pos = (width - text_width) // 2
    y_pos = height - overlay_height + (overlay_height - (text_bbox[3] - text_bbox[1])) // 2
    
    draw.text((x_pos, y_pos), watermark_text, fill="white", font=font)
    
    output = BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()