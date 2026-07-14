---
name: dang-bai-wordpress
description: >
  Tự viết bài blog chuẩn SEO + GEO rồi đăng lên website WordPress, có bảng Lark làm bàn điều khiển.
  Luồng: Claude viết bài (tiêu đề ≤60, meta ≤155, slug, H2 dạng câu hỏi, đoạn trả lời trực tiếp cho AI,
  FAQ + schema JSON-LD) → đổ vào bảng nội dung Lark ("Chờ đăng" để duyệt) → đăng lên WordPress qua REST API
  (Application Password) → ghi "Đã đăng" + link về Lark. Chạy được trên máy (wordpress-studio) và trên mây
  (GitHub Actions: bấm nút Lark hoặc cron 6h sáng). Song sinh của skill đăng bài Facebook.
  Dùng khi người dùng muốn: viết blog đăng lên web, đăng bài WordPress tự động, đăng bài chuẩn SEO/GEO,
  lên lịch bài blog 6h sáng, đổ bài vào bảng Lark chờ duyệt.
  Kích hoạt khi có từ: đăng bài wordpress, viết blog đăng web, đăng bài lên web, wordpress studio,
  bài blog chuẩn seo geo, đăng bài 6h sáng, đổ bài vào lark, noithatchocon.
---

# Skill: Đăng bài blog WordPress (SEO + GEO) qua bảng Lark

Tự viết nội dung → đổ vào bảng Lark chờ duyệt → đăng lên WordPress. Bàn điều khiển là bảng Lark.

## Vị trí

- **Bản chạy máy:** `d:\Hien's Brain\wordpress-studio\` (Python app, có `.env`, các file .bat, HƯỚNG DẪN.md, QUY TRÌNH.md).
- **Bản chạy mây:** repo `thanhhiensanotel-maker/mentor_camp` → thư mục `skill-dang-wordpress/`
  + workflow `.github/workflows/dang-wordpress.yml` (repository_dispatch `dang-wordpress` + cron 6h sáng VN).

## Kết nối (đã cấu hình, xem `.env` của wordpress-studio)

- **WordPress:** https://noithatchocon.com — REST API `/wp-json/wp/v2/posts`, xác thực Application Password.
  Bẫy: hosting chặn `/users/me` (chống dò user) nhưng đăng bài vẫn chạy → xác thực qua `/posts?context=edit`.
- **Lark base:** `BuH1b5axjaKZotsTQO9jlwTAp4b` (app `cli_aaae89e966f85e17`).
  - Bảng NỘI DUNG blog: `tblrTJbF7f9Zgknr` (cột: Tiêu đề · Nội dung · Từ khoá SEO · Meta description · Slug · Loại · Trạng thái{Chờ đăng/Đã đăng/Lỗi} · Lịch đăng bài · Link bài đăng · Web).
  - Bảng DANH SÁCH WEB: `tbllbBoFFJzjTsYo` (Tên web · Loại · URL · Tài khoản · App Password).
- `app/lark.py` tự chọn: có `LARK_APP_SECRET` → Lark Open API (mây); không → lark-cli (máy).

## ⚠️ TIÊU CHUẨN NỘI DUNG — BẮT BUỘC theo skill [[viet-blog]]
Mọi bài viết đăng qua skill này PHẢI đạt quy trình SIPOC trong **[[viet-blog]]**:
>1500 từ · bố cục liệt kê + heading đánh số (1, 2, 1.1) · tiêu đề chứa key chính ~4 từ ·
meta ~150 ký tự · mật độ key chính 1-3% & đuôi dài 0.5-1.5% (mỗi loại ≥1 lần) ·
backlink FB/TikTok/YouTube/Website · ≥4-5 ảnh có caption + alt + logo · font Times New Roman
(bọc `<div style="font-family:'Times New Roman',Times,serif;">`) · danh mục "Chia sẻ" (id 256) ·
CTA cuối bài · XANH cả 2 Yoast (SEO + Khả năng đọc). → Đọc [[viet-blog]] trước khi soạn `article`.

## Cách vận hành (miễn phí — Claude Code tự viết, KHÔNG dùng API trả tiền)

1. **Viết bài:** soạn 1 dict `article` ĐÚNG chuẩn [[viet-blog]] (tự viết, đừng gọi Anthropic API).
2. **Đổ vào Lark chờ duyệt:** chạy trong `wordpress-studio` (đã có `.venv`):
   ```python
   from app import lark
   lark.push_article(article, status="Chờ đăng", loai="Cẩm nang")  # thêm schedule="YYYY-MM-DD HH:MM:SS" nếu hẹn giờ
   ```
3. **Đăng lên web:** `python -m app.cli queue -y` — đọc bài "Chờ đăng" → đăng → ghi "Đã đăng" + link.
   (Trên mây: bấm nút "Đăng" trong bảng Lark, hoặc cron 6h sáng tự chạy.)

### Lệnh CLI hay dùng (chạy trong wordpress-studio, `.venv\Scripts\activate`)
```
python -m app.cli test                 # kiểm tra kết nối WordPress
python -m app.cli lark-test            # liệt kê bài "Chờ đăng" trong Lark
python -m app.cli draft "chủ đề"       # soạn thử, không đăng
python -m app.cli post "chủ đề" -y     # viết + đăng thẳng 1 bài
python -m app.cli queue -y             # đăng tất cả bài "Chờ đăng" từ Lark
```

### Schema `article`
```python
article = {
  "title": "...",              # ≤60 ký tự, chứa từ khoá chính
  "slug": "...",               # không dấu, gạch nối, chứa từ khoá
  "meta_description": "...",   # ≤155 ký tự, có từ khoá + CTA nhẹ
  "focus_keyword": "...",
  "tags": ["...", "..."],
  "content_html": "<p>...</p><h2>...</h2>...",  # thân bài; mở đầu có ĐOẠN TRẢ LỜI TRỰC TIẾP; H2 dạng câu hỏi; có danh sách; 1 link nội bộ
  "faq": [{"q": "...", "a": "..."}]             # 3-5 câu → tự gắn <script> JSON-LD FAQPage cho GEO
}
```
`wordpress.assemble_content()` tự ghép FAQ hiển thị + schema JSON-LD; `wordpress.publish()` tự tạo tag.

## An toàn
- `WP_DEFAULT_STATUS=draft` (bài vào nháp chờ duyệt) — giai đoạn đầu để vậy; đổi `publish` khi tin tưởng.
- Bài đi qua Lark để duyệt; đăng nhầm vẫn xoá/sửa trong wp-admin.
- KHÔNG ghi mật khẩu WordPress vào Lark; giữ trong `.env` (máy) và GitHub Secrets (mây).

## Nội dung theo thương hiệu
Định hướng giọng văn / được-không-được nói: xem `QUY TRÌNH.md` trong wordpress-studio.
Ảnh đăng bài: thư mục `Ảnh đăng web/<thương hiệu>/` (Ảnh đại diện · Ảnh trong bài · Ảnh gốc chưa xử lý).

Related: skill-dang-reel-facebook (bản Facebook), viet-bai-seo-chuan.
