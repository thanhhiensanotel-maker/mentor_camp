---
name: viet-blog
description: >
  Viết 1 bài blog chuẩn SEO + GEO theo QUY TRÌNH SIPOC của SANOTEL/Nội Thất Cho Con, rồi
  (tuỳ chọn) đăng lên WordPress qua skill dang-bai-wordpress. Bài đạt: >1500 từ, bố cục
  liệt kê + heading đánh số (1, 2, 1.1...), từ khoá chính 4 từ ở tiêu đề, mật độ key chính
  1-3% & key đuôi dài 0.5-1.5%, meta ~150 ký tự, ≥4-5 ảnh có caption + logo, backlink
  FB/TikTok/YouTube/Website, CTA cuối bài, font Times New Roman, danh mục "Chia sẻ",
  và XANH cả 2 chỉ số Yoast (Phân tích SEO + Khả năng đọc).
  Dùng khi người dùng muốn viết bài blog, viết content chuẩn SEO/GEO cho web nội thất,
  lên bài blog nội thất/giường tầng/bàn nâng hạ, viết bài theo quy trình SANOTEL.
  Kích hoạt khi có từ: viết blog, viết bài blog, viết bài seo, viết content nội thất,
  bài blog nội thất, viết blog sanotel, viết blog nội thất cho con.
---

# Skill: Viết Blog (chuẩn SEO + GEO — quy trình SANOTEL)

Viết 1 bài blog đạt chuẩn để đăng WordPress. Sau khi viết xong → dùng skill
**[[dang-bai-wordpress]]** để đổ vào bảng Lark 18.2 và đăng lên web.

## 1. ĐẦU VÀO cần có trước khi viết
Hỏi/đọc các nguồn sau (nếu người dùng chưa đưa):
- **Chủ đề + từ khoá chính** (key chính ~4 từ) và **từ khoá đuôi dài** liên quan.
  Research thêm: keywordtool.io, Google Trends VN (geo=VN).
- **Bộ từ khoá web** (file "TỪ KHÓA WEB") — chọn key chính + phụ cho bài.
- **Insight khách hàng**: "CHÂN DUNG KHÁCH HÀNG SANOTEL.xlsx" — viết đúng nỗi đau, đúng người đọc.
- **Định hướng plan**: "Content Marketing planning.xlsx".
- **GEO**: tối ưu để AI (ChatGPT/Gemini/AI Overview) trích dẫn được — xem
  brandsvietnam.com/congdong/topic/346551-geo... (đoạn trả lời trực tiếp, câu hỏi, số liệu, FAQ).
> Các file trên nằm ở Lark/Drive của chị; nếu chưa có, hỏi người dùng gửi hoặc chốt từ khoá tay.

## 2. QUY TRÌNH VIẾT — checklist BẮT BUỘC
### Nội dung & bố cục
- [ ] **> 1500 từ**.
- [ ] Viết ở **vị thế khách hàng**, giải quyết **nỗi đau** (theo chân dung khách).
- [ ] **Bố cục liệt kê rõ ràng** — KHÔNG viết đoạn dài liên tục; tách ý bằng danh sách (ul/ol).
- [ ] **Heading đánh số**: H2 = `1.`, `2.`, `3.`... ; H3 = `1.1`, `1.2`... (ghi số vào chính tiêu đề mục).
- [ ] Mở bài có **đoạn trả lời trực tiếp** 2-3 câu (cho GEO/AI trích).
- [ ] H2 nên dạng **câu hỏi** người dùng hay tra.
- [ ] **CTA cuối bài** (mời liên hệ/tư vấn/inbox) — viết LỜI KÊU GỌI TỰ NHIÊN, **TUYỆT ĐỐI không viết chữ "CTA"** vào bài.

### SEO on-page
- [ ] **Tiêu đề** ngắn gọn, chứa **key chính** (key chính chỉ ~4 từ).
- [ ] **Meta description ~150 ký tự**, chứa key chính.
- [ ] **Slug** ngắn, không dấu, chứa key chính.
- [ ] **Key chính**: mật độ **1%-3%** (KHÔNG nhồi nhét/spam), xuất hiện ở mở bài + ≥1 H2.
- [ ] **Key đuôi dài**: mật độ **0.5%-1.5%**.
- [ ] Key chính **và** key đuôi dài xuất hiện **tối thiểu 1 lần** trong bài.
- [ ] **Off-page/backlink**: gắn link vào từ khoá chính → **Facebook, TikTok, YouTube, Website**
      (URL lấy từ `.env`/người dùng; xem BRAND_SOCIAL bên dưới).
- [ ] Có ít nhất 1 **link nội bộ** (bài liên quan / trang liên hệ).

### Hình ảnh
- [ ] **Tối thiểu 4-5 hình**, LIÊN QUAN nội dung chủ đề.
- [ ] **Mỗi hình có caption** (tiêu đề hình) liên quan nội dung + **alt chứa từ khoá**.
- [ ] **Tất cả hình có logo công ty** (ảnh sản phẩm SANOTEL đã sẵn logo; ảnh khác → đóng logo bằng
      tool GOUP Watermark trước).
- [ ] **Ảnh thumbnail (đại diện)** đẹp, liên quan.
- [ ] Ảnh lấy từ thư mục `Ảnh đăng web/<thương hiệu>/` (xem [[dang-bai-wordpress]]).

### Định dạng & phân loại
- [ ] **Font Times New Roman**: bọc thân bài trong
      `<div style="font-family:'Times New Roman',Times,serif;">...</div>`.
- [ ] **Danh mục** tích vào **"Chia sẻ"** (tạo category nếu chưa có).

### Chất lượng (Yoast)
- [ ] **Phân tích SEO: XANH** — nhờ đủ tiêu chí trên + ghi focus keyword & meta vào Yoast qua API
      (snippet Yoast-REST đã cài; skill dang-bai-wordpress set `WP_SEO_PLUGIN=yoast`).
- [ ] **Phân tích khả năng đọc: XANH** — để đạt:
      • Câu ngắn (đa số < 20 từ), đoạn ngắn (2-4 câu).
      • Có **subheading** đều đặn (~mỗi 300 từ 1 heading).
      • Dùng **từ nối** (vì vậy, tuy nhiên, ngoài ra, đầu tiên, cuối cùng...).
      • Hạn chế câu bị động.

## 3. ĐĂNG BÀI
Sau khi soạn `article` (schema xem [[dang-bai-wordpress]]) đủ checklist → đăng:
```python
from app import lark, wordpress
# đổ vào bảng Lark 18.2 để duyệt (khuyên dùng)
lark.push_article(article, status="Chờ đăng", loai="Cẩm nang")
# hoặc đăng thẳng WP (đặt category "Chia sẻ"):
wordpress.publish(article, status="publish", category=<id_danh_muc_Chia_se>)
```
- Ảnh: nén nhỏ + nhúng data-URI (hosting chặn upload Media — xem [[dang-bai-wordpress]]).
- Font Times New Roman: đã bọc trong `content_html`.

## 3B. KIỂM TRA TRƯỚC KHI ĐĂNG (bắt buộc — bằng code)
Chạy `blog.check_quality(article)` (xem [[dang-bai-wordpress]]) → PHẢI trả về rỗng.
Nó tự chặn: bài <1500 từ · mật độ từ khoá ngoài 1-3% · thiếu key ở tiêu đề/meta ·
<4 ảnh · lộ chữ "CTA". Chưa đạt thì viết bù / giảm từ khoá rồi kiểm lại, KHÔNG đăng vội.

## 4. ĐẦU RA & KIỂM TRA SAU ĐĂNG (bắt buộc)
- [ ] **Check lại bài đã đăng**: mở bài trong wp-admin → Yoast **Phân tích SEO = Tốt (xanh)** +
      **Khả năng đọc = Tốt (xanh)**.
- [ ] Ảnh hiện đủ, có caption + logo; thumbnail đẹp.
- [ ] Danh mục = "Chia sẻ"; backlink FB/TikTok/YT/Web hoạt động.
- [ ] Không lỗi bố cục (khung mục lục, font).

## 5. MỤC TIÊU (Customers)
Bài phục vụ: **Post Views · Thu lead · Tăng nhận diện thương hiệu**. Viết để vừa lên top vừa
dẫn khách về liên hệ.

---

## BRAND_SOCIAL (điền URL thật vào .env của dang-bai-wordpress)
```
BRAND_FB=https://facebook.com/...
BRAND_TIKTOK=https://tiktok.com/@...
BRAND_YOUTUBE=https://youtube.com/@noithatchocon
BRAND_WEBSITE=https://noithatchocon.com
```
Related: [[dang-bai-wordpress]] (cơ chế đăng), [[viet-bai-seo-chuan]] (skill SEO chung), [[goup-watermark-tool]] (đóng logo ảnh).
