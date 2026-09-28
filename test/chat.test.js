const test = require('node:test');
const assert = require('node:assert/strict');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.LLM_API_KEY = 'test-key';
process.env.ORIGIN_SECRET = 'from-cloudfront';
process.env.ACCOUNT_STORE_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cardradar-chat-')), 'accounts.json');
const { handler, cardsSummary } = require('../lambda/chat');
const { createSession } = require('../lambda/chat/account');

const signedIn = { 'x-origin-verify': 'from-cloudfront', authorization: `Bearer ${createSession('reader@example.com')}` };
const event = (body, headers = signedIn) => ({ headers, body: JSON.stringify(body) });
const replyOf = (res) => JSON.parse(res.body).reply;

test('requests that did not come through CloudFront are refused', async () => {
  const res = await handler(event({ message: 'hi' }, {}));
  assert.equal(res.statusCode, 403);

  // Inside Lambda a missing ORIGIN_SECRET must refuse requests, not let them through.
  const saved = process.env.ORIGIN_SECRET;
  delete process.env.ORIGIN_SECRET;
  process.env.AWS_LAMBDA_FUNCTION_NAME = 'cardradar-chat';
  try {
    assert.equal((await handler(event({ message: 'hi' }, {}))).statusCode, 403);
  } finally {
    process.env.ORIGIN_SECRET = saved;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  }
});

test('empty and oversized messages are rejected before calling the LLM', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => { throw new Error('should not be called'); });
  assert.equal((await handler(event({ message: '  ' }))).statusCode, 400);
  assert.equal((await handler(event({ message: 'x'.repeat(501) }))).statusCode, 400);
  assert.equal((await handler(event(null))).statusCode, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('questions need a signed-in user', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => { throw new Error('should not be called'); });
  const res = await handler(event({ message: 'hi' }, { 'x-origin-verify': 'from-cloudfront' }));
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).needs, 'signin');
  const forged = await handler(event({ message: 'hi' }, { 'x-origin-verify': 'from-cloudfront', authorization: 'Bearer abc.def' }));
  assert.equal(forged.statusCode, 401);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('unknown routes are 404', async () => {
  const res = await handler({ rawPath: '/api/nope', requestContext: { http: { method: 'GET' } }, headers: signedIn });
  assert.equal(res.statusCode, 404);
});

test('sends the card list, trimmed history and question to the LLM', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'Try the SBI Cashback card.' } }] }) }));
  const history = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'bot' : 'user', content: `m${i}` }));
  const res = await handler(event({ message: 'Best cashback card?', history }));
  assert.equal(res.statusCode, 200);
  assert.equal(replyOf(res), 'Try the SBI Cashback card.');
  const sent = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.equal(sent.messages[0].role, 'system');
  assert.match(sent.messages[0].content, /Data status:/);
  assert.equal(sent.messages.length, 1 + 10 + 1);
  assert.deepEqual(sent.messages.at(-1), { role: 'user', content: 'Best cashback card?' });
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers.authorization, 'Bearer test-key');
});

test('LLM failures return a friendly 502', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 429 }));
  const res = await handler(event({ message: 'hello' }));
  assert.equal(res.statusCode, 502);
  assert.match(replyOf(res), /try again/);
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) }));
  assert.equal((await handler(event({ message: 'hello' }))).statusCode, 502, 'an empty answer is a failure, not a blank reply');
});

test('cardsSummary marks cards without verified benefits', () => {
  const text = cardsSummary([{ name: 'X Card', bank: 'X Bank', network: 'Visa', category: 'Co-branded', verificationStatus: 'unverified', isLTF: false, annualFee: 500, joiningFee: null, rewardRate: null, eligibility: { minIncome: null, minAge: null }, benefits: null, highlights: [] }]);
  assert.match(text, /Benefits: not verified yet/);
  assert.match(text, /Joining fee: unknown/);
});

test('email sign-in sends the code through Resend and never logs it', async (t) => {
  process.env.RESEND_API_KEY = 're_test';
  const start = (email) => handler({ rawPath: '/api/auth/email/start', requestContext: { http: { method: 'POST' } }, headers: signedIn, body: JSON.stringify({ email }) });
  try {
    const logs = t.mock.method(console, 'log', () => {});
    const fetchMock = t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ id: 'e1' }) }));
    const res = await start('Mail@Example.com');
    assert.equal(res.statusCode, 200);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.headers.authorization, 'Bearer re_test');
    const sent = JSON.parse(init.body);
    assert.deepEqual(sent.to, ['mail@example.com']);
    const code = /\b(\d{6})\b/.exec(sent.subject)[1];
    assert.match(sent.text, new RegExp(code));
    assert.equal(logs.mock.calls.some((c) => String(c.arguments[0]).includes(code)), false, 'code must not be logged');

    t.mock.method(global, 'fetch', async () => ({ ok: false, status: 403, text: async () => 'forbidden' }));
    t.mock.method(console, 'error', () => {});
    const failed = await start('other@example.com');
    assert.equal(failed.statusCode, 502);
    assert.match(JSON.parse(failed.body).error, /could not send/);
  } finally {
    delete process.env.RESEND_API_KEY;
  }
});
