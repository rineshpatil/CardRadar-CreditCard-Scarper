const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.ACCOUNT_STORE_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cardradar-account-')), 'accounts.json');
const account = require('../lambda/chat/account');

const NOW = Date.parse('2026-09-27T10:00:00Z');
const DAY = 86400000;

test('sessions round-trip and reject forged or expired tokens', () => {
  const token = account.createSession('a@example.com', NOW);
  assert.equal(account.readSession(`Bearer ${token}`, NOW), 'a@example.com');
  assert.equal(account.readSession(`Bearer ${token}`, NOW + 31 * DAY), null, 'expired');
  const [payload] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ e: 'admin@example.com', x: NOW + DAY })).toString('base64url');
  assert.equal(account.readSession(`Bearer ${forgedPayload}.${token.split('.')[1]}`, NOW), null, 'signature must match payload');
  assert.equal(account.readSession(`Bearer ${payload}`, NOW), null);
  assert.equal(account.readSession(undefined, NOW), null);
});

test('email codes sign in once, expire, and lock after 5 wrong tries', () => {
  const { email, code } = account.startEmailSignIn('  Reader@Example.com ', NOW);
  assert.equal(email, 'reader@example.com');
  assert.match(code, /^\d{6}$/);
  assert.throws(() => account.startEmailSignIn('reader@example.com', NOW + 1000), { status: 429 });
  const token = account.finishEmailSignIn('reader@example.com', code, NOW + 1000);
  assert.equal(account.readSession(`Bearer ${token}`, NOW + 1000), 'reader@example.com');
  assert.throws(() => account.finishEmailSignIn('reader@example.com', code, NOW + 2000), { status: 400 }, 'a code works only once');

  const second = account.startEmailSignIn('reader@example.com', NOW + 2 * 60000);
  assert.throws(() => account.finishEmailSignIn('reader@example.com', second.code, NOW + 13 * 60000), { status: 400 }, 'expired');

  const third = account.startEmailSignIn('reader@example.com', NOW + 20 * 60000);
  const wrong = third.code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.throws(() => account.finishEmailSignIn('reader@example.com', wrong, NOW + 20 * 60000));
  assert.throws(() => account.finishEmailSignIn('reader@example.com', third.code, NOW + 20 * 60000), { status: 400 }, 'locked after 5 tries');
  assert.throws(() => account.startEmailSignIn('not-an-email', NOW), { status: 400 });
});

test('free users get 3 answered questions a day; subscribers are unlimited', () => {
  const email = 'free@example.com';
  for (let i = 0; i < 3; i++) {
    account.checkAllowance(email, NOW);
    account.recordQuestion(email, NOW);
  }
  assert.throws(() => account.checkAllowance(email, NOW), { status: 402 });
  assert.equal(account.checkAllowance(email, NOW + DAY).freeLeft, 3, 'resets the next day');

  const paid = account.activatePlan(email, 'monthly', NOW);
  assert.equal(paid.subscribed, true);
  assert.equal(paid.freeLeft, null);
  for (let i = 0; i < 10; i++) account.recordQuestion(email, NOW);
  assert.equal(account.checkAllowance(email, NOW).subscribed, true);

  const renewed = account.activatePlan(email, 'yearly', NOW + DAY);
  assert.equal(Date.parse(renewed.paidUntil), NOW + (30 + 365) * DAY, 'renewal stacks on the time left');
  assert.equal(account.checkAllowance(email, NOW + 396 * DAY).subscribed, false, 'lapses back to free');
  assert.throws(() => account.activatePlan(email, 'lifetime', NOW), { status: 400 });
});

test('Google sign-in accepts only verified tokens for our client id', async (t) => {
  process.env.GOOGLE_CLIENT_ID = 'client-123';
  const good = { aud: 'client-123', iss: 'https://accounts.google.com', email: 'G@Example.com', email_verified: 'true', exp: String(NOW / 1000 + 3600) };
  t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => good }));
  const token = await account.googleSignIn('id-token', NOW);
  assert.equal(account.readSession(`Bearer ${token}`, NOW), 'g@example.com');

  for (const bad of [{ aud: 'other' }, { email_verified: 'false' }, { iss: 'evil.com' }, { exp: String(NOW / 1000 - 1) }]) {
    t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ ...good, ...bad }) }));
    await assert.rejects(account.googleSignIn('id-token', NOW), { status: 401 });
  }
  delete process.env.GOOGLE_CLIENT_ID;
  await assert.rejects(account.googleSignIn('id-token', NOW), { status: 503 });
});

test('inside Lambda, sessions refuse to use the local fallback secret', () => {
  process.env.AWS_LAMBDA_FUNCTION_NAME = 'cardradar-chat';
  try {
    assert.throws(() => account.createSession('a@example.com', NOW), { status: 503 });
  } finally {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  }
});
