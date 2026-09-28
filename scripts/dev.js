// Local preview: serves public/ and sends /api/* to the chat Lambda handler.
// Run `npm run build` first so public/data/ and lambda/chat/cards.json exist.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

async function handle(req, res) {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { handler } = require('../lambda/chat');
      const out = await handler({
        rawPath: pathname,
        requestContext: { http: { method: req.method } },
        headers: { authorization: req.headers.authorization },
        body,
      });
      res.writeHead(out.statusCode, out.headers);
      return res.end(out.body);
    }
    const file = path.join(PUBLIC, pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
    if (!file.startsWith(PUBLIC + path.sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const data = await fs.promises.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    // A bad path, a missing file or a missing build must not take the preview down.
    const missing = err.code === 'ENOENT';
    if (!missing) console.error('preview error:', err.message);
    res.writeHead(missing ? 404 : 500);
    res.end(missing ? 'Not found' : 'Preview error — did you run npm run build?');
  }
}

// Loopback only, on both IPv4 and IPv6: "localhost" resolves to ::1 first on some machines.
http.createServer(handle).listen(PORT, '127.0.0.1', () => console.log(`CardRadar preview: http://localhost:${PORT}`));
http.createServer(handle).listen(PORT, '::1').on('error', () => {}); // no IPv6 loopback: IPv4 still serves
