#!/usr/bin/env node
/*
 * post-feed-api.js — Đăng bài (ẢNH / VIDEO lên feed) từ bảng "14.3 Đăng bài tự động" lên Facebook Page.
 * KHÁC post-reels-api.js: đăng feed ảnh/video (không phải Reel) và MỖI DÒNG chọn Page riêng
 * qua cột link "Link Page" (trỏ tới bảng 14.1 Pages) → dùng đúng token của page đó.
 *
 * Chạy:  node post-feed-api.js            (đăng thật các dòng đủ điều kiện)
 *        node post-feed-api.js --dry-run  (chỉ liệt kê, không đăng, không ghi Base)
 *
 * Điều kiện đăng 1 dòng: Trạng thái ≠ "Thành công" + có Page link + có file Ảnh/video
 *   + (Lịch đăng bài trống hoặc đã tới giờ). Đăng xong set Trạng thái + Log + Link bài đăng.
 *
 * Bí mật qua BIẾN MÔI TRƯỜNG: LARK_APP_SECRET (bắt buộc). Token FB lấy TỪ bảng Pages (không cần env).
 * Tùy chọn: LARK_APP_ID, LARK_APP_TOKEN, LARK_TABLE_ID, PAGES_TABLE_ID, LARK_DOMAIN, GRAPH_VERSION, RESPECT_SCHEDULE.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const CFG = {
  APP_ID:       process.env.LARK_APP_ID    || 'cli_xxxxxxxxxxxxxxxx',   // Lark app_id (đặt qua env)
  APP_SECRET:   process.env.LARK_APP_SECRET|| '',                       // BẮT BUỘC qua env (Secret)
  APP_TOKEN:    process.env.LARK_APP_TOKEN || 'bascnXXXXXXXXXXXXXXXX',  // base token (đặt qua env)
  TABLE_ID:     process.env.LARK_TABLE_ID  || 'tblXXXXXXXXXXXXXX',      // bảng "Đăng bài Fanpage" (đặt qua env)
  PAGES_TABLE:  process.env.PAGES_TABLE_ID || 'tblXXXXXXXXXXXXXX',      // bảng Pages: ID + access_token (đặt qua env)
  LARK_DOMAIN:  process.env.LARK_DOMAIN    || 'https://open.larksuite.com',
  GRAPH_VERSION:process.env.GRAPH_VERSION  || 'v21.0',
  RESPECT_SCHEDULE: process.env.RESPECT_SCHEDULE !== 'false',
};
const GRAPH = `https://graph.facebook.com/${CFG.GRAPH_VERSION}`;
const DRY = process.argv.includes('--dry-run');
if (!DRY && !CFG.APP_SECRET) { console.error('!! Thiếu LARK_APP_SECRET — đặt qua biến môi trường.'); process.exit(1); }

const F = { link:'Link Page', type:'Loại', caption:'Nội dung', comment:'Comment ebook', media:'Ảnh/video',
            thumb:'Thumbnail', schedule:'Lịch đăng bài', status:'Trạng thái', log:'Log', linkPost:'Link bài đăng' };
const DONE = 'Thành công', FAIL = 'Thất bại';
const now = () => new Date().toISOString().replace('T',' ').slice(0,19);
const log = (...a) => console.log(now(), ...a);
const plain = v => v==null?'':typeof v==='string'?v:Array.isArray(v)?v.map(x=>x.text||x.name||'').join(''):(v.text||v.name||v.link||String(v));
const isVid = a => /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(a.name||'') || /^video/i.test(a.type||'');
const isImg = a => /\.(jpe?g|png|gif|webp|bmp)$/i.test(a.name||'') || /^image/i.test(a.type||'');
// Lấy record_ids từ cell link — API list trả MẢNG [{record_ids:[...]}], API 1-record trả OBJECT {record_ids:[...]}.
const linkRecIds = cell => { if(!cell) return [];
  const arr = Array.isArray(cell) ? cell : [cell]; let ids=[];
  for(const el of arr){ if(!el) continue;
    if(Array.isArray(el.record_ids)) ids=ids.concat(el.record_ids);
    else if(el.record_id) ids.push(el.record_id);
    else if(typeof el==='string') ids.push(el); }
  return ids.filter(Boolean); };

const sleep = ms => new Promise(r=>setTimeout(r,ms));
const RATE_CODES = new Set([1254290,1254291,99991400]);   // Lark TooManyRequest / giới hạn tần suất / xung đột ghi
// Gọi Lark Open API trả JSON, TỰ CHỜ RỒI THỬ LẠI khi bị giới hạn tần suất (TooManyRequest) — tránh chết cả job.
async function larkJson(url, opts, label){
  let last;
  for(let i=0;i<7;i++){
    if(i) await sleep(Math.min(20000, 800*2**i) + Math.floor(Math.random()*600));   // lùi tăng dần ~1.6s,3s,6s,12s,20s + nhiễu
    let r,j; try{ r=await fetch(url,opts); j=await r.json(); }catch(e){ last=e; continue; }
    if(j.code===0) return j;
    if(RATE_CODES.has(j.code) || r.status===429){ last=new Error(`${label}: ${JSON.stringify(j)}`); log(`     ⏳ Lark bận (code ${j.code}) — chờ thử lại ${i+1}/7...`); continue; }
    throw new Error(`${label}: ${JSON.stringify(j)}`);   // lỗi khác (token/quyền/field sai) → không thử lại
  }
  throw last || new Error(label+': hết lượt thử lại (Lark bận)');
}
async function larkToken() {
  const j = await larkJson(CFG.LARK_DOMAIN+'/open-apis/auth/v3/tenant_access_token/internal',
    { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app_id:CFG.APP_ID,app_secret:CFG.APP_SECRET}) }, 'Lark token');
  return j.tenant_access_token;
}
async function listAll(tk, tableId) {
  let items=[], pt='';
  do { const j=await larkJson(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${tableId}/records?page_size=200`+(pt?'&page_token='+pt:''),{headers:{Authorization:'Bearer '+tk}}, 'list '+tableId);
    items=items.concat(j.data.items||[]); pt=j.data.has_more?j.data.page_token:''; } while(pt);
  return items;
}
async function listFields(tk, tableId) {
  const j=await larkJson(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${tableId}/fields?page_size=200`,{headers:{Authorization:'Bearer '+tk}}, 'fields');
  return (j.data.items||[]).map(f=>({name:f.field_name,type:f.type}));
}
async function updateRow(tk, recId, fields) {
  await larkJson(`${CFG.LARK_DOMAIN}/open-apis/bitable/v1/apps/${CFG.APP_TOKEN}/tables/${CFG.TABLE_ID}/records/${recId}`,
    {method:'PUT',headers:{'Content-Type':'application/json; charset=utf-8',Authorization:'Bearer '+tk},body:JSON.stringify({fields})}, 'update');
}
async function downloadMedia(tk, fileToken, out) {
  const tries=[ `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download?extra=${encodeURIComponent(JSON.stringify({bitablePerm:{tableId:CFG.TABLE_ID}}))}`,
                `${CFG.LARK_DOMAIN}/open-apis/drive/v1/medias/${fileToken}/download` ];
  for(let i=0;i<5;i++){
    if(i) await sleep(1000*2**i + Math.floor(Math.random()*500));   // media cũng có thể bị bận → lùi rồi thử lại
    for (const u of tries) { let r; try{ r=await fetch(u,{headers:{Authorization:'Bearer '+tk}}); }catch{ continue; }
      if (r.ok && (r.headers.get('content-type')||'').indexOf('json')<0) { const b=Buffer.from(await r.arrayBuffer()); fs.writeFileSync(out,b); return b.length; } }
    log(`     ⏳ chưa tải được media — thử lại ${i+1}/5...`);
  }
  throw new Error('không tải được media từ Lark (thử lại nhiều lần vẫn lỗi)');
}
async function fbFetch(u,o){ const r=await fetch(u,o); const t=await r.text(); let j; try{j=JSON.parse(t)}catch{j={_raw:t}}
  if(!r.ok||j.error)throw new Error('FB '+r.status+': '+JSON.stringify(j.error||j._raw||j)); return j; }

// Đăng feed nhiều ảnh: upload từng ảnh (published=false) → media_fbid → tạo post /feed đính kèm.
async function postPhotos(pageId, token, files, caption) {
  const fbids=[];
  for (const f of files) {
    const fd=new FormData(); fd.set('access_token',token); fd.set('published','false');
    fd.set('source', new Blob([fs.readFileSync(f.path)]), f.name||'photo.jpg');
    const j=await fbFetch(`${GRAPH}/${pageId}/photos`,{method:'POST',body:fd});
    if(!j.id) throw new Error('upload ảnh không có id'); fbids.push(j.id);
  }
  const body=new URLSearchParams(); body.set('access_token',token); if(caption)body.set('message',caption);
  fbids.forEach((id,i)=>body.set(`attached_media[${i}]`, JSON.stringify({media_fbid:id})));
  const post=await fbFetch(`${GRAPH}/${pageId}/feed`,{method:'POST',body});
  return { objectId:post.id, permalink:`https://www.facebook.com/${post.id}` };
}
// Đăng video bằng RESUMABLE (chunked) upload: chia video thành nhiều mảnh nhỏ đẩy lần lượt
// (đúng cách app FB/YouTube làm) → đăng được video NẶNG >100MB, hết lỗi "FB 413: Payload Too Large".
// 3 pha: start (báo dung lượng, xin session) → transfer (đẩy từng mảnh theo offset FB trả) → finish (chốt bài + caption + thumbnail).
async function postVideo(pageId, token, file, caption, thumbFile) {
  const buf = fs.readFileSync(file.path);
  const fileSize = buf.length;
  // Pha 1 — START: báo tổng dung lượng, nhận upload_session_id + video_id + mốc offset đầu.
  const startBody = new URLSearchParams();
  startBody.set('access_token', token); startBody.set('upload_phase', 'start'); startBody.set('file_size', String(fileSize));
  const st = await fbFetch(`${GRAPH}/${pageId}/videos`, { method:'POST', body:startBody });
  const sessionId = st.upload_session_id, videoId = st.video_id;
  if (!sessionId || !videoId) throw new Error('resumable start thiếu session/video id: '+JSON.stringify(st));
  let start = Number(st.start_offset), end = Number(st.end_offset);
  // Pha 2 — TRANSFER: đẩy lần lượt mảnh [start,end); FB trả offset mới mỗi lần cho tới khi start===end.
  while (start < end) {
    const chunk = buf.subarray(start, end);
    const fd = new FormData();
    fd.set('access_token', token); fd.set('upload_phase', 'transfer'); fd.set('upload_session_id', sessionId);
    fd.set('start_offset', String(start));
    fd.set('video_file_chunk', new Blob([chunk]), file.name||'video.mp4');
    const tr = await fbFetch(`${GRAPH}/${pageId}/videos`, { method:'POST', body:fd });
    start = Number(tr.start_offset); end = Number(tr.end_offset);
    log(`     … đang tải video: ${Math.min(start,fileSize)}/${fileSize} bytes`);
  }
  // Pha 3 — FINISH: chốt bài, gắn caption + thumbnail (nếu có).
  const finFd = new FormData();
  finFd.set('access_token', token); finFd.set('upload_phase', 'finish'); finFd.set('upload_session_id', sessionId);
  if(caption) finFd.set('description', caption);
  if(thumbFile&&thumbFile.path) finFd.set('thumb', new Blob([fs.readFileSync(thumbFile.path)]), thumbFile.name||'thumb.jpg');
  await fbFetch(`${GRAPH}/${pageId}/videos`, { method:'POST', body:finFd });
  let permalink='';
  try{ const info=await fbFetch(`${GRAPH}/${videoId}?fields=permalink_url&access_token=${encodeURIComponent(token)}`,{method:'GET'});
    permalink=info.permalink_url||''; }catch{}
  if(permalink&&permalink.startsWith('/'))permalink='https://www.facebook.com'+permalink;
  return { objectId:videoId, permalink:permalink||`https://www.facebook.com/${videoId}` };
}
async function postComment(pageId, token, objectId, message){
  return fbFetch(`${GRAPH}/${objectId}/comments`,{method:'POST',body:new URLSearchParams({message,access_token:token})});
}
function scheduleMs(cell){ if(cell==null)return null; if(typeof cell==='number')return cell; // Lark datetime = epoch ms
  const t=plain(cell).trim(); if(!t)return null;
  const m=t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); if(m)return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime();
  const d=new Date(t); return isNaN(d)?null:d.getTime(); }

(async()=>{
  if(!DRY) await sleep(Math.floor(Math.random()*4000));   // lệch giờ ngẫu nhiên 0-4s: nhiều bài hẹn cùng phút không tông Lark cùng lúc
  const tk=await larkToken();
  // Tự dò cột link tới bảng Pages (type 18 single-link / 21 duplex-link) — không phụ thuộc tên cột.
  try {
    const flds=await listFields(tk, CFG.TABLE_ID);
    const lf=flds.find(f=>f.type===18||f.type===21) || flds.find(f=>/page/i.test(f.name));
    if(lf) F.link=lf.name;
    log(`Cột link Page = "${F.link}".`);
  } catch(e){ log('! không đọc được fields, dùng mặc định "'+F.link+'": '+String(e.message||e)); }
  // map record_id (bảng Pages) -> {fbId, token, name}
  const pageRecs=await listAll(tk, CFG.PAGES_TABLE);
  const pageMap=new Map();
  for(const r of pageRecs){ pageMap.set(r.record_id, { fbId:plain(r.fields.ID).trim(), token:plain(r.fields.access_token).trim(), name:plain(r.fields.Fanpage).trim() }); }

  const rows=await listAll(tk, CFG.TABLE_ID);
  const nowMs=Date.now();
  let ok=0,err=0,wait=0,skip=0;
  for(const row of rows){
    const recId=row.record_id;
    if(plain(row.fields[F.status])===DONE) { skip++; continue; }              // đã đăng
    const pageRecIds=linkRecIds(row.fields[F.link]);                          // LẤY TẤT CẢ Page được link (không chỉ page đầu) → đăng đủ mọi kênh
    const atts=Array.isArray(row.fields[F.media])?row.fields[F.media]:[];
    if(pageRecIds.length===0 || atts.length===0) { skip++; continue; }        // dòng chưa sẵn sàng → bỏ qua im lặng
    // Gom Page hợp lệ (có ID+token trong bảng 14.1); Page thiếu thông tin cho vào badPages để báo.
    const pages=[], badPages=[];
    for(const prid of pageRecIds){ const pg=pageMap.get(prid);
      if(pg&&pg.fbId&&pg.token) pages.push({recId:prid, ...pg}); else badPages.push(prid); }
    if(pages.length===0){ log(`  [LỖI] ${recId}: không Page nào có ID/token trong bảng 14.1`); if(!DRY)await updateRow(tk,recId,{[F.status]:FAIL,[F.log]:`${now()} - Page thiếu ID/token`}); err++; continue; }

    if(CFG.RESPECT_SCHEDULE){ const s=scheduleMs(row.fields[F.schedule]); if(s&&s>nowMs){ log(`  [CHỜ GIỜ] ${recId}: hẹn ${new Date(s).toISOString().slice(0,16)}`); wait++; continue; } }

    const caption=plain(row.fields[F.caption]);
    const loai=plain(row.fields[F.type]);
    let kind = /video/i.test(loai) ? 'video' : /ảnh|hình|image|photo/i.test(loai) ? 'image' : (atts.some(isVid)?'video':'image');
    const files = kind==='video' ? [ atts.find(isVid)||atts[0] ] : atts.filter(a=>isImg(a)||!isVid(a));
    log(`  >> ${recId} | ${pages.map(p=>p.name).join(', ')}${badPages.length?` (+${badPages.length} page lỗi)`:''} | ${kind} | ${files.length} file | ${pages.length} page | "${caption.slice(0,40).replace(/\n/g,' ')}"`);
    if(DRY){ const c=plain(row.fields[F.comment]).trim(); if(c)log(`     [DRY] comment: ${c.slice(0,60)}`);
      if(kind==='video'){ const th=Array.isArray(row.fields[F.thumb])?row.fields[F.thumb]:[]; log(th.length?`     [DRY] thumbnail: ${th[0].name||'(có)'}`:`     [DRY] thumbnail: (không có -> FB tự tạo)`);} continue; }

    const tmp=[];
    try{
      // Tải media 1 LẦN rồi dùng chung cho mọi Page (không tải lại cho từng kênh).
      for(let i=0;i<files.length;i++){ const f=files[i]; const p=path.join(os.tmpdir(),`feed_${recId}_${i}_${(f.name||'m').replace(/[^\w.]/g,'')}`);
        await downloadMedia(tk,f.file_token,p); f.path=p; tmp.push(p); }
      // Chỉ VIDEO mới dùng thumbnail; ảnh thì bỏ qua. Lấy ảnh đầu trong cột Thumbnail.
      let thumbFile=null;
      if(kind==='video'){ const ths=Array.isArray(row.fields[F.thumb])?row.fields[F.thumb]:[]; const th=ths.find(a=>isImg(a))||ths[0];
        if(th&&th.file_token){ const tp=path.join(os.tmpdir(),`thumb_${recId}_${(th.name||'t').replace(/[^\w.]/g,'')}`); await downloadMedia(tk,th.file_token,tp); thumbFile={path:tp,name:th.name}; tmp.push(tp); } }
      const commentText=plain(row.fields[F.comment]).trim();
      const prevLog=plain(row.fields[F.log])||'';                             // Log cũ → biết Page nào đã đăng để chạy lại KHÔNG đăng trùng.
      const mark=id=>`✓${id}`;
      // Đăng lần lượt lên TỪNG Page; Page đã có dấu ✓ trong Log cũ thì bỏ qua (chống đăng trùng khi retry).
      const results=[]; let firstLink='';
      for(const pg of pages){
        if(prevLog.includes(mark(pg.recId))){ results.push({pg,ok:true,skipped:true}); log(`     • ${pg.name}: đã đăng trước → bỏ qua`); continue; }
        try{
          const res = kind==='video' ? await postVideo(pg.fbId,pg.token,files[0],caption,thumbFile)
                                      : await postPhotos(pg.fbId,pg.token,files,caption);
          let cmtNote='';
          if(commentText){ try{ await postComment(pg.fbId,pg.token,res.objectId,commentText); cmtNote=' +cmt'; }
            catch(e){ cmtNote=' (cmt lỗi)'; log(`     ! ${pg.name} comment lỗi: ${String(e.message||e).slice(0,120)}`); } }
          if(!firstLink) firstLink=res.permalink;
          results.push({pg,ok:true,permalink:res.permalink,objectId:res.objectId,cmtNote});
          log(`     ✔ ${pg.name}: ${res.permalink}${cmtNote}`);
        }catch(e){ const msg=String(e.message||e).slice(0,200); results.push({pg,ok:false,err:msg}); log(`     ✖ ${pg.name}: ${msg}`); }
      }
      // Tổng hợp: giữ dấu ✓ cho mọi Page đã thành công để lần chạy sau bỏ qua, không đăng trùng.
      const okPages=results.filter(r=>r.ok), failPages=results.filter(r=>!r.ok), total=pages.length+badPages.length;
      const logLines=results.map(r=> r.ok
        ? `${mark(r.pg.recId)} ${r.pg.name}${r.skipped?': (đã đăng trước)':`: ${r.permalink||''}${r.cmtNote||''}`}`
        : `✗ ${r.pg.name}: ${r.err}`);
      if(badPages.length) logLines.push(`✗ ${badPages.length} Page thiếu ID/token`);
      const allOk = failPages.length===0 && badPages.length===0;
      const patch={ [F.status]: allOk?DONE:FAIL, [F.log]:`${now()} - ${allOk?'OK':'CHƯA ĐỦ'} ${okPages.length}/${total} page\n`+logLines.join('\n') };
      if(firstLink) patch[F.linkPost]={link:firstLink, text: okPages.length>1?`Xem (${okPages.length} page)`:'Xem bài'};
      await updateRow(tk,recId,patch);
      if(allOk){ ok++; log(`     ✔ XONG ${okPages.length}/${total} page`); } else { err++; log(`     ⚠ MỚI ${okPages.length}/${total} page — sẽ tự thử lại Page còn thiếu ở lần chạy sau`); }
    }catch(e){ const msg=String(e.message||e).slice(0,300); log(`     ✖ LỖI: ${msg}`);
      try{await updateRow(tk,recId,{[F.status]:FAIL,[F.log]:`${now()} - LỖI - ${msg}`});}catch{} err++;
    }finally{ tmp.forEach(p=>{try{fs.unlinkSync(p)}catch{}}); }
  }
  log(`Xong. Đăng: ${ok}, Lỗi: ${err}, Chờ giờ: ${wait}, Bỏ qua: ${skip}.`);
})().catch(e=>{console.error('FATAL',e.message||e);process.exit(1);});
