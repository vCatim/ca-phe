# ☕ Cà Phê

Ứng dụng quản lý lịch học, thu chi, ngân sách và mục tiêu cá nhân dành cho sinh viên.
Chạy được trên điện thoại lẫn máy tính, cài được như app (PWA), có chế độ sáng/tối.

👉 **Dùng thử:** https://vcatim.github.io/ca-phe/

## Tính năng
- **Hôm nay**: lời chào, ngân sách trong ngày, việc cần làm, thu/chi nhanh
- **Lịch**: xem theo tháng/tuần, vuốt để chuyển, sao chép và dán lịch tuần/ngày
- **Nhập lịch từ Google Calendar** qua file `.ics` (hỗ trợ lịch lặp, buổi bị dời/hủy), file chỉ được đọc ngay trên máy bạn
- **Tài chính**: thu/chi theo nhóm việc, biểu đồ, tổng kết tuần và tháng
- **Mục tiêu**: theo dõi tiến độ, tự cập nhật theo thu/chi của việc đã hoàn thành
- Dữ liệu lưu trong trình duyệt, hoạt động cả khi mất mạng

## Chạy trên máy
Cần cài [Node.js](https://nodejs.org) (bản LTS).

```bash
npm install
npm run dev
```
Mở địa chỉ hiện ra (thường là http://localhost:5173/ca-phe/).

## Cấu trúc
- `src/App.jsx`: logic và giao diện
- `src/style.css`: kiểu dáng
- `vite.config.js`: cấu hình Vite và PWA
- `.github/workflows/deploy.yml`: tự đưa lên GitHub Pages khi push

## Công nghệ
React · Vite · vite-plugin-pwa · ical.js · localStorage

## Kế hoạch
- [x] Chạy trên web, đưa lên GitHub Pages
- [x] Cài như app (PWA)
- [x] Nhập lịch từ file `.ics`
- [ ] Tài khoản thật và đồng bộ (Supabase)
- [ ] Thông báo nhắc lịch
