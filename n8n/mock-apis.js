// Local stand-in for the site, the LLM and GitHub so the crawler image can be tested without real accounts.
// Usage: node n8n/mock-apis.js   (then run the image as shown in docs/crawler.md)
const http = require('http');

const HOST = 'http://host.docker.internal:8787';
const PAGES = {
  '/page/infinia': '<html><head><title>Infinia</title><script>var t = Date.now()</script></head><body><nav>Cards Loans</nav><main><h1>HDFC Bank Infinia</h1><p>Annual fee: &#8377;12,500 + GST</p><p>Unlimited&nbsp;lounge access</p></main><footer>Copyright</footer></body></html>',
  '/page/regalia': '<html><body><p>Joining fee ₹2,500</p></body></html>',
};
const SOURCES = [
  { id: 'hdfc-infinia-product_page', cardId: 'hdfc-infinia', cardName: 'HDFC Bank Infinia Credit Card', url: `${HOST}/page/infinia`, kind: 'product_page' },
  { id: 'hdfc-regalia-product_page', cardId: 'hdfc-regalia', cardName: 'HDFC Regalia Credit Card', url: `${HOST}/page/regalia`, kind: 'product_page' },
  { id: 'missing-product_page', cardId: 'missing', cardName: 'Missing Card', url: `${HOST}/page/missing`, kind: 'product_page' },
];
const LLM_REPLY = '```json\n{"annualFee":{"value":12500,"quote":"Annual fee: ₹12,500 + GST"}}\n```';

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = req.url.split('?')[0];
    const send = (code, data, type = 'application/json') => {
      console.log(`${code} ${req.method} ${url}`);
      res.writeHead(code, { 'content-type': type });
      res.end(typeof data === 'string' ? data : JSON.stringify(data));
    };
    if (url === '/data/status.json') return send(403, '<Error>AccessDenied</Error>', 'application/xml'); // first run: no status yet
    if (url === '/data/sources.json') return send(200, { sources: SOURCES });
    if (PAGES[url]) return send(200, PAGES[url], 'text/html');
    if (url === '/v1/chat/completions') return send(200, { choices: [{ message: { content: LLM_REPLY } }] });
    if (url === '/repos/o/r/git/ref/heads/main') return send(200, { object: { sha: 'main-sha' } });
    if (url === '/repos/o/r/git/refs' && req.method === 'POST') return send(201, { ref: JSON.parse(body).ref });
    if (url.startsWith('/repos/o/r/contents/crawl/') && req.method === 'PUT') {
      const { content, branch } = JSON.parse(body);
      const file = JSON.parse(Buffer.from(content, 'base64').toString());
      console.log(`    -> ${branch}: ${file.sourceId || `run summary (${file.results.length} results)`}`);
      return send(201, { content: { path: url } });
    }
    if (url === '/repos/o/r/actions/workflows/intake.yml/dispatches' && req.method === 'POST') return send(204, '');
    send(404, { message: 'Not Found' });
  });
}).listen(8787, () => console.log('Mock APIs on http://localhost:8787'));
