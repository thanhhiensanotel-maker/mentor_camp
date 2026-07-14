"""Ảnh cho bài blog.

Vì hosting của web CHẶN upload ảnh qua REST (/wp-json/.../media → 403), skill dùng 2 cách:
  • Ảnh TRONG bài  → nén nhỏ rồi NHÚNG data-URI thẳng vào nội dung (figure()).
  • Ảnh ĐẠI DIỆN   → upload qua XML-RPC (/xmlrpc.php, firewall không chặn) rồi gán featured.
XML-RPC đôi khi bị chặn nhịp (403) → tự retry vài lần.
"""
import base64
import io
import time
import xmlrpc.client

import requests
from requests.auth import HTTPBasicAuth

from . import config


def compress(path, max_w=900, quality=78):
    """Nén 1 ảnh về JPEG (giảm dung lượng để nhúng/upload nhẹ)."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_w, max_w))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def data_uri(path, max_w=900, quality=78):
    """Trả về chuỗi data:image để nhúng thẳng vào <img src=...>."""
    return "data:image/jpeg;base64," + base64.b64encode(compress(path, max_w, quality)).decode()


def figure(path, caption, max_w=900):
    """1 khối <figure> CĂN GIỮA có ảnh nhúng + caption (tiêu đề ảnh, căn giữa) + alt = caption."""
    return (f'<figure style="text-align:center;">'
            f'<img src="{data_uri(path, max_w)}" alt="{caption}" loading="lazy"/>'
            f'<figcaption style="text-align:center;font-style:italic;color:#666;">'
            f'{caption}</figcaption></figure>')


def _auth():
    return HTTPBasicAuth(config.WP_USERNAME, config.WP_APP_PASSWORD.replace(" ", ""))


def upload_featured(post_id, path, filename=None, max_w=1200, quality=85, retries=5):
    """Upload ảnh ĐẠI DIỆN (thumbnail) qua XML-RPC + gán cho bài. Retry khi bị chặn nhịp.

    Trả về {'id', 'url'} của ảnh trong Thư viện Media.
    """
    bits = compress(path, max_w, quality)
    fn = filename or "thumbnail.jpg"
    pw = config.WP_APP_PASSWORD.replace(" ", "")
    xurl = f"{config.WP_SITE_URL}/xmlrpc.php"
    last = None
    for _ in range(retries):
        try:
            sv = xmlrpc.client.ServerProxy(xurl)
            res = sv.wp.uploadFile(0, config.WP_USERNAME, pw,
                                   {"name": fn, "type": "image/jpeg",
                                    "bits": xmlrpc.client.Binary(bits), "overwrite": True})
            aid = int(res.get("id"))
            requests.post(f"{config.WP_SITE_URL}/wp-json/wp/v2/posts/{post_id}",
                          auth=_auth(), json={"featured_media": aid}, timeout=60)
            return {"id": aid, "url": res.get("url")}
        except Exception as e:  # noqa: BLE001 — XML-RPC Fault/ProtocolError/timeout
            last = e
            time.sleep(4)
    raise RuntimeError(f"Upload ảnh bìa thất bại sau {retries} lần: {last}")
