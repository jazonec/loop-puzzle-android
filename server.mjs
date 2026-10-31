import http from 'node:http';
import { readFile } from 'node:fs/promises';
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript' };
const port = Number(process.env.PORT || 5173);
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!['/', '/index.html', '/style.css', '/app.js', '/puzzle.js'].includes(path)) { res.writeHead(404).end(); return; }
  const file = path === '/' ? 'index.html' : path.slice(1);
  try { res.writeHead(200, { 'Content-Type': types[file.split('.').at(-1)], 'Cache-Control': 'no-cache' }); res.end(await readFile(new URL(file, import.meta.url))); }
  catch { res.writeHead(500).end('Unable to load file'); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
