"""Giao diện dòng lệnh cho WordPress Studio.

Ví dụ:
    python -m app.cli test
    python -m app.cli draft "cách chọn giường tầng an toàn cho bé"
    python -m app.cli post  "cách chọn giường tầng an toàn cho bé" -y
    python -m app.cli queue -y            # đọc bài "Chờ đăng" từ Lark → viết & đăng
"""
import argparse
from . import config, wordpress, claude_client, lark, sites


def _confirm(question, auto_yes):
    if auto_yes:
        return True
    return input(question).strip().lower().startswith("y")


def _select_site(args):
    """Chọn website theo --site (mã/tên/URL). Không có → site mặc định .env."""
    ref = getattr(args, "site", None)
    site = sites.get(ref) if ref else sites.from_env()
    wordpress.use_site(site)
    if not site.configured:
        raise SystemExit(
            f"❌ Website '{site.name or site.code}' chưa đủ cấu hình để đăng.\n"
            f"   URL={site.url or '(trống)'}  Tài khoản={site.username or '(trống)'}  "
            f"App Password={'có' if site.app_password else 'THIẾU'}\n"
            f"   Điền WP_APP_PASSWORD_{site.code.upper()} vào .env "
            f"(và Tài khoản trong bảng 18.1) rồi thử lại.")
    return site


def _preview(a):
    print("\n========== BÀI CLAUDE SOẠN (chuẩn SEO/GEO) ==========")
    print(f"Tiêu đề     : {a.get('title')}")
    print(f"Slug        : {a.get('slug')}")
    print(f"Meta (mô tả): {a.get('meta_description')}")
    print(f"Từ khoá     : {a.get('focus_keyword')}")
    print(f"Tags        : {', '.join(a.get('tags', []))}")
    print(f"FAQ         : {len(a.get('faq', []))} câu hỏi")
    body = a.get("content_html", "")
    print(f"Thân bài    : {len(body)} ký tự HTML (trích): {body[:300]}…")
    print("=====================================================\n")


def cmd_test(args):
    site = _select_site(args)
    wordpress.verify_auth()
    info = wordpress.site_info()
    print(f"✅ Kết nối WordPress OK: '{info.get('name')}' "
          f"— {info.get('description') or ''} ({site.url})")
    print(f"   Đăng nhập bằng '{site.username}' hợp lệ, đăng bài được.")


def cmd_sites(args):
    """Liệt kê website trong bảng 18.1 + (tuỳ chọn) test kết nối từng cái."""
    rows = sites.load()
    if not rows:
        print("Bảng 18.1 chưa có website nào.")
        return
    print(f"Có {len(rows)} website trong sổ đăng ký (bảng 18.1):\n")
    for s in rows:
        pw = "✅ có App Password" if s.app_password else "⚠️ THIẾU App Password"
        print(f"  • [{s.code or '?':5}] {s.name:22} {s.url or '(chưa có URL)'}")
        print(f"          tài khoản: {s.username or '(trống)':16} | {pw}")
        if args.test and s.configured:
            try:
                wordpress.use_site(s)
                wordpress.verify_auth()
                info = wordpress.site_info()
                print(f"          🔌 kết nối OK — '{info.get('name')}'")
            except Exception as e:  # noqa: BLE001
                print(f"          ❌ lỗi kết nối: {e}")
        elif args.test:
            print("          ⏭️  bỏ qua test (chưa đủ cấu hình)")
        print()


def cmd_draft(args):
    config.require("ANTHROPIC_API_KEY")
    a = claude_client.write_article(args.topic, args.keyword or "")
    _preview(a)
    print("(chỉ soạn nháp, chưa đăng. Dùng lệnh 'post' để đăng.)")


def cmd_post(args):
    config.require("ANTHROPIC_API_KEY")
    site = _select_site(args)
    a = claude_client.write_article(args.topic, args.keyword or "")
    _preview(a)
    status = args.status or site.status or config.WP_DEFAULT_STATUS
    if _confirm(f"Đăng lên WordPress (status={status})? (y/N) ", args.yes):
        res = wordpress.publish(a, status=status)
        print(f"✅ Đã đăng. Link: {res.get('link')}  (id {res.get('id')})")
    else:
        print("Đã huỷ, chưa đăng.")


def cmd_queue(args):
    """Đọc bài 'Chờ đăng' đã lưu trong Lark → đăng thẳng lên WordPress (không cần API)."""
    config.require("WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD",
                   "LARK_BASE_TOKEN", "LARK_TABLE_ID")
    rows = lark.pending_articles()
    if not rows:
        print("Không có bài nào 'Chờ đăng' trong Lark. Xong.")
        return
    print(f"Có {len(rows)} bài chờ đăng.")
    limit = args.limit if args.limit and args.limit > 0 else len(rows)
    n = 0
    for a in rows[:limit]:
        print(f"\n📝 {a['title']}")
        if not _confirm("Đăng bài này? (y/N) ", args.yes):
            print("   Bỏ qua.")
            continue
        res = wordpress.publish(a)
        link = res.get("link", "")
        print(f"   ✅ Đã đăng: {link}")
        try:
            lark.mark_done(a["record_id"], link)
            print("   ✅ Đã cập nhật trạng thái trong Lark.")
        except lark.LarkError as e:
            print(f"   ⚠️ Đăng xong nhưng chưa cập nhật được Lark: {e}")
        n += 1
    print(f"\nXong. Đã đăng {n} bài.")


def cmd_lark_test(args):
    config.require("LARK_BASE_TOKEN", "LARK_TABLE_ID")
    rows = lark.pending_articles()
    print(f"✅ Kết nối Lark OK. Có {len(rows)} bài 'Chờ đăng':")
    for r in rows[:20]:
        print(f"  • {r['title']}")


def main():
    ap = argparse.ArgumentParser(
        prog="wordpress-studio",
        description="Claude tự viết & đăng bài blog WordPress chuẩn SEO/GEO")
    sub = ap.add_subparsers(required=True)

    p = sub.add_parser("test", help="Kiểm tra kết nối WordPress")
    p.add_argument("--site", help="Mã/tên/URL web trong bảng 18.1 (mặc định: .env)")
    p.set_defaults(func=cmd_test)

    p = sub.add_parser("sites", help="Liệt kê website trong bảng 18.1")
    p.add_argument("--test", action="store_true", help="Test kết nối từng web")
    p.set_defaults(func=cmd_sites)

    p = sub.add_parser("draft", help="Claude soạn bài (không đăng)")
    p.add_argument("topic", help="Chủ đề bài viết")
    p.add_argument("--keyword", help="Từ khoá chính (tuỳ chọn)")
    p.set_defaults(func=cmd_draft)

    p = sub.add_parser("post", help="Claude viết & đăng 1 bài")
    p.add_argument("topic", help="Chủ đề bài viết")
    p.add_argument("--site", help="Mã/tên/URL web trong bảng 18.1 (mặc định: .env)")
    p.add_argument("--keyword", help="Từ khoá chính (tuỳ chọn)")
    p.add_argument("--status", choices=["publish", "draft", "future"],
                   help="Trạng thái đăng (mặc định lấy từ .env)")
    p.add_argument("-y", "--yes", action="store_true", help="Đăng luôn, không hỏi")
    p.set_defaults(func=cmd_post)

    p = sub.add_parser("queue",
                       help="Đọc bài 'Chờ đăng' từ Lark → viết & đăng, rồi đánh dấu đã đăng")
    p.add_argument("--limit", type=int, default=0, help="Số bài tối đa xử lý (0 = tất cả)")
    p.add_argument("-y", "--yes", action="store_true", help="Đăng luôn, không hỏi")
    p.set_defaults(func=cmd_queue)

    p = sub.add_parser("lark-test", help="Kiểm tra kết nối Lark & liệt kê bài chờ đăng")
    p.set_defaults(func=cmd_lark_test)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
