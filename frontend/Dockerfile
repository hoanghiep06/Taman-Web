# Bước 1: Biên dịch mã nguồn React sang HTML/JS tĩnh
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Bước 2: Khởi tạo máy chủ Web Nginx gọn nhẹ để phân phát file tĩnh
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]