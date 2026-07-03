# Đăng Reel Facebook qua GitHub Actions

Đăng video Reel từ **Lark Base** lên **Facebook Page** mà **không cần bật máy**.
GitHub Actions chạy `post-reels-api.js` trên cloud, kích hoạt bằng 1 request HTTP.

## Cách hoạt động
```
Lark Base (TT Reel = "Chờ đăng")
   │  HTTP dispatch  →  GitHub Actions chạy post-reels-api.js MỘT lần
   ▼
1. Lark Open API: quét dòng "Chờ đăng" → tải video
2. FB Graph API video_reels (start → upload → finish/PUBLISHED)
3. Ghi ngược Base: TT Reel="Đã đăng" + Link Reel + Log (hoặc "Lỗi" + lý do)
```
Engine chỉ dùng Node 18+ (không dependency, `fetch` có sẵn). Không quét nền — mỗi lần gọi chạy 1 lần.

## 1. Cấu hình một lần trên GitHub
Repo → **Settings → Secrets and variables → Actions**

**Secrets** (bí mật):
| Tên | Giá trị |
|---|---|
| `LARK_APP_SECRET` | App secret của Lark app |
| `FB_PAGE_TOKEN` | Page Access Token của Fanpage (loại lâu dài ~60 ngày) |

**Variables** (không bí mật — mặc định khi request không truyền):
| Tên | Ví dụ |
|---|---|
| `LARK_APP_ID` | `cli_xxxxxxxxxxxxxxxx` |
| `LARK_APP_TOKEN` | base token chứa bảng Đăng Reel |
| `LARK_TABLE_ID` | `tblXXXXXXXXXXXXXX` |
| `FB_PAGE_ID` | id Fanpage |
| `LARK_DOMAIN` | `https://open.larksuite.com` (Lark quốc tế) hoặc `https://open.feishu.cn` |

> App Lark cần quyền **bitable (đọc/ghi)** và **drive (tải media)**. FB Page Token cần scope
> `pages_read_engagement`, `pages_manage_posts` (và `pages_manage_engagement` nếu dùng auto-comment).

## 2. Gọi đăng qua HTTP
```bash
curl -X POST https://api.github.com/repos/thanhhiensanotel-maker/mentor_camp/dispatches \
  -H "Authorization: Bearer <GITHUB_PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"dang-reel"}'
```
- **PAT**: GitHub Personal Access Token **classic**, scope `repo`.
- **Thành công = HTTP 204** (không có body). Xem kết quả ở tab **Actions → dang-reel**.
- Truyền override qua `client_payload` (không bắt buộc nếu đã đặt Variables):
```json
{"event_type":"dang-reel","client_payload":{
  "fb_page_id":"...", "lark_app_token":"...", "lark_table_id":"...",
  "respect_schedule":"false"
}}
```
`respect_schedule:"false"` = đăng tất cả dòng "Chờ đăng" ngay, bỏ qua cột "Lịch đăng".

## 3. Chạy thử an toàn
Tab **Actions → dang-reel → Run workflow**, đặt `dry_run = true`: chỉ liệt kê các dòng sẽ đăng, không đăng thật.

## Nối vào Lark Base (tùy chọn)
Dùng action **"Gửi yêu cầu HTTP"** trong automation Lark Base, method `POST`, URL và body như mục 2
(để PAT trong header). Bấm/hẹn lịch trong Lark → tự đăng.

## Bảng field Lark Base (đúng tên, phân biệt hoa/thường & dấu)
| Field | Kiểu | Vai trò |
|---|---|---|
| `TT Reel` | Single Select | **Chờ đăng** (kích hoạt) / Đã đăng / Lỗi |
| `Ảnh/video` | Attachment | Video MP4 dọc 9:16, 3–90s |
| `Nội dung` | Text | Caption |
| `Hastag` | Text | Hashtag (ghép dưới caption) |
| `Lịch đăng` | DateTime | Hẹn giờ (trống = đăng ngay) |
| `Link Reel` | Text/URL | Máy ghi link sau khi đăng |
| `Log đăng Reel` | Text | Máy ghi OK / lỗi |
| `Comment ebook` | Text | (tùy chọn) auto-comment #1 sau khi đăng |

## Lưu ý bảo mật & vận hành
- **KHÔNG** commit token thật vào repo. Token chỉ nằm trong GitHub Secrets.
- FB Page Token hết hạn (~60 ngày) → chỉ cập nhật lại Secret `FB_PAGE_TOKEN`, không sửa code.
- Nếu từng lộ secret ở đâu đó → **rotate** (tạo lại) ngay.
