# skill-dang-wordpress

Đăng bài blog **WordPress** chuẩn SEO/GEO từ bảng nội dung **Lark Base**, chạy trên
**GitHub Actions** (máy tắt vẫn chạy). Song sinh của `skill-dang-reel-facebook`.

## Chạy thế nào
Workflow `.github/workflows/dang-wordpress.yml`:
- Bấm nút **"Đăng"** trong bảng Lark 18.2 → Lark gửi `repository_dispatch` (event `dang-wordpress`).
- Hoặc **cron 6h sáng VN** tự chạy.
- Hành động: đọc bài **"Chờ đăng"** trong Lark → đăng lên WordPress → ghi **"Đã đăng"** + link.

## Secrets cần đặt (Settings → Secrets and variables → Actions)
| Secret | Là gì |
|---|---|
| `LARK_APP_SECRET` | App secret Lark (đã có sẵn — dùng chung với dang-reel) |
| `WP_APP_PASSWORD` | Application Password của WordPress (Người dùng → Hồ sơ) |

Các thông tin còn lại (site, user, base/table, tên cột) để thẳng trong workflow (không bí mật).

## Nguồn bài
Bài do Claude viết được đổ vào bảng Lark nội dung (table `tblrTJbF7f9Zgknr`) với trạng thái
"Chờ đăng". Workflow chỉ lấy bài "Chờ đăng" để đăng, xong đổi "Đã đăng".

## Chạy local (tuỳ chọn)
Xem thư mục `wordpress-studio` trên máy: có `.env`, các file .bat, HƯỚNG DẪN.md.
Không có `LARK_APP_SECRET` thì tự fallback dùng `lark-cli`.
