# ☕ Cà Phê

Ứng dụng quản lý lịch học, thu chi, ngân sách và mục tiêu cá nhân dành cho sinh viên.
Chạy được trên điện thoại lẫn máy tính, cài được như app (PWA), có chế độ sáng/tối.

👉 **Dùng thử:** https://vcatim.github.io/ca-phe/

## Tính năng
- **Hôm nay**: lời chào, ngân sách trong ngày, việc cần làm, thu/chi nhanh
- **Lịch**: lưới 24 giờ, xem theo tháng/tuần, vuốt để chuyển, chọn nhanh ngày/tháng/năm, sao chép và dán lịch tuần/ngày
- **Nhập lịch từ Google Calendar** qua file `.ics` (hỗ trợ lịch lặp, buổi bị dời/hủy), file chỉ được đọc ngay trên máy bạn
- **Tài chính**: thu/chi theo nhóm việc, biểu đồ, tổng kết tuần và tháng
- **Mục tiêu**: nhiều mục tiêu, mức ưu tiên, bật tự động cộng/trừ theo thu/chi (việc đã hoàn thành và khoản không gắn việc)
- **Tài khoản & đồng bộ**: đăng nhập Supabase, sao lưu dữ liệu giữa thiết bị; khi liên kết hoặc nhập lịch, các sự kiện có cùng tiêu đề, ngày và giờ sẽ tự được bỏ qua để không bị trùng
- **Xóa tài khoản**: khi đang đăng nhập, xóa tài khoản sẽ xóa cả dữ liệu và tài khoản trên Supabase; với tài khoản dùng thử, dữ liệu chỉ bị xóa trên máy
- Dữ liệu vẫn dùng được khi mất mạng nhờ localStorage và PWA

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

## Cấu hình Supabase

Ứng dụng đã dùng Supabase cho đăng nhập và đồng bộ. Trước khi dùng tính năng xóa tài khoản trên cloud, hãy chạy toàn bộ file [`supabase/schema.sql`](supabase/schema.sql) trong **SQL Editor** của Supabase để tạo hàm bảo mật `delete_own_account`. Hàm này chỉ cho phép người đang đăng nhập xóa chính tài khoản của họ; dữ liệu liên quan được xóa theo cùng lúc.

## Kế hoạch
- [x] Chạy trên web, đưa lên GitHub Pages
- [x] Cài như app (PWA)
- [x] Nhập lịch từ file `.ics`
- [x] Tài khoản và đồng bộ Supabase, chống trùng lịch
- [x] Xóa tài khoản cloud an toàn
- [ ] Thông báo nhắc lịch
