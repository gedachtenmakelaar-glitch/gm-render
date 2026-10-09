// Instant-preview server (owner: main chat): serves videos/_base/_work/vista with no browser cache (edits show on reload).
//   started by .claude/launch.json "gm-vista" (port 8767): node videos/_base/motor/servidor_vista.mjs 8767
// Node instead of Python's http.server: under the browser's burst of ~30 module requests Python reset connections
// (three.js came cut with ERR_CONNECTION_RESET and the page never started; 09/10/2026).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), '_work', 'vista');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(+(process.argv[2] || 8766), '127.0.0.1');
