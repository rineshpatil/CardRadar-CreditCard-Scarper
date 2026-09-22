// POST /api/chat — answers questions about the cards listed on CardRadar.
// cards.json is written next to this file by scripts/build.js.
const cards = require('./cards.json');

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

const reply = (statusCode, text) => ({ statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reply: text }) });

exports.handler = async (event) => {
  // CloudFront adds this header; requests sent straight to the function URL are refused.
  // Inside Lambda a missing secret fails closed; locally (npm run dev) there is no secret to check.
  const secret = process.env.ORIGIN_SECRET;
  if ((secret || process.env.AWS_LAMBDA_FUNCTION_NAME) && (!secret || event.headers?.['x-origin-verify'] !== secret)) {
    return reply(403, 'Forbidden');
  }

  let body;
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body || '{}');
  } catch {
    return reply(400, 'Invalid request.');
  }
  if (!body || typeof body !== 'object') return reply(400, 'Invalid request.');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE) return reply(400, `Please ask a question of 1–${MAX_MESSAGE} characters.`);
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY)
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content.slice(0, 2000) }));

  try {
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
    return reply(200, answer);
  } catch (err) {
    console.error('chat failed:', err.message);
    return reply(502, 'Sorry, I could not answer right now. Please try again in a minute.');
  }
};

exports.cardsSummary = cardsSummary;
