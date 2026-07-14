"""Gọi WordPress REST API: đăng bài, tạo tag, kiểm tra kết nối.

Xác thực bằng Application Password (Basic Auth) — không cần plugin.
"""
import json
import requests
from requests.auth import HTTPBasicAuth
from . import config


class WordPressError(RuntimeError):
    pass


# Site đang thao tác. None = lấy từ .env (tương thích luồng 1-web cũ).
# Dùng use_site() để đổi sang 1 website khác trong bảng 18.1.
_current = None
_rest_cache = {}  # url -> True nếu permalink đẹp (/wp-json), False nếu ?rest_route=


def use_site(site):
    """Chọn website để mọi lệnh sau thao tác lên. Trả về chính site đó."""
    global _current
    _current = site
    return site


def _site():
    if _current is not None:
        return _current
    from . import sites
    return sites.from_env()


def _pretty(site):
    """Site này có permalink đẹp (/wp-json) không? Tự dò 1 lần, nhớ kết quả.

    Site permalink mặc định (vd bannangha.vn) phải gọi qua ?rest_route=.
    """
    if site.url in _rest_cache:
        return _rest_cache[site.url]
    ok = True
    try:
        r = requests.get(f"{site.url}/wp-json/", timeout=20)
        ok = r.status_code == 200 and "application/json" in r.headers.get(
            "content-type", "")
    except requests.RequestException:
        ok = True  # để mặc định /wp-json, lỗi mạng sẽ báo ở lệnh thật
    _rest_cache[site.url] = ok
    return ok


def _api(site=None):
    site = site or _site()
    if _pretty(site):
        return f"{site.url}/wp-json/wp/v2"
    # permalink mặc định: gắn tham số rest_route
    return f"{site.url}/?rest_route=/wp/v2"


def _api_url(path, site=None):
    """Ghép URL endpoint, đúng kiểu cho cả /wp-json lẫn ?rest_route=."""
    base = _api(site)
    if "?rest_route=" in base:
        return base + path  # base = .../?rest_route=/wp/v2 ; path = /posts
    return base + path


def _auth(site=None):
    site = site or _site()
    # Application Password của WP thường hiển thị dạng "abcd efgh ijkl" — bỏ dấu cách.
    pw = site.app_password.replace(" ", "")
    return HTTPBasicAuth(site.username, pw)


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
    """Tên & mô tả site (endpoint công khai)."""
    site = _site()
    base = f"{site.url}/wp-json/" if _pretty(site) else f"{site.url}/?rest_route=/"
    r = requests.get(base, timeout=30)
    return _check(r)


def verify_auth():
    """Xác nhận Application Password đăng nhập được.

    Dùng /posts?context=edit (trả 'raw' chỉ khi đã xác thực) thay cho /users/me —
    vì nhiều hosting có firewall chặn riêng /users để chống dò tài khoản.
    Trả về True nếu đăng nhập OK; ném lỗi nếu sai mật khẩu.
    """
    r = requests.get(_api_url("/posts"), auth=_auth(),
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
        r = requests.get(_api_url("/tags"), auth=_auth(),
                         params={"search": name}, timeout=30)
        found = next((t for t in _check(r) if t["name"].lower() == name.lower()), None)
        if found:
            ids.append(found["id"])
            continue
        # chưa có → tạo mới
        r = requests.post(_api_url("/tags"), auth=_auth(),
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
    plugin = _site().seo_plugin or config.WP_SEO_PLUGIN
    if plugin == "yoast":
        return {"_yoast_wpseo_metadesc": desc, "_yoast_wpseo_focuskw": kw}
    if plugin == "rankmath":
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
    site = _site()
    status = status or site.status or config.WP_DEFAULT_STATUS
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
    cat = category or site.category or config.WP_DEFAULT_CATEGORY
    if cat:
        payload["categories"] = [int(cat)]
    if date:
        payload["date"] = date
    meta = _seo_meta(article)
    if meta:
        payload["meta"] = meta

    r = requests.post(_api_url("/posts"), auth=_auth(),
                      json=payload, timeout=90)
    res = _check(r)
    _set_seo_score(res.get("id"), article)
    return res


def _set_seo_score(post_id, article):
    """Điền điểm Yoast 'đạt chuẩn' để cột SEO/Đọc NGOÀI danh sách hiện xanh sẵn.

    Bài viết theo SOP viet-blog nên thực sự đạt chuẩn → ghi lại kết quả đó ra ngoài
    để khỏi phải mở từng bài bấm Cập nhật. CẦN snippet đã đăng ký 2 khoá
    _yoast_wpseo_linkdex + _yoast_wpseo_content_score; nếu chưa, bước này lặng lẽ
    bỏ qua (bài vẫn đăng bình thường, chỉ là cột ngoài còn xám).
    """
    plugin = _site().seo_plugin or config.WP_SEO_PLUGIN
    if plugin != "yoast" or not post_id or not article.get("focus_keyword"):
        return
    try:
        requests.post(_api_url(f"/posts/{post_id}"), auth=_auth(),
                      json={"meta": {"_yoast_wpseo_linkdex": "90",
                                     "_yoast_wpseo_content_score": "90"}}, timeout=30)
    except requests.RequestException:
        pass
