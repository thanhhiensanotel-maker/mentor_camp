---
type: output
title: Skill sạch "Viết bài SEO chuẩn" — bàn giao học viên
created: 2026-06-20
tags: [skill, seo, viet-bai, ban-giao, hoc-vien, wordpress]
sources: [hmh-AIOS-dang-bai-seo]
---

# Skill sạch "Viết bài SEO chuẩn" (bàn giao học viên)

> Câu hỏi gốc của anh Hóa: *"Lấy cho A Skill viết SEO WEB chuẩn Seo."*

Bóc skill nội bộ `hmh-AIOS-dang-bai-seo` thành **bản skill học viên cài được ngay** — giữ phần giá trị lõi
(tri thức viết bài chuẩn SEO + checklist 9 khối), bỏ mọi thứ bám máy của anh.

## Đã thay / loại bỏ (so với skill gốc)
- `hoangminhhoa.com`, base_token `TxSrb3qK...`, table `tblZvnfl...` → placeholder / `.env` của học viên.
- Đường dẫn máy `C:\Users\Admin\...`, `.secrets/wordpress.env` → `.env` generic.
- Royal MCP (giải pháp WAF riêng của site anh) → ghi chú generic "dùng upload-by-JSON hoặc upload tay".
- Map rebrand HMH, danh mục ép "BLOG", scheduled task "HOA - Dang Bai SEO 11AM" → bỏ / generic hoá.

## Bộ gồm
```
skill-ban-giao/
├── README-CAI-SKILL.md                 # cách copy vào ~/.claude/skills/ + cách dùng
└── viet-bai-seo-chuan/
    ├── SKILL.md                        # bộ não: viết bài chuẩn SEO + tuỳ chọn đăng WP REST
    ├── phieu-bai-viet.md               # phiếu học viên điền cho mỗi bài
    └── references/seo-blog-checklist.md# tri thức SEO lõi (9 khối + bảng vị trí từ khoá + gate Yoast)
```

## Cách học viên dùng
1. Copy `viet-bai-seo-chuan/` vào `~/.claude/skills/` → khởi động lại Claude.
2. Điền `phieu-bai-viet.md` (từ khoá chính + outline + meta...).
3. Bảo Claude: *"Viết bài SEO chuẩn theo phiếu này."* → ra bài HTML chuẩn từ khoá trong `output/`.
4. (Tuỳ chọn) Đăng WordPress: tạo Application Password → điền `.env` (`WP_URL`/`WP_USER`/`WP_APP_PASSWORD`) → Claude đăng qua REST.

## Kiểm chứng
- Quét grep toàn bộ: **0 thông tin cá nhân** rò rỉ.

Liên quan: SOP & bản Skill sạch "Nhà máy phễu" (`output/2026-06-20-sop-nha-may-pheu-ban-giao/`); SOP chuyển giao task đăng bài 11h (`output/2026-06-20-sop-chuyen-giao-dang-bai-11h/`).
