"""Claude làm bộ não nội dung: viết bài blog chuẩn SEO & GEO.

Trả về 1 dict có cấu trúc để đăng lên WordPress:
    title, slug, meta_description, focus_keyword, tags[], content_html, faq[]
"""
import json
from anthropic import Anthropic
from . import config

_client = None


def client():
    global _client
    if _client is None:
        config.require("ANTHROPIC_API_KEY")
        _client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


def _text(msg):
    return "".join(b.text for b in msg.content if b.type == "text").strip()


def _brand():
    bits = []
    if config.BRAND_NAME:
        bits.append(f"Thương hiệu: {config.BRAND_NAME}")
    if config.BRAND_NICHE:
        bits.append(f"Lĩnh vực: {config.BRAND_NICHE}")
    bits.append(f"Giọng văn: {config.BRAND_TONE}")
    if config.BRAND_INTERNAL_LINK:
        bits.append(f"Link nội bộ nên chèn 1 lần: {config.BRAND_INTERNAL_LINK}")
    return " | ".join(bits)


def _strip_fences(s):
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        if s.endswith("```"):
            s = s[: s.rfind("```")]
    return s.strip()


def write_article(topic, keyword=""):
    """Viết 1 bài blog hoàn chỉnh, chuẩn SEO + GEO. Trả về dict."""
    kw = keyword or topic
    prompt = f"""Bạn là chuyên gia nội dung SEO/GEO tiếng Việt, viết cho blog WordPress.
{_brand()}

Nhiệm vụ: viết 1 BÀI BLOG hoàn chỉnh về chủ đề: "{topic}".
Từ khoá chính (focus keyword): "{kw}".

CHUẨN SEO (bắt buộc):
- Tiêu đề (title) ≤ 60 ký tự, chứa từ khoá chính, hấp dẫn để click.
- meta_description ≤ 155 ký tự, chứa từ khoá chính, tóm gọn lợi ích, có CTA nhẹ.
- slug ngắn, không dấu, dùng gạch nối, chứa từ khoá chính.
- Từ khoá chính xuất hiện trong: đoạn mở đầu (100 chữ đầu), ít nhất 1 thẻ H2, và tự nhiên trong bài (mật độ ~1%). KHÔNG nhồi nhét.
- Bài dài 800–1500 từ, chia H2/H3 rõ ràng, đoạn ngắn dễ đọc, có ít nhất 1 danh sách (ul/ol).
- Chèn 1 link nội bộ (nếu có link nội bộ ở trên).

CHUẨN GEO (tối ưu cho AI trả lời — ChatGPT, Gemini, Google AI Overview):
- Ngay dưới tiêu đề, viết 1 đoạn "câu trả lời trực tiếp" 2-3 câu, súc tích, trả lời thẳng ý định tìm kiếm (để AI trích dẫn được ngay).
- Đặt các H2 dạng CÂU HỎI mà người dùng hay hỏi.
- Nêu số liệu / bước cụ thể / định nghĩa rõ ràng (AI thích trích nội dung có thực thể & con số rõ).
- Tạo 3-5 câu hỏi FAQ kèm câu trả lời ngắn (sẽ được gắn schema FAQ để AI đọc).

Trả về DUY NHẤT một JSON hợp lệ (không giải thích, không bọc ```), theo đúng khoá:
{{
  "title": "…",
  "slug": "…",
  "meta_description": "…",
  "focus_keyword": "{kw}",
  "tags": ["…", "…", "…"],
  "content_html": "<p>…</p><h2>…</h2>… (HTML thân bài, KHÔNG lặp lại thẻ H1/title)",
  "faq": [{{"q": "…", "a": "…"}}, {{"q": "…", "a": "…"}}]
}}"""
    msg = client().messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = _strip_fences(_text(msg))
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # thử cắt lấy khối JSON đầu tiên
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start : end + 1])
    data.setdefault("focus_keyword", kw)
    data.setdefault("tags", [])
    data.setdefault("faq", [])
    return data
