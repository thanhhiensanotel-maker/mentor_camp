# Đăng bài Facebook (đa Page) qua GitHub Actions

Đăng ảnh/video từ **Lark Base** lên nhiều **Facebook Page** mà **không cần bật máy**.
GitHub Actions chạy `post-feed-api.js` trên cloud, kích hoạt bằng 1 request HTTP hoặc nút bấm.

## Cách hoạt động
```
Lark Base:
  • Bảng "14.3 Đăng bài Fanpage"  → mỗi dòng: cột Page + Ảnh/video + Nội dung + Trạng thái
  • Bảng "14.1 Pages"             → mỗi page: ID + access_token (token đăng bài)
   │  HTTP dispatch / nút bấm  →  GitHub Actions chạy post-feed-api.js MỘT lần
   ▼
1. Đọc bảng Pages → map từng Page ra token riêng
2. Quét bảng đăng bài: dòng nào Trạng thái ≠ "Thành công" + có Page + có file → đăng
3. Đăng đúng token của Page đó (ảnh: /photos + /feed; video: /videos)
4. Ghi ngược: Trạng thái="Thành công" + Link bài đăng + Log (hoặc "Thất bại" + lý do)
```
Engine chỉ dùng Node 18+ (không dependency). Không quét nền — mỗi lần gọi chạy 1 lần.
**Điểm mạnh:** token FB nằm trong bảng Pages của Lark → GitHub chỉ giữ đúng 1 secret.

## Điều kiện để 1 dòng được đăng
- `Trạng thái` **≠ "Thành công"** (dòng đã đăng thì bỏ qua)
- Cột **Page** có trỏ tới 1 page (bảng 14.1) có sẵn `ID` + `access_token`
- Cột **Ảnh/video** có file
- `Lịch đăng bài` trống **hoặc** đã tới giờ (đặt `respect_schedule=false` để bỏ qua lịch, đăng ngay)

## 1. Cấu hình trên GitHub (làm 1 lần)
Repo → **Settings → Secrets and variables → Actions → tab Secrets** → **New repository secret**:

| Name | Value |
|---|---|
| `LARK_APP_SECRET` | App secret của Lark app (app có quyền trên base) |

Các định danh khác (app_id, base token, table id, pages table id, domain) đã ghi sẵn trong
`.github/workflows/dang-reel.yml` — không phải khai thêm. Đổi bảng/base thì sửa các dòng đó.

> App Lark cần được **thêm làm cộng tác viên (Can edit)** trên base, và có scope **bitable** + **drive**.
> Token FB trong bảng Pages phải là Page Access Token còn hạn.

## 2. Gọi đăng qua HTTP
```bash
curl -X POST https://api.github.com/repos/thanhhiensanotel-maker/mentor_camp/dispatches \
  -H "Authorization: Bearer <GITHUB_PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"dang-reel"}'
```
- **PAT**: GitHub Personal Access Token **classic**, scope `repo`.
- **Thành công = HTTP 204**. Xem kết quả ở tab **Actions → dang-reel**.
- Bỏ qua lịch, đăng tất cả ngay: thêm `"client_payload":{"respect_schedule":"false"}`.

## 3. Nút bấm ngay trên Lark Base
Lark Base → **Tự động hóa** → tạo automation:
1. Trigger **Khi nút được nhấn** → tạo nút, ví dụ "Đăng ngay"
2. Hành động **Gửi yêu cầu HTTP**: POST tới URL ở mục 2, thêm 3 header
   (`Authorization: Bearer <PAT repo>`, `Accept: application/vnd.github+json`, `Content-Type: application/json`),
   body `{"event_type":"dang-reel"}`
3. Lưu & bật → bấm nút trên bất kỳ dòng nào để chạy

## 4. Chạy thử an toàn
Tab **Actions → dang-reel → Run workflow**, đặt `dry_run = true`: chỉ liệt kê dòng sẽ đăng, không đăng thật.

## Cột trong bảng "14.3 Đăng bài Fanpage"
| Field | Vai trò |
|---|---|
| `Page` (link → 14.1 Pages) | Chọn page để đăng |
| `Loại` (Hình ảnh / Video) | Kiểu bài (tự đoán theo file nếu trống) |
| `Ảnh/video` (Attachment) | 1 video, hoặc nhiều ảnh |
| `Nội dung` | Caption |
| `Comment ebook` | (tùy chọn) auto-comment #1 sau khi đăng |
| `Lịch đăng bài` (DateTime) | Hẹn giờ (trống = đăng ngay) |
| `Trạng thái` (Thành công/Thất bại) | Máy ghi kết quả; "Thành công" = bỏ qua lần sau |
| `Link bài đăng` | Máy ghi link sau khi đăng |
| `Log` | Máy ghi OK / lỗi |

## Ghi chú
- **KHÔNG** commit token thật vào repo. Chỉ `LARK_APP_SECRET` nằm trong GitHub Secrets; token FB ở bảng Pages.
- Page Access Token hết hạn → cập nhật lại trong **bảng Pages (Lark)**, không đụng code/secret.
- `post-reels-api.js` (trong cùng thư mục) là bản đăng **Reel 1 page** — schema bảng khác, chỉ dùng khi cần Reel đơn page.
