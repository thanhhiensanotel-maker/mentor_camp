"""Trợ giúp soạn nội dung blog theo SOP viet-blog + BỘ KIỂM TRA CHẤT LƯỢNG.

Dùng để bài ra "phát nào chuẩn phát đó": đủ 1500 từ, mật độ từ khoá 1-3%,
font Times New Roman, FAQ + schema GEO, không lộ chữ "CTA".
"""
import json
import re


def times_new_roman(html):
    """Bọc thân bài trong font Times New Roman (theo quy ước SANOTEL)."""
    return f'<div style="font-family:\'Times New Roman\',Times,serif;">{html}</div>'


def faq_block(faq, start_no=9):
    """Từ list [(câu hỏi, trả lời)] → (html hiển thị, script JSON-LD FAQPage cho GEO).

    Trả về 1 chuỗi ghép sẵn (FAQ hiển thị + schema) để chèn cuối bài.
    """
    if not faq:
        return ""
    rows = "".join(f"<h3>{q}</h3><p>{a}</p>" for q, a in faq)
    html = f"<h2>{start_no}. Câu hỏi thường gặp</h2>{rows}"
    ld = ('<script type="application/ld+json">' + json.dumps(
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        ensure_ascii=False) + "</script>")
    return html + ld


def _text(html):
    return re.sub(r"<[^>]+>", " ", html or "")


def word_count(html):
    return len(_text(html).split())


def keyword_density(html, kw):
    words = len(_text(html).split())
    if not words or not kw:
        return 0.0
    n = _text(html).lower().count(kw.lower())
    return round(n * len(kw.split()) / words * 100, 2)


def check_quality(article, min_words=1500, dmin=1.0, dmax=3.0, min_images=4):
    """Kiểm tra bài trước khi đăng. Trả về list vấn đề (rỗng = ĐẠT chuẩn)."""
    issues = []
    html = article.get("content_html") or article.get("content") or ""
    kw = (article.get("focus_keyword") or "").strip()
    title = article.get("title", "")
    meta = article.get("meta_description", "")

    wc = word_count(html)
    if wc < min_words:
        issues.append(f"Bài {wc} từ < {min_words} từ tối thiểu — viết thêm.")
    if kw:
        dens = keyword_density(html, kw)
        if dens < dmin:
            issues.append(f"Mật độ từ khoá {dens}% < {dmin}% — dùng từ khoá thêm.")
        elif dens > dmax:
            issues.append(f"Mật độ từ khoá {dens}% > {dmax}% (nhồi nhét) — giảm bớt.")
        if kw.lower() not in title.lower():
            issues.append("Tiêu đề chưa chứa từ khoá chính.")
        if kw.lower() not in meta.lower():
            issues.append("Meta description chưa chứa từ khoá chính.")
    if len(kw.split()) > 4:
        issues.append("Từ khoá chính > 4 chữ — nên rút gọn.")
    if meta and len(meta) > 160:
        issues.append(f"Meta {len(meta)} ký tự > 160 — rút ngắn (~150).")
    if (html.count("<img") + html.count("data:image")) // 2 < min_images and \
            html.count("<img") < min_images:
        issues.append(f"Bài có < {min_images} ảnh — thêm ảnh.")
    if re.search(r"\bCTA\b", html):
        issues.append('Bài còn lộ chữ "CTA" — thay bằng lời kêu gọi tự nhiên.')
    return issues
