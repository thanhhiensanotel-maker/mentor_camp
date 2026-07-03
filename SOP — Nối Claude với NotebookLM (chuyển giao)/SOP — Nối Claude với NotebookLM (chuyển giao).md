# SOP — Nối Claude với NotebookLM \(chuyển giao\)

# SOP — Nối Claude với NotebookLM \(bộ chuyển giao\)

Tài liệu này giúp bạn **biến NotebookLM thành "bộ não đọc nguồn" cho Claude**: Claude tự nạp tài liệu/video vào notebook, hỏi phân tích có trích dẫn, rồi xuất ra podcast/slide/infographic — tất cả bằng câu lệnh, không phải click chuột trong trình duyệt\.

## Bạn làm được gì sau khi nối

- Tạo notebook \& nạp nguồn \(link web, **video YouTube — NotebookLM tự nghe \& gỡ băng**, file, text, Google Drive\)\.

- Hỏi Claude phân tích nguồn, trả lời **kèm trích dẫn**\.

- Tạo **Audio Overview \(podcast 2 người dẫn\)**, video, slide, infographic — rồi tải về\.

## Cơ chế \(hiểu để không sợ\)

NotebookLM không có API công khai, nên cây cầu nối là một gói mã nguồn mở \(`notebooklm-mcp-cli`\):

```
Claude ⇄ (giao thức MCP) ⇄ notebooklm-mcp ⇄ (cookie đăng nhập) ⇄ notebooklm.google.com
```

- **Đăng nhập** = bạn login Google 1 lần qua Chrome, công cụ lưu lại cookie phiên\.

- **Bảo trì duy nhất:** cookie hết hạn sau vài ngày–vài tuần → chạy lại 1 lệnh `nlm login` là xong\.

## Lộ trình 2 trang con

1. **Cài đặt \& nối máy** — 4 bước, chạy 1 lần trên mỗi máy\.

2. **Bảng tra lệnh \& dùng hằng ngày** — danh sách công cụ \+ ví dụ chuỗi việc điển hình\.

> Kèm theo trang này có **file zip skill** để tải về — bỏ vào thư mục skills của Claude là Claude tự hiểu cách dùng\.
> 
> 

> (注：内容由 AI 生成，请谨慎参考）
