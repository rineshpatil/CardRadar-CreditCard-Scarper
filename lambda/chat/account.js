// Accounts for the AI assistant: sign-in (email code or Google), sessions, the free daily allowance and paid plans.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FREE_PER_DAY = 3;
const PLANS = {
  monthly: { name: 'Monthly', pricePaise: 9900, days: 30 },
  yearly: { name: 'Yearly', pricePaise: 99900, days: 365 },
};
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const CODE_ATTEMPTS = 5;
const SESSION_MS = 30 * 86400000;
const DAY_MS = 86400000;

const inLambda = () => Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

class AccountError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ponytail: one JSON file, fine for local use. A Lambda's disk is neither shared nor durable,
// so this must move to a DynamoDB table (same load/save shape) before the site is deployed.
const storeFile = () => process.env.ACCOUNT_STORE_FILE || path.join(__dirname, '..', '..', '.data', 'accounts.json');
function load() {
  try {
    return JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  } catch {
    return { users: {}, codes: {} };
  }
}
function save(db) {
  fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
  fs.writeFileSync(storeFile(), JSON.stringify(db, null, 2));
}

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (inLambda()) throw new AccountError(503, 'Sign-in is not set up yet.'); // never sign sessions with a known key in production
  return 'local-dev-only-secret';
}

function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError(400, 'Please enter a valid email address.');
  return email;
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function createSession(email, now = Date.now()) {
  const payload = b64(JSON.stringify({ e: email, x: now + SESSION_MS }));
  return `${payload}.${sign(payload)}`;
}

// Returns the signed-in email, or null for a missing, forged or expired token.
function readSession(authorization, now = Date.now()) {
  const token = /^Bearer (.+)$/.exec(authorization || '')?.[1];
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof e === 'string' && x > now ? e : null;
  } catch {
    return null;
  }
}

function userOf(db, email, now) {
  db.users[email] ??= { email, createdAt: new Date(now).toISOString(), plan: null, paidUntil: 0, usage: { day: '', count: 0 } };
  return db.users[email];
}

const hashCode = (email, code) => crypto.createHmac('sha256', secret()).update(`${email}:${code}`).digest('hex');

// Email sign-in step 1: make a 6-digit code. Returns the code so the caller can send it.
function startEmailSignIn(rawEmail, now = Date.now()) {
  const email = normalizeEmail(rawEmail);
  const db = load();
  const prev = db.codes[email];
  if (prev && now - prev.sentAt < CODE_RESEND_MS) throw new AccountError(429, 'A code was just sent. Please wait a minute before asking for another.');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  db.codes[email] = { hash: hashCode(email, code), sentAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0 };
  save(db);
  return { email, code };
}

// Email sign-in step 2: check the code and hand back a session.
function finishEmailSignIn(rawEmail, rawCode, now = Date.now()) {
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  const db = load();
  const entry = db.codes[email];
  if (!entry || entry.expiresAt < now || entry.attempts >= CODE_ATTEMPTS) {
    throw new AccountError(400, 'That code has expired. Please ask for a new one.');
  }
  const ok = /^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(entry.hash), Buffer.from(hashCode(email, code)));
  if (!ok) {
    entry.attempts += 1;
    save(db);
    throw new AccountError(400, 'That code is not right. Please check it and try again.');
  }
  delete db.codes[email];
  userOf(db, email, now);
  save(db);
  return createSession(email, now);
}

// Google sign-in: the browser sends Google's ID token; Google's tokeninfo endpoint checks the signature for us.
async function googleSignIn(credential, now = Date.now()) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AccountError(503, 'Google sign-in is not set up yet.');
  if (typeof credential !== 'string' || credential.length > 4096) throw new AccountError(400, 'Invalid Google sign-in.');
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(10000) });
  const info = res.ok ? await res.json() : {};
  const valid = info.aud === clientId
    && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)
    && info.email_verified === 'true'
    && Number(info.exp) * 1000 > now;
  if (!valid) throw new AccountError(401, 'Google sign-in failed. Please try again.');
  const email = normalizeEmail(info.email);
  const db = load();
  userOf(db, email, now);
  save(db);
  return createSession(email, now);
}

const today = (now) => new Date(now).toISOString().slice(0, 10);

function describeUser(user, now = Date.now()) {
  const subscribed = user.paidUntil > now;
  const used = user.usage.day === today(now) ? user.usage.count : 0;
  return {
    email: user.email,
    subscribed,
    plan: subscribed ? user.plan : null,
    paidUntil: subscribed ? new Date(user.paidUntil).toISOString() : null,
    freeLeft: subscribed ? null : Math.max(0, FREE_PER_DAY - used),
    freePerDay: FREE_PER_DAY,
  };
}

function account(email, now = Date.now()) {
  const db = load();
  return describeUser(db.users[email] || userOf(db, email, now), now);
}

// Throws 402 when a free user has used today's questions. Call before asking the AI.
function checkAllowance(email, now = Date.now()) {
  const info = account(email, now);
  if (!info.subscribed && info.freeLeft === 0) {
    throw new AccountError(402, `You've used your ${FREE_PER_DAY} free questions for today. Subscribe for unlimited answers.`, { account: info });
  }
  return info;
}

// Counts one answered question against the free allowance (subscribers are unlimited).
function recordQuestion(email, now = Date.now()) {
  const db = load();
  const user = userOf(db, email, now);
  if (user.paidUntil <= now) {
    if (user.usage.day !== today(now)) user.usage = { day: today(now), count: 0 };
    user.usage.count += 1;
  }
  save(db);
  return describeUser(user, now);
}

// Adds a plan's days on top of any time still left. The payment gateway's webhook calls this once a payment is confirmed.
function activatePlan(email, planId, now = Date.now()) {
  const plan = PLANS[planId];
  if (!plan) throw new AccountError(400, 'Unknown plan.');
  const db = load();
  const user = userOf(db, email, now);
  user.plan = planId;
  user.paidUntil = Math.max(now, user.paidUntil) + plan.days * DAY_MS;
  save(db);
  return describeUser(user, now);
}

module.exports = {
  FREE_PER_DAY, PLANS, AccountError, inLambda, normalizeEmail, createSession, readSession,
  startEmailSignIn, finishEmailSignIn, googleSignIn, account, checkAllowance, recordQuestion, activatePlan,
};
