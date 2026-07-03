---
type: output
title: SOP bàn giao — Hệ thống "Nhà máy phễu" (học viên tự cài & tự dùng)
created: 2026-06-20
tags: [sop, nha-may-pheu, funnel, ban-giao, hoc-vien, cloudflare, lark, smtp]
sources: [nha-may-pheu-ai-team, hmh-sale-nha-may-pheu]
---

# SOP BÀN GIAO — HỆ THỐNG "NHÀ MÁY PHỄU"

> **Bản dành cho học viên tự triển khai trên tài khoản của chính mình.**
> Mọi thông tin cá nhân (domain, tài khoản, mật khẩu, mã App) trong tài liệu này đều để **chỗ trống dạng `<...>`** — học viên tự điền bằng tài khoản riêng của mình. **Không dùng chung tài khoản với người khác.**

---

## 0. HỆ THỐNG NÀY LÀM GÌ

Một dây chuyền **thu khách tiềm năng (lead) tự động bằng AI**: từ máy trắng → trang đích (landing page) sống trên internet → khách điền form → dữ liệu đổ thẳng vào Lark Base → tự gửi ebook qua email → nuôi dưỡng 10 ngày bằng chuỗi email tự động → đo tỉ lệ mở email.

Bạn chỉ cần đưa **một "Phiếu đầu bài"** (sản phẩm, giá, đối tượng, mục tiêu); AI (Claude) chạy đủ **10 bước phễu** rồi cho ra một chiến dịch LIVE.

### Sơ đồ kiến trúc (4 mảnh nối nhau)

```
        [BẠN + Claude Code]  ──(lark-cli)──►  [LARK BASE]   ← cơ sở dữ liệu: Leads, 10 email
              │  dựng & deploy
              ▼
[Khách] ─► [TRANG WEB + WORKER trên CLOUDFLARE] ─► ghi vào LARK BASE (qua App Lark)
  (điền form)        │
                     ├─► gửi email ebook + nuôi dưỡng  (qua SMTP hộp thư của bạn)
                     └─► cron mỗi sáng: tự gửi chuỗi email + pixel đo mở
```

| Mảnh | Vai trò |
|---|---|
| **Claude Code** | "Người thợ" — nghiên cứu, viết nội dung, tạo bảng, viết code, deploy. Chạy trên máy của bạn. |
| **lark-cli** | Cây cầu để Claude điều khiển Lark Base (tạo bảng, đọc/ghi dữ liệu) bằng danh nghĩa bạn. |
| **Lark** | Chứa **dữ liệu** (Base), gửi **email** (hộp thư + SMTP), cấp **App** để Worker có quyền ghi Base. |
| **Cloudflare + domain** | Nơi **trang web sống công khai** + **backend luôn bật** (nhận form, gửi mail, cron, đo mở). Máy cá nhân không "luôn bật + công khai" được nên cần Cloudflare (gói miễn phí) + 1 tên miền. |

---

## 1. PHẦN MỀM & TÀI KHOẢN PHẢI CHUẨN BỊ

### 1A. Phần mềm cài trên máy (Windows 10/11)

Cài theo đúng thứ tự:

| # | Phần mềm | Lấy ở đâu | Kiểm tra sau khi cài |
|---|---|---|---|
| 1 | **Node.js** (bản LTS) | nodejs.org — cài mặc định | `node -v` và `npm -v` ra số phiên bản |
| 2 | **Git for Windows** (kèm Git Bash) | git-scm.com | mở được "Git Bash" |
| 3 | **Python 3** (tùy chọn, vài script phụ) | python.org — nhớ tick **"Add to PATH"** | `python --version` |
| 4 | **Claude Code** | Theo hướng dẫn chính thức của Anthropic, rồi đăng nhập | mở được `claude` |
| 5 | **lark-cli** | Cài qua `npm` (global) | `lark-cli --version` |
| 6 | **wrangler** (deploy Cloudflare) | Không cần cài riêng — gọi qua `npx wrangler ...` | `npx wrangler --version` |

> Kết quả: máy có `node`, `npm`, `git bash`, `python`, `claude`, `lark-cli`, `npx wrangler`.

### 1B. Tài khoản phải có (đăng ký bằng thông tin của bạn)

| # | Tài khoản | Dùng để làm gì | Chi phí |
|---|---|---|---|
| 1 | **Tài khoản Lark/Feishu** | Chứa Base dữ liệu + hộp thư gửi email | Miễn phí |
| 2 | **Lark Custom App** (tự tạo trong Lark Developer) | Cấp "chìa khóa" cho Worker ghi vào Base | Miễn phí |
| 3 | **Hộp thư công khai + SMTP** (trong Lark Admin) | Địa chỉ gửi email ebook & nuôi dưỡng | Miễn phí |
| 4 | **Tài khoản Cloudflare** | Host trang web + backend luôn bật | Gói miễn phí đủ dùng |
| 5 | **Một tên miền (domain)** | Địa chỉ trang đích, vd `<ten-mien-cua-ban>.com` | ~250–400k/năm |

> ⚠️ Ngoài Claude + Lark, bạn **bắt buộc thêm Cloudflare (miễn phí) + 1 domain**. Đây là phần "luôn bật + công khai" mà máy cá nhân không làm được.

---

## 2. SETUP 1 LẦN (làm một lần, dùng cho mọi chiến dịch sau)

### Bước 2.1 — Nối Claude ↔ Lark (đăng nhập lark-cli)

```
lark-cli auth login
```
- Lệnh hiện **link + mã (device flow)**. Mở link, đăng nhập Lark của bạn, nhập mã → cấp quyền.
- Sau đó Claude (qua lark-cli) đọc/ghi Lark Base **bằng danh nghĩa bạn**.
- Kiểm tra nhanh: nhờ Claude tạo thử 1 Base rồi xóa — chạy được là OK.

### Bước 2.2 — Tạo App Lark (để Worker ghi được Base)

Worker trên Cloudflare cần "chìa khóa" riêng để ghi vào Base:

1. Vào **Lark Developer Console** (`open.larksuite.com/app`) → **Create custom app**.
2. Tab **Permissions & Scopes** → thêm scope **`bitable:app`** (đọc/ghi đa bảng) → **Save**.
3. **Publish / Release** một phiên bản (scope mới chỉ hiệu lực sau khi publish).
4. Tab **Credentials & Basic Info** → ghi lại **App ID** (`cli_...`) và **App Secret**.
5. Mở **Base** sẽ dùng → **... → Add collaborator** → thêm chính **App** này, quyền **Có thể chỉnh sửa**.

> Giữ kín **App Secret**. Đây là chìa khóa ghi vào dữ liệu của bạn.

### Bước 2.3 — Chuẩn bị hộp thư gửi (SMTP)

1. Trong **Lark Admin Console → Mail (Hộp thư)** → tạo/dùng **hộp thư công khai** (vd `hello@<ten-mien-cua-ban>.com`).
2. Bật **dịch vụ IMAP/SMTP** → lấy **mật khẩu SMTP** (khác mật khẩu đăng nhập Lark).
3. Ghi lại 4 thứ: **máy chủ** `smtp.larksuite.com:465`, **user** (địa chỉ thư), **password SMTP**, **tên hiển thị** (vd tên thương hiệu bạn).

### Bước 2.4 — Chuẩn bị Cloudflare + domain

1. **Đăng ký Cloudflare** (miễn phí) tại cloudflare.com.
2. **Đưa domain lên Cloudflare:** Add site → nhập domain → Cloudflare cấp **2 nameserver** → vào nhà cung cấp domain đổi nameserver sang Cloudflare (chờ vài chục phút–vài giờ để active).
3. **Đăng nhập wrangler** trên máy:
   ```
   npx wrangler login
   ```
   (mở trình duyệt, bấm cho phép). Kiểm tra: `npx wrangler whoami`.
4. **Chọn subdomain** cho chiến dịch đầu tiên (vd `khoa1.<ten-mien-cua-ban>.com`) — đảm bảo **chưa trỏ về dịch vụ khác**. Nếu đã trỏ (vd WebCake/Ladipage), gỡ bản ghi DNS cũ trước khi gắn.

> Kết quả của Phần 2: máy đã nối Lark; có **App ID + App Secret**; có **thông tin SMTP**; Cloudflare sẵn sàng, domain active. **Những thứ này dùng lại cho mọi chiến dịch — không phải làm lại.**

---

## 3. MỖI CHIẾN DỊCH — QUY TRÌNH CHẠY

### Bước 3.1 — Điền "Phiếu đầu bài"

Điền hết để AI chạy **một mạch, không phải dừng hỏi**:

```
[SẢN PHẨM] tên: ... | giá: ... | link trang bán: ...
[ĐỐI TƯỢNG] nghề / tuổi / nỗi đau: ...
[MỤC TIÊU] doanh thu/tháng: ... | deadline / khai giảng: ...
[DOMAIN] subdomain dùng: <khoa1.ten-mien-cua-ban.com>  (đã trên Cloudflare & đang rảnh)
[LARK] App ID: cli_... | App Secret: (sẽ nạp dạng secret — KHÔNG dán vào chat)
[EMAIL] hộp thư gửi: ... | tên hiển thị: ... | mật khẩu SMTP: (sẽ nạp dạng secret)
[ZALO] link nhóm: https://zalo.me/g/...
[THƯƠNG HIỆU] ảnh chân dung: ... | testimonial THẬT: ... | số uy tín THẬT: ... | pháp nhân footer: ...
[CẤU HÌNH] chế độ: tự động hoàn toàn / bán tự động (3 chốt) | nền page: HTML-Cloudflare / Ladipage | giờ cron gửi nurture: ...
```

> **Mẹo chạy 0 lần dừng:** chọn chế độ **tự động hoàn toàn** và **nạp sẵn các secret** (Bước 3.4) TRƯỚC khi giao đầu bài. Lý do: AI **không được tự nhập mật khẩu** (rào an toàn) — nếu secret chưa sẵn, AI buộc phải dừng xin.

### Bước 3.2 — Giao đầu bài cho AI

1. Mở **Claude Code** tại thư mục dự án.
2. Dán Phiếu đầu bài + yêu cầu, ví dụ:
   > *"Chạy hệ thống Nhà máy phễu theo Phiếu đầu bài sau: [dán]. Tạo Base + bảng Leads + bảng 10 email; viết ebook/bìa/landing page; dựng Cloudflare Worker (form→Base, gửi ebook SMTP, mời Zalo, cron chuỗi email, pixel đo mở); deploy + gắn subdomain. Chế độ tự động hoàn toàn."*

### Bước 3.3 — AI chạy dây chuyền 10 bước

AI lần lượt: **chiến lược → nghiên cứu thị trường → chọn mồi câu (lead magnet) → bìa → ebook PDF → landing page → tạo bảng Lark + đổ data → email giao ebook → nurture 10 ngày → content Facebook.**

- **Bán tự động:** AI dừng cho bạn duyệt chất lượng tại **3 chốt** (sau research, sau ebook, sau leadpage).
- **Tự động hoàn toàn:** bỏ qua 3 chốt, chạy thẳng.

### Bước 3.4 — Nạp secret & lên sóng domain (bạn tự làm)

AI **bị chặn nhập mật khẩu** để bảo mật → phần này **bạn tự làm**. Trong thư mục deploy:

```
npx wrangler secret put LARK_APP_ID        # cli_...
npx wrangler secret put LARK_APP_SECRET    # app secret
npx wrangler secret put SMTP_USER          # hộp thư gửi
npx wrangler secret put SMTP_PASS          # mật khẩu SMTP
npx wrangler secret put FROM_NAME          # tên hiển thị
npx wrangler secret put ZALO_LINK          # link nhóm Zalo
npx wrangler secret put LINK_KHOA          # URL trang bán khóa (tùy chọn)
```

Gắn domain thật: **Cloudflare Dashboard → Workers & Pages → [worker] → Settings → Domains & Routes → Add Custom Domain → `khoa1.<ten-mien-cua-ban>.com`** (Cloudflare tự tạo DNS + SSL). *Hoặc nhờ AI gắn nếu bạn cấp API token có quyền DNS.*

### Bước 3.5 — Nghiệm thu (đạt 100%)

Vào trang thật, điền thử form, rồi kiểm:

- [ ] Mở `https://<subdomain>` thấy trang, form bấm được
- [ ] Điền form → có **record mới** trong bảng Leads
- [ ] Nhận **email ebook** (kèm nút Zalo)
- [ ] Lead chuyển trạng thái **"Đã gửi"**; **"Đã mở email giao"** tick khi mở
- [ ] Bảng **10 email** đủ nội dung; **cron** đã gắn; **pixel đo mở** chạy
- [ ] **Xóa record test** sau khi nghiệm thu

---

## 4. AI LÀM GÌ — BẠN LÀM GÌ

| Việc | AI (Claude) | Bạn (người vận hành) |
|---|:---:|:---:|
| Nghiên cứu, viết ebook, bìa, page, email, content | ✅ | |
| Tạo bảng Lark, ghi data, viết Worker, deploy code | ✅ | |
| Tạo App Lark + cấp scope + thêm cộng tác viên | | ✅ |
| **Nhập secret (mật khẩu/app secret) vào Cloudflare** | | ✅ (an toàn) |
| Sửa DNS / gỡ subdomain cũ (nếu token thiếu quyền) | | ✅ |
| Duyệt chất lượng tại 3 chốt (nếu bán tự động) | | ✅ |

> **Vì sao đôi khi AI "phải dừng hỏi":** AI không được tự đọc/nhập thông tin bí mật (mật khẩu, app secret). Cứ **nạp sẵn mọi credential trước**, AI sẽ chạy một mạch.

---

## 5. KHI CÓ CHIẾN DỊCH MỚI

**Nguyên tắc:** tái dùng phần "Setup 1 lần", chỉ làm lại phần "mỗi chiến dịch". Chiến dịch thứ 2 trở đi nhanh hơn nhiều.

**Tái dùng (không làm lại):** tài khoản Cloudflare, App Lark (App ID/Secret), hộp thư SMTP, lark-cli đã đăng nhập.

**Làm mới cho mỗi đầu bài:**
1. **Phiếu đầu bài mới** (sản phẩm/giá/đối tượng/mục tiêu/link khóa/Zalo).
2. **Subdomain mới** (vd `khoa2.<ten-mien-cua-ban>.com`).
3. **Chạy lại 10 bước** → bộ artifact mới (ebook/bìa/page/10 email/content).
4. **Bảng dữ liệu mới:** tạo bảng **Leads** + **Email Nurture 10 ngày** riêng (hoặc dùng chung 1 Base + thêm cột "Chiến dịch" để lọc).
5. **Worker mới** (đổi tên + đổi `LEADS_TABLE`/`NURTURE_TABLE`/`SOURCE_TAG`/`BASE_URL` + secret `ZALO_LINK`/`LINK_KHOA`) → deploy + gắn subdomain mới.

**Mẫu câu giao việc nhanh:**
> *"Chạy chiến dịch mới theo Phiếu đầu bài: [dán]. Dùng lại App Lark + hộp thư SMTP cũ. Tạo bảng Leads + Nurture mới, dựng Worker `leadpage-<tên>`, gắn subdomain `<...>`. Chế độ tự động hoàn toàn."*

---

## 6. BẢO MẬT & SỰ CỐ THƯỜNG GẶP

### Nguyên tắc bảo mật
- **Không bao giờ** dán mật khẩu / App Secret vào khung chat. Luôn nạp qua `npx wrangler secret put` (ẩn).
- App Secret / mật khẩu SMTP là chìa khóa — lộ thì **đổi ngay** trong Lark Admin / Developer Console.
- Mỗi học viên dùng **tài khoản, domain, hộp thư, App của riêng mình** — không dùng chung.

### Bảng xử lý sự cố
| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `/submit` báo `auth Lark: invalid param` | Secret App Lark sai / chưa propagate | Kiểm tra App ID/Secret; chờ vài giây test lại |
| Worker ghi Base bị từ chối quyền | App chưa là **cộng tác viên quyền Sửa** của Base | Thêm app vào Base, quyền Sửa |
| Subdomain không lên trang của mình | Còn bản ghi DNS cũ (WebCake/Ladipage...) | Gỡ DNS cũ rồi gắn Custom Domain |
| Email không gửi | Sai SMTP user/pass, hoặc chưa bật IMAP/SMTP | Bật IMAP/SMTP cho hộp thư, lấy lại mật khẩu |
| Tỉ lệ mở > 100% | Email mở nhiều lần đếm trùng | Dedup bằng KV (key `ngày:lead`), chỉ tính lần đầu |
| AI "dừng xin mật khẩu" | Đúng thiết kế an toàn | Người vận hành tự `wrangler secret put` |

### Giới hạn cần biết
- **Đo mở email** chỉ tính khi app email tải ảnh (Apple Mail Privacy / tắt ảnh tự động sẽ không tính) — giới hạn chung của mọi hệ thống email.
- **Giới hạn gửi SMTP** (Larksuite ~200 mail/100 giây, ~6.000/ngày) — chiến dịch lớn cần chia tải.
- **Số liệu phải thật** — không bịa con số uy tín / testimonial.
- **Đừng ghi đè domain đang có** — kiểm tra subdomain rảnh trước khi trỏ.

---

## 7. PHỤ LỤC — Danh sách secret (Worker)

7 secret nạp lên Worker bằng `npx wrangler secret put <TÊN>`:

```
LARK_APP_ID      LARK_APP_SECRET   SMTP_USER   SMTP_PASS
FROM_NAME        ZALO_LINK         LINK_KHOA (tùy chọn)
```

---

*Bản SOP bàn giao — đã ẩn toàn bộ thông tin cá nhân; học viên điền tài khoản riêng. Hệ thống tham chiếu nội bộ: skill `hmh-sale-nha-may-pheu`.*
