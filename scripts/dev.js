// Local preview: serves public/ and sends POST /api/chat to the chat Lambda handler.
// Run `npm run build` first so public/data/ and lambda/chat/cards.json exist.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.png': 'image/png', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { handler } = require('../lambda/chat');
    const out = await handler({ headers: {}, body });
    res.writeHead(out.statusCode, out.headers);
    return res.end(out.body);
  }
  const file = path.join(PUBLIC, pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
  if (!file.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`CardRadar preview: http://localhost:${PORT}`));
