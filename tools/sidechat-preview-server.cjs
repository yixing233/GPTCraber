const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const routes = new Map([
  ['/', ['tools/sidechat-harness.html', 'text/html; charset=utf-8']],
  ['/tools/sidechat-harness.html', ['tools/sidechat-harness.html', 'text/html; charset=utf-8']],
  ['/chatgpt-md-exporter.user.js', ['chatgpt-md-exporter.user.js', 'text/javascript; charset=utf-8']]
]);
const server = http.createServer((req, res) => {
  const route = routes.get(new URL(req.url, 'http://localhost').pathname);
  if (!route) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' });
  const stream = fs.createReadStream(path.resolve(__dirname, '..', route[0]));
  stream.on('error', () => res.destroy());
  stream.pipe(res);
});
server.listen(0, '127.0.0.1', () => {
  console.log('Side chat preview: http://127.0.0.1:' + server.address().port);
});
