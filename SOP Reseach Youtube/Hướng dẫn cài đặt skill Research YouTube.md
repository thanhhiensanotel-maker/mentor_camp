# Hướng dẫn cài đặt skill Research YouTube

# Cài đặt Skill: Research Video YouTube \(theo View \& Sub\)

Gói này chứa một **skill cho Claude Code** giúp bạn tìm video YouTube viral theo chủ đề, lọc theo lượt xem \& số người đăng ký, và phát hiện video "vượt cỡ kênh" \(outlier\) — dùng **số liệu thật** từ YouTube Data API v3\.

## Trong gói có gì

```Plaintext
goi-skill/
└── hmh-mkt-research-youtube/
    ├── SKILL.md              # Não của skill — Claude đọc file này
    ├── .env.example          # Mẫu file cấu hình API key
    └── scripts/
        ├── yt-research.mjs    # Research video theo chủ đề (chính)
        └── yt-channel.mjs     # Liệt kê toàn bộ video của 1 kênh
HUONG-DAN-LAY-YOUTUBE-API-KEY.md   # Cách lấy API key miễn phí
README-CAI-DAT.md                  # File này
```

## Yêu cầu

- **Claude Code** đã cài \(CLI / VS Code / Desktop\)\.

- **Node\.js ≥ 18** \(kiểm tra: `node -v`\)\. Tải tại https://nodejs\.org nếu chưa có\.

- Một **YouTube Data API key** miễn phí → xem `HUONG-DAN-LAY-YOUTUBE-API-KEY.md`\.

## Cài đặt \(3 bước\)

### 1\. Chép skill vào thư mục skills của bạn

Chép cả thư mục `hmh-mkt-research-youtube/` vào một trong hai nơi:

- **Dùng cho 1 dự án:** `<thư-mục-dự-án>/.claude/skills/hmh-mkt-research-youtube/`

- **Dùng cho mọi dự án \(global\):** `C:\Users\<tên-bạn>\.claude\skills\hmh-mkt-research-youtube\`
\(trên Mac/Linux: `~/.claude/skills/...`\)

### 2\. Cấu hình API key

- Trong thư mục skill vừa chép, đổi tên `.env.example` → `.env`\.

- Mở `.env`, dán YouTube API key của bạn \(hướng dẫn lấy key ở file riêng\)\.

### 3\. Khởi động lại Claude Code

Để Claude nạp skill mới\. Sau đó gõ trong chat:

```Plaintext
/hmh-mkt-research-youtube
```

hoặc nói tự nhiên, ví dụ:

> "Research video YouTube chủ đề kinh doanh online, view trên 100k, kênh trên 50k sub\."

Claude sẽ tự chạy script, lấy số liệu thật và viết báo cáo cho bạn\.

## Chạy thử nhanh \(không qua Claude\)

Mở terminal tại thư mục chứa `.env`, chạy:

```Bash
node hmh-mkt-research-youtube/scripts/yt-research.mjs --query "kinh doanh online" --min-views 100000 --max 50
```

Xem đầy đủ tham số:

```Bash
node hmh-mkt-research-youtube/scripts/yt-research.mjs --help
```

## Skill này làm được gì

- Tìm video theo **nhiều chủ đề** cùng lúc \(lặp `--query`\)\.

- Lọc theo **view tối thiểu**, **sub tối thiểu/tối đa**, quốc gia, ngôn ngữ, khoảng thời gian\.

- Tính **chỉ số outlier** \(views ÷ subs\) để tìm video vượt cỡ kênh — tín hiệu chủ đề đang viral\.

- Tính **tốc độ view/ngày**, **tỉ lệ tương tác**, **tuổi video**\.

- Săn **kênh nhỏ có video viral** \(`--max-subs`\) để học công thức content dễ sao chép\.

- Liệt kê **toàn bộ video của một kênh** đối thủ \(`yt-channel.mjs`\)\.

## Khắc phục sự cố

|Lỗi|Cách xử lý|
|---|---|
|`Không tìm thấy API key`|Chưa tạo `.env` hoặc đặt sai tên biến\. Phải là `YOUTUBE_API_KEY=...`|
|`quotaExceeded`|Hết hạn mức ngày — đợi hôm sau hoặc tạo key mới|
|`node: command not found`|Chưa cài Node\.js ≥ 18|
|Claude không thấy skill|Chép sai thư mục, hoặc chưa khởi động lại Claude Code|

---

*Gói chuyển giao bởi Hoàng Minh Hóa · 2026\-06\-10*

