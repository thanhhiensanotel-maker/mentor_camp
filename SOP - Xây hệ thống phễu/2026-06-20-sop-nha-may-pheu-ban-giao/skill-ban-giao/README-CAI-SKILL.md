# Cài Skill "Nhà máy phễu" vào máy của bạn

> Skill này để **Claude tự chạy** dây chuyền phễu. Khác với SOP (tài liệu cho bạn đọc), Skill là năng lực cài vào Claude — cài xong, bạn chỉ cần nói *"chạy nhà máy phễu theo phiếu đầu bài"* là Claude tự làm.

## Bộ này gồm gì
```
skill-ban-giao/
├── README-CAI-SKILL.md         # File này
└── nha-may-pheu/
    ├── SKILL.md                # Bộ não skill (đã bóc sạch bí mật)
    ├── phieu-dau-bai.md        # Phiếu bạn điền cho mỗi chiến dịch
    └── wrangler.toml.mau       # Mẫu cấu hình Cloudflare Worker
```
> ✅ Toàn bộ đã **bóc sạch thông tin cá nhân** — không có token/App Secret/domain/email của ai. Bạn tự điền tài khoản của mình.

## Cài (1 lần, ~2 phút)
1. Tìm thư mục skills của Claude trên máy bạn — thường là `~/.claude/skills/` (Windows: `C:\Users\<bạn>\.claude\skills\`).
2. **Copy nguyên thư mục `nha-may-pheu/`** vào trong đó → thành `~/.claude/skills/nha-may-pheu/`.
3. Khởi động lại Claude Code. Kiểm tra: gõ `/` xem có skill `nha-may-pheu` trong danh sách không (hoặc hỏi Claude *"liệt kê skill nhà máy phễu"*).

> Có thể giữ tên `nha-may-pheu` hoặc đổi theo thương hiệu của bạn (đổi cả `name:` trong `SKILL.md` cho khớp tên thư mục).

## Dùng
1. Hoàn tất **Setup 1 lần** trong SOP (cài Node/lark-cli/wrangler, nối Lark, tạo App Lark, hộp thư SMTP, Cloudflare + domain). Xem SOP "Nhà máy phễu" trên Wiki.
2. Mở `nha-may-pheu/phieu-dau-bai.md`, điền hết các ô `<...>` (KHÔNG dán mật khẩu — nạp secret bằng lệnh ở cuối phiếu).
3. Mở Claude Code tại thư mục dự án, nói:
   > *"Chạy skill nhà máy phễu theo phiếu đầu bài này: [dán nội dung phiếu]. Chế độ bán tự động."*
4. Claude chạy 10 bước → bạn duyệt 3 chốt (nếu bán tự động) → **bạn tự nạp secret** trên Cloudflare → Claude deploy + gắn domain → nghiệm thu.

## Nhắc lại bảo mật
- Skill **không tự nhập mật khẩu** (rào an toàn). Phần `wrangler secret put` là **bạn tự làm**.
- Đừng commit/đưa lên mạng file `wrangler.toml` đã điền KV id, và tuyệt đối không để lộ App Secret / mật khẩu SMTP.

---
*Đi kèm: SOP "Nhà máy phễu" (tài liệu vận hành cho người) — đã đăng Wiki School.*
