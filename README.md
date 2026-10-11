# ☕ Cà Phê

Ứng dụng quản lý lịch học, thu chi, ngân sách và mục tiêu cá nhân dành cho sinh viên.
Chạy được trên điện thoại lẫn máy tính, giao diện ấm áp, có chế độ sáng/tối.

👉 **Dùng thử:** https://<tên-bạn>.github.io/ca-phe/

<!-- Sau này thêm ảnh chụp màn hình: ![Trang Hôm nay](docs/hom-nay.png) -->

## Tính năng
- **Hôm nay**: lời chào, ngân sách trong ngày, việc cần làm, thu/chi nhanh
- **Lịch**: xem theo tháng/tuần, vuốt để chuyển, sao chép và dán lịch
- **Tài chính**: thu/chi theo nhóm việc, biểu đồ, tổng kết tuần và tháng
- **Mục tiêu**: theo dõi tiến độ, tự cập nhật theo thu/chi của việc đã hoàn thành
- Nhiều tài khoản trên một thiết bị, dữ liệu lưu ngay trong trình duyệt

## Chạy trên máy
Cần cài [Node.js](https://nodejs.org) (bản LTS).

```bash
npm install
npm run dev
```
Mở địa chỉ hiện ra (thường là http://localhost:5173).

## Cấu trúc
- `src/App.jsx`: logic và giao diện
- `src/style.css`: kiểu dáng
- `.github/workflows/deploy.yml`: tự đưa lên GitHub Pages khi push

## Công nghệ
React · Vite · localStorage

## Kế hoạch
- [x] Chạy trên web, đưa lên GitHub Pages
- [ ] Cài như app (PWA)
- [ ] Nhập lịch từ Google Calendar (file .ics)
- [ ] Tài khoản thật và đồng bộ (Supabase)
- [ ] Thông báo nhắc lịch

## Giấy phép
MIT
