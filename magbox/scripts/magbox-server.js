#!/usr/bin/env node
// MagBox — two-way LAN file bridge between a human and their agent.
// No cloud, no auth (LAN-only by design — see SECURITY in SKILL.md).
//
// Two rivers:
//   Drop to Agent   — human uploads files that land in TO_AGENT_DIR (the agent's inbox)
//   Drop from Agent — agent writes files into FROM_AGENT_DIR; human browses + downloads them
//
// Both directions keep a visible, timestamped record so you can see what went each way.
//
// CONFIG: everything machine-specific is a variable below or an env override.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Config (override with env vars) ---
const PORT = parseInt(process.env.MAGBOX_PORT || '9900', 10);
const BIND = process.env.MAGBOX_BIND || '0.0.0.0';           // LAN-reachable. Use 127.0.0.1 to lock to localhost.
const TO_AGENT_DIR = process.env.MAGBOX_TO_AGENT || path.join(os.homedir(), 'Inbox');        // human -> agent
const FROM_AGENT_DIR = process.env.MAGBOX_FROM_AGENT || path.join(os.homedir(), 'Outbox');   // agent -> human

for (const d of [TO_AGENT_DIR, FROM_AGENT_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const HOST_LABEL = `${os.hostname()}:${PORT}`;

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
  mp3: 'audio/mpeg', mp4: 'video/mp4', mov: 'video/quicktime',
  txt: 'text/plain', md: 'text/plain', json: 'application/json',
};

// --- Shared UI helpers injected into both pages ---
const SHARED_JS = `
const IMG_EXTS = new Set(['jpg','jpeg','png','gif','webp','svg']);
const ICONS = { pdf:'PDF', mp3:'AUD', mp4:'VID', mov:'VID', zip:'ZIP', md:'TXT', txt:'TXT', js:'FILE', json:'FILE', default:'FILE' };
function fileIcon(name){ const e=name.split('.').pop().toLowerCase(); return ICONS[e]||ICONS.default; }
function fmtSize(b){ if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function fmtDate(iso){ const d=new Date(iso), n=new Date(), s=(n-d)/1000;
  if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
`;

// --- Drop from Agent (dark visual grid, human downloads what the agent sent) ---
const FROM_AGENT_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drop from Agent</title>
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:-apple-system,sans-serif;background:#0d0d0d;color:#e5e5e0;min-height:100vh;padding:28px}
 h1{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#c8a84b;margin-bottom:20px}
 .nav{margin-bottom:22px}
 .nav a{font-size:.65rem;color:#555;text-decoration:none;border:1px solid #222;border-radius:3px;padding:4px 10px;margin-right:8px}
 .nav a.active{color:#c8a84b;border-color:#c8a84b44}
 .files-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
 .files-header span{font-size:.7rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#555}
 .files-header button{font-size:.65rem;color:#555;background:none;border:1px solid #222;border-radius:3px;padding:2px 8px;cursor:pointer}
 .files-header button:hover{color:#c8a84b;border-color:#c8a84b44}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
 .file-card{background:#111;border:1px solid #1e1e1e;border-radius:6px;padding:10px 12px;position:relative;transition:border-color .15s}
 .file-card:hover{border-color:#c8a84b44}
 .file-card .thumb{width:100%;height:90px;object-fit:cover;border-radius:3px;margin-bottom:8px;display:block;background:#0a0a0a}
 .file-card .thumb-ph{width:100%;height:90px;border-radius:3px;margin-bottom:8px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-size:.6rem;color:#c8a84b;letter-spacing:.1em}
 .file-card .name{font-size:.7rem;color:#d1d5db;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
 .file-card .meta{font-size:.6rem;color:#4b5563}
 .file-card a.dl{position:absolute;top:8px;right:8px;font-size:.6rem;color:#555;text-decoration:none;background:#0a0a0a;border:1px solid #222;border-radius:3px;padding:2px 6px;opacity:0;transition:opacity .15s}
 .file-card:hover a.dl{opacity:1}
 .empty{font-size:.8rem;color:#333;padding:20px 0}
</style></head><body>
<h1>Drop from Agent</h1>
<div class="nav"><a href="/" class="active">From Agent</a><a href="/to">To Agent</a></div>
<div class="files-header"><span id="count">Loading...</span><button onclick="load()">Refresh</button></div>
<div class="grid" id="grid"><div class="empty">Loading...</div></div>
<script>${SHARED_JS}
function load(){ fetch('/api/from').then(r=>r.json()).then(files=>{
 document.getElementById('count').textContent=files.length+' file'+(files.length!==1?'s':'')+' from agent';
 const g=document.getElementById('grid');
 if(!files.length){g.innerHTML='<div class="empty">Nothing here yet</div>';return;}
 g.innerHTML=files.map(f=>{const ext=f.name.split('.').pop().toLowerCase();const isImg=IMG_EXTS.has(ext);
  const prev=isImg?'<img class="thumb" src="/dl/from/'+encodeURIComponent(f.name)+'" loading="lazy" onerror="this.style.display=0">':'<div class="thumb-ph">'+fileIcon(f.name)+'</div>';
  return '<div class="file-card">'+prev+'<a class="dl" href="/dl/from/'+encodeURIComponent(f.name)+'" download="'+f.name+'">DL</a><div class="name" title="'+f.name+'">'+f.name+'</div><div class="meta">'+fmtSize(f.size)+' &middot; '+fmtDate(f.modified)+'</div></div>';
 }).join('');
}).catch(()=>{document.getElementById('grid').innerHTML='<div class="empty">Failed to load.</div>';});}
load();
</script></body></html>`;

// --- Drop to Agent (white minimal drop page + hidden "what I've sent" tray) ---
const TO_AGENT_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drop to Agent</title>
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:-apple-system,sans-serif;background:#fafafa;color:#1a1a1a;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 20px}
 h1{font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:24px}
 .nav{margin-bottom:32px}
 .nav a{font-size:.65rem;color:#aaa;text-decoration:none;border:1px solid #e2e2e2;border-radius:3px;padding:4px 10px;margin:0 4px}
 .nav a.active{color:#1a1a1a;border-color:#1a1a1a}
 .zone{width:100%;max-width:520px;border:2px dashed #ccc;border-radius:12px;padding:60px 28px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:#fff}
 .zone.dragover{border-color:#1a1a1a;background:#f0f0f0}
 .zone p{font-size:.95rem;color:#999;margin-bottom:14px}
 input[type=file]{display:none}
 label.browse{font-size:.8rem;color:#1a1a1a;text-decoration:underline;cursor:pointer}
 progress{width:100%;max-width:520px;margin-top:14px;display:none;height:3px;accent-color:#1a1a1a}
 .status{font-size:.8rem;color:#999;min-height:1.4em;margin-top:14px}
 .status.ok{color:#16a34a}.status.err{color:#dc2626}
 .tray{width:100%;max-width:520px;margin-top:36px}
 .tray summary{font-size:.7rem;color:#aaa;cursor:pointer;letter-spacing:.05em;text-transform:uppercase;list-style:none}
 .tray summary::-webkit-details-marker{display:none}
 .tray summary:before{content:'\\25B8 ';color:#ccc}
 .tray[open] summary:before{content:'\\25BE '}
 .sent-item{display:flex;justify-content:space-between;font-size:.72rem;color:#666;padding:7px 2px;border-bottom:1px solid #eee}
 .sent-item .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
 .sent-item .m{color:#bbb}
</style></head><body>
<h1>Drop to Agent</h1>
<div class="nav"><a href="/">From Agent</a><a href="/to" class="active">To Agent</a></div>
<div class="zone" id="zone"><p>Drag a file here</p><label class="browse" for="picker">or browse</label><input type="file" id="picker" multiple></div>
<progress id="bar" value="0" max="100"></progress>
<div class="status" id="status"></div>
<details class="tray"><summary id="tray-label">What you've sent</summary><div id="sent"></div></details>
<script>${SHARED_JS}
const zone=document.getElementById('zone'),picker=document.getElementById('picker'),status=document.getElementById('status'),bar=document.getElementById('bar');
zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');upload(e.dataTransfer.files);});
picker.addEventListener('change',e=>upload(e.target.files));
function upload(files){[...files].forEach(file=>{const fd=new FormData();fd.append('file',file);const x=new XMLHttpRequest();x.open('POST','/api/to');
 status.className='status';status.textContent='Uploading '+file.name+'...';bar.style.display='block';
 x.upload.onprogress=e=>{if(e.lengthComputable)bar.value=(e.loaded/e.total)*100;};
 x.onload=()=>{bar.style.display='none';if(x.status===200){status.className='status ok';status.textContent=file.name+' delivered.';loadSent();}else{status.className='status err';status.textContent='Error: '+x.responseText;}};
 x.onerror=()=>{status.className='status err';status.textContent='Upload failed.';};x.send(fd);});}
function loadSent(){fetch('/api/to/list').then(r=>r.json()).then(files=>{
 document.getElementById('tray-label').textContent="What you've sent ("+files.length+")";
 const s=document.getElementById('sent');
 if(!files.length){s.innerHTML='<div class="sent-item"><span class="m">nothing yet</span></div>';return;}
 s.innerHTML=files.map(f=>'<div class="sent-item"><span class="n">'+f.name+'</span><span class="m">'+fmtSize(f.size)+' &middot; '+fmtDate(f.modified)+'</span></div>').join('');
});}
loadSent();
</script></body></html>`;

function listDir(dir) {
  try {
    return fs.readdirSync(dir).map(name => {
      try { const st = fs.statSync(path.join(dir, name)); return st.isFile() ? { name, size: st.size, modified: st.mtime.toISOString() } : null; }
      catch { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.modified) - new Date(a.modified));
  } catch { return []; }
}

function parseMultipart(body, boundary) {
  const parts = [], sep = Buffer.from('--' + boundary);
  let start = 0;
  while (true) {
    const idx = body.indexOf(sep, start); if (idx === -1) break;
    const next = body.indexOf(sep, idx + sep.length); if (next === -1) break;
    const part = body.slice(idx + sep.length + 2, next - 2);
    const hEnd = part.indexOf(Buffer.from('\r\n\r\n')); if (hEnd === -1) { start = next; continue; }
    const headers = part.slice(0, hEnd).toString();
    const data = part.slice(hEnd + 4);
    const fileMatch = headers.match(/filename="([^"]+)"/);
    if (fileMatch) parts.push({ filename: fileMatch[1], data });
    start = next;
  }
  return parts;
}

function serveFile(req, res, dir) {
  const raw = decodeURIComponent(req.url.split('/').pop());
  const safe = path.basename(raw);
  const fp = path.join(dir, safe);
  if (!fp.startsWith(dir)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('Not found'); }
  const st = fs.statSync(fp);
  const ext = safe.split('.').pop().toLowerCase();
  const ct = MIME[ext] || 'application/octet-stream';
  const range = req.headers.range;
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': ct, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    return res.end();
  }
  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let s = m[1] ? parseInt(m[1], 10) : 0, e = m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(s) || s < 0) s = 0; if (isNaN(e) || e >= st.size) e = st.size - 1;
    if (s > e) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { 'Content-Type': ct, 'Content-Length': e - s + 1, 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(fp, { start: s, end: e }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': ct, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
  return fs.createReadStream(fp).pipe(res);
}

function receiveUpload(req, res, destDir) {
  const ct = req.headers['content-type'] || '';
  const bMatch = ct.match(/boundary=(.+)/);
  if (!bMatch) { res.writeHead(400); return res.end('No boundary'); }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const parts = parseMultipart(Buffer.concat(chunks), bMatch[1]);
    if (!parts.length) { res.writeHead(400); return res.end('No file'); }
    parts.forEach(p => {
      const safe = path.basename(p.filename).replace(/[^a-zA-Z0-9._\-]/g, '_');
      fs.writeFileSync(path.join(destDir, safe), p.data);
    });
    res.writeHead(200); res.end('ok');
  });
}

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const m = req.method;

  if (m === 'GET' && (u === '/' || u === '/from')) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(FROM_AGENT_HTML); }
  if (m === 'GET' && u === '/to') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(TO_AGENT_HTML); }

  if (m === 'GET' && u === '/api/from') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(listDir(FROM_AGENT_DIR))); }
  if (m === 'GET' && u === '/api/to/list') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(listDir(TO_AGENT_DIR))); }

  if ((m === 'GET' || m === 'HEAD') && u.startsWith('/dl/from/')) return serveFile(req, res, FROM_AGENT_DIR);
  if ((m === 'GET' || m === 'HEAD') && u.startsWith('/dl/to/')) return serveFile(req, res, TO_AGENT_DIR);

  if (m === 'POST' && u === '/api/to') return receiveUpload(req, res, TO_AGENT_DIR);

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, BIND, () => {
  console.log(`MagBox running on http://${HOST_LABEL}`);
  console.log(`  To Agent   (human -> agent): ${TO_AGENT_DIR}`);
  console.log(`  From Agent (agent -> human): ${FROM_AGENT_DIR}`);
});
