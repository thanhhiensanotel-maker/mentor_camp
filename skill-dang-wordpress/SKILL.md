---
name: dang-bai-tu-dong-wordpress
description: >
  Bộ skill TRỌN GÓI: tự VIẾT bài blog chuẩn SEO + AEO + AIO + GEO (quy trình SIPOC của
  SANOTEL/Nội Thất Cho Con) rồi ĐĂNG tự động lên website WordPress, có bảng Lark làm bàn
  điều khiển và GitHub Actions chạy trên mây (bấm nút Lark hoặc cron 6h sáng — máy tắt vẫn chạy).
  Bài đạt: >1500 từ, heading đánh số + in đậm, ảnh có caption căn giữa + logo + ảnh bìa,
  meta ~150 ký tự, mật độ từ khoá 1-3%, backlink, CTA liên hệ (không lộ chữ "CTA"),
  font Times New Roman, danh mục "Tin tức", FAQ + schema, và XANH cả 2 chỉ số Yoast.
  Dùng khi người dùng muốn: viết + đăng blog WordPress tự động, viết bài chuẩn SEO/AEO/AIO/GEO,
  lên lịch bài 6h sáng, đổ bài vào Lark chờ duyệt, đăng bài nội thất/giường tầng/bàn nâng hạ.
  Kích hoạt khi có từ: đăng bài wordpress, viết blog, viết bài seo, đăng bài tự động,
  bài blog chuẩn seo geo, đăng bài 6h sáng, đổ bài vào lark, viết blog nội thất, noithatchocon,
  wordpress studio, viết blog sanotel.
---

# Skill: Đăng bài tự động WordPress (viết + đăng, chuẩn SEO/AEO/AIO/GEO)

Một skill trọn gói: **VIẾT** nội dung đạt chuẩn → **ĐĂNG** tự động lên web.
Gồm 2 phần: **A. VIẾT** (nội dung) và **B. ĐĂNG** (cơ chế). Đọc cả hai trước khi làm.

## Vị trí & kết nối
- **App chạy máy:** `d:\Hien's Brain\wordpress-studio\` (`.venv`, `.env`, file .bat, HƯỚNG DẪN/QUY TRÌNH.md).
- **Bản chạy mây:** repo `thanhhiensanotel-maker/mentor_camp` → `skill-dang-wordpress/` + workflow
  `.github/workflows/dang-wordpress.yml` (event `dang-wordpress` + cron `0 23 * * *` = 6h sáng VN).
- **WordPress:** https://noithatchocon.com — REST API + Application Password. Bẫy: hosting chặn
  `/users/me` và upload `/media` (403) → xác thực qua `/posts?context=edit`; ảnh bìa upload qua **XML-RPC**.
- **Lark base** `BuH1b5axjaKZotsTQO9jlwTAp4b` (app `cli_aaae89e966f85e17`):
  bảng NỘI DUNG `tblrTJbF7f9Zgknr` (18.2), bảng DANH SÁCH WEB `tbllbBoFFJzjTsYo` (18.1).
- `app/lark.py` tự chọn: có `LARK_APP_SECRET` → Lark Open API (mây); không → lark-cli (máy).

---
# PHẦN A — VIẾT NỘI DUNG (chuẩn SEO + AEO + AIO + GEO)

## A0. Đầu vào cần có
Chủ đề + **từ khoá chính (≤4 chữ)** + từ khoá đuôi dài; insight khách (CHÂN DUNG KHÁCH HÀNG
SANOTEL.xlsx); bộ từ khoá web (TỪ KHÓA WEB); plan (Content Marketing planning.xlsx). Research:
keywordtool.io, Google Trends VN. Chưa có file thì hỏi người dùng / chốt từ khoá tay.

> 📚 **Tri thức SEO lõi:** đọc `references/seo-blog-checklist.md` (checklist 9 khối + bảng vị trí
> từ khoá + gate xanh Yoast, dựa trên Yoast/Backlinko/Ogilvy). Mẫu brief: `references/phieu-bai-viet.md`.

## A1. 🎯 4 LỚP TỐI ƯU (bắt buộc phủ đủ)
- **SEO — Google xếp hạng:** từ khoá ở tiêu đề/slug/meta/H2/alt; mật độ **1-3%**; >1500 từ;
  heading số + đậm; link nội bộ + link ngoài; ảnh có alt.
- **AEO — Answer Engine (featured snippet, trợ lý giọng nói):** mỗi H2 (câu hỏi) có **câu trả lời
  thẳng 40-60 từ**; dùng danh sách/bảng; **bắt buộc FAQ + schema FAQPage** (`blog.faq_block`).
- **AIO — Google AI Overview / trợ lý AI:** đầu bài có **khối "Tóm tắt nhanh"** (`blog.key_takeaways`);
  phủ đủ chủ đề phụ + câu hỏi "mọi người cũng hỏi"; thông tin cập nhật, rõ thực thể.
- **GEO — ChatGPT/Gemini trích dẫn:** đầu bài có **đoạn trả lời trực tiếp** (`blog.answer_box`);
  câu ngắn tự đứng độc lập, giàu **số liệu + định nghĩa**; giọng đáng tin (E-E-A-T).

## A2. Checklist ĐỊNH DẠNG & SEO (bắt buộc)
- [ ] **> 1500 từ**, viết ở **vị thế khách hàng**, giải **nỗi đau**, bố cục **liệt kê** (ul/ol), không đoạn dài.
- [ ] **Tiêu đề KHÔNG có dấu ":"** (dùng " - " nếu cần), ngắn gọn, chứa **key chính ≤4 chữ**.
- [ ] **Heading & subheading ĐÁNH SỐ + IN ĐẬM** (`blog.heading(no,text,level)`), mỗi H2 nên có ≥1 H3.
- [ ] **Ảnh ≥4-5**, có **caption CĂN GIỮA** + alt chứa từ khoá + **logo công ty** (`images.figure()`).
      Ảnh lấy từ `Ảnh đăng web/<thương hiệu>/`; ảnh chưa có logo → đóng bằng GOUP Watermark.
- [ ] **Ảnh bìa (thumbnail)** đẹp, liên quan (tự upload qua XML-RPC — xem B).
- [ ] **Meta ~150 ký tự**, chứa key; **slug** ngắn không dấu chứa key; key chính + đuôi dài ≥1 lần.
- [ ] **Backlink** vào từ khoá chính → FB/TikTok/YouTube/Website (`.env` BRAND_*); có ≥1 **link nội bộ**.
- [ ] **CTA liên hệ cuối bài** — lời kêu gọi tự nhiên (`blog.cta()`), **TUYỆT ĐỐI không viết chữ "CTA"**.
- [ ] **Font Times New Roman** (`blog.times_new_roman(html)` bọc toàn thân bài).
- [ ] Readability xanh: câu ngắn (<20 từ), đoạn 2-4 câu, subheading đều, dùng từ nối, ít câu bị động.

## A3. KIỂM TRA TRƯỚC KHI ĐĂNG (bắt buộc — bằng code)
`blog.check_quality(article)` PHẢI trả về **rỗng**. Nó chặn: <1500 từ · mật độ ngoài 1-3% ·
thiếu key ở tiêu đề/meta · tiêu đề có ":" · <4 ảnh · lộ chữ "CTA" · thiếu CTA liên hệ ·
heading chưa in đậm · caption chưa căn giữa · thiếu FAQ schema · thiếu đoạn trả lời trực tiếp/tóm tắt.
Chưa đạt → viết bù / giảm từ khoá rồi kiểm lại, **KHÔNG đăng vội**.

---
# PHẦN B — ĐĂNG BÀI (cơ chế, miễn phí)

## B1. Công thức đăng 1 bài hoàn chỉnh
```python
from app import blog, images, wordpress, lark
KW = "bàn nâng hạ chống gù"                 # key chính ≤4 chữ
body = (blog.answer_box("Trả lời trực tiếp 40-60 từ…")       # GEO/AEO
        + blog.key_takeaways(["ý chính 1", "ý chính 2", "…"])# AIO
        + images.figure("Ảnh đăng web/…/1.png", "caption chứa từ khoá")  # caption căn giữa
        + blog.heading("1", "Tiêu đề mục", 2) + "<p>…</p>"   # heading số + đậm
        + blog.heading("1.1", "Mục con", 3) + "<p>…</p>"
        + blog.cta("Cần tư vấn?", "https://noithatchocon.com/lien-he")   # không lộ chữ CTA
        + blog.backlinks(config.BRAND_FB, config.BRAND_TIKTOK, config.BRAND_YOUTUBE, config.BRAND_WEBSITE)  # BẮT BUỘC đủ 4 kênh
        + blog.faq_block(faq, start_no=9))                   # FAQ + schema JSON-LD
content = blog.times_new_roman(body)                         # font Times New Roman
article = {"title": f"… {KW} …", "slug": "…-khong-dau",
           "meta_description": "≤150 ký tự chứa key", "focus_keyword": KW,
           "content_html": content, "faq": [], "tags": ["…"]}

issues = blog.check_quality(article)                         # ⚠️ phải RỖNG
if issues: raise SystemExit(issues)

res = wordpress.publish(article, status="publish", category=17,   # 17 = "Tin tức"
                        featured_image="Ảnh đăng web/…/1.png")     # ảnh bìa qua XML-RPC
lark.push_article(article, status="Đã đăng")                # hoặc "Chờ đăng" để duyệt
```

## B2. Lệnh CLI (chạy trong wordpress-studio, `.venv\Scripts\activate`)
```
python -m app.cli test          # kiểm tra kết nối WordPress
python -m app.cli lark-test     # liệt kê bài "Chờ đăng" trong Lark
python -m app.cli post "chủ đề" -y   # viết + đăng 1 bài
python -m app.cli queue -y      # đăng tất cả bài "Chờ đăng" từ Lark
```
Trên mây: bấm nút **"Đăng"** ở bảng Lark 18.2, hoặc **cron 6h sáng** tự chạy `queue`.

## B3. Module đã đóng gói (khỏi làm tay)
- **`images.py`**: `figure(path,caption)` nén + nhúng data-URI ảnh trong bài (né chặn upload REST),
  caption căn giữa; `upload_featured(post_id,path)` upload **ảnh bìa qua XML-RPC** + retry khi 403.
- **`blog.py`**: `answer_box` (GEO/AEO) · `key_takeaways` (AIO) · `faq_block` (AEO/GEO) ·
  `heading` (số+đậm) · `cta` · `times_new_roman` · **`check_quality`** (cổng chất lượng).
- **`wordpress.publish(..., category=17, featured_image=path)`**: tự set focus keyword + meta +
  **điểm Yoast** `_yoast_wpseo_linkdex`/`content_score`=90 → XANH cả trong lẫn ngoài; tự upload ảnh bìa.

## B4. Bẫy đã xử (đừng lặp lại)
- KHÔNG gửi khoá điểm Yoast trong POST tạo bài (WP từ chối cả bài) → set ở call RIÊNG sau (publish đã làm).
  Cần **snippet Yoast-REST** đã đăng ký 5 khoá (focuskw, metadesc, title, linkdex, content_score).
- `tags` phải là ID, không phải tên → `ensure_tags` tự chuyển.
- XML-RPC hay **403 chặn nhịp** → retry (đã có trong `upload_featured`).
- Ảnh bìa chỉ set ở **luồng viết local** (có file); bài cloud lấy từ Lark giữ ảnh trong bài (data-URI đã nhúng).
- Hosting hay **cache** → sau đăng/sửa bảo người dùng F5/Purge cache.

## B5. An toàn
- Giai đoạn đầu để `WP_DEFAULT_STATUS=draft` (nháp chờ duyệt); tin tưởng rồi đổi `publish`.
- Bài đi qua Lark để duyệt; đăng nhầm vẫn xoá/sửa trong wp-admin.
- KHÔNG ghi mật khẩu WordPress vào Lark; giữ trong `.env` (máy) + GitHub Secrets (mây).

Related: skill-dang-reel-facebook (bản Facebook), [[goup-watermark-tool]] (đóng logo ảnh),
[[viet-bai-seo-chuan]] (skill SEO chung).
