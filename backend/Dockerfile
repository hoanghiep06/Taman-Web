FROM python:3.11-slim

# Tối ưu hóa môi trường Python cho Cloud Production
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Cài đặt postgresql-client phục vụ cho phân hệ cứu hộ thảm họa (pg_dump / psql)
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Tách riêng phần cài đặt dependencies để tận dụng Docker Layer Cache tối đa
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Khởi chạy Uvicorn ở chế độ Production (Xóa bỏ hoàn toàn cờ --reload gây tốn RAM)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]


# RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .

# # Dành để chạy test trên data sample
# # CMD ["sh", "-c", "python seed_data.py && uvicorn main:app --host 0.0.0.0 --port 5000 --reload"]

# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]


