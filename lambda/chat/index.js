// /api/* — CardRadar AI (answers questions about the listed cards) plus sign-in and subscriptions.
// cards.json is written next to this file by scripts/build.js.
const cards = require('./cards.json');
const account = require('./account');

const LLM_URL = process.env.LLM_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'moonshotai/kimi-k2.5';
const MAX_MESSAGE = 500;
const MAX_HISTORY = 10;

function cardsSummary(list) {
  const visits = (n) => (n === -1 ? 'unlimited' : n ? `${n}/year` : 'none');
  const rupees = (n) => (n == null ? 'unknown' : `₹${n.toLocaleString('en-IN')}`);
  return list.map((c) => {
    const b = c.benefits;
    const lines = [
      `## ${c.name}`,
      `- Bank: ${c.bank} | Network: ${c.network} | Category: ${c.category}`,
      `- Data status: ${c.verificationStatus}${c.lastVerifiedAt ? ` (verified ${c.lastVerifiedAt})` : ''}`,
      `- Annual fee: ${c.isLTF ? 'lifetime free' : rupees(c.annualFee)} | Joining fee: ${rupees(c.joiningFee)}`,
      `- Reward rate: ${c.rewardRate || 'unknown'}`,
      `- Minimum income: ${rupees(c.eligibility.minIncome)} a year | Minimum age: ${c.eligibility.minAge ?? 'unknown'}`,
    ];
    if (b) {
      if (b.cashback?.description) lines.push(`- Rewards: ${b.cashback.description}`);
      lines.push(`- Airport lounges: domestic ${visits(b.lounges?.airport?.domestic)}, international ${visits(b.lounges?.airport?.international)}`);
      lines.push(`- Golf: ${b.golf?.available ? 'yes' : 'no'} | Forex markup: ${b.forex?.markupFee || 'unknown'}`);
      if (b.other?.length) lines.push(`- Other: ${b.other.join('; ')}`);
    } else {
      lines.push('- Benefits: not verified yet');
    }
    if (c.highlights.length) lines.push(`- Highlights: ${c.highlights.join(', ')}`);
    return lines.join('\n');
  }).join('\n\n');
}

const SYSTEM = `You are CardRadar AI, a friendly guide to Indian credit cards. Answer ONLY about the cards listed below.

${cardsSummary(cards)}

RULES:
1. Only use the card list above. If asked about a card that is not listed, say "That card is not currently listed on CardRadar."
2. If asked something unrelated to credit cards, reply: "I'm CardRadar AI — I help with Indian credit cards. Ask me about fees, rewards, lounge access, eligibility, or which card suits you."
3. Each card has a data status. If it is "unverified" or "stale", say its details have not been checked recently and the user should confirm on the bank's website. Never present unverified benefits as confirmed.
4. When recommending, match the user's income against minimum income and prefer cards whose fee they can justify from their spending.
5. Be concise. Use short bullet points. Always name the card and bank. Amounts are in Indian Rupees (₹).
6. You are not a financial adviser. For big decisions, suggest reading the bank's terms.`;

let apiKey = process.env.LLM_API_KEY; // set locally; in AWS the key is read from SSM once per container

async function getApiKey() {
  if (apiKey) return apiKey;
  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm'); // bundled in the Lambda runtime
  const out = await new SSMClient({}).send(new GetParameterCommand({ Name: process.env.LLM_API_KEY_PARAM, WithDecryption: true }));
  apiKey = out.Parameter.Value;
  return apiKey;
}

const json = (statusCode, data) => ({ statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(data) });
const reply = (statusCode, text, extra = {}) => json(statusCode, { reply: text, ...extra });

async function askLlm(message, history) {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await getApiKey()}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [{ role: 'system', content: SYSTEM }, ...history, { role: 'user', content: message }],
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) throw new Error(`LLM returned ${res.status}`);
  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new Error('LLM returned an empty answer');
  return answer;
}

async function chat(body, email) {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE) return reply(400, `Please ask a question of 1–${MAX_MESSAGE} characters.`);
  if (!email) return reply(401, 'Please sign in to ask CardRadar AI.', { needs: 'signin' });
  account.checkAllowance(email);
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY)
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content.slice(0, 2000) }));
  try {
    const answer = await askLlm(message, history);
    return reply(200, answer, { account: account.recordQuestion(email) }); // only answered questions count
  } catch (err) {
    console.error('chat failed:', err.message);
    return reply(502, 'Sorry, I could not answer right now. Please try again in a minute.');
  }
}

// Sends the sign-in code through Resend (https://resend.com). Without a verified domain, Resend's test
// sender (onboarding@resend.dev) only delivers to the email address that owns the Resend account.
async function sendCode(email, code) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'CardRadar <onboarding@resend.dev>',
      to: [email],
      subject: `${code} is your CardRadar sign-in code`,
      text: `Your CardRadar sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;background:#05060d;color:#eef6ff;border-radius:12px">
        <h2 style="margin:0 0 8px;color:#00f0ff">CardRadar</h2>
        <p>Your sign-in code is:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#00f0ff;margin:16px 0">${code}</p>
        <p style="color:#a3b1d1">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p></div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.error('email send failed:', res.status, await res.text().catch(() => ''));
    throw new account.AccountError(502, 'We could not send the code. Please try again in a minute.');
  }
}

// Payment gateway goes here. Until one is configured, local runs offer a simulated payment and production refuses.
function startCheckout(email, planId) {
  if (!account.PLANS[planId]) throw new account.AccountError(400, 'Unknown plan.');
  if (process.env.PAYMENT_PROVIDER) throw new account.AccountError(501, 'Payment provider is configured but not wired up yet.');
  if (account.inLambda()) throw new account.AccountError(503, 'Subscriptions open soon — payments are not live yet.');
  return { mode: 'mock', plan: planId };
}

const ROUTES = {
  'GET /api/config': () => json(200, {
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    paymentsLive: Boolean(process.env.PAYMENT_PROVIDER) || !account.inLambda(),
    mockPayments: !process.env.PAYMENT_PROVIDER && !account.inLambda(),
    freePerDay: account.FREE_PER_DAY,
    plans: Object.entries(account.PLANS).map(([id, p]) => ({ id, name: p.name, price: p.pricePaise / 100, days: p.days })),
  }),
  'POST /api/auth/email/start': async (body) => {
    const mailer = Boolean(process.env.RESEND_API_KEY);
    if (!mailer && account.inLambda()) throw new account.AccountError(503, 'Email sign-in is not set up yet. Please use Google.');
    const { email, code } = account.startEmailSignIn(body.email);
    if (mailer) await sendCode(email, code);
    else console.log(`[CardRadar] sign-in code for ${email}: ${code}`); // local only, when no email sender is configured
    return json(200, { sent: true });
  },
  'POST /api/auth/email/verify': (body) => json(200, { token: account.finishEmailSignIn(body.email, body.code) }),
  'POST /api/auth/google': async (body) => json(200, { token: await account.googleSignIn(body.credential) }),
  'GET /api/me': (body, email) => (email ? json(200, account.account(email)) : json(401, { error: 'Not signed in.' })),
  'POST /api/subscribe': (body, email) => (email ? json(200, startCheckout(email, body.plan)) : json(401, { error: 'Please sign in first.' })),
  'POST /api/subscribe/mock-complete': (body, email) => {
    if (!email) return json(401, { error: 'Please sign in first.' });
    if (process.env.PAYMENT_PROVIDER || account.inLambda()) return json(404, { error: 'Not found.' });
    return json(200, account.activatePlan(email, body.plan));
  },
  'POST /api/chat': chat,
};

exports.handler = async (event) => {
  // CloudFront adds this header; requests sent straight to the function URL are refused.
  // Inside Lambda a missing secret fails closed; locally (npm run dev) there is no secret to check.
  const secret = process.env.ORIGIN_SECRET;
  if ((secret || process.env.AWS_LAMBDA_FUNCTION_NAME) && (!secret || event.headers?.['x-origin-verify'] !== secret)) {
    return reply(403, 'Forbidden');
  }
  const method = event.requestContext?.http?.method || 'POST';
  const route = ROUTES[`${method} ${event.rawPath || '/api/chat'}`];
  if (!route) return json(404, { error: 'Not found.' });

  let body = {};
  if (method === 'POST') {
    try {
      body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body || '{}');
    } catch {
      return reply(400, 'Invalid request.');
    }
    if (!body || typeof body !== 'object') return reply(400, 'Invalid request.');
  }
  try {
    return await route(body, account.readSession(event.headers?.authorization));
  } catch (err) {
    if (err instanceof account.AccountError) return json(err.status, { error: err.message, reply: err.message, ...err.extra });
    console.error('request failed:', err.message);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};

exports.cardsSummary = cardsSummary;
