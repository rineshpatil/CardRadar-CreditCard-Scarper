// Checks data/cards/*.json and writes the files the site, chat and crawler read:
//   public/data/cards.json    every card plus its verification status
//   public/data/sources.json  pages the weekly crawl fetches
//   public/data/status.json   crawl state (page fingerprints, last check, failures)
//   lambda/chat/cards.json    card list bundled into the chat function
const fs = require('fs');
const path = require('path');
const { FIELDS, getPath, isClaim } = require('./fields');

const ROOT = path.join(__dirname, '..');
const ALLOWED_DOMAINS = require('../config/allowed-domains.json');
const TIERS = ['entry', 'mid', 'premium', 'super_premium', 'private'];
const STALE_DAYS = 45;
const MAX_FAILURES = 3;
const DAY_MS = 86400000;

function isAllowedUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const wholeNumber = (v, min = 0) => Number.isInteger(v) && v >= min;
const orNull = (check) => (v) => v === null || check(v);

function validateCard(card, fileName) {
  const errors = [];
  const bad = (msg) => errors.push(`${fileName}: ${msg}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(card.id || '')) bad('id must be lowercase words joined by hyphens');
  else if (fileName !== `${card.id}.json`) bad(`file name must be ${card.id}.json`);
  for (const key of ['name', 'bank', 'network', 'category']) {
    if (typeof card[key] !== 'string' || !card[key].trim()) bad(`${key} is required`);
  }
  if (!TIERS.includes(card.tier)) bad(`tier must be one of: ${TIERS.join(', ')}`);
  for (const key of ['isLTF', 'isCoBranded']) if (typeof card[key] !== 'boolean') bad(`${key} must be true or false`);
  if (!wholeNumber(card.annualFee)) bad('annualFee must be a whole number of rupees');
  if (!orNull(wholeNumber)(card.joiningFee)) bad('joiningFee must be a whole number of rupees or null');
  if (!orNull((v) => typeof v === 'string')(card.rewardRate)) bad('rewardRate must be text or null');
  if (!isAllowedUrl(card.applyUrl)) bad(`applyUrl must be an https link on a domain in config/allowed-domains.json: ${card.applyUrl}`);
  if (card.image !== undefined && !/^img\/cards\/[a-z0-9-]+\.(webp|png|jpg)$/.test(card.image)) {
    bad('image must be a file in public/img/cards/ (webp, png or jpg)');
  }
  if (card.benefits !== null) {
    if (typeof card.benefits !== 'object' || Array.isArray(card.benefits)) bad('benefits must be an object or null');
    else {
      const b = card.benefits;
      const loungeCount = (v) => v === undefined || (Number.isInteger(v) && v >= -1);
      if (!loungeCount(b.lounges?.airport?.domestic) || !loungeCount(b.lounges?.airport?.international) || !loungeCount(b.lounges?.railway?.count)) {
        bad('lounge counts must be whole numbers per year (-1 means unlimited)');
      }
      if (b.golf?.available !== undefined && typeof b.golf.available !== 'boolean') bad('benefits.golf.available must be true or false');
      if (b.forex?.markupFee !== undefined && !/^\d+(\.\d+)?%$/.test(b.forex.markupFee)) bad('benefits.forex.markupFee must look like "3.5%"');
      for (const [name, list] of [['cashback.details', b.cashback?.details], ['other', b.other]]) {
        if (list !== undefined && (!Array.isArray(list) || list.some((item) => typeof item !== 'string'))) bad(`benefits.${name} must be a list of text`);
      }
    }
  }
  const e = card.eligibility;
  if (!e || !orNull(wholeNumber)(e.minIncome) || !orNull((v) => wholeNumber(v, 18))(e.minAge)) {
    bad('eligibility needs minIncome and minAge (whole numbers or null)');
  }
  if (!Array.isArray(card.highlights) || card.highlights.some((h) => typeof h !== 'string')) bad('highlights must be a list of text');
  if (!wholeNumber(card.popularityScore)) bad('popularityScore must be a whole number');
  if (!Array.isArray(card.sources)) bad('sources must be a list');
  else {
    card.sources.forEach((s, i) => {
      if (s.kind !== 'product_page') bad(`sources[${i}].kind must be "product_page"`);
      if (!isAllowedUrl(s.url)) bad(`sources[${i}].url must be an https link on an allowed domain`);
    });
    if (card.sources.length > 1) bad('only one source per card is supported');
  }
  if (!card.verification || typeof card.verification !== 'object') bad('verification must be an object');
  else {
    for (const [field, v] of Object.entries(card.verification)) {
      if (!(field in FIELDS)) bad(`verification.${field} is not a known field`);
      else if (!v || typeof v.quote !== 'string' || !isAllowedUrl(v.url) || !/^\d{4}-\d{2}-\d{2}$/.test(v.verifiedAt)) {
        bad(`verification.${field} needs quote, url and verifiedAt (YYYY-MM-DD)`);
      }
    }
  }
  return errors;
}

const sourceId = (card, source) => `${card.id}-${source.kind}`;

// Verification status shown on the site:
//   verified    every fee, rate and benefit the card claims has a source quote
//   stale       was verified, but its page failed 3 checks in a row or went 45 days unchecked
//   unverified  anything else
function describe(card, status, now) {
  const claims = Object.keys(FIELDS).filter((f) => isClaim(f, getPath(card, FIELDS[f])));
  const quoted = claims.filter((f) => card.verification[f]);
  const checks = card.sources.map((s) => (status.sources || {})[sourceId(card, s)]).filter(Boolean);
  const lastCheckedAt = checks.map((c) => c.lastCheckedAt).filter(Boolean).sort().pop() || null;
  const failing = checks.some((c) => c.consecutiveFailures >= MAX_FAILURES);
  const unchecked = !lastCheckedAt || (now - Date.parse(lastCheckedAt)) / DAY_MS > STALE_DAYS;
  const everVerified = Object.keys(card.verification).length > 0;
  const allQuoted = claims.length > 0 && quoted.length === claims.length;
  const pendingSince = ((status.cards || {})[card.id] || {}).pendingSince;
  const newest = Object.values(card.verification).map((v) => v.verifiedAt).sort().pop() || '';
  return {
    verificationStatus: everVerified && (failing || unchecked) ? 'stale' : allQuoted ? 'verified' : 'unverified',
    lastVerifiedAt: allQuoted ? quoted.map((f) => card.verification[f].verifiedAt).sort()[0] : null,
    lastCheckedAt,
    // Only a card that was verified before can become "may be outdated"; an unverified card stays unverified.
    hasPendingChanges: Boolean(everVerified && pendingSince && newest < pendingSince),
  };
}

function write(root, rel, data) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

function build({ root = ROOT, now = Date.now() } = {}) {
  const dir = path.join(root, 'data', 'cards');
  const errors = [];
  const cards = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const card = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      errors.push(...validateCard(card, file));
      if (typeof card.image === 'string' && !fs.existsSync(path.join(root, 'public', card.image))) errors.push(`${file}: image file public/${card.image} does not exist`);
      cards.push(card);
    } catch (err) {
      errors.push(`${file}: not valid JSON (${err.message})`);
    }
  }
  const sourceOwners = new Map();
  for (const card of cards) {
    if (!Array.isArray(card.sources)) continue; // validateCard already reported this; don't crash here
    for (const source of card.sources) {
      const owner = sourceOwners.get(source.url);
      if (owner) errors.push(`${card.id}.json: source url is already used by ${owner}.json — a crawl source must belong to one card`);
      else sourceOwners.set(source.url, card.id);
    }
  }
  if (errors.length) throw new Error(`Card data has ${errors.length} problem(s):\n${errors.join('\n')}`);

  const statusFile = path.join(root, 'data', 'status.json');
  const status = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : { sources: {}, cards: {} };
  const site = cards
    .map((card) => ({ ...card, ...describe(card, status, now) }))
    .sort((a, b) => b.popularityScore - a.popularityScore || a.name.localeCompare(b.name));
  const sources = cards.flatMap((c) => c.sources.map((s) => ({ id: sourceId(c, s), cardId: c.id, cardName: c.name, url: s.url, kind: s.kind })));

  write(root, 'public/data/cards.json', site);
  write(root, 'public/data/sources.json', { sources });
  write(root, 'public/data/status.json', status);
  write(root, 'lambda/chat/cards.json', site);
  return { cards: site.length, sources: sources.length };
}

if (require.main === module) {
  try {
    const { cards, sources } = build();
    console.log(`Built ${cards} cards and ${sources} crawl sources.`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { build, validateCard, describe, isAllowedUrl };
