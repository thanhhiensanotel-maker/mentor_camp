---
type: output
title: Xuất bộ skill Đăng Video YouTube hẹn giờ ra output (bản chuyển giao)
created: 2026-06-24
tags: [youtube, skill, dang-video, lark-base, chuyen-giao, scheduled-task]
sources: [youtube-auto-post]
---

# Bộ skill: Đăng video YouTube hẹn giờ từ Lark Base

> Câu hỏi gốc: "ĐÓNG GÓI QUI TRÌNH ĐĂNG YOUTUBE" → "XUẤT FILE SKILL RA OUTPUT".

Đây là bản **xuất ra `output/` để chuyển giao** của skill `hmh-AIOS-dang-video-youtube`
(bản gốc sống tại `.claude/skills/hmh-AIOS-dang-video-youtube/`). Nội dung trong thư mục này
là **bản sao đầy đủ, có thể bê sang máy/khách khác** rồi deploy lại sạch.

## Có gì trong thư mục này

| File / thư mục | Vai trò |
|---|---|
| `hmh-AIOS-dang-video-youtube/` | Bản sao đầy đủ của skill (SKILL.md + scripts + references) |
| `hmh-AIOS-dang-video-youtube.zip` | Bản nén để gửi/chuyển giao nhanh (~18 KB) |
| `hmh-AIOS-dang-video-youtube/SKILL.md` | Tài liệu skill: triết lý gốc (YouTube Data API v3), bảng 12 cột, 3 quy trình, gotchas |
| `scripts/config.js` | base/table/field IDs, scope; override qua env `YT_ROOT/YT_BASE_TOKEN/YT_TABLE_ID` |
| `scripts/auth.js` | Lấy refresh token (OAuth loopback 4119, ép `prompt=consent`) — chạy 1 lần |
| `scripts/youtube.js` | Upload resumable + thumbnail + playlist; map privacy |
| `scripts/lark.js` | Đọc record (định dạng cột) · tải attachment · cập nhật trạng thái |
| `scripts/scan-and-post.js` | Trái tim: quét bảng, đăng video đến hạn, lockfile, dừng khi chạm quota |
| `scripts/register-task.ps1` | Đăng ký Task `HMH-YouTube-AutoPost` mỗi 1 phút (tự định vị `$PSScriptRoot`) |
| `references/huong-dan-tao-oauth-youtube.md` | Hướng dẫn click-by-click tạo OAuth client trên Google Cloud |

> **Lưu ý:** thư mục này **KHÔNG kèm `node_modules`** (nặng). Khi deploy phải chạy `npm install`
> trong `scripts/` để tải `googleapis`.

## Cài lại trên máy khác (3 bước)

```powershell
# 0) Bê thư mục skill về (giải nén .zip) vào nơi muốn chạy, rồi:
cd "<đường-dẫn>\hmh-AIOS-dang-video-youtube\scripts"
npm install                                              # tải googleapis

# 1) Tạo OAuth → bỏ client_secret.json vào .secrets\  (xem references/huong-dan-tao-oauth-youtube.md)
# 2) Lấy refresh token (đăng nhập đúng kênh)
node auth.js

# 3) Đăng ký Task chạy nền mỗi phút
powershell -ExecutionPolicy Bypass -File register-task.ps1
```

Chuyển giao khách khác: tạo bảng Lark "Lịch đăng YouTube" (12 cột), rồi set env
`YT_BASE_TOKEN` / `YT_TABLE_ID` (và `YT_ROOT` nếu `.secrets/` ở nơi khác).

## Trạng thái
- ✅ Skill gốc đã đăng ký (dòng 62 trong `DANH-SACH-SKILL.md`), hệ thống đã nhận diện.
- ✅ Đã verify: `config` load OK (12 field), 4 file JS pass `node -c`.
- ✅ Bản xuất + .zip đã tạo tại thư mục này.

Liên quan: bộ nhớ [[youtube-auto-post]] · hệ thống LIVE đang chạy ở `output/2026-06-17-dang-video-youtube/`.
