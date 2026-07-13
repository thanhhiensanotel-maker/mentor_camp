"""Gọi WordPress REST API: đăng bài, tạo tag, kiểm tra kết nối.

Xác thực bằng Application Password (Basic Auth) — không cần plugin.
"""
import json
import requests
from requests.auth import HTTPBasicAuth
from . import config


class WordPressError(RuntimeError):
    pass


def _api():
    return f"{config.WP_SITE_URL}/wp-json/wp/v2"


def _auth():
    # Application Password của WP thường hiển thị dạng "abcd efgh ijkl" — bỏ dấu cách.
    pw = config.WP_APP_PASSWORD.replace(" ", "")
    return HTTPBasicAuth(config.WP_USERNAME, pw)


def _check(resp):
    try:
        data = resp.json()
    except ValueError:
        resp.raise_for_status()
        raise
    if isinstance(data, dict) and data.get("code") and resp.status_code >= 400:
        raise WordPressError(f"[{data.get('code')}] {data.get('message')}")
    resp.raise_for_status()
    return data


def site_info():
    """Tên & mô tả site (endpoint công khai /wp-json)."""
    r = requests.get(f"{config.WP_SITE_URL}/wp-json/", timeout=30)
    return _check(r)


def verify_auth():
    """Xác nhận Application Password đăng nhập được.

    Dùng /posts?context=edit (trả 'raw' chỉ khi đã xác thực) thay cho /users/me —
    vì nhiều hosting có firewall chặn riêng /users để chống dò tài khoản.
    Trả về True nếu đăng nhập OK; ném lỗi nếu sai mật khẩu.
    """
    r = requests.get(f"{_api()}/posts", auth=_auth(),
                     params={"context": "edit", "per_page": 1}, timeout=30)
    if r.status_code in (401, 403):
        # phân biệt: sai mật khẩu (JSON của WP) vs firewall chặn (HTML)
        try:
            data = r.json()
            raise WordPressError(
                f"[{data.get('code')}] {data.get('message')}")
        except ValueError:
            raise WordPressError(
                "Bị chặn khi xác thực (firewall/hosting?). "
                "Nhưng việc ĐĂNG BÀI vẫn có thể chạy — thử lệnh 'post'.")
    _check(r)
    return True


def me():
    """Giữ để tương thích: gộp thông tin site + xác nhận đăng nhập."""
    verify_auth()
    return site_info()


def ensure_tags(names):
    """Đảm bảo các tag tồn tại, trả về list ID."""
    ids = []
    for name in names:
        if not name:
            continue
        # tìm tag sẵn có
        r = requests.get(f"{_api()}/tags", auth=_auth(),
                         params={"search": name}, timeout=30)
        found = next((t for t in _check(r) if t["name"].lower() == name.lower()), None)
        if found:
            ids.append(found["id"])
            continue
        # chưa có → tạo mới
        r = requests.post(f"{_api()}/tags", auth=_auth(),
                          data={"name": name}, timeout=30)
        try:
            ids.append(_check(r)["id"])
        except WordPressError:
            pass  # bỏ qua tag lỗi, không chặn việc đăng bài
    return ids


def _faq_jsonld(faq):
    """Tạo khối JSON-LD FAQPage — giúp GEO (AI đọc) & rich result Google."""
    if not faq:
        return ""
    entities = [{
        "@type": "Question",
        "name": item.get("q", ""),
        "acceptedAnswer": {"@type": "Answer", "text": item.get("a", "")},
    } for item in faq if item.get("q")]
    if not entities:
        return ""
    payload = {"@context": "https://schema.org",
               "@type": "FAQPage", "mainEntity": entities}
    return ('\n<script type="application/ld+json">'
            + json.dumps(payload, ensure_ascii=False)
            + "</script>\n")


def _faq_html(faq):
    """Hiển thị FAQ dạng H2 + Q/A cho người đọc."""
    if not faq:
        return ""
    rows = "".join(
        f"<h3>{i.get('q','')}</h3><p>{i.get('a','')}</p>" for i in faq if i.get("q"))
    return f"\n<h2>Câu hỏi thường gặp</h2>\n{rows}" if rows else ""


def _seo_meta(article):
    """Trả về dict meta cho plugin SEO (Yoast/RankMath), nếu bật."""
    desc = article.get("meta_description", "")
    kw = article.get("focus_keyword", "")
    if config.WP_SEO_PLUGIN == "yoast":
        return {"_yoast_wpseo_metadesc": desc, "_yoast_wpseo_focuskw": kw}
    if config.WP_SEO_PLUGIN == "rankmath":
        return {"rank_math_description": desc, "rank_math_focus_keyword": kw}
    return {}


def assemble_content(article):
    """Ghép thân bài hoàn chỉnh: nội dung + FAQ hiển thị + schema JSON-LD.

    Dùng chung cho cả đăng thẳng lên WP và lưu vào Lark (không mất FAQ/schema).
    """
    return (article.get("content_html", "")
            + _faq_html(article.get("faq"))
            + _faq_jsonld(article.get("faq")))


def publish(article, status=None, category=None, date=None):
    """Đăng 1 bài. `article` là dict từ claude_client.write_article.

    status: publish | draft | future. date: ISO 8601 (cho 'future').
    Trả về dict bài đã tạo (có 'link').
    """
    status = status or config.WP_DEFAULT_STATUS
    # nếu 'content_html' đã là thân bài đầy đủ (đọc lại từ Lark) thì dùng luôn
    content = (article["content"] if article.get("content")
               else assemble_content(article))

    payload = {
        "title": article.get("title", ""),
        "content": content,
        "slug": article.get("slug", ""),
        "excerpt": article.get("meta_description", ""),
        "status": status,
    }
    tag_ids = ensure_tags(article.get("tags", []))
    if tag_ids:
        payload["tags"] = tag_ids
    cat = category or config.WP_DEFAULT_CATEGORY
    if cat:
        payload["categories"] = [int(cat)]
    if date:
        payload["date"] = date
    meta = _seo_meta(article)
    if meta:
        payload["meta"] = meta

    r = requests.post(f"{_api()}/posts", auth=_auth(),
                      json=payload, timeout=90)
    return _check(r)
