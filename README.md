# Movie Booking — Hướng dẫn cài đặt và chạy

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---|---|
| [Node.js](https://nodejs.org) | 18+ |
| npm | đi kèm Node.js |
| MongoDB | Atlas (cloud) **hoặc** MongoDB Community 6+ (local) |

---

## 1. Clone và cài đặt dependencies

```bash
git clone <url-repo>
cd movie_booking
npm install
```

---

## 2. Cấu hình biến môi trường

Sao chép file mẫu rồi điền thông tin kết nối:

```bash
cp .env.example .env
```

Mở `.env` và chỉnh sửa:

```env
# === Dùng MongoDB Atlas (khuyến nghị) ===
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>/<DATABASE>?retryWrites=true&w=majority

# === Hoặc dùng MongoDB local ===
# MONGODB_URI=mongodb://127.0.0.1:27017/db_movie_booking

MONGODB_DB=db_movie_booking
PORT=3000
```

### Dùng MongoDB Atlas

1. Đăng nhập [MongoDB Atlas](https://cloud.mongodb.com), tạo cluster miễn phí (M0).
2. Vào **Database Access** → tạo user với quyền `readWrite`.
3. Vào **Network Access** → thêm IP của bạn (hoặc `0.0.0.0/0` để cho phép mọi IP).
4. Vào cluster → **Connect** → **Drivers** → sao chép chuỗi kết nối dán vào `MONGODB_URI`.

### Dùng MongoDB local

Đảm bảo MongoDB đang chạy trên máy:

```bash
# Windows (nếu cài MongoDB Community)
net start MongoDB
```

Khi dùng local, không cần thay `MONGODB_URI` — giá trị mặc định `mongodb://127.0.0.1:27017` sẽ được dùng.

> **Lưu ý:** Tính năng tích điểm tự động (Change Streams) yêu cầu MongoDB chạy ở chế độ Replica Set. Khi dùng Atlas hoặc local standalone thông thường, tính năng này sẽ tự động bị bỏ qua — ứng dụng vẫn hoạt động bình thường.

---

## 3. Seed dữ liệu mẫu (tùy chọn)

Nếu database còn trống, chạy lệnh sau để tạo dữ liệu mẫu (phim, phòng, suất chiếu, coupon):

```bash
node database/seed/index.js
```

> Tài khoản mặc định cũng được tạo tự động mỗi lần server khởi động — không cần seed thêm.

---

## 4. Khởi động server

```bash
# Chạy thường
npm start

# Chạy với auto-reload khi sửa code (development)
npm run dev
```

Server chạy tại: **http://localhost:3000**

---

## 5. Tài khoản mặc định

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `user.customer@gmail.com` | `12341234` | Khách hàng |
| `user.staff@gmail.com` | `12341234` | Nhân viên |
| `user.admin@gmail.com` | `12341234` | Quản lý |

---

## Cấu trúc project

```
movie_booking/
├── backend/
│   ├── server.js          # Entry point
│   ├── config/db.js       # Kết nối MongoDB
│   └── routes/            # Các API route (movies, bookings, auth, ...)
├── database/
│   ├── crud/              # Thao tác cơ bản với collection
│   ├── queries/           # Aggregation pipeline phức tạp
│   ├── procedures/        # Logic nghiệp vụ (ghế, doanh thu, coupon)
│   ├── transactions/      # Đặt vé ACID transaction
│   ├── changeStreams/      # Real-time tích điểm khách hàng
│   └── seed/              # Script khởi tạo dữ liệu mẫu
├── frontend/
│   ├── index.html         # Trang chủ danh sách phim
│   ├── seats.html         # Trang chọn ghế
│   ├── admin.html         # Dashboard quản lý
│   ├── css/               # Stylesheet
│   └── js/                # Logic frontend (app, auth, admin, seats)
├── .env.example           # Mẫu cấu hình môi trường
└── package.json
```

---

## API nhanh

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra server |
| GET | `/api/movies` | Danh sách phim đang chiếu |
| GET | `/api/showtimes` | Danh sách suất chiếu |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/bookings` | Đặt vé |
| GET | `/api/admin/revenue` | Báo cáo doanh thu (MANAGER) |

---

## Lỗi thường gặp

**"Fail to Fetch" / "Không thể tải dữ liệu"**
→ Server chưa được khởi động. Chạy `npm start` rồi truy cập `http://localhost:3000`.

**`MongoServerSelectionError`**
→ Sai chuỗi kết nối hoặc IP chưa được thêm vào Network Access trên Atlas.

**`Cannot find module`**
→ Chưa cài dependencies. Chạy `npm install`.
