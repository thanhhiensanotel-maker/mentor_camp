"""Sổ đăng ký ĐA WEBSITE — đọc từ bảng Lark 18.1.

Mỗi dòng bảng 18.1 = 1 website WordPress mà Claude quản lý:
    Tên web · Loại · ID (mã ngắn: ntcc/sn/sc...) · App Password · Tài khoản · URL

App Password KHÔNG lấy từ Lark (để an toàn) mà đọc từ .env theo mã:
    WP_APP_PASSWORD_<MÃ VIẾT HOA>   (vd: WP_APP_PASSWORD_SN)
    — riêng 'ntcc' còn nhận cả biến cũ WP_APP_PASSWORD cho tương thích.
Nếu .env trống mà ô "App Password" trong Lark có mật khẩu thật thì dùng tạm ô đó.

Dùng:
    sites.load()           -> list[Site] tất cả web trong bảng 18.1
    sites.get("sn")        -> Site theo mã (hoặc theo tên/URL)
    sites.from_env()       -> Site mặc định lấy từ .env (tương thích bản cũ)
"""
import os
from dataclasses import dataclass

from . import config, lark


@dataclass
class Site:
    code: str            # mã ngắn: ntcc, sn, sc...
    name: str            # tên hiển thị
    url: str             # https://...  (đã bỏ / cuối)
    username: str        # tài khoản WP
    app_password: str    # Application Password (đã bỏ dấu cách khi dùng)
    seo_plugin: str = "yoast"
    category: str = ""
    status: str = ""     # publish/draft/future — trống = theo .env

    @property
    def configured(self) -> bool:
        return bool(self.url and self.username and self.app_password)


def _env_password(code: str) -> str:
    """Tìm App Password của site trong .env theo mã."""
    if not code:
        return ""
    key = "WP_APP_PASSWORD_" + code.upper().replace("-", "_")
    pw = os.getenv(key, "").strip()
    if pw:
        return pw
    # tương thích: biến cũ dùng chung cho site gốc noithatchocon
    if code.lower() == "ntcc":
        return config.WP_APP_PASSWORD
    return ""


def _looks_like_password(val: str) -> bool:
    """Ô 'App Password' trong Lark có phải mật khẩu thật không (không phải ghi chú)."""
    v = (val or "").strip()
    if not v or v.startswith("(") or "lưu" in v.lower() or " an toàn" in v.lower():
        return False
    return len(v.replace(" ", "")) >= 16  # App Password WP dài 24 ký tự


def _row_to_site(fields: dict) -> Site:
    C = config
    f = lark._api_field  # chuẩn hoá ô Bitable -> chuỗi
    code = f(fields.get(C.LARK_SITE_COL_CODE)).strip()
    url = f(fields.get(C.LARK_SITE_COL_URL)).strip().rstrip("/")
    user = f(fields.get(C.LARK_SITE_COL_USER)).strip()
    pw = _env_password(code)
    if not pw:
        cell = f(fields.get(C.LARK_SITE_COL_APPPW))
        if _looks_like_password(cell):
            pw = cell.strip()
    return Site(
        code=code,
        name=f(fields.get(C.LARK_SITE_COL_NAME)).strip(),
        url=url,
        username=user,
        app_password=pw,
        seo_plugin=config.WP_SEO_PLUGIN or "yoast",
    )


def load() -> list:
    """Đọc tất cả website đã đăng ký trong bảng 18.1."""
    config.require("LARK_BASE_TOKEN", "LARK_SITE_TABLE_ID")
    recs = lark.read_table(config.LARK_SITE_TABLE_ID)
    out = []
    for rec in recs:
        site = _row_to_site(rec.get("fields", {}))
        if site.url or site.name:
            out.append(site)
    return out


def from_env() -> Site:
    """Site mặc định dựng từ .env (giữ tương thích với luồng 1-web cũ)."""
    return Site(
        code="ntcc",
        name=config.BRAND_NAME or "Website",
        url=config.WP_SITE_URL,
        username=config.WP_USERNAME,
        app_password=config.WP_APP_PASSWORD,
        seo_plugin=config.WP_SEO_PLUGIN or "yoast",
        category=config.WP_DEFAULT_CATEGORY,
        status=config.WP_DEFAULT_STATUS,
    )


def get(ref: str) -> Site:
    """Tìm site theo mã / tên / URL (không phân biệt hoa thường)."""
    if not ref:
        return from_env()
    r = ref.strip().lower().rstrip("/")
    for s in load():
        if r in (s.code.lower(), s.name.lower(),
                 s.url.lower(), s.url.lower().replace("https://", "").replace("http://", "")):
            return s
    raise SystemExit(
        f"❌ Không tìm thấy website '{ref}' trong bảng 18.1. "
        "Chạy 'python -m app.cli sites' để xem danh sách.")
