import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from core.config import settings

def send_alert_email(shift_date, shift_type, missing_assets, lost_assets):
    # Kiểm tra cấu hình trước khi chạy
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logging.error("Chưa cấu hình MAIL_USERNAME hoặc MAIL_PASSWORD trong .env")
        return

    # Tách chuỗi email thành list: "email1@gmail.com, email2@gmail.com" -> ['email1@gmail.com', 'email2@gmail.com']
    receiver_emails = [email.strip() for email in settings.MAIL_RECEIVERS.split(',') if email.strip()]
    
    if not receiver_emails:
        logging.error("Danh sách người nhận (MAIL_RECEIVERS) đang trống.")
        return

    subject = f"⚠️ CẢNH BÁO BÁO CÁO CA {shift_type.upper()} ({shift_date}) - TÂM AN INVENTORY"

    html_content = f"""
    <html>
        <body>
            <h2 style="color: #d9534f;">Báo Cáo Tình Trạng Kiểm Kê - Có Sự Cố</h2>
            <p><strong>Ngày:</strong> {shift_date} | <strong>Ca:</strong> {shift_type}</p>
            <hr>
    """

    if lost_assets:
        html_content += "<h3 style='color: #f0ad4e;'>1. Tài Sản Báo Mất (Nhân viên không tìm thấy):</h3><ul>"
        for item in lost_assets:
            html_content += f"<li><b>{item['name']}</b> (Phòng: {item['room_number']}) - <i>Ghi chú: {item['note']}</i></li>"
        html_content += "</ul>"

    if missing_assets:
        html_content += "<h3 style='color: #d9534f;'>2. Tài Sản Bị Bỏ Sót (Chưa được kiểm kê):</h3><ul>"
        for item in missing_assets:
            html_content += f"<li><b>{item['name']}</b> (Phòng: {item['room_number']})</li>"
        html_content += "</ul>"

    html_content += """
            <hr>
            <p><i>Hệ thống tự động chốt ca. Vui lòng truy cập trang Dashboard Admin để xem chi tiết.</i></p>
        </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = settings.MAIL_USERNAME
    # Gửi nhiều người cùng lúc (BCC hoặc To đều được, ở đây dùng To nối chuỗi)
    msg['To'] = ", ".join(receiver_emails)
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        logging.info(f"Đã gửi email cảnh báo thành công cho ca {shift_type} tới {len(receiver_emails)} người nhận.")
    except Exception as e:
        logging.error(f"Lỗi khi gửi email: {e}")
        raise e
    
def send_realtime_missing_alert(asset_name: str, room_number: str, note: str, reporter_name: str, shift_type: str):
    """
    Gửi cảnh báo khẩn cấp ngay lập tức khi có nhân viên báo mất đồ.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logging.error("Chưa cấu hình MAIL_USERNAME hoặc MAIL_PASSWORD trong .env")
        return

    receiver_emails = [email.strip() for email in settings.MAIL_RECEIVERS.split(',') if email.strip()]
    if not receiver_emails:
        return

    subject = f"🚨 KHẨN CẤP: Báo Mất Tài Sản - Ca {shift_type.upper()} - TÂM AN INVENTORY"

    html_content = f"""
    <html>
        <body>
            <h2 style="color: #d9534f;">Cảnh Báo Sự Cố Mất Tài Sản Tức Thời</h2>
            <p>Hệ thống Tâm An Inventory vừa ghi nhận một tài sản bị báo mất trong quá trình đi tuần.</p>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="background-color: #f9f9f9;"><strong>Tài sản:</strong></td>
                    <td><b style="color: #d9534f;">{asset_name}</b></td>
                </tr>
                <tr>
                    <td style="background-color: #f9f9f9;"><strong>Phòng:</strong></td>
                    <td>{room_number}</td>
                </tr>
                <tr>
                    <td style="background-color: #f9f9f9;"><strong>Người kiểm kê:</strong></td>
                    <td>{reporter_name}</td>
                </tr>
                <tr>
                    <td style="background-color: #f9f9f9;"><strong>Ghi chú giải trình:</strong></td>
                    <td><i>{note}</i></td>
                </tr>
            </table>
            <br>
            <p><i>Vui lòng bộ phận quản lý kiểm tra và có phương án xử lý kịp thời.</i></p>
        </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = settings.MAIL_USERNAME
    msg['To'] = ", ".join(receiver_emails)
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        logging.info(f"Đã gửi cảnh báo KHẨN CẤP thành công cho tài sản: {asset_name}")
    except Exception as e:
        logging.error(f"Lỗi khi gửi email khẩn cấp: {e}")