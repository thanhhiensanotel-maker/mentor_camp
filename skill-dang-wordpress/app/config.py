"""Đọc cấu hình từ file .env."""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Kết nối WordPress ---
WP_SITE_URL = os.getenv("WP_SITE_URL", "").strip().rstrip("/")
WP_USERNAME = os.getenv("WP_USERNAME", "").strip()
# Application Password (Hồ sơ người dùng → Application Passwords). Có thể có dấu cách.
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD", "").strip()
# Trạng thái đăng: publish = đăng ngay, draft = để nháp chờ duyệt tay, future = hẹn giờ.
WP_DEFAULT_STATUS = os.getenv("WP_DEFAULT_STATUS", "publish").strip()
# ID chuyên mục mặc định (để trống nếu không dùng). VD: 5
WP_DEFAULT_CATEGORY = os.getenv("WP_DEFAULT_CATEGORY", "").strip()
# Plugin SEO đang dùng để ghi meta: yoast | rankmath | none
WP_SEO_PLUGIN = os.getenv("WP_SEO_PLUGIN", "none").strip().lower()

# --- Claude ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5").strip()

# --- Thương hiệu / định hướng nội dung ---
BRAND_NAME = os.getenv("BRAND_NAME", "").strip()
BRAND_NICHE = os.getenv("BRAND_NICHE", "").strip()
BRAND_TONE = os.getenv("BRAND_TONE", "chuyên nghiệp, đáng tin, dễ đọc").strip()
# URL trang chủ / link nội bộ hay chèn (giúp SEO). VD: https://site.com/lien-he
BRAND_INTERNAL_LINK = os.getenv("BRAND_INTERNAL_LINK", "").strip()

# --- Kết nối Lark Base (bảng nội dung bài blog) ---
# Lấy từ URL bảng: https://...larksuite.com/base/<BASE_TOKEN>?table=<TABLE_ID>
LARK_BASE_TOKEN = os.getenv("LARK_BASE_TOKEN", "").strip()
# Bảng NỘI DUNG bài blog (nơi Claude đổ bài vào, và queue đọc để đăng).
LARK_TABLE_ID = os.getenv("LARK_TABLE_ID", "").strip()
# Bảng SỔ ĐĂNG KÝ WEBSITE (18.1): mỗi dòng = 1 web (Tên/ID/Tài khoản/URL).
LARK_SITE_TABLE_ID = os.getenv("LARK_SITE_TABLE_ID", "tbllbBoFFJzjTsYo").strip()
# Tên cột trong bảng 18.1.
LARK_SITE_COL_NAME = os.getenv("LARK_SITE_COL_NAME", "Tên web").strip()
LARK_SITE_COL_TYPE = os.getenv("LARK_SITE_COL_TYPE", "Loại").strip()
LARK_SITE_COL_CODE = os.getenv("LARK_SITE_COL_CODE", "ID").strip()
LARK_SITE_COL_APPPW = os.getenv("LARK_SITE_COL_APPPW", "App Password").strip()
LARK_SITE_COL_USER = os.getenv("LARK_SITE_COL_USER", "Tài khoản").strip()
LARK_SITE_COL_URL = os.getenv("LARK_SITE_COL_URL", "URL").strip()

# Lark Open API (để chạy trên mây/GitHub Actions — không cần lark-cli).
# Nếu có LARK_APP_SECRET → dùng API trực tiếp; nếu không → fallback lark-cli (máy local).
LARK_APP_ID = os.getenv("LARK_APP_ID", "cli_aaae89e966f85e17").strip()
LARK_APP_SECRET = os.getenv("LARK_APP_SECRET", "").strip()
LARK_DOMAIN = os.getenv("LARK_DOMAIN", "https://open.larksuite.com").strip().rstrip("/")
# Đường dẫn lark-cli (fallback local; gọi thẳng "lark-cli" nếu đã có trong PATH).
LARK_CLI = os.getenv("LARK_CLI", "lark-cli").strip()
# Tên các cột trong bảng nội dung (đổi cho khớp bảng của chị).
LARK_COL_TITLE = os.getenv("LARK_COL_TITLE", "Tiêu đề").strip()
LARK_COL_CONTENT = os.getenv("LARK_COL_CONTENT", "Nội dung").strip()
LARK_COL_KEYWORD = os.getenv("LARK_COL_KEYWORD", "Từ khoá SEO").strip()
LARK_COL_META = os.getenv("LARK_COL_META", "Meta description").strip()
LARK_COL_SLUG = os.getenv("LARK_COL_SLUG", "Slug").strip()
LARK_COL_TYPE = os.getenv("LARK_COL_TYPE", "Loại").strip()
LARK_COL_STATUS = os.getenv("LARK_COL_STATUS", "Trạng thái").strip()
LARK_COL_SCHEDULE = os.getenv("LARK_COL_SCHEDULE", "Lịch đăng bài").strip()
LARK_COL_URL = os.getenv("LARK_COL_URL", "Link bài đăng").strip()
# Giá trị trạng thái: bài nào = "chờ đăng" thì lấy; đăng xong đổi sang "đã đăng".
LARK_STATUS_PENDING = os.getenv("LARK_STATUS_PENDING", "Chờ đăng").strip()
LARK_STATUS_DONE = os.getenv("LARK_STATUS_DONE", "Đã đăng").strip()


def require(*keys):
    """Dừng chương trình với thông báo dễ hiểu nếu thiếu cấu hình."""
    missing = [k for k in keys if not globals().get(k)]
    if missing:
        raise SystemExit(
            "❌ Thiếu cấu hình trong file .env: " + ", ".join(missing)
            + "\n   Mở .env, điền cho đủ rồi chạy lại. Xem HƯỚNG DẪN.md."
        )
