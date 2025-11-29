# Landio Client - React + TypeScript

Client application cho game multiplayer Landio, được xây dựng với React và TypeScript.

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

## Chạy ứng dụng

Để chạy ứng dụng ở chế độ development:
```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## Build

Để build ứng dụng cho production:
```bash
npm run build
```

Files đã build sẽ nằm trong thư mục `dist/`

## Cấu trúc dự án

```
client/
├── src/
│   ├── components/      # React components
│   │   ├── Chat.tsx
│   │   ├── GameContainer.tsx
│   │   ├── HUD.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── Scoreboard.tsx
│   │   └── TimerOverlay.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useGameClient.ts
│   │   └── useWebSocket.ts
│   ├── utils/           # Utility classes
│   │   ├── gameRenderer.ts
│   │   └── imageLoader.ts
│   ├── types.ts         # TypeScript type definitions
│   ├── App.tsx          # Main App component
│   ├── App.css          # Styles
│   ├── main.tsx         # Entry point
│   └── index.css
├── index.html           # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Yêu cầu

- Node.js 18+ 
- npm hoặc yarn
- Server game phải chạy tại `ws://localhost:8080`

## Lưu ý

- Assets (hình ảnh) cần được đặt trong thư mục `public/elements/` để Vite có thể serve chúng
- Đảm bảo server game đang chạy trước khi khởi động client

