# ☕ Cà Phê

Ứng dụng quản lý lịch học, thu chi, ngân sách và quỹ cá nhân dành cho sinh viên.
Hỗ trợ chạy mượt mà trên **Windows Desktop**, **Web (PWA)** và **Android Native (.apk)** với khả năng đồng bộ dữ liệu đa thiết bị và hoạt động ngoại tuyến (Offline-First).

👉 **Dùng thử trực tiếp trên Web:** [https://vcatim.github.io/ca-phe/](https://vcatim.github.io/ca-phe/)  
📦 **Tải bản cài đặt Android (.apk):** Truy cập mục [Actions](https://github.com/vCatim/ca-phe/actions) ➔ Chọn lần chạy build gần nhất ➔ Tải file trong mục **Artifacts** (`Ca-Phe-App`).

---

## 🚀 Tính năng nổi bật

### 1. Quản lý Lịch trình & Công việc
- **Lưới lịch 24 giờ:** Xem trực quan theo tuần và tháng, ngày bắt đầu từ Thứ Hai.
- **Thao tác mượt mà:** Vuốt trượt chuyển ngày/tuần trên điện thoại, phím mũi tên trên máy tính.
- **Sao chép & Dán lịch:** Sao chép nguyên tuần hoặc ngày chỉ với 1 chạm.
- **Đồng bộ 2 chiều với Google Calendar & Google Tasks (OAuth 2.0):**
  - Tự động đẩy lịch trình từ Cà Phê lên Google Calendar và Google Tasks.
  - Tự động kéo sự kiện từ Google về Cà Phê, thuật toán lọc bỏ sự kiện trùng lặp thông minh.
  - Hỗ trợ nhập bổ sung nhanh từ file `.ics` ngoại tuyến.

### 2. Quản lý Thu chi & Quỹ cá nhân
- **Theo dõi tài sản:** Tổng tài sản, số dư khả dụng (tiền mặt/tài khoản) và tiền đã phân bổ vào các quỹ.
- **Hệ thống Quỹ riêng biệt:** Tạo quỹ tiết kiệm, quỹ mua sắm, quỹ khẩn cấp... hỗ trợ nạp/rút tiền linh hoạt; hoàn tiền về số dư khi xóa quỹ.
- **Thống kê chi tiêu:** Phân loại theo nhóm việc/danh mục, biểu đồ trực quan, tổng kết tuần và tháng.

### 3. Thông báo nhắc lịch thông minh (Hybrid)
- **Trên Android (Native APK):** Hẹn giờ trực tiếp qua **Android AlarmManager** (`@capacitor/local-notifications`). **0% tốn RAM hay pin ngầm**, chuông vẫn reo chính xác từng giây ngay cả khi tắt màn hình hoặc tắt ứng dụng.
- **Trên Windows / Web Desktop:** Tự động fallback sử dụng Web `Notification` API quét định kỳ.
- Tuỳ chọn thời gian báo trước linh hoạt: *Đúng giờ*, *trước 5 phút*, *10 phút*, *15 phút* hoặc *30 phút*.

### 4. Tối ưu trải nghiệm Android Native
- **Xử lý nút Back vật lý:** Bấm Back để đóng hộp thoại/modal, quay lại Trang chính, và bấm 2 lần để thoát ứng dụng an toàn.
- **Thanh trạng thái (Status Bar) động:** Tự đổi màu nền và màu icon tương thích tức thì khi chuyển đổi giao diện Sáng/Tối.
- **Bộ nhận diện & Màn hình chờ (Splash Screen):** Tích hợp logo ly cà phê và chú mèo đặc trưng trên nền be trang nhã.

### 5. Tài khoản & Đồng bộ Đám mây (Supabase)
- Đăng nhập an toàn qua Supabase Auth, bảo mật Row Level Security (RLS).
- Đồng bộ đa chiều, chống nhân đôi sự kiện khi chuyển đổi thiết bị.
- Hỗ trợ xóa tài khoản an toàn kèm cơ chế xóa sạch dữ liệu (Cascade Delete).
- Hoạt động 100% khi mất mạng nhờ bộ nhớ cục bộ và Service Worker PWA.

---

## 💻 Chạy thử trên máy tính (Development)

Cần cài đặt [Node.js](https://nodejs.org) (phiên bản 18+).

```bash
# 1. Cài đặt thư viện
npm install

# 2. Khởi chạy môi trường phát triển
npm run dev
```

Mở địa chỉ hiện ra trên terminal (thường là `http://localhost:5173/`).

---

## 📱 Biên dịch cho Android (Android Build)

### Cách 1: Tải file APK tự động từ GitHub (Khuyên dùng)
Dự án đã tích hợp sẵn GitHub Actions workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml). Mỗi khi push mã nguồn lên nhánh `main`, GitHub sẽ tự động build file `.apk`. Bạn chỉ cần vào tab **Actions** trên GitHub để tải về.

### Cách 2: Biên dịch thủ công bằng Android Studio trên máy
```bash
# 1. Build mã nguồn web
npm run build

# 2. Đồng bộ vào thư mục Android
npx cap sync android

# 3. Mở dự án trong Android Studio
npx cap open android
```

---

## 🛠️ Cấu trúc thư mục

```
ca-phe/
├── android/                    # Dự án Android Native (Capacitor)
│   ├── app/src/main/res/       # Icons mipmap & Splash screens
│   └── app/src/main/           # AndroidManifest.xml & MainActivity.java
├── public/                     # Tài nguyên web tĩnh & icons PWA
├── src/
│   ├── App.jsx                 # Giao diện chính & điều hướng
│   ├── googleAuth.js           # Quản lý xác thực Google OAuth2 (GIS)
│   ├── googleCalendar.js       # Tích hợp Google Calendar API v3
│   ├── googleTasks.js          # Tích hợp Google Tasks API v1
│   ├── googleSync.js           # Bộ điều phối đồng bộ 2 chiều Google
│   ├── GoogleSyncModal.jsx     # Giao diện kết nối & cài đặt Google Sync
│   ├── notificationManager.js  # Hệ thống thông báo nhắc việc Hybrid
│   ├── NotificationModal.jsx   # Giao diện cài đặt thông báo
│   ├── supabase.js             # Kết nối Supabase Client & Auth
│   ├── supabaseSync.js         # Đồng bộ dữ liệu Supabase Cloud
│   ├── taskIdentity.js         # Thuật toán fingerprint chống trùng lặp
│   └── style.css               # Phong cách giao diện & theme tokens
├── supabase/
│   └── schema.sql              # Định nghĩa bảng, RLS & RPC functions
├── .github/workflows/
│   ├── deploy.yml              # Tự động xuất bản lên GitHub Pages
│   └── build-apk.yml           # Tự động biên dịch file APK
├── capacitor.config.json       # Cấu hình Capacitor container
└── vite.config.js              # Cấu hình Vite & PWA Workbox
```

---

## 📄 Bản quyền
Ứng dụng cá nhân phục vụ học tập và quản lý cuộc sống sinh viên.
