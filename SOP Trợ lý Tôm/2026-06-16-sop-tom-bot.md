# 2026\-06\-16\-sop\-tom\-bot



# SOP: Dựng Trợ Lý AI TÔM Điều Khiển Qua Lark



**Mục tiêu:** Sau khi hoàn thành SOP này, học viên có một trợ lý AI chạy 24/7 trên máy tính — điều khiển hoàn toàn qua điện thoại \(app Lark\)\. Nhắn lệnh từ bất kỳ đâu, AI thực thi trên máy, trả kết quả về Lark trong vài giây\.



──────────────────────────────────────────────────



## Tổng quan hệ thống



\[Điện thoại \- Lark\]
      │  nhắn lệnh
      ▼
\[Lark App Bot\] ── nghe tin ──► \[Bridge \(Node\.js\) trên máy PC\]
                                        │
                                        ▼
                               \[Claude Code Headless\]
                               \(AI thực thi toàn bộ\)
                                        │
                                        ▼
                               \[Webhook Bot\] ── gửi kết quả ──► \[Lark nhóm\]



**Nhóm Lark trở thành terminal từ xa của bạn\.** Ngồi cà phê nhắn "viết bài SEO về X rồi đăng", máy ở nhà tự làm và báo lại kết quả\.



──────────────────────────────────────────────────



## Tài nguyên cần chuẩn bị



### Phần cứng

|Thứ|Yêu cầu tối thiểu|Lý do|
|---|---|---|
|Máy tính Windows|RAM 8GB\+, CPU ổn định|Chạy Claude Code \+ Node\.js|
|GPU NVIDIA \(tùy chọn\)|GTX 1050 trở lên|Tăng tốc nhận dạng giọng nói|
|Kết nối Internet|Ổn định, không VPN chặn API|Claude API \+ Lark API|
|Máy bật liên tục|Hoặc dùng VPS Windows|Bridge cần chạy 24/7|



### Tài khoản \& Quyền truy cập

|Thứ|Mô tả|Lấy ở đâu|
|---|---|---|
|\*\*Tài khoản Lark\*\*|Có quyền tạo App \(Developer\)|larksuite\.com hoặc feishu\.cn|
|\*\*Anthropic API Key\*\*|Để Claude Code hoạt động|console\.anthropic\.com|
|\*\*Claude Code\*\*|Cài trên máy tính|claude\.ai/code|



### Chi phí ước tính

- Claude Code: miễn phí \(dùng gói Max\) hoặc trả theo token API

- Lark: miễn phí gói cơ bản

- Model Haiku: \~$0\.25/triệu token \(rất rẻ cho lệnh ngắn\)

- Model Sonnet: \~$3/triệu token \(cho lệnh phức tạp\)



──────────────────────────────────────────────────



## Bước 1 — Cài phần mềm trên máy PC



### 1\.1 Cài Node\.js

- Vào \[nodejs\.org\]\(https://nodejs\.org\) → tải bản **LTS** \(ví dụ 20\.x\)

- Chạy file cài đặt, chọn "Add to PATH"

- Mở PowerShell, kiểm tra: node \-\-version → phải ra v20\.x\.x



### 1\.2 Cài Python

- Vào \[python\.org\]\(https://python\.org/downloads\) → tải Python **3\.11** hoặc **3\.12**

- Cài đặt, **tick "Add Python to PATH"**

- Kiểm tra: python \-\-version



### 1\.3 Cài Claude Code

\# Mở PowerShell với quyền Admin
npm install \-g @anthropic\-ai/claude\-code
claude \-\-version

Sau khi cài, chạy claude lần đầu để đăng nhập tài khoản Anthropic\.



### 1\.4 Cài lark\-cli

npm install \-g @larksuite/cli
lark\-cli \-\-version



### 1\.5 Cài thư viện Python cần thiết

pip install faster\-whisper sounddevice pyperclip pyautogui pynput gtts pygame

Nếu có GPU NVIDIA: pip install ctranslate2 \(tự động, cài cùng faster\-whisper\)



──────────────────────────────────────────────────



## Bước 2 — Tạo Lark App \(Bot TÔM\)



Đây là bước quan trọng nhất\. Bạn cần tạo một "ứng dụng Lark" — đây sẽ là đôi tai của TÔM, nghe mọi tin nhắn trong nhóm điều khiển\.



### 2\.1 Vào Lark Developer Console

- Truy cập: **open\.larksuite\.com** \(hoặc open\.feishu\.cn nếu dùng Feishu\)

- Đăng nhập bằng tài khoản Lark của bạn

- Click **"Create App"** → chọn **"Custom App"**

- Đặt tên: TÔM \(hoặc tên bất kỳ\)

- Click **"Create"**



### 2\.2 Lấy App Credentials

Sau khi tạo xong, vào tab **"Credentials \& Basic Info"**:

- Copy **App ID** \(dạng cli\_xxxxxxxxxx\)

- Copy **App Secret**



Lưu 2 giá trị này — cần dùng ở Bước 4\.



### 2\.3 Cấu hình quyền \(Scopes\)

Vào **"Permission \& Scopes"** → thêm các quyền sau:



**Quyền đọc tin nhắn \(bắt buộc\):**

- im:message — đọc tin nhắn

- im:message:receive\_v1 — nhận sự kiện tin nhắn mới



**Quyền gửi tin nhắn:**

- im:message:send\_as\_bot — gửi tin với tư cách bot



**Quyền quản lý nhóm:**

- im:chat — đọc thông tin nhóm

- im:chat:readonly — xem danh sách nhóm



Click **"Apply All"** rồi **"Publish"** để phê duyệt quyền\.



### 2\.4 Bật Event Subscription \(nghe sự kiện\)

- Vào tab **"Event Subscriptions"**

- Mở rộng **"Subscribe to Events"**

- Thêm sự kiện: **\`im\.message\.receive\_v1\`** \(tin nhắn mới trong nhóm có bot\)

- Lưu lại



### 2\.5 Publish App

- Vào **"Version Management \& Publish"**

- Click **"Create Version"** → điền ghi chú → **"Submit for Release"**

- Nếu tổ chức nhỏ \(dùng Lark Free\): tự duyệt ngay được

- Nếu tổ chức lớn: cần admin phê duyệt



──────────────────────────────────────────────────



## Bước 3 — Đăng nhập lark\-cli bằng App vừa tạo



lark\-cli auth login \-\-app\-id cli\_XXXXXXXX \-\-app\-secret YYYYYYYY

Thay cli\_XXXXXXXX và YYYYYYYY bằng thông tin từ Bước 2\.2\.



Kiểm tra đăng nhập thành công:

lark\-cli auth whoami

→ Phải hiện thông tin App, không báo lỗi\.



──────────────────────────────────────────────────



## Bước 4 — Tạo nhóm điều khiển trên Lark



### 4\.1 Tạo nhóm mới

- Mở Lark \(desktop hoặc điện thoại\)

- Tạo nhóm mới: **"Điều Khiển AI"** \(tên tùy ý\)

- Thêm **chính mình** vào nhóm

- Thêm **App Bot TÔM** vào nhóm \(tìm theo tên app vừa tạo\)



### 4\.2 Thêm Custom Bot \(để gửi kết quả\)

- Trong nhóm → **Settings \(⚙️\)** → **Bots** → **Add Bot**

- Chọn **"Custom Bot"** → đặt tên TÔM Reply

- Copy **Webhook URL** \(dạng https://open\.larksuite\.com/open\-apis/bot/v2/hook/xxxxxxxx\)

- Lưu webhook URL này — cần dùng ở Bước 5



**Tại sao cần 2 bot?**

\- App Bot TÔM: NGHE tin nhắn vào \(Event Subscription\)

\- Custom Bot TÔM Reply: GỬI kết quả ra \(Webhook\)

Lark tách biệt 2 chiều để bảo mật\.



### 4\.3 Lấy open\_id của bản thân

lark\-cli user info \-\-me

→ Copy giá trị open\_id \(dạng ou\_xxxxxxxxxx\)\. Đây là "chữ ký" của bạn — chỉ tin nhắn từ open\_id này mới được TÔM thực thi\.



──────────────────────────────────────────────────



## Bước 5 — Tải về và cấu hình Bridge



### 5\.1 Tải file bridge

Tải 2 file về máy, đặt vào cùng 1 thư mục \(ví dụ C:\\TOM\-BOT\\\):

- lark\-bridge\.mjs — engine chính

- \.env\.example — mẫu cấu hình



File bridge được cung cấp trong gói chuyển giao của khóa học\.



### 5\.2 Tạo file cấu hình

cd C:\\TOM\-BOT
Copy\-Item \.env\.example \.env
notepad \.env



Điền vào file \.env:

\# \(BẮT BUỘC\) Webhook nhóm điều khiển — lấy từ Bước 4\.2
LARK\_WEBHOOK=https://open\.larksuite\.com/open\-apis/bot/v2/hook/xxxxxxxx

\# open\_id của bạn — lấy từ Bước 4\.3
OWNER\_OPEN\_ID=ou\_xxxxxxxxxx

\# \(Tùy chọn\) chat\_id nhóm điều khiển — để trống lần đầu, tự học
CONTROL\_CHAT\_ID=

\# Model AI: haiku \(nhanh, rẻ\) \| sonnet \(mạnh\) \| opus \(mạnh nhất\)
CLAUDE\_MODEL=haiku

\# Thư mục làm việc của Claude \(nơi chứa wiki, skill, dữ liệu\)
BRAIN\_ROOT=C:\\HOA\-BRAIN

\# Quyền: bypassPermissions = chạy thẳng không hỏi
PERMISSION\_MODE=bypassPermissions

\# Giữ mạch hội thoại giữa các lệnh
KEEP\_SESSION=true

\# Thời gian chờ tối đa 1 lệnh \(ms\) — 25 phút
CLAUDE\_TIMEOUT\_MS=1500000



──────────────────────────────────────────────────



## Bước 6 — Thiết lập thư mục làm việc HOA BRAIN



Đây là "bộ não" của TÔM — nơi chứa wiki tri thức, skill, và cấu hình\. Claude Code sẽ làm việc trong thư mục này\.



### 6\.1 Tạo cấu trúc thư mục

C:\\HOA\-BRAIN\\
├── CLAUDE\.md          ← Hướng dẫn hành vi cho AI \(BẮT BUỘC\)
├── index\.md           ← Mục lục tri thức
├── raw\\               ← Nguồn tài liệu gốc
├── wiki\\              ← Trang wiki do AI tạo
│   ├── sources\\
│   ├── entities\\
│   └── concepts\\
└── output\\            ← Kết quả AI tạo ra



### 6\.2 Tạo file CLAUDE\.md cơ bản

File này là "bộ quy tắc" — dạy TÔM cách làm việc\. Nội dung mẫu:



\# TÔM — Trợ lý AI cá nhân

Tôi là TÔM, trợ lý AI của \[Tên bạn\]\. Làm việc bằng tiếng Việt\.
Gọi chủ là "Anh \[Tên\]"\.

\#\# Nhiệm vụ chính
\- Thực thi lệnh từ Lark nhanh chóng và chính xác
\- Quản lý lịch, email, content, báo cáo
\- Lưu kết quả vào output/ có tổ chức

\#\# Nguyên tắc
\- Báo nhận lệnh trước khi làm
\- Trả lời đầy đủ, rõ ràng
\- Khi nghi ngờ, hỏi lại trước khi thực thi



──────────────────────────────────────────────────



## Bước 7 — Khởi động TÔM lần đầu



### 7\.1 Tạo file khởi động

Tạo file start\.ps1 trong thư mục C:\\TOM\-BOT\\:

\# start\.ps1
$env:Path = \[Environment\]::GetEnvironmentVariable\("Path","Machine"\) \+ ";" \+
            \[Environment\]::GetEnvironmentVariable\("Path","User"\) \+ ";" \+
            "C:\\Program Files\\nodejs;C:\\Users\\$env:USERNAME\\AppData\\Roaming\\npm"
Set\-Location $PSScriptRoot
Write\-Host "▶ Đang bật TÔM Bridge\.\.\." \-ForegroundColor Cyan
node lark\-bridge\.mjs



### 7\.2 Bật bridge

\# Bấm phải vào start\.ps1 → "Run with PowerShell"
\# Hoặc trong PowerShell:
powershell \-File C:\\TOM\-BOT\\start\.ps1



Khi bật thành công, terminal sẽ hiện:

✅ listener sẵn sàng \(đã subscribe IM\)
✅ Bridge sẵn sàng\. Mọi yêu cầu sẽ được trả lời gần vào tin của anh\.



Và nhóm Lark sẽ nhận được card thông báo: **"🤖 TÔM Bridge đã bật"**



### 7\.3 Test lần đầu

Trong nhóm Lark, nhắn:

/ping

TÔM phản hồi trong vòng 3\-5 giây: **"🏓 Pong\! TÔM đang chạy\. Model: haiku\."**



──────────────────────────────────────────────────



## Bước 8 — Cài đặt tự động khởi động cùng máy tính



Để TÔM tự bật khi máy tính khởi động:



### Cách 1: Task Scheduler \(khuyến nghị\)

$action = New\-ScheduledTaskAction \-Execute "powershell\.exe" \`
    \-Argument "\-WindowStyle Hidden \-File C:\\TOM\-BOT\\start\.ps1"
$trigger = New\-ScheduledTaskTrigger \-AtLogOn
$settings = New\-ScheduledTaskSettingsSet \-RestartCount 3 \-RestartInterval \(New\-TimeSpan \-Minutes 1\)
Register\-ScheduledTask \-TaskName "TOM\-Bridge" \-Action $action \`
    \-Trigger $trigger \-Settings $settings \-RunLevel Highest



### Cách 2: Startup folder

- Nhấn Win\+R → gõ shell:startup

- Tạo shortcut của start\.ps1 vào thư mục này



──────────────────────────────────────────────────



## Vận hành hàng ngày



### Lệnh điều khiển nhanh



|Lệnh|Tác dụng|
|---|---|
|\`/ping\`|Kiểm tra TÔM còn sống không|
|\`/reset\`|Xóa lịch sử hội thoại \(giải phóng context\)|
|\`/id\`|Xem chat\_id nhóm \+ open\_id của bạn|
|\`/help\`|Danh sách lệnh có thể dùng|



### Cách nhắn lệnh thường



Nhắn tự nhiên như nhắn người trợ lý:

- \*"Tóm tắt email hôm nay cho tôi"\*

- \*"Viết 1 bài Facebook về chủ đề kỷ luật"\*

- \*"Nhắc tôi cuộc họp 3h chiều"\*

- \*"Kiểm tra quảng cáo Facebook hôm nay"\*

- \*"Đăng bài SEO đến hạn hôm nay"\*



### Gửi lệnh bằng giọng nói \(Voice\)

Bridge hỗ trợ nhận voice message từ Lark:

- Nhấn giữ nút micro trong Lark → nói lệnh → thả ra

- TÔM nhận file audio → Whisper chuyển thành text → thực thi

- Kết quả trả về bằng text \(và TTS nếu cấu hình\)



### Chạy nhiều lệnh nối tiếp

TÔM nhớ ngữ cảnh trong cùng phiên \(KEEP\_SESSION=true\):

Bạn: "Phân tích dữ liệu lead tháng này"
TÔM: \[trả kết quả\]
Bạn: "Vẽ biểu đồ cho kết quả vừa rồi"  ← TÔM hiểu "kết quả vừa rồi" là gì
TÔM: \[vẽ biểu đồ\]



──────────────────────────────────────────────────



## Xử lý sự cố thường gặp



### TÔM không phản hồi

- Kiểm tra terminal bridge còn chạy không \(cửa sổ PowerShell\)

- Nhắn /ping — nếu không trả lời, restart bridge

- Kiểm tra Internet kết nối được không



### TÔM phản hồi chậm \(\>30 giây\)

- Nguyên nhân: session cũ quá dài → nhắn /reset

- Hoặc đổi sang model haiku trong \.env: CLAUDE\_MODEL=haiku

- Restart bridge sau khi đổi



### Lỗi "permission denied" khi Claude thực thi

- Kiểm tra PERMISSION\_MODE=bypassPermissions trong \.env

- Nếu dùng Claude Code Max: đảm bảo đã đăng nhập \(claude auth login\)



### Bridge tắt giữa chừng

- Thiết lập Task Scheduler với RestartCount=3 \(xem Bước 8\)

- Hoặc dùng PM2: npm install \-g pm2 → pm2 start lark\-bridge\.mjs



### Claude không tìm thấy file/skill

- Kiểm tra BRAIN\_ROOT trong \.env trỏ đúng thư mục

- Đảm bảo CLAUDE\.md tồn tại trong BRAIN\_ROOT



──────────────────────────────────────────────────



## Nâng cao — Thêm Skill cho TÔM



Skill là các "kịch bản chuyên biệt" giúp TÔM làm tốt hơn từng loại việc\.



### Cấu trúc 1 Skill

BRAIN\_ROOT/
└── \.claude/
    └── skills/
        ├── index\.md          ← Danh mục skill \(BẮT BUỘC\)
        └── hmh\-mkt\-viet\-bai/ ← Thư mục mỗi skill
            └── skill\.md      ← Nội dung skill



### Các Skill đã có sẵn \(kèm theo gói chuyển giao\)



|Skill|Công dụng|
|---|---|
|\`hmh\-mkt\-content\-tri\-thuc\`|Tự động tạo 5 bài Facebook/ngày từ video|
|\`hmh\-mkt\-infographic\-html\`|Tạo ảnh infographic từ chủ đề|
|\`hmh\-AIOS\-dang\-bai\-seo\`|Viết \+ đăng bài blog SEO tự động|
|\`hmh\-mkt\-research\-seo\-web\`|Nghiên cứu từ khóa SEO|
|\`hmh\-sale\-ke\-hoach\-loi\-nhuan\`|Tính điểm hòa vốn, lập kế hoạch lợi nhuận|
|\`hmh\-sale\-business\-model\-canvas\`|Coach dựng mô hình kinh doanh|
|\`hmh\-sale\-dinh\-gia\-offer\`|Định giá và thiết kế offer Grand Slam|
|\`hmh\-AIOS\-tao\-skill\`|Tạo skill mới theo chuẩn|



### Cách kích hoạt Skill

Trong Lark, nhắn: /\[tên\-skill\] hoặc gọi tên skill trong câu lệnh:

"Dùng skill hmh\-sale\-ke\-hoach\-loi\-nhuan để tính hòa vốn cho quán cà phê của tôi"



──────────────────────────────────────────────────



## Checklist hoàn thành



- \[ \] Node\.js cài xong, node \-\-version OK

- \[ \] Python cài xong, python \-\-version OK  

- \[ \] Claude Code cài xong, đăng nhập được

- \[ \] lark\-cli cài xong, đăng nhập App TÔM được

- \[ \] Lark App tạo xong, có đủ quyền

- \[ \] Custom Bot webhook tạo xong, có URL

- \[ \] File \.env điền đầy đủ

- \[ \] Thư mục HOA BRAIN tạo xong, có CLAUDE\.md

- \[ \] Bridge khởi động, terminal hiện "✅ sẵn sàng"

- \[ \] Test /ping trong Lark → TÔM trả lời

- \[ \] Task Scheduler bật để tự khởi động cùng máy



──────────────────────────────────────────────────



## Thời gian cần để cài đặt



|Giai đoạn|Thời gian|
|---|---|
|Cài phần mềm \(Node, Python, Claude, lark\-cli\)|30–45 phút|
|Tạo Lark App \+ cấu hình quyền|20–30 phút|
|Thiết lập bridge \+ test|15–20 phút|
|Cài skill \+ test lệnh đầu tiên|15 phút|
|\*\*Tổng cộng\*\*|\*\*\~90 phút\*\*|



──────────────────────────────────────────────────



## Hỗ trợ \& Tài nguyên



- **Nhóm hỗ trợ kỹ thuật:** \[Mentor Coaching Operational Systems\]

- **Tài liệu lark\-cli:** lark\-cli \-\-help

- **Tài liệu Claude Code:** claude \-\-help

- **Cập nhật lark\-cli:** lark\-cli update



──────────────────────────────────────────────────



\*Tài liệu này được biên soạn bởi hệ thống TÔM — Hoàng Minh Hóa Academy\. Cập nhật: 2026\-06\-16\.\*

