# ☕ Cà Phê

Ứng dụng quản lý lịch học, thu chi, ngân sách và mục tiêu cho sinh viên.

## Chạy trên máy
```bash
npm install     # tải thư viện (chỉ cần lần đầu)
npm run dev     # chạy thử, mở địa chỉ hiện ra (thường là http://localhost:5173)
```

## Đóng gói
```bash
npm run build   # tạo thư mục dist/ (bản để đưa lên mạng)
npm run preview # xem thử bản dist
```

## Cấu trúc
- `index.html` — trang gốc
- `src/main.jsx` — điểm vào của app
- `src/App.jsx` — toàn bộ logic và giao diện (React)
- `src/style.css` — giao diện
- `public/` — file tĩnh (icon...)
- `.github/workflows/deploy.yml` — tự động đưa lên GitHub Pages

## Công nghệ
React, Vite, localStorage. Kế hoạch: PWA, nhập lịch từ Google Calendar, tài khoản thật (Supabase).
