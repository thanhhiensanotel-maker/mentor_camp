"""Trợ giúp soạn nội dung blog theo SOP viet-blog + BỘ KIỂM TRA CHẤT LƯỢNG.

Dùng để bài ra "phát nào chuẩn phát đó": đủ 1500 từ, mật độ từ khoá 1-3%,
font Times New Roman, FAQ + schema GEO, không lộ chữ "CTA".
"""
import json
import re


def times_new_roman(html):
    """Bọc thân bài trong font Times New Roman (theo quy ước SANOTEL)."""
    return f'<div style="font-family:\'Times New Roman\',Times,serif;">{html}</div>'


def heading(no, text, level=2):
    """Heading/subheading CÓ SỐ THỨ TỰ + IN ĐẬM. no ví dụ: '1', '2.1'."""
    tag = f"h{level}"
    return f'<{tag} style="font-weight:700;">{no}. {text}</{tag}>'


def cta(text, link, label="Liên hệ Nội Thất Cho Con"):
    """Khối CTA liên hệ cuối bài (lời kêu gọi tự nhiên — KHÔNG viết chữ 'CTA')."""
    return (f'<p>{text} 👉 <a href="{link}"><strong>{label}</strong></a> '
            f'để được tư vấn ngay.</p>')


def answer_box(text):
    """Đoạn TRẢ LỜI TRỰC TIẾP đầu bài (AEO + GEO — cho featured snippet & AI trích dẫn).

    Nên 40-60 từ, trả lời thẳng ý định tìm kiếm ngay câu đầu.
    """
    return (f'<p style="background:#f2f8ff;border-left:4px solid #2b7a4b;'
            f'padding:10px 14px;margin:0 0 14px;"><strong>{text}</strong></p>')


def key_takeaways(points, title="Tóm tắt nhanh"):
    """Khối TL;DR gạch đầu dòng ý chính (AIO — để Google AI Overview / trợ lý AI trích)."""
    lis = "".join(f"<li>{p}</li>" for p in points)
    return (f'<div style="background:#fafafa;border:1px solid #eee;border-radius:8px;'
            f'padding:10px 14px;margin:0 0 14px;"><strong>📌 {title}</strong>'
            f'<ul>{lis}</ul></div>')


def faq_block(faq, start_no=9):
    """Từ list [(câu hỏi, trả lời)] → (html hiển thị, script JSON-LD FAQPage cho GEO).

    Trả về 1 chuỗi ghép sẵn (FAQ hiển thị + schema) để chèn cuối bài.
    """
    if not faq:
        return ""
    rows = "".join(f'<h3 style="font-weight:700;">{q}</h3><p>{a}</p>' for q, a in faq)
    html = f'<h2 style="font-weight:700;">{start_no}. Câu hỏi thường gặp</h2>{rows}'
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
    if ":" in title:
        issues.append("Tiêu đề CÓ dấu hai chấm ':' — bỏ đi (dùng ' - ' nếu cần).")
    if meta and len(meta) > 160:
        issues.append(f"Meta {len(meta)} ký tự > 160 — rút ngắn (~150).")
    if html.count("<img") < min_images:
        issues.append(f"Bài có < {min_images} ảnh — thêm ảnh.")
    if re.search(r"\bCTA\b", html):
        issues.append('Bài còn lộ chữ "CTA" — thay bằng lời kêu gọi tự nhiên.')
    # CTA liên hệ cuối bài
    if "lien-he" not in html and "liên hệ" not in html.lower():
        issues.append("Thiếu CTA liên hệ ở cuối — thêm lời mời liên hệ.")
    # heading/subheading phải IN ĐẬM
    if re.search(r"<h[23](?![^>]*font-weight)", html):
        issues.append("Có heading/subheading CHƯA in đậm (thêm style font-weight:700).")
    # chú thích ảnh phải căn giữa
    if "<figcaption" in html and re.search(r"<figcaption(?![^>]*text-align)", html):
        issues.append("Chú thích ảnh CHƯA căn giữa (figcaption cần text-align:center).")
    # AEO/GEO: phải có FAQ + schema
    if "FAQPage" not in html:
        issues.append("Thiếu FAQ + schema FAQPage (AEO/GEO) — thêm khối câu hỏi thường gặp.")
    # AEO/AIO: phải có đoạn trả lời trực tiếp hoặc tóm tắt nhanh đầu bài
    if "border-left" not in html and "Tóm tắt nhanh" not in html:
        issues.append("Thiếu đoạn TRẢ LỜI TRỰC TIẾP / TÓM TẮT NHANH đầu bài (AEO/AIO).")
    return issues
