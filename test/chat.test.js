const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LLM_API_KEY = 'test-key';
process.env.ORIGIN_SECRET = 'from-cloudfront';
const { handler, cardsSummary } = require('../lambda/chat');

const event = (body, headers = { 'x-origin-verify': 'from-cloudfront' }) => ({ headers, body: JSON.stringify(body) });
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
