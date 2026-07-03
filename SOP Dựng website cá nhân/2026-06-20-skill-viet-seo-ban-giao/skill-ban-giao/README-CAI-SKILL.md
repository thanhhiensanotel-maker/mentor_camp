# Cài Skill "Viết bài SEO chuẩn" vào máy của bạn

> Skill này để **Claude tự viết bài blog chuẩn SEO** (và tuỳ chọn đăng WordPress của bạn). Cài xong, bạn chỉ
> cần điền phiếu bài viết là Claude viết ra bài HTML chuẩn từ khoá.

## Bộ này gồm gì
```
skill-ban-giao/
├── README-CAI-SKILL.md                 # File này
└── viet-bai-seo-chuan/                 # ← thư mục copy vào máy
    ├── SKILL.md                        # Bộ não skill (đã bóc sạch bí mật)
    ├── phieu-bai-viet.md               # Phiếu bạn điền cho mỗi bài
    └── references/
        └── seo-blog-checklist.md       # Tri thức SEO lõi (9 khối + vị trí từ khoá)
```
> ✅ Đã **bóc sạch thông tin cá nhân** — không có domain/tài khoản/Application Password/Base token của ai.

## Cài (1 lần, ~2 phút)
1. Mở thư mục skills của Claude: `~/.claude/skills/` (Windows: `C:\Users\<bạn>\.claude\skills\`).
2. **Copy nguyên thư mục `viet-bai-seo-chuan/`** vào đó → thành `~/.claude/skills/viet-bai-seo-chuan/`.
3. Khởi động lại Claude Code. Kiểm tra: hỏi Claude *"liệt kê skill viết bài SEO"* hoặc gõ `/`.

> Có thể đổi tên thư mục theo thương hiệu của bạn (đổi cả `name:` trong `SKILL.md` cho khớp).

## Dùng
1. Mở `viet-bai-seo-chuan/phieu-bai-viet.md`, điền từ khoá chính + các ô `<...>`.
2. Nói với Claude: *"Viết bài SEO chuẩn theo phiếu này: [dán phiếu]."*
3. Claude đọc checklist → viết bài HTML chuẩn SEO vào `output/`.
4. **(Tuỳ chọn) Đăng WordPress:** tạo Application Password trên website của bạn (wp-admin → Users → Profile →
   Application Passwords), điền vào `.env` (`WP_URL`, `WP_USER`, `WP_APP_PASSWORD`), rồi bảo Claude đăng.

## Nhắc lại bảo mật
- Application Password / token là chìa khoá — để trong `.env`, **không dán vào chat**, không commit lên mạng.
- Skill không tự nhập mật khẩu (rào an toàn) — bạn tự điền `.env`.

---
*Cặp đôi gợi ý: dùng kèm một skill "research từ khoá" để tạo brief trước, rồi skill này viết bài.*
