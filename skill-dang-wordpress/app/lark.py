"""Cầu nối Lark Base ⇄ bài blog.

Hai chế độ tự chọn:
  • Có LARK_APP_SECRET  → gọi Lark Open API trực tiếp (chạy được trên mây/GitHub Actions).
  • Không có secret     → fallback dùng lark-cli đã cấu hình trên máy local.

Public: push_article() · pending_articles() · mark_done().

Bảng nội dung (đổi tên cột trong .env):
  Tiêu đề · Nội dung · Từ khoá SEO · Meta description · Slug · Loại
  · Trạng thái ("Chờ đăng"/"Đã đăng") · Lịch đăng bài · Link bài đăng
"""
import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime

import requests

from . import config


class LarkError(RuntimeError):
    pass


def _use_api():
    return bool(config.LARK_APP_SECRET)


# ======================================================================
#  NHÁNH 1 — LARK OPEN API TRỰC TIẾP (mây)
# ======================================================================
_token_cache = {"value": None}


def _api_token():
    if _token_cache["value"]:
        return _token_cache["value"]
    r = requests.post(
        f"{config.LARK_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": config.LARK_APP_ID, "app_secret": config.LARK_APP_SECRET},
        timeout=30)
    data = r.json()
    if data.get("code") != 0:
        raise LarkError(f"Lấy token Lark lỗi: [{data.get('code')}] {data.get('msg')}")
    _token_cache["value"] = data["tenant_access_token"]
    return _token_cache["value"]


def _api(method, path, **kw):
    url = f"{config.LARK_DOMAIN}{path}"
    headers = {"Authorization": f"Bearer {_api_token()}",
               "Content-Type": "application/json; charset=utf-8"}
    r = requests.request(method, url, headers=headers, timeout=60, **kw)
    data = r.json()
    if data.get("code") != 0:
        raise LarkError(f"Lark API [{data.get('code')}] {data.get('msg')} ({path})")
    return data.get("data", {})


def _api_field(val):
    """Chuẩn hoá 1 ô Bitable về chuỗi."""
    if val is None:
        return ""
    if isinstance(val, list):
        parts = []
        for v in val:
            if isinstance(v, dict):
                parts.append(v.get("text") or v.get("name") or v.get("link") or "")
            else:
                parts.append(str(v))
        return "".join(parts)
    if isinstance(val, dict):
        return val.get("text") or val.get("value") or val.get("name") or ""
    return str(val)


def _base_path(suffix=""):
    return (f"/open-apis/bitable/v1/apps/{config.LARK_BASE_TOKEN}"
            f"/tables/{config.LARK_TABLE_ID}/records{suffix}")


def _api_push(fields):
    data = _api("POST", _base_path(), data=json.dumps({"fields": fields},
                                                      ensure_ascii=False))
    return (data.get("record") or {}).get("record_id")


def _api_pending():
    out, page = [], None
    while True:
        params = {"page_size": 100}
        if page:
            params["page_token"] = page
        data = _api("GET", _base_path(), params=params)
        for rec in data.get("items", []):
            out.append({"record_id": rec.get("record_id"),
                        "fields": rec.get("fields", {})})
        if not data.get("has_more"):
            break
        page = data.get("page_token")
    return out


def _api_update(record_id, fields):
    _api("PUT", _base_path(f"/{record_id}"),
         data=json.dumps({"fields": fields}, ensure_ascii=False))


# ======================================================================
#  NHÁNH 2 — LARK-CLI (local, fallback)
# ======================================================================
def _resolve_cli():
    p = shutil.which(config.LARK_CLI)
    if p:
        return p
    for ext in (".cmd", ".exe", ".bat"):
        p = shutil.which(config.LARK_CLI + ext)
        if p:
            return p
    return None


def _cli_run(args):
    cli = _resolve_cli()
    if not cli:
        raise LarkError(
            f"Không tìm thấy '{config.LARK_CLI}'. Cài lark-cli, hoặc đặt LARK_APP_SECRET "
            "trong .env để dùng Lark Open API.")
    tmp = None
    args = list(args)
    for i, a in enumerate(args):
        if isinstance(a, str) and a.startswith("{") and a.endswith("}"):
            fd, tmp = tempfile.mkstemp(suffix=".json", dir=os.getcwd(),
                                       prefix="_lark_payload_")
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(a)
            args[i] = "@./" + os.path.basename(tmp)
    base = ["base"] + args + ["--format", "json"]
    cmd = (["cmd", "/c", cli] + base) if cli.lower().endswith((".cmd", ".bat")) \
        else [cli] + base
    try:
        out = subprocess.run(cmd, capture_output=True, text=True,
                             encoding="utf-8", timeout=120)
    finally:
        if tmp:
            try:
                os.remove(tmp)
            except OSError:
                pass
    text = (out.stdout or "").strip()
    data = {}
    if text:
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            s, e = text.find("{"), text.rfind("}")
            data = json.loads(text[s:e + 1]) if s >= 0 and e > s else {"_raw": text}
    if out.returncode != 0 or (isinstance(data, dict) and data.get("ok") is False):
        msg = (data.get("error") or {}).get("message") if isinstance(data, dict) else ""
        raise LarkError(msg or out.stderr or "lark-cli lỗi")
    return data


def _cli_records(data):
    d = data.get("data") if isinstance(data, dict) else None
    if not isinstance(d, dict):
        return []
    header = d.get("fields") or []
    rows = d.get("data") or []
    ids = d.get("record_id_list") or []
    if header and rows and isinstance(rows[0], list):
        res = []
        for i, row in enumerate(rows):
            f = {header[j]: row[j] for j in range(min(len(header), len(row)))}
            res.append({"record_id": ids[i] if i < len(ids) else None, "fields": f})
        return res
    for k in ("records", "items"):
        if isinstance(d.get(k), list):
            return d[k]
    return []


# ======================================================================
#  PUBLIC — dispatch theo chế độ
# ======================================================================
def _schedule_to_ms(schedule):
    if schedule is None:
        return None
    if isinstance(schedule, (int, float)):
        return int(schedule)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return int(datetime.strptime(schedule, fmt).timestamp() * 1000)
        except ValueError:
            continue
    return None


def push_article(article, status=None, schedule=None, loai=None):
    """Đổ 1 bài Claude vừa viết vào bảng nội dung. Trả về record_id."""
    config.require("LARK_BASE_TOKEN", "LARK_TABLE_ID")
    from . import wordpress
    body = wordpress.assemble_content(article)
    C = config
    fields = {
        C.LARK_COL_TITLE: article.get("title", ""),
        C.LARK_COL_CONTENT: body,
        C.LARK_COL_KEYWORD: article.get("focus_keyword", ""),
        C.LARK_COL_META: article.get("meta_description", ""),
        C.LARK_COL_SLUG: article.get("slug", ""),
        C.LARK_COL_TYPE: loai or "Cẩm nang",
        C.LARK_COL_STATUS: status or C.LARK_STATUS_PENDING,
    }
    if _use_api():
        ms = _schedule_to_ms(schedule)
        if ms is not None:
            fields[C.LARK_COL_SCHEDULE] = ms
        return _api_push(fields)
    # lark-cli: dạng cột
    names = list(fields.keys())
    row = [fields[n] for n in names]
    if schedule:
        names.append(C.LARK_COL_SCHEDULE)
        row.append(schedule)
    payload = json.dumps({"fields": names, "rows": [row]}, ensure_ascii=False)
    data = _cli_run(["+record-batch-create", "--base-token", C.LARK_BASE_TOKEN,
                     "--table-id", C.LARK_TABLE_ID, "--json", payload])
    d = data.get("data") or {}
    recs = d.get("records") or d.get("record_id_list") or []
    if recs:
        first = recs[0]
        return first.get("record_id") if isinstance(first, dict) else first
    return None


def pending_articles():
    """Đọc các bài 'Chờ đăng' → list dict sẵn sàng đăng lên WP."""
    config.require("LARK_BASE_TOKEN", "LARK_TABLE_ID")
    C = config
    recs = _api_pending() if _use_api() else _cli_records(
        _cli_run(["+record-list", "--base-token", C.LARK_BASE_TOKEN,
                  "--table-id", C.LARK_TABLE_ID]))
    out = []
    for rec in recs:
        f = rec.get("fields", {})
        status = _api_field(f.get(C.LARK_COL_STATUS))
        if C.LARK_STATUS_PENDING and status != C.LARK_STATUS_PENDING:
            continue
        content = _api_field(f.get(C.LARK_COL_CONTENT))
        title = _api_field(f.get(C.LARK_COL_TITLE))
        if not (content and title):
            continue
        out.append({
            "record_id": rec.get("record_id"),
            "title": title,
            "content": content,
            "meta_description": _api_field(f.get(C.LARK_COL_META)),
            "focus_keyword": _api_field(f.get(C.LARK_COL_KEYWORD)),
            "slug": _api_field(f.get(C.LARK_COL_SLUG)),
        })
    return out


def mark_done(record_id, link=""):
    """Đổi trạng thái record sang 'Đã đăng' + ghi link bài."""
    config.require("LARK_BASE_TOKEN", "LARK_TABLE_ID")
    C = config
    patch = {C.LARK_COL_STATUS: C.LARK_STATUS_DONE}
    if link and C.LARK_COL_URL:
        patch[C.LARK_COL_URL] = link
    if _use_api():
        _api_update(record_id, patch)
        return
    body = json.dumps({"record_id_list": [record_id], "patch": patch},
                      ensure_ascii=False)
    _cli_run(["+record-batch-update", "--base-token", C.LARK_BASE_TOKEN,
              "--table-id", C.LARK_TABLE_ID, "--json", body])
