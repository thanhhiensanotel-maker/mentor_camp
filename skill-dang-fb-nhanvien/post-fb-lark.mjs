// post-fb-lark.mjs — Đăng bài Facebook TỪ Lark Base (CÁCH 1: token nằm trong máy, KHÔNG trong Base).
// ĐA TRANG: đọc cột "Page" của mỗi dòng -> tra token trong kho (pages.json trên máy) -> đăng đúng trang.
// Chạy:  node post-fb-lark.mjs            (đăng thật các dòng chưa đăng)
//        node post-fb-lark.mjs --dry-run  (chỉ liệt kê, không đăng)
// Cần Node 18+.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = (k, d = "") => (process.env[k] ?? d);
const CFG = {
  APP_ID: env("LARK_APP_ID"),
  APP_SECRET: env("LARK_APP_SECRET"),
  BASE: env("LARK_APP_TOKEN"),
  TABLE: env("LARK_TABLE_ID"),
  DOMAIN: env("LARK_DOMAIN", "https://open.larksuite.com"),
  GRAPH: "https://graph.facebook.com/v21.0",
  PAGES_FILE: env("PAGES_FILE", ""),   // kho token: pages.json  {data:[{name,id,access_token}]}
  FB_PAGE_ID: env("FB_PAGE_ID"),       // (tùy chọn) ép 1 trang cho MỌI dòng, bỏ qua cột Page
  FB_PAGE_TOKEN: env("FB_PAGE_TOKEN"),
};
const DRY = process.argv.includes("--dry-run");
const F = {
  page: env("F_PAGE", "Page"),
  status: env("F_STATUS", "Trạng thái"),
  media: env("F_MEDIA", "Ảnh/ Video"),
  caption: env("F_CAPTION", "Mô tả"),
  comment: env("F_COMMENT", "Comment ebook"),
  link: env("F_LINK", "Link video"),
  log: env("F_LOG", "Ghi chú lỗi"),
  schedule: env("F_SCHEDULE", "Lịch đăng"),
};
const DONE = env("STATUS_DONE", "Đã đăng");
const FAIL = env("STATUS_FAIL", "Lỗi");
// Tôn trọng "Lịch đăng": dòng hẹn giờ TƯƠNG LAI thì bỏ qua (chờ tới giờ). FORCE=true để đăng ngay bất kể lịch.
const RESPECT_SCHEDULE = env("RESPECT_SCHEDULE", "true") !== "false" && env("FORCE", "") !== "true";
const schedMs = v => (typeof v === "number" ? v : (v && !isNaN(Number(v)) ? Number(v) : 0));

for (const k of ["APP_ID", "APP_SECRET", "BASE", "TABLE"]) {
  if (!CFG[k]) { console.error("❌ Thiếu biến:", k); process.exit(1); }
}

// ---- Kho token (Cách 1): chuẩn hoá tên trang -> {id, token} ----
const norm = s => String(s || "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
const PAGES = new Map();
if (CFG.PAGES_FILE && fs.existsSync(CFG.PAGES_FILE)) {
  const d = JSON.parse(fs.readFileSync(CFG.PAGES_FILE, "utf8"));
  for (const p of (d.data || d)) PAGES.set(norm(p.name), { id: p.id, token: p.access_token, name: p.name });
}
function resolvePage(nameFromRow) {
  if (CFG.FB_PAGE_ID && CFG.FB_PAGE_TOKEN) return { id: CFG.FB_PAGE_ID, token: CFG.FB_PAGE_TOKEN, name: "(ép env)" };
  return PAGES.get(norm(nameFromRow)) || null;
}

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (...a) => console.log(now(), ...a);

async function larkToken() {
  const r = await fetch(`${CFG.DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: CFG.APP_ID, app_secret: CFG.APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error("Lark token lỗi: " + JSON.stringify(j));
  return j.tenant_access_token;
}

async function listRows(tk) {
  let items = [], pt = "";
  do {
    const r = await fetch(`${CFG.DOMAIN}/open-apis/bitable/v1/apps/${CFG.BASE}/tables/${CFG.TABLE}/records?page_size=200` + (pt ? `&page_token=${pt}` : ""),
      { headers: { Authorization: "Bearer " + tk } });
    const j = await r.json();
    if (j.code !== 0) throw new Error("Đọc bảng lỗi: " + JSON.stringify(j));
    items = items.concat(j.data.items || []);
    pt = j.data.has_more ? j.data.page_token : "";
  } while (pt);
  return items;
}

function plain(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(x => (x && x.text) ? x.text : (typeof x === "string" ? x : "")).join("");
  if (typeof v === "object") return v.text || v.name || "";
  return String(v);
}
const firstSel = v => Array.isArray(v) ? (v[0] && (v[0].text ?? v[0].name ?? v[0])) || "" : (v && (v.text ?? v.name)) || (v ?? "");

async function download(tk, fileToken, dest) {
  const extra = encodeURIComponent(JSON.stringify({ bitablePerm: { tableId: CFG.TABLE } }));
  const urls = [
    `${CFG.DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download?extra=${extra}`,
    `${CFG.DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download`,
  ];
  for (const u of urls) {
    const r = await fetch(u, { headers: { Authorization: "Bearer " + tk } });
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(dest, b); return b.length; }
  }
  throw new Error("không tải được file đính kèm từ Lark");
}

async function fbJson(url, opt) {
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(`FB ${r.status}: ${j.error.message}`);
  if (!r.ok) throw new Error(`FB ${r.status}`);
  return j;
}

async function postReel(pageId, token, videoPath, caption) {
  const start = await fbJson(`${CFG.GRAPH}/${pageId}/video_reels?upload_phase=start&access_token=${encodeURIComponent(token)}`, { method: "POST" });
  const videoId = start.video_id, uploadUrl = start.upload_url;
  if (!videoId || !uploadUrl) throw new Error("start thiếu video_id/upload_url");
  const buf = fs.readFileSync(videoPath);
  await fetch(uploadUrl, { method: "POST", headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(buf.length) }, body: buf });
  await fbJson(`${CFG.GRAPH}/${pageId}/video_reels`, { method: "POST", body: new URLSearchParams({ upload_phase: "finish", video_id: videoId, video_state: "PUBLISHED", description: caption || "", access_token: token }) });
  let permalink = "";
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const st = await fbJson(`${CFG.GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(token)}`, { method: "GET" });
      permalink = st.permalink_url || permalink;
      const ph = st.status && (st.status.video_status || (st.status.processing_phase && st.status.processing_phase.status));
      if (ph === "ready" || ph === "PUBLISHED" || (st.status && st.status.video_status === "ready")) break;
    } catch { /* poll tiếp */ }
  }
  return { objectId: videoId, permalink };
}

async function postPhoto(pageId, token, imgPath, caption) {
  const fd = new FormData();
  fd.append("caption", caption || "");
  fd.append("access_token", token);
  fd.append("source", new Blob([fs.readFileSync(imgPath)]), path.basename(imgPath));
  const j = await fbJson(`${CFG.GRAPH}/${pageId}/photos`, { method: "POST", body: fd });
  const id = j.post_id || j.id;
  return { objectId: id, permalink: id ? `https://www.facebook.com/${id}` : "" };
}

async function postText(pageId, token, caption) {
  const j = await fbJson(`${CFG.GRAPH}/${pageId}/feed`, { method: "POST", body: new URLSearchParams({ message: caption || "", access_token: token }) });
  return { objectId: j.id, permalink: j.id ? `https://www.facebook.com/${j.id}` : "" };
}

async function postComment(token, objectId, message) {
  return fbJson(`${CFG.GRAPH}/${objectId}/comments`, { method: "POST", body: new URLSearchParams({ message, access_token: token }) });
}

async function updateRow(tk, recId, fields) {
  const r = await fetch(`${CFG.DOMAIN}/open-apis/bitable/v1/apps/${CFG.BASE}/tables/${CFG.TABLE}/records/${recId}`, {
    method: "PUT", headers: { "Content-Type": "application/json; charset=utf-8", Authorization: "Bearer " + tk },
    body: JSON.stringify({ fields }),
  });
  const j = await r.json().catch(() => ({ code: -1 }));
  return j.code;
}

const isImage = (n) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(n || "");
const isVideo = (n) => /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(n || "");

// FB /photos chặn ảnh nặng (~4MB) -> tự nén ảnh lớn xuống JPEG cho nhẹ. Cần gói "sharp".
async function maybeShrink(imgPath) {
  try {
    if (fs.statSync(imgPath).size <= 3.8 * 1048576) return imgPath;
    const sharp = (await import("sharp")).default;
    const out = imgPath + ".fb.jpg";
    await sharp(imgPath).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(out);
    log(`     (đã nén ảnh ${(fs.statSync(imgPath).size / 1048576).toFixed(1)}MB -> ${(fs.statSync(out).size / 1048576).toFixed(1)}MB)`);
    return out;
  } catch (e) {
    log(`     ! không nén được ảnh (${String(e.message || e).slice(0, 60)}) — đăng nguyên bản`);
    return imgPath;
  }
}

(async () => {
  const tk = await larkToken();
  const rows = await listRows(tk);
  const onlyIds = (process.env.RECORD_ID || "").split(",").map(s => s.trim()).filter(Boolean);
  const TRIGGER = env("TRIGGER", "Chờ đăng");   // trạng thái được coi là "cần đăng" (ngoài ô trống)
  const canPost = st => !st || st === TRIGGER;
  const targets = rows.filter(r => (onlyIds.length === 0 || onlyIds.includes(r.record_id)) && canPost(firstSel(r.fields[F.status])));
  log(`Tổng ${rows.length} dòng, ${targets.length} dòng chưa đăng. (Kho token: ${PAGES.size} trang)`);
  let ok = 0, err = 0;
  for (const row of targets) {
    const recId = row.record_id;
    const pageName = firstSel(row.fields[F.page]);
    const caption = plain(row.fields[F.caption]).trim();
    const media = row.fields[F.media];
    const att = Array.isArray(media) ? media[0] : null;
    const commentText = plain(row.fields[F.comment]).trim();
    const pg = resolvePage(pageName);
    if (!caption && !att) { log(`  [BỎ QUA] ${recId}: trống`); continue; }
    if (RESPECT_SCHEDULE) {
      const sMs = schedMs(row.fields[F.schedule]);
      if (sMs && sMs > Date.now()) {
        log(`  [CHỜ GIỜ] ${recId}: hẹn ${new Date(sMs).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} — chưa tới giờ, bỏ qua`);
        continue;
      }
    }
    if (!pg) {
      log(`  ✖ ${recId}: KHÔNG CÓ TOKEN cho trang "${pageName}" (kiểm tra pages.json)`);
      if (!DRY) await updateRow(tk, recId, { [F.status]: FAIL, [F.log]: `${now()} - Không tìm thấy token trang "${pageName}"` });
      err++; continue;
    }
    log(`  >> ${recId} → [${pageName}] ${att ? (att.name || "file") : "(text)"} | ${caption.slice(0, 32).replace(/\n/g, " ")}`);
    if (DRY) { log(`     [DRY] sẽ đăng lên ${pg.name || pageName} (id ${pg.id}).`); continue; }
    try {
      let res;
      if (att && att.file_token && isVideo(att.name)) {
        const tmp = path.join(os.tmpdir(), `fbv_${Date.now()}_${att.name}`);
        await download(tk, att.file_token, tmp);
        res = await postReel(pg.id, pg.token, tmp, caption);
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      } else if (att && att.file_token && isImage(att.name)) {
        const tmp = path.join(os.tmpdir(), `fbi_${Date.now()}_${att.name}`);
        await download(tk, att.file_token, tmp);
        const up = await maybeShrink(tmp);
        res = await postPhoto(pg.id, pg.token, up, caption);
        try { fs.unlinkSync(tmp); if (up !== tmp) fs.unlinkSync(up); } catch { /* ignore */ }
      } else {
        res = await postText(pg.id, pg.token, caption);
      }
      let cmtNote = "";
      if (commentText && res.objectId) {
        try { await postComment(pg.token, res.objectId, commentText); cmtNote = " +cmt"; }
        catch { cmtNote = " (cmt lỗi)"; }
      }
      const linkVal = res.permalink ? { link: res.permalink, text: res.permalink } : "";
      const code = await updateRow(tk, recId, { [F.status]: DONE, [F.link]: linkVal, [F.log]: `${now()} - OK [${pageName}] - ${res.objectId}${cmtNote}` });
      log(`     ✔ ĐÃ ĐĂNG (${pageName}): ${res.permalink || "(đang xử lý)"}${code !== 0 ? " ! ghi bảng lỗi code " + code : ""}`); ok++;
    } catch (e) {
      const msg = String(e.message || e).slice(0, 300);
      log(`     ✖ LỖI (${pageName}): ${msg}`);
      try { await updateRow(tk, recId, { [F.status]: FAIL, [F.log]: `${now()} - ${msg}` }); } catch { /* ignore */ }
      err++;
    }
  }
  log(`Xong. Đăng: ${ok}, Lỗi: ${err}.`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
