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
// Mỗi field ghi NHIỀU tên khả dĩ (cách nhau dấu phẩy) — engine tự dò tên nào có thật trong bảng.
// Chống việc người dùng đổi tên cột làm hỏng.
const F = {
  page: env("F_PAGE", "Page,Trang,Fanpage"),
  status: env("F_STATUS", "Trạng thái,Trang thai,Status"),
  media: env("F_MEDIA", "Ảnh/video,Ảnh/ Video,Ảnh/ video,Ảnh/Video,Ảnh,Video,Media"),
  caption: env("F_CAPTION", "Nội dung,Mô tả,Nội dung bài,Caption"),
  comment: env("F_COMMENT", "Comment ebook,Comment,Bình luận,Comment đầu"),
  thumb: env("F_THUMB", "Thumbnail,Ảnh bìa,Anh bia,Thumb"),   // THÊM 27/11/2026: ảnh bìa cho Reel/video
  link: env("F_LINK", "Link bài đăng,Link video,Link,Link bài"),
  log: env("F_LOG", "Log,Ghi chú lỗi,Ghi chú,Log đăng"),
  schedule: env("F_SCHEDULE", "Lịch đăng bài,Lịch đăng,Lịch"),
  // THÊM 2026-08-12: cột phân loại. Dòng nào ghi "Tin 24h" (hoặc Story) thì đăng TIN 24 GIỜ
  // thay vì bài trên bảng tin. Bảng chưa có cột này / để trống -> chạy y như cũ.
  type: env("F_TYPE", "Loại,Loai,Kiểu,Kieu,Định dạng"),
};
// Nhận diện dòng muốn đăng tin 24 giờ (khớp cả "Tin 24h", "tin 24 gio", "story").
const laTin24h = v => /tin24|story/.test(String(v || "").normalize("NFC").toLowerCase().replace(/\s+/g, "").replace(/giờ|gio|h\b/g, ""));
const DONE = env("STATUS_DONE", "Đã đăng");
const FAIL = env("STATUS_FAIL", "Lỗi");
// CHỐNG TRÙNG (lớp cuối): "chốt" dòng sang trạng thái "đang xử lý" NGAY TRƯỚC khi gọi FB, để nếu
// lần chạy chết giữa chừng thì dòng không còn "Chờ đăng" -> lần sau KHÔNG đăng lại. Để trống = tắt.
const CLAIM = env("STATUS_CLAIM", "Đang đăng");
// Tôn trọng "Lịch đăng": dòng hẹn giờ TƯƠNG LAI thì bỏ qua (chờ tới giờ). FORCE=true để đăng ngay bất kể lịch.
// VÁ 21/10/2026 (sự cố đăng dồn 23 bài NTN): FORCE (nút "Đăng ngay") CHỈ được bỏ qua lịch
// khi có RECORD_ID cụ thể. Không có RECORD_ID thì nút vẫn tôn trọng lịch -> dòng hẹn giờ tương lai KHÔNG bị đăng sớm.
const RESPECT_SCHEDULE = env("RESPECT_SCHEDULE", "true") !== "false" && !(env("FORCE", "") === "true" && (process.env.RECORD_ID || "").trim());
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
// Bí danh: tên trong cột Page -> tên trang FB thật. VD phongtrocaocap.com/.vn/"Thanh Hiên Sleepbox"
// -> "Sleepbox Cao Cấp HCM". Nạp qua env PAGE_ALIASES (JSON {"bí danh":"tên trang thật"}).
const ALIASES = (() => { try { return JSON.parse(env("PAGE_ALIASES", "{}")); } catch { return {}; } })();
const aliasMap = new Map();
for (const [a, real] of Object.entries(ALIASES)) aliasMap.set(norm(a), norm(real));
function resolvePage(nameFromRow) {
  if (CFG.FB_PAGE_ID && CFG.FB_PAGE_TOKEN) return { id: CFG.FB_PAGE_ID, token: CFG.FB_PAGE_TOKEN, name: "(ép env)" };
  const key = aliasMap.get(norm(nameFromRow)) || norm(nameFromRow);
  return PAGES.get(key) || null;
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

// Đọc độ dài video ngay trong file MP4/MOV (box "mvhd") — không cần cài ffmpeg trên máy chạy.
// Trả về số giây; 0 = không đọc được (khi đó giữ nguyên đường Reel như cũ).
function videoDurationSec(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const size = fs.fstatSync(fd).size;
    const head = Buffer.alloc(16);
    const findBox = (from, to, name) => {
      let off = from;
      while (off + 8 <= to) {
        fs.readSync(fd, head, 0, 8, off);
        let bsize = head.readUInt32BE(0);
        const type = head.toString("latin1", 4, 8);
        let hlen = 8;
        if (bsize === 1) {                       // box lớn: kích thước 64-bit nằm ngay sau
          fs.readSync(fd, head, 0, 8, off + 8);
          bsize = Number(head.readBigUInt64BE(0));
          hlen = 16;
        } else if (bsize === 0) bsize = to - off; // box chạy tới hết file
        if (bsize < hlen) break;
        if (type === name) return { start: off + hlen, end: off + bsize };
        off += bsize;
      }
      return null;
    };
    const moov = findBox(0, size, "moov");
    if (!moov) return 0;
    const mvhd = findBox(moov.start, moov.end, "mvhd");
    if (!mvhd) return 0;
    const b = Buffer.alloc(32);
    fs.readSync(fd, b, 0, 32, mvhd.start);
    let timescale, duration;
    if (b[0] === 1) {                            // version 1: mốc thời gian 64-bit
      timescale = b.readUInt32BE(20);
      duration = Number(b.readBigUInt64BE(24));
    } else {
      timescale = b.readUInt32BE(12);
      duration = b.readUInt32BE(16);
    }
    return timescale > 0 ? duration / timescale : 0;
  } catch { return 0; }
  finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* ignore */ } } }
}

// Video DÀI (quá giới hạn Reel) -> đăng dạng video thường trên trang, qua /videos nhiều mảnh.
// Upload từng mảnh theo offset FB trả về nên chịu được file vài trăm MB mà không nuốt hết RAM.
async function postVideo(pageId, token, videoPath, caption) {
  const size = fs.statSync(videoPath).size;
  const start = await fbJson(`${CFG.GRAPH}/${pageId}/videos`, {
    method: "POST",
    body: new URLSearchParams({ upload_phase: "start", file_size: String(size), access_token: token }),
  });
  const sess = start.upload_session_id, videoId = start.video_id;
  if (!sess || !videoId) throw new Error("start thiếu upload_session_id/video_id");
  let off = Number(start.start_offset || 0), endOff = Number(start.end_offset || 0);
  const fd = fs.openSync(videoPath, "r");
  try {
    while (endOff > off) {
      const len = endOff - off;
      const chunk = Buffer.alloc(len);
      fs.readSync(fd, chunk, 0, len, off);
      const form = new FormData();
      form.append("upload_phase", "transfer");
      form.append("upload_session_id", sess);
      form.append("start_offset", String(off));
      form.append("access_token", token);
      form.append("video_file_chunk", new Blob([chunk]), path.basename(videoPath));
      const t = await fbJson(`${CFG.GRAPH}/${pageId}/videos`, { method: "POST", body: form });
      off = Number(t.start_offset); endOff = Number(t.end_offset);
    }
  } finally { try { fs.closeSync(fd); } catch { /* ignore */ } }
  await fbJson(`${CFG.GRAPH}/${pageId}/videos`, {
    method: "POST",
    body: new URLSearchParams({
      upload_phase: "finish", upload_session_id: sess,
      description: caption || "", access_token: token,
    }),
  });
  let permalink = "";
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const st = await fbJson(`${CFG.GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(token)}`, { method: "GET" });
      permalink = st.permalink_url || permalink;
      const ph = st.status && (st.status.video_status || (st.status.processing_phase && st.status.processing_phase.status));
      if (ph === "ready" || ph === "PUBLISHED") break;
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

// Đăng NHIỀU ảnh vào 1 bài: upload từng ảnh (chưa xuất bản) -> tạo 1 feed post gắn hết.
async function postPhotos(pageId, token, imgPaths, caption) {
  if (imgPaths.length <= 1) return postPhoto(pageId, token, imgPaths[0], caption);
  const ids = [];
  for (const p of imgPaths) {
    const fd = new FormData();
    fd.append("published", "false");        // upload nhưng chưa đăng
    fd.append("access_token", token);
    fd.append("source", new Blob([fs.readFileSync(p)]), path.basename(p));
    const j = await fbJson(`${CFG.GRAPH}/${pageId}/photos`, { method: "POST", body: fd });
    if (j.id) ids.push(j.id);
  }
  const params = new URLSearchParams();
  params.append("message", caption || "");
  params.append("access_token", token);
  ids.forEach((id, i) => params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
  const post = await fbJson(`${CFG.GRAPH}/${pageId}/feed`, { method: "POST", body: params });
  return { objectId: post.id, permalink: post.id ? `https://www.facebook.com/${post.id}` : "" };
}

async function postText(pageId, token, caption) {
  const j = await fbJson(`${CFG.GRAPH}/${pageId}/feed`, { method: "POST", body: new URLSearchParams({ message: caption || "", access_token: token }) });
  return { objectId: j.id, permalink: j.id ? `https://www.facebook.com/${j.id}` : "" };
}

// ---- TIN 24 GIỜ (story) — THÊM 2026-08-12, không đụng các hàm đăng bài ở trên ----
// Facebook KHÔNG cho hẹn giờ tin 24h ở phía họ, nên lịch do engine giữ (cột "Lịch đăng bài"):
// tới giờ mới bắn. Tin không mang caption — chữ nằm sẵn trong ảnh/video.
async function postStoryVideo(pageId, token, videoPath) {
  const size = fs.statSync(videoPath).size;
  const start = await fbJson(`${CFG.GRAPH}/${pageId}/video_stories`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "start", access_token: token }),
  });
  if (!start.video_id || !start.upload_url) throw new Error("story start thiếu video_id/upload_url");
  const buf = fs.readFileSync(videoPath);
  const up = await fetch(start.upload_url, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(buf.length), "Content-Type": "application/octet-stream" },
    body: buf,
  });
  const upJson = await up.json().catch(() => ({}));
  if (upJson.error) throw new Error("story upload: " + JSON.stringify(upJson.error).slice(0, 160));
  const fin = await fbJson(`${CFG.GRAPH}/${pageId}/video_stories`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "finish", video_id: start.video_id, access_token: token }),
  });
  const id = fin.post_id || fin.id || start.video_id;
  return { objectId: id, permalink: "" };   // tin 24h không có link công khai bền
}

async function postStoryPhoto(pageId, token, imgPath) {
  const fd = new FormData();
  fd.append("published", "false");           // nạp ảnh trước, chưa xuất bản
  fd.append("access_token", token);
  fd.append("source", new Blob([fs.readFileSync(imgPath)]), path.basename(imgPath));
  const up = await fbJson(`${CFG.GRAPH}/${pageId}/photos`, { method: "POST", body: fd });
  if (!up.id) throw new Error("story ảnh: không lấy được photo_id");
  const j = await fbJson(`${CFG.GRAPH}/${pageId}/photo_stories`, {
    method: "POST", body: new URLSearchParams({ photo_id: up.id, access_token: token }),
  });
  return { objectId: j.post_id || j.id || up.id, permalink: "" };
}

// THÊM 27/11/2026: gắn ẢNH BÌA (cột Thumbnail) cho Reel/video sau khi đăng. Facebook cần video xử lý xong
// mới nhận ảnh bìa nên thử lại vài lần. Lỗi ở bước này KHÔNG làm hỏng bài (bài đã lên), chỉ ghi chú vào Log.
async function setThumbnail(token, videoId, imgPath) {
  let last = "";
  for (let i = 0; i < 6; i++) {
    try {
      const form = new FormData();
      form.append("source", new Blob([fs.readFileSync(imgPath)]), path.basename(imgPath));
      form.append("is_preferred", "true");
      form.append("access_token", token);
      await fbJson(`${CFG.GRAPH}/${videoId}/thumbnails`, { method: "POST", body: form });
      return true;
    } catch (e) { last = String(e.message || e); await new Promise(r => setTimeout(r, 15000)); }
  }
  throw new Error(last || "không gắn được ảnh bìa");
}

async function postComment(token, objectId, message) {
  return fbJson(`${CFG.GRAPH}/${objectId}/comments`, { method: "POST", body: new URLSearchParams({ message, access_token: token }) });
}

// Ghi bảng có RETRY: nếu đăng FB xong mà ghi "Đã đăng" bị lỗi mạng thì dòng vẫn là "Chờ đăng"
// -> lần chạy sau đăng LẠI (trùng bài). Thử tối đa 3 lần để chắc chắn đánh dấu được.
async function updateRow(tk, recId, fields) {
  let last = -1;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${CFG.DOMAIN}/open-apis/bitable/v1/apps/${CFG.BASE}/tables/${CFG.TABLE}/records/${recId}`, {
        method: "PUT", headers: { "Content-Type": "application/json; charset=utf-8", Authorization: "Bearer " + tk },
        body: JSON.stringify({ fields }),
      });
      const j = await r.json().catch(() => ({ code: -1 }));
      last = j.code;
      if (last === 0) return 0;
    } catch { last = -1; }
    if (attempt < 3) await new Promise(res => setTimeout(res, 800 * attempt));
  }
  return last;
}

// Lấy tập tên field thật của bảng (để tự dò, chống đổi tên cột)
async function tableFields(tk) {
  const r = await fetch(`${CFG.DOMAIN}/open-apis/bitable/v1/apps/${CFG.BASE}/tables/${CFG.TABLE}/fields?page_size=200`,
    { headers: { Authorization: "Bearer " + tk } });
  const j = await r.json();
  return new Set(((j.data && j.data.items) || []).map(f => f.field_name));
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
  // Tự dò tên field THẬT trong bảng (chống việc đổi tên cột làm hỏng)
  const fieldSet = await tableFields(tk);
  const RF = {};
  for (const [k, csv] of Object.entries(F)) {
    const cands = csv.split(",").map(s => s.trim()).filter(Boolean);
    RF[k] = cands.find(c => fieldSet.has(c)) || cands[0];
  }
  log(`Field thật: nội dung="${RF.caption}" · media="${RF.media}" · lịch="${RF.schedule}" · trạng thái="${RF.status}" · link="${RF.link}" · log="${RF.log}"`);
  const rows = await listRows(tk);
  const onlyIds = (process.env.RECORD_ID || "").split(",").map(s => s.trim()).filter(Boolean);
  const TRIGGER = env("TRIGGER", "Chờ đăng");   // trạng thái được coi là "cần đăng" (ngoài ô trống)
  const canPost = st => !st || st === TRIGGER;
  const targets = rows.filter(r => (onlyIds.length === 0 || onlyIds.includes(r.record_id)) && canPost(firstSel(r.fields[RF.status])));
  log(`Tổng ${rows.length} dòng, ${targets.length} dòng chưa đăng. (Kho token: ${PAGES.size} trang)`);
  let ok = 0, err = 0;
  for (const row of targets) {
    const recId = row.record_id;
    const pageName = firstSel(row.fields[RF.page]);
    const caption = plain(row.fields[RF.caption]).trim();
    const media = row.fields[RF.media];
    const atts = Array.isArray(media) ? media.filter(a => a && a.file_token) : (media && media.file_token ? [media] : []);
    const videoAtt = atts.find(a => isVideo(a.name));
    const imageAtts = atts.filter(a => isImage(a.name));
    const commentText = plain(row.fields[RF.comment]).trim();
    const pg = resolvePage(pageName);
    if (!caption && atts.length === 0) { log(`  [BỎ QUA] ${recId}: trống`); continue; }
    if (RESPECT_SCHEDULE) {
      const sMs = schedMs(row.fields[RF.schedule]);
      if (sMs && sMs > Date.now()) {
        log(`  [CHỜ GIỜ] ${recId}: hẹn ${new Date(sMs).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} — chưa tới giờ, bỏ qua`);
        continue;
      }
    }
    if (!pg) {
      log(`  ✖ ${recId}: KHÔNG CÓ TOKEN cho trang "${pageName}" (kiểm tra pages.json)`);
      if (!DRY) await updateRow(tk, recId, { [RF.status]: FAIL, [RF.log]: `${now()} - Không tìm thấy token trang "${pageName}"` });
      err++; continue;
    }
    const tin24 = laTin24h(firstSel(row.fields[RF.type]));   // THÊM: dòng này là tin 24 giờ?
    const mediaDesc = videoAtt ? videoAtt.name : (imageAtts.length ? `${imageAtts.length} ảnh` : "(text)");
    log(`  >> ${recId} → [${pageName}] ${tin24 ? "TIN 24H · " : ""}${mediaDesc} | ${caption.slice(0, 32).replace(/\n/g, " ")}`);
    if (DRY) { log(`     [DRY] sẽ đăng lên ${pg.name || pageName} (id ${pg.id}) — ${mediaDesc}.`); continue; }
    // CHỐT DÒNG trước khi đăng (chống trùng triệt để). Best-effort: nếu ghi claim lỗi thì VẪN đăng
    // (dựa vào khóa tuần tự) để hệ thống không bao giờ bị kẹt không đăng được.
    if (CLAIM) {
      const cc = await updateRow(tk, recId, { [RF.status]: CLAIM, [RF.log]: `${now()} - đang xử lý...` });
      if (cc !== 0) log(`     ! chốt dòng lỗi (code ${cc}) — vẫn đăng, dựa vào khóa tuần tự`);
    }
    try {
      let res;
      // THÊM 2026-08-12: nhánh TIN 24 GIỜ. Chỉ chạy khi cột Loại ghi "Tin 24h"; mọi trường hợp
      // khác rơi xuống đúng các nhánh cũ (Reel / video / ảnh / chữ) không đổi một dòng nào.
      if (tin24) {
        if (!videoAtt && !imageAtts.length) throw new Error("Tin 24h phải có ảnh hoặc video đính kèm");
        const a = videoAtt || imageAtts[0];
        const tmp = path.join(os.tmpdir(), `fbs_${Date.now()}_${a.name}`);
        await download(tk, a.file_token, tmp);
        let dung = tmp;
        try {
          if (videoAtt) res = await postStoryVideo(pg.id, pg.token, tmp);
          else { dung = await maybeShrink(tmp); res = await postStoryPhoto(pg.id, pg.token, dung); }
        } finally {
          for (const f of new Set([tmp, dung])) { try { fs.unlinkSync(f); } catch { /* ignore */ } }
        }
        if (caption) log(`     (tin 24h không mang chữ — phần "Nội dung" chỉ để ghi chú)`);
        if (imageAtts.length > 1 || (videoAtt && imageAtts.length)) log(`     (chỉ đăng 1 tệp đầu tiên; mỗi tin = 1 tệp)`);
      } else if (videoAtt) {
        const tmp = path.join(os.tmpdir(), `fbv_${Date.now()}_${videoAtt.name}`);
        await download(tk, videoAtt.file_token, tmp);
        // Reel chỉ nhận clip ngắn. Video dài hơn thì đăng dạng video thường, không đẩy vào Reels.
        const dur = videoDurationSec(tmp);
        const reelMax = Number(env("REEL_MAX_SEC", "90"));
        if (dur > reelMax) {
          log(`     video dài ${Math.round(dur)}s (> ${reelMax}s) → đăng dạng video thường, không phải Reel`);
          res = await postVideo(pg.id, pg.token, tmp, caption);
        } else {
          res = await postReel(pg.id, pg.token, tmp, caption);
        }
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      } else if (imageAtts.length) {
        const paths = [], cleanup = [];
        for (let i = 0; i < imageAtts.length; i++) {
          const a = imageAtts[i];
          const tmp = path.join(os.tmpdir(), `fbi_${Date.now()}_${i}_${a.name}`);
          await download(tk, a.file_token, tmp);
          cleanup.push(tmp);
          const up = await maybeShrink(tmp);
          if (up !== tmp) cleanup.push(up);
          paths.push(up);
        }
        res = await postPhotos(pg.id, pg.token, paths, caption);
        for (const p of cleanup) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
      } else {
        res = await postText(pg.id, pg.token, caption);
      }
      let cmtNote = "";
      const thumbF = row.fields[RF.thumb];
      const thumbAtt = (Array.isArray(thumbF) ? thumbF : (thumbF ? [thumbF] : [])).find(a => a && a.file_token && isImage(a.name));
      if (thumbAtt && videoAtt && !tin24 && res.objectId) {
        const tmp = path.join(os.tmpdir(), `fbt_${Date.now()}_${thumbAtt.name}`);
        let dung = tmp;
        try { await download(tk, thumbAtt.file_token, tmp); dung = await maybeShrink(tmp); await setThumbnail(pg.token, res.objectId, dung); cmtNote += " +bìa"; }
        catch (e) { cmtNote += ` (bìa lỗi: ${String(e.message || e).slice(0, 80)})`; }
        finally { for (const f of new Set([tmp, dung])) { try { fs.unlinkSync(f); } catch { /* ignore */ } } }
      }
      if (commentText && res.objectId && !tin24) {   // tin 24h không có phần bình luận
        try { await postComment(pg.token, res.objectId, commentText); cmtNote = " +cmt"; }
        catch { cmtNote = " (cmt lỗi)"; }
      }
      const linkVal = res.permalink ? { link: res.permalink, text: res.permalink } : "";
      const code = await updateRow(tk, recId, { [RF.status]: DONE, [RF.link]: linkVal, [RF.log]: `${now()} - OK [${pageName}] - ${res.objectId}${cmtNote}` });
      log(`     ✔ ĐÃ ĐĂNG (${pageName}): ${res.permalink || "(đang xử lý)"}${code !== 0 ? " ! ghi bảng lỗi code " + code : ""}`); ok++;
    } catch (e) {
      const msg = String(e.message || e).slice(0, 300);
      log(`     ✖ LỖI (${pageName}): ${msg}`);
      try { await updateRow(tk, recId, { [RF.status]: FAIL, [RF.log]: `${now()} - ${msg}` }); } catch { /* ignore */ }
      err++;
    }
  }
  log(`Xong. Đăng: ${ok}, Lỗi: ${err}.`);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
