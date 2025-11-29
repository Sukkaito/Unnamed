# Hướng dẫn chạy ứng dụng

## Bước 1: Chạy Server Game

Mở một terminal mới và chạy server:

```bash
cd ../server
npm start
```

Hoặc nếu muốn chạy với auto-reload:
```bash
npm run dev
```

Server sẽ chạy tại `ws://localhost:8080`

## Bước 2: Chạy Client (React + TypeScript)

Trong terminal hiện tại (đã ở trong thư mục `client`), chạy:

```bash
npm run dev
```

Client sẽ tự động mở trình duyệt tại `http://localhost:3000`

## Lưu ý

- **Phải chạy server trước** khi chạy client
- Nếu server không chạy, client sẽ không thể kết nối
- Server và client cần chạy đồng thời trong 2 terminal riêng biệt

## Troubleshooting

- Nếu port 3000 đã được sử dụng, Vite sẽ tự động chọn port khác (3001, 3002, ...)
- Kiểm tra console trong browser để xem lỗi kết nối WebSocket
- Đảm bảo server đang chạy tại đúng port 8080

