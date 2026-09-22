# CardRadar Serverless Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve all 154 Indian credit cards as a public static website on AWS (S3 + CloudFront). The site has honest verification labels and safe rendering, and the AI chat runs as one Lambda. There is no server, database or login.

**Architecture:**
- **Card data:** moves from `cards/*.js` into one JSON file per card under `data/cards/`.
- **Build:** `scripts/build.js` validates the card files and writes `public/data/*.json`. The browser filters those files itself, using helpers in `public/lib.js`.
- **Hosting:** CloudFront serves the S3 bucket and routes `/api/chat` to a Lambda function URL.
- **Deploys:** GitHub Actions deploys `main` through an OIDC role, so no AWS keys are stored.

**Tech Stack:** Node.js ≥ 22 standard library only (`node:test`, `node:http`), vanilla HTML/CSS/JS, AWS CloudFormation (S3, CloudFront, Lambda, IAM, SSM), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-22-cardradar-aws-design.md`

## Global Constraints

- **Node.js** ≥ 22. After Task 6 there are no npm dependencies. Task 1's one-time migration uses the already-installed `xlsx` package.
- **AWS:** region `ap-south-1`, CloudFormation stack name `cardradar`.
- **Card files:**
  - `data/cards/<id>.json`, where `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$` and equals the file name.
  - Written as 2-space-indented JSON with a trailing newline.
- **Links:** every link (`applyUrl`, `sources[].url`, `verification.*.url`) must be `https:` on a domain in `config/allowed-domains.json`.
- **Units:** lounge and railway counts are per year, and `-1` means unlimited.
- **Rendering:** every card-derived string goes through `escapeHtml` before it's inserted into HTML. Links are rendered only through `safeUrl`.
- **Disclaimer** (both page footers, exactly): "Card details are checked against official bank pages but can change at any time. CardRadar is not a bank and this is not financial advice — confirm on the bank's website before you apply."
- **Tests:** Node's built-in runner only. `npm test` = `node scripts/build.js && node --test`. Build first, because the chat tests load the generated `lambda/chat/cards.json`.
- **Git:** work on a feature branch. Tasks 1–7 don't touch `main`; Task 8 merges to `main`, which triggers the first deploy.

## File Structure

| Path | Responsibility |
|---|---|
| `data/cards/<id>.json` | One card, the source of truth (154 files, created by Task 1) |
| `config/allowed-domains.json` | Domains links may point to |
| `scripts/fields.js` | The 9 verified fields and their card paths; `getPath`, `isClaim` |
| `scripts/build.js` | Validates cards, computes verification status, writes generated data |
| `scripts/dev.js` | Local preview server: serves `public/` and sends `/api/chat` to the Lambda handler |
| `public/lib.js` | Pure browser helpers (escape, filters, sorting, labels, chat markdown), also loadable by tests |
| `public/app.js` | Catalog page behaviour (rewritten in Task 5) |
| `lambda/chat/index.js` | Chat Lambda handler |
| `infra/cardradar.yml` | CloudFormation stack |
| `.github/workflows/deploy.yml` | Test, build and publish on every push to `main` |
| `test/*.test.js` | `node:test` suites |
| Generated, gitignored | `public/data/cards.json`, `public/data/sources.json`, `public/data/status.json`, `lambda/chat/cards.json`, `chat.zip` |

---

### Task 1: Move the card data into one JSON file per card

This is a one-time migration, so it gets no test of its own. Task 2's build validates every file it writes, and Task 6 deletes the script.

**Files:**
- Create: `config/allowed-domains.json`
- Create (temporary): `scripts/migrate-cards.js`
- Create: `data/cards/*.json` (generated)

**Interfaces:**
- Consumes: `CREDIT_CARDS` from `knowledgebase.js`; `cards/cobranded.js`; `India_Credit_Cards_Database.xlsx` (sheet "Co-branded Cards") in the repo root. The spreadsheet is gitignored, so it is only on the developer's machine.
- Produces: card files with keys in this order: `id, name, bank, network, category, tier, isLTF, isCoBranded, annualFee, joiningFee, rewardRate, applyUrl, benefits, eligibility {minIncome, minAge}, highlights, popularityScore, sources [{kind: "product_page", url}], verification {}`.

- [ ] **Step 1: Create the allowed-domains list**

`config/allowed-domains.json`:

```json
[
  "americanexpress.com",
  "aubank.in",
  "axisbank.com",
  "bankofbaroda.in",
  "canarabank.com",
  "federalbank.co.in",
  "fi.money",
  "getonecard.app",
  "hdfcbank.com",
  "hsbc.co.in",
  "icicibank.com",
  "idbibank.in",
  "idfcfirstbank.com",
  "indusind.com",
  "jupiter.money",
  "kiwi.money",
  "kotak.com",
  "magnifi.app",
  "paisabazaar.com",
  "pnbcard.in",
  "rblbank.com",
  "sbicard.com",
  "sc.com",
  "scapia.com",
  "sliceit.com",
  "standardchartered.co.in",
  "yesbank.in"
]
```

- [ ] **Step 2: Create the migration script**

`scripts/migrate-cards.js`:

```js
// One-time migration: cards/*.js + the Excel "Co-branded Cards" sheet -> data/cards/<id>.json.
// Run once (`node scripts/migrate-cards.js`), commit data/, then delete this script and cards/.
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { CREDIT_CARDS } = require('../knowledgebase');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'cards');

// cards/cobranded.js was generated from the Excel with benefits, rates and eligibility guessed
// from the category name, so only the Excel's own columns are kept for those cards.
const GENERATED = new Set(require('../cards/cobranded').map((c) => c.id));
// Generated copies of hand-curated cards (same card, differently spelled name).
const DUPLICATES = new Set([
  'hdfc-bank-infinia-credit-card-metal', 'amazon-pay-icici-credit-card', 'icici-bank-sapphiro-credit-card',
  'icici-bank-coral-credit-card-paid', 'sbi-aurum-credit-card', 'american-express-platinum-charge-card',
  'american-express-membership-rewards-credit-card', 'indusind-legend-credit-card',
  'rbl-bank-shoprite-credit-card', 'cashback-sbi-card',
]);
// Co-branded sheet rows not to add: discontinued, or already present under another name.
const SKIP_ROWS = new Set(['Paytm SBI Credit Card SELECT', 'Kiwi-YES Bank RuPay Credit Card', 'PVR Kotak Credit Card']);
// Apply links that point at a generic card listing rather than the card's own page.
const NO_SOURCE = new Set(['axis-olympus-credit-card', 'practo-axis-bank-credit-card']);
// Ordering hint carried over from server.js (not shown to users).
const POPULARITY = {
  'hdfc-infinia': 95, 'hdfc-diners-black': 90, 'amazon-pay-icici': 88,
  'idfc-first-select': 85, 'axis-atlas': 83, 'icici-emeralde': 80,
  'idfc-first-wealth': 78, 'scapia-federal': 75, 'idfc-first-millennia': 73,
  'au-lit': 70, 'hsbc-cashback': 68, 'swiggy-hdfc': 65,
  'indusind-tiger': 63, 'icici-sapphiro': 60, 'hsbc-travel-one': 58,
  'amex-platinum': 55, 'hdfc-regalia-gold': 53, 'marriott-bonvoy-hdfc': 50,
  'axis-neo': 48, 'hdfc-tata-neu-infinity': 45, 'idbi-euphoria': 43,
  'sbi-cashback': 40, 'rbl-shoprite': 38,
};

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
// Same words in any order ("Tata Neu Infinity HDFC" = "HDFC Tata Neu Infinity").
const words = (name) => name.toLowerCase().replace(/\(.*?\)/g, ' ')
  .replace(/credit card|charge card|\bcard\b|\bbank\b|\bthe\b|\bltd\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).sort().join(' ');

function tierOf(card) {
  const cat = card.category.toLowerCase();
  if (/invite only|private/.test(cat)) return 'private';
  if (card.annualFee >= 9999 || /super premium|ultra premium/.test(cat)) return 'super_premium';
  if (card.annualFee >= 2500 || (/premium/.test(cat) && !/entry/.test(cat))) return 'premium';
  if (card.annualFee >= 500) return 'mid';
  return 'entry';
}

// Stores every lounge count per year (the unit the weekly crawl extracts).
function perYear(benefits) {
  const b = structuredClone(benefits);
  const scale = (n) => (n > 0 ? n * 4 : n);
  const air = b.lounges.airport;
  if (air.perQuarter) { air.domestic = scale(air.domestic); air.international = scale(air.international); }
  const rail = b.lounges.railway;
  if (rail.perQuarter) rail.count = scale(rail.count);
  delete air.perQuarter; delete air.perYear; delete rail.perQuarter; delete rail.perYear;
  return b;
}

function record(card, coBranded) {
  const generated = GENERATED.has(card.id);
  const rec = {
    id: card.id,
    name: card.name,
    bank: card.bank,
    network: card.network,
    category: card.category,
    tier: null,
    isLTF: card.isLTF,
    isCoBranded: coBranded,
    annualFee: card.annualFee,
    joiningFee: generated ? null : card.joiningFee,
    rewardRate: generated ? null : card.rewardRate,
    applyUrl: card.applyUrl,
    benefits: generated || !card.benefits ? null : perYear(card.benefits),
    eligibility: generated || !card.eligibility
      ? { minIncome: null, minAge: null }
      : { minIncome: card.eligibility.minIncome, minAge: card.eligibility.minAge },
    highlights: generated ? [] : card.highlights,
    popularityScore: POPULARITY[card.id] || 30,
    sources: NO_SOURCE.has(card.id) || !/^https:\/\//.test(card.applyUrl || '')
      ? []
      : [{ kind: 'product_page', url: card.applyUrl }],
    verification: {},
  };
  rec.tier = tierOf(rec);
  return rec;
}

const sheet = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(ROOT, 'India_Credit_Cards_Database.xlsx')).Sheets['Co-branded Cards']);
const kept = CREDIT_CARDS.filter((c) => !DUPLICATES.has(c.id));
const byWords = new Map(kept.map((c) => [words(c.name), c.id]));
const coBrandedIds = new Set();
const added = [];
for (const row of sheet) {
  const existing = byWords.get(words(row['Card Name']));
  if (existing) { coBrandedIds.add(existing); continue; }
  if (SKIP_ROWS.has(row['Card Name'])) continue;
  const isLTF = row['LTF?'] === 'Yes';
  const card = {
    id: slug(row['Card Name']), name: row['Card Name'], bank: row.Bank, network: row.Network,
    category: 'Co-branded', isLTF, annualFee: isLTF ? 0 : Number(row['Annual Fee (₹)']) || 0,
    joiningFee: null, rewardRate: null, applyUrl: row['Apply Link'], benefits: null, eligibility: null,
    highlights: [`Co-branded with ${row['Partner Brand']}`],
  };
  if (kept.some((c) => c.id === card.id) || added.some((c) => c.id === card.id)) throw new Error(`id clash: ${card.id}`);
  added.push(card);
  coBrandedIds.add(card.id);
}

const records = [...kept.map((c) => record(c, coBrandedIds.has(c.id))), ...added.map((c) => record(c, true))];
fs.mkdirSync(OUT, { recursive: true });
for (const r of records) fs.writeFileSync(path.join(OUT, `${r.id}.json`), JSON.stringify(r, null, 2) + '\n');
const tiers = records.reduce((t, r) => ({ ...t, [r.tier]: (t[r.tier] || 0) + 1 }), {});
console.log(`Wrote ${records.length} cards (${kept.length} existing, ${added.length} new co-branded).`);
console.log('Tiers:', JSON.stringify(tiers), '| co-branded:', coBrandedIds.size, '| no crawl source:', records.filter((r) => !r.sources.length).map((r) => r.id).join(', '));
```

- [ ] **Step 3: Run it**

Run: `node scripts/migrate-cards.js`

Expected:
```
Wrote 154 cards (124 existing, 30 new co-branded).
Tiers: {"super_premium":17,"premium":33,"mid":52,"entry":50,"private":2} | co-branded: 45 | no crawl source: axis-olympus-credit-card, practo-axis-bank-credit-card
```

- [ ] **Step 4: Spot-check two cards**

Run: `node -e "const a=require('./data/cards/idfc-first-select.json'), z=require('./data/cards/zomato-rbl-bank-credit-card.json'); console.log(a.benefits.lounges.airport.domestic, a.tier, z.benefits, z.isCoBranded)"`

Expected: `16 entry null true`. IDFC's 4 visits a quarter become 16 a year, and the new co-branded card has no invented benefits.

- [ ] **Step 5: Commit**

```bash
git add config/allowed-domains.json scripts/migrate-cards.js data/cards
git commit -m "data: move cards to one JSON file per card"
```

---

### Task 2: Validate card data and build the site's data files

**Files:**
- Create: `scripts/fields.js`, `scripts/build.js`
- Test: `test/build.test.js`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces (`scripts/fields.js`):
  - `FIELDS`: an object mapping the 9 field names to card paths.
  - `getPath(obj, path)` returns the value or `undefined`.
  - `isClaim(field, value)` returns a boolean.
- Produces (`scripts/build.js`):
  - `build({ root, now }) → { cards, sources }`
  - `validateCard(card, fileName) → string[]` (error messages)
  - `describe(card, status, now) → { verificationStatus: 'verified'|'stale'|'unverified', lastVerifiedAt, lastCheckedAt, hasPendingChanges }`
  - `isAllowedUrl(url) → boolean`
- Produces (files):
  - `public/data/cards.json`: array of card + `describe` fields, sorted by `popularityScore` descending, then name.
  - `public/data/sources.json`: `{ sources: [{ id: "<cardId>-<kind>", cardId, cardName, url, kind }] }`.
  - `public/data/status.json`: a copy of `data/status.json`, or `{ sources: {}, cards: {} }` if it doesn't exist.
  - `lambda/chat/cards.json`: the same array as `public/data/cards.json`.

- [ ] **Step 1: Write the failing test**

`test/build.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, validateCard, describe } = require('../scripts/build');

const URL = 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/test-card';
const card = (overrides = {}) => ({
  id: 'hdfc-test',
  name: 'HDFC Test Credit Card',
  bank: 'HDFC Bank',
  network: 'Visa',
  category: 'Premium',
  tier: 'premium',
  isLTF: false,
  isCoBranded: false,
  annualFee: 2500,
  joiningFee: 2500,
  rewardRate: '1.3%',
  applyUrl: URL,
  benefits: null,
  eligibility: { minIncome: 900000, minAge: 21 },
  highlights: [],
  popularityScore: 30,
  sources: [{ kind: 'product_page', url: URL }],
  verification: {},
  ...overrides,
});
const quote = (verifiedAt = '2026-09-01') => ({ quote: 'from the page', url: URL, verifiedAt });
const quoteAll = (fields, date) => Object.fromEntries(fields.map((f) => [f, quote(date)]));
const BASIC = ['annualFee', 'joiningFee', 'rewardRate', 'minIncome', 'minAge'];
const NOW = Date.parse('2026-09-22T00:00:00Z');
const checked = (at = '2026-09-21T03:00:00Z', consecutiveFailures = 0) => ({
  sources: { 'hdfc-test-product_page': { lastCheckedAt: at, consecutiveFailures } },
});

test('a well-formed card passes validation', () => {
  assert.deepEqual(validateCard(card(), 'hdfc-test.json'), []);
});

test('links must be https on an allowed bank domain', () => {
  assert.match(validateCard(card({ applyUrl: 'https://evil.example/apply' }), 'hdfc-test.json').join(), /applyUrl/);
  assert.match(validateCard(card({ applyUrl: 'javascript:alert(1)' }), 'hdfc-test.json').join(), /applyUrl/);
  assert.match(validateCard(card({ applyUrl: 'http://www.hdfcbank.com/x' }), 'hdfc-test.json').join(), /applyUrl/);
});

test('file name must match the card id', () => {
  assert.match(validateCard(card(), 'other.json').join(), /file name must be hdfc-test\.json/);
});

test('verification entries need a quote, allowed url and date', () => {
  const errors = validateCard(card({ verification: { annualFee: { quote: 'x', url: URL, verifiedAt: 'last week' } } }), 'hdfc-test.json');
  assert.match(errors.join(), /verification\.annualFee/);
});

test('verified only when every stated fee, rate and eligibility value is quoted', () => {
  assert.equal(describe(card({ verification: quoteAll(BASIC) }), checked(), NOW).verificationStatus, 'verified');
  assert.equal(describe(card({ verification: quoteAll(BASIC.slice(1)) }), checked(), NOW).verificationStatus, 'unverified');
});

test('benefits a card does not offer need no quote, benefits it offers do', () => {
  const noPerks = { lounges: { airport: { domestic: 0, international: 0 } }, golf: { available: false } };
  assert.equal(describe(card({ benefits: noPerks, verification: quoteAll(BASIC) }), checked(), NOW).verificationStatus, 'verified');
  const lounge = { lounges: { airport: { domestic: 8, international: 0 } }, golf: { available: false } };
  assert.equal(describe(card({ benefits: lounge, verification: quoteAll(BASIC) }), checked(), NOW).verificationStatus, 'unverified');
  assert.equal(describe(card({ benefits: lounge, verification: quoteAll([...BASIC, 'loungeDomestic']) }), checked(), NOW).verificationStatus, 'verified');
});

test('a verified card goes stale after 3 failed checks or 45 days without a check', () => {
  const verified = card({ verification: quoteAll(BASIC) });
  assert.equal(describe(verified, checked('2026-09-21T03:00:00Z', 3), NOW).verificationStatus, 'stale');
  assert.equal(describe(verified, checked('2026-07-01T03:00:00Z'), NOW).verificationStatus, 'stale');
  assert.equal(describe(verified, { sources: {} }, NOW).verificationStatus, 'stale');
});

test('lastVerifiedAt is the oldest quote date', () => {
  const v = { ...quoteAll(BASIC, '2026-09-10'), rewardRate: quote('2026-08-05') };
  assert.equal(describe(card({ verification: v }), checked(), NOW).lastVerifiedAt, '2026-08-05');
});

test('pending changes clear once a newer verification is merged', () => {
  const pending = { ...checked(), cards: { 'hdfc-test': { pendingSince: '2026-09-21' } } };
  assert.equal(describe(card({ verification: quoteAll(BASIC, '2026-09-01') }), pending, NOW).hasPendingChanges, true);
  assert.equal(describe(card({ verification: quoteAll(BASIC, '2026-09-21') }), pending, NOW).hasPendingChanges, false);
});

test('build writes the site files and refuses bad card data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cardradar-'));
  fs.mkdirSync(path.join(root, 'data', 'cards'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-test.json'), JSON.stringify(card()));
  assert.deepEqual(build({ root, now: NOW }), { cards: 1, sources: 1 });
  const site = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'cards.json'), 'utf8'));
  assert.equal(site[0].verificationStatus, 'unverified');
  const { sources } = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'sources.json'), 'utf8'));
  assert.deepEqual(sources, [{ id: 'hdfc-test-product_page', cardId: 'hdfc-test', cardName: 'HDFC Test Credit Card', url: URL, kind: 'product_page' }]);
  assert.ok(fs.existsSync(path.join(root, 'lambda', 'chat', 'cards.json')));

  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-test.json'), JSON.stringify(card({ tier: 'gold' })));
  assert.throws(() => build({ root, now: NOW }), /tier must be one of/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/build.test.js`
Expected: FAIL with `Cannot find module '../scripts/build'`

- [ ] **Step 3: Create the field list**

`scripts/fields.js`:

```js
// Card facts the weekly crawl extracts and verifies, mapped to where they live in a card file.
const FIELDS = {
  annualFee: 'annualFee',
  joiningFee: 'joiningFee',
  rewardRate: 'rewardRate',
  loungeDomestic: 'benefits.lounges.airport.domestic',
  loungeInternational: 'benefits.lounges.airport.international',
  golf: 'benefits.golf.available',
  forexMarkup: 'benefits.forex.markupFee',
  minIncome: 'eligibility.minIncome',
  minAge: 'eligibility.minAge',
};

const getPath = (obj, path) => path.split('.').reduce((o, key) => (o == null ? undefined : o[key]), obj);

// True when the site presents the value as a fact about the card, so it needs a source quote.
// "No lounge" / "no golf" are absences, not claims: bank pages rarely state them.
function isClaim(field, value) {
  if (value === null || value === undefined) return false;
  if (field === 'loungeDomestic' || field === 'loungeInternational') return value !== 0;
  if (field === 'golf') return value === true;
  return true;
}

module.exports = { FIELDS, getPath, isClaim };
```

- [ ] **Step 4: Create the build script**

`scripts/build.js`:

```js
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
  if (typeof card.benefits !== 'object') bad('benefits must be an object or null');
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
    hasPendingChanges: Boolean(pendingSince && newest < pendingSince),
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
      cards.push(card);
    } catch (err) {
      errors.push(`${file}: not valid JSON (${err.message})`);
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
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `node --test test/build.test.js`
Expected: `ℹ tests 10` and `ℹ pass 10`

- [ ] **Step 6: Add the npm scripts**

In `package.json`, replace:
```json
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
```
with:
```json
  "scripts": {
    "start": "node server.js",
    "build": "node scripts/build.js",
    "test": "node scripts/build.js && node --test",
    "dev": "node server.js"
  },
```

- [ ] **Step 7: Ignore generated files**

In `.gitignore`, replace:
```
node_modules/
.env
```
with:
```
node_modules/
.env

# Generated by scripts/build.js
public/data/
lambda/chat/cards.json
chat.zip
```

- [ ] **Step 8: Build the real data**

Run: `npm test`
Expected: `Built 154 cards and 152 crawl sources.` then `ℹ pass 10`, `ℹ fail 0`

- [ ] **Step 9: Commit**

```bash
git add scripts/fields.js scripts/build.js test/build.test.js package.json .gitignore
git commit -m "feat: validate card files and build the site data"
```

---

### Task 3: Browser helpers for filtering, labels and safe output

**Files:**
- Create: `public/lib.js`
- Test: `test/lib.test.js`

**Interfaces:**
- Produces. These are globals in the browser; in Node they're `module.exports`:
  - `escapeHtml(value) → string`
  - `safeUrl(url) → string | null` (https only)
  - `FILTERS`: `{ all, ltf, 'non-ltf', lounge, railway, golf, cashback, forex }`, each `(card) → boolean`. A card with `benefits: null` never matches a benefit filter.
  - `queryCards(cards, { filter, bank, search, sort, tier, verifiedOnly }) → card[]`. The `sort` values are `popularity` (verified first), `fee-low`, `fee-high`, `name` and `bank`.
  - `computeStats(cards) → { totalCards, ltfCount, withLoungeCount, withGolfCount, withCashbackCount, totalBanks }`
  - `bankCounts(cards) → [{ name, cardCount }]`, sorted by name
  - `monthYear(date) → 'Sep 2026'`
  - `verificationBadge(card) → { kind: 'verified'|'outdated'|'unverified', text }`
  - `renderMarkdown(text) → html` (escaped first; `**bold**`, `*italic*` and `- ` lists)

- [ ] **Step 1: Write the failing test**

`test/lib.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../public/lib');

const card = (overrides = {}) => ({
  id: 'x', name: 'Test Card', bank: 'HDFC Bank', category: 'Rewards', tier: 'mid', isLTF: false,
  annualFee: 500, highlights: [], popularityScore: 30, benefits: null, verificationStatus: 'unverified', ...overrides,
});

test('escapeHtml neutralises markup and quotes', () => {
  assert.equal(lib.escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(lib.escapeHtml("it's"), 'it&#39;s');
  assert.equal(lib.escapeHtml(null), '');
});

test('safeUrl keeps only https links', () => {
  assert.equal(lib.safeUrl('https://www.hdfcbank.com/x'), 'https://www.hdfcbank.com/x');
  assert.equal(lib.safeUrl('javascript:alert(1)'), null);
  assert.equal(lib.safeUrl('http://www.hdfcbank.com/x'), null);
  assert.equal(lib.safeUrl(undefined), null);
});

test('benefit filters treat cards without verified benefits as not matching', () => {
  const lounge = card({ benefits: { lounges: { airport: { domestic: -1, international: 0 }, railway: { count: 0 } } } });
  assert.equal(lib.FILTERS.lounge(lounge), true);
  assert.equal(lib.FILTERS.lounge(card()), false);
  assert.equal(lib.FILTERS.golf(card()), false);
  assert.equal(lib.FILTERS.railway(lounge), false);
});

test('queryCards filters by bank, tier, search and verified status', () => {
  const cards = [
    card({ id: 'a', name: 'Alpha', bank: 'HDFC Bank', tier: 'premium', verificationStatus: 'verified' }),
    card({ id: 'b', name: 'Beta', bank: 'Axis Bank', tier: 'mid', highlights: ['Fuel savings'] }),
  ];
  assert.deepEqual(lib.queryCards(cards, { bank: 'Axis Bank' }).map((c) => c.id), ['b']);
  assert.deepEqual(lib.queryCards(cards, { tier: 'premium' }).map((c) => c.id), ['a']);
  assert.deepEqual(lib.queryCards(cards, { search: 'fuel' }).map((c) => c.id), ['b']);
  assert.deepEqual(lib.queryCards(cards, { verifiedOnly: true }).map((c) => c.id), ['a']);
});

test('popularity sort puts verified cards first', () => {
  const cards = [card({ id: 'popular', popularityScore: 90 }), card({ id: 'checked', popularityScore: 10, verificationStatus: 'verified' })];
  assert.deepEqual(lib.queryCards(cards).map((c) => c.id), ['checked', 'popular']);
  assert.deepEqual(lib.queryCards(cards, { sort: 'fee-low' }).length, 2);
});

test('computeStats and bankCounts summarise the full list', () => {
  const cards = [card({ isLTF: true, bank: 'SBI Card' }), card({ bank: 'Axis Bank' }), card({ bank: 'Axis Bank' })];
  assert.equal(lib.computeStats(cards).ltfCount, 1);
  assert.equal(lib.computeStats(cards).totalBanks, 2);
  assert.deepEqual(lib.bankCounts(cards), [{ name: 'Axis Bank', cardCount: 2 }, { name: 'SBI Card', cardCount: 1 }]);
});

test('verificationBadge describes the card honestly', () => {
  assert.deepEqual(lib.verificationBadge(card({ verificationStatus: 'verified', lastVerifiedAt: '2026-09-05' })), { kind: 'verified', text: 'Verified · Sep 2026' });
  assert.equal(lib.verificationBadge(card({ verificationStatus: 'verified', hasPendingChanges: true })).kind, 'outdated');
  assert.equal(lib.verificationBadge(card({ verificationStatus: 'stale' })).kind, 'outdated');
  assert.equal(lib.verificationBadge(card()).text, 'Unverified');
});

test('renderMarkdown formats chat replies without letting HTML through', () => {
  assert.equal(lib.renderMarkdown('**Best:** <b>x</b>'), '<strong>Best:</strong> &lt;b&gt;x&lt;/b&gt;');
  assert.equal(lib.renderMarkdown('Cards:\n- One\n- Two'), 'Cards:<br><ul><li>One</li><li>Two</li></ul>');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/lib.test.js`
Expected: FAIL with `Cannot find module '../public/lib'`

- [ ] **Step 3: Implement**

`public/lib.js`:

```js
// Pure helpers used by the site (as globals) and by the Node tests (via module.exports).

function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (ch) => map[ch]);
}

// Only https links are rendered; anything else (javascript:, data:, http:) is dropped.
function safeUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;
}

const FILTERS = {
  all: () => true,
  ltf: (c) => c.isLTF,
  'non-ltf': (c) => !c.isLTF,
  lounge: (c) => Boolean(c.benefits?.lounges?.airport?.domestic || c.benefits?.lounges?.airport?.international),
  railway: (c) => Boolean(c.benefits?.lounges?.railway?.count),
  golf: (c) => c.benefits?.golf?.available === true,
  cashback: (c) => c.category === 'Cashback' || /cashback/i.test(c.benefits?.cashback?.description || ''),
  forex: (c) => c.benefits?.forex?.markupFee === '0%',
};

const verifiedFirst = (a, b) => (a.verificationStatus === 'verified' ? 0 : 1) - (b.verificationStatus === 'verified' ? 0 : 1);
const SORTS = {
  popularity: (a, b) => verifiedFirst(a, b) || b.popularityScore - a.popularityScore,
  'fee-low': (a, b) => a.annualFee - b.annualFee,
  'fee-high': (a, b) => b.annualFee - a.annualFee,
  name: (a, b) => a.name.localeCompare(b.name),
  bank: (a, b) => a.bank.localeCompare(b.bank),
};

function queryCards(cards, { filter = 'all', bank = '', search = '', sort = 'popularity', tier = '', verifiedOnly = false } = {}) {
  const q = search.trim().toLowerCase();
  return cards
    .filter(FILTERS[filter] || FILTERS.all)
    .filter((c) => !bank || c.bank === bank)
    .filter((c) => !tier || c.tier === tier)
    .filter((c) => !verifiedOnly || c.verificationStatus === 'verified')
    .filter((c) => !q || [c.name, c.bank, c.category, ...c.highlights].some((t) => t.toLowerCase().includes(q)))
    .sort(SORTS[sort] || SORTS.popularity);
}

function computeStats(cards) {
  return {
    totalCards: cards.length,
    ltfCount: cards.filter(FILTERS.ltf).length,
    withLoungeCount: cards.filter(FILTERS.lounge).length,
    withGolfCount: cards.filter(FILTERS.golf).length,
    withCashbackCount: cards.filter(FILTERS.cashback).length,
    totalBanks: new Set(cards.map((c) => c.bank)).size,
  };
}

function bankCounts(cards) {
  const counts = {};
  for (const c of cards) counts[c.bank] = (counts[c.bank] || 0) + 1;
  return Object.keys(counts).sort().map((name) => ({ name, cardCount: counts[name] }));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthYear(date) {
  const d = new Date(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function verificationBadge(card) {
  if (card.verificationStatus === 'stale' || card.hasPendingChanges) return { kind: 'outdated', text: 'May be outdated' };
  if (card.verificationStatus === 'verified') return { kind: 'verified', text: `Verified · ${monthYear(card.lastVerifiedAt)}` };
  return { kind: 'unverified', text: 'Unverified' };
}

// Chat replies: escape everything first, then allow **bold**, *italic* and "- " bullet lists.
function renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[ \t]*[-•][ \t]+(.+)$/gm, '<li>$1</li>')
    .replace(/(?:<li>.*<\/li>\n?)+/g, (items) => `<ul>${items.replace(/\n/g, '')}</ul>`)
    .replace(/\n/g, '<br>');
}

if (typeof module === 'object' && module.exports) {
  module.exports = { escapeHtml, safeUrl, FILTERS, queryCards, computeStats, bankCounts, monthYear, verificationBadge, renderMarkdown };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `node --test test/lib.test.js`
Expected: `ℹ tests 8`, `ℹ pass 8`

- [ ] **Step 5: Commit**

```bash
git add public/lib.js test/lib.test.js
git commit -m "feat: add browser helpers for filters, labels and escaping"
```

---

### Task 4: Chat as a Lambda function

**Files:**
- Create: `lambda/chat/index.js`
- Test: `test/chat.test.js`

**Interfaces:**
- Consumes: `lambda/chat/cards.json`, written by `npm run build` (Task 2).
- Produces:
  - `handler(event) → { statusCode, headers, body }`. The body is JSON `{ "reply": string }`.
  - `cardsSummary(cards) → string`
- Event shape: a Lambda function URL payload. It reads `event.headers['x-origin-verify']`, `event.body` and `event.isBase64Encoded`.
- Status codes: 200 answer, 400 bad input, 403 missing origin header, 502 LLM failure.
- Environment:
  - `LLM_API_KEY`: local only. When it isn't set, the key is read from the SSM parameter named by `LLM_API_KEY_PARAM`.
  - `ORIGIN_SECRET`: when set, requests must carry the same value in `X-Origin-Verify`.
  - `LLM_URL`: default `https://integrate.api.nvidia.com/v1/chat/completions`.
  - `LLM_MODEL`: default `moonshotai/kimi-k2.5`.

- [ ] **Step 1: Write the failing test**

`test/chat.test.js`:

```js
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
});

test('empty and oversized messages are rejected before calling the LLM', async (t) => {
  const fetchMock = t.mock.method(global, 'fetch', async () => { throw new Error('should not be called'); });
  assert.equal((await handler(event({ message: '  ' }))).statusCode, 400);
  assert.equal((await handler(event({ message: 'x'.repeat(501) }))).statusCode, 400);
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
});

test('cardsSummary marks cards without verified benefits', () => {
  const text = cardsSummary([{ name: 'X Card', bank: 'X Bank', network: 'Visa', category: 'Co-branded', verificationStatus: 'unverified', isLTF: false, annualFee: 500, joiningFee: null, rewardRate: null, eligibility: { minIncome: null, minAge: null }, benefits: null, highlights: [] }]);
  assert.match(text, /Benefits: not verified yet/);
  assert.match(text, /Joining fee: unknown/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL in `test/chat.test.js` with `Cannot find module '../lambda/chat'`

- [ ] **Step 3: Implement**

`lambda/chat/index.js`:

```js
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
  if (process.env.ORIGIN_SECRET && event.headers?.['x-origin-verify'] !== process.env.ORIGIN_SECRET) return reply(403, 'Forbidden');

  let body;
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body || '{}');
  } catch {
    return reply(400, 'Invalid request.');
  }
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
    return reply(200, data.choices[0].message.content);
  } catch (err) {
    console.error('chat failed:', err.message);
    return reply(502, 'Sorry, I could not answer right now. Please try again in a minute.');
  }
};

exports.cardsSummary = cardsSummary;
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test`
Expected: `ℹ tests 23`, `ℹ pass 23`

- [ ] **Step 5: Commit**

```bash
git add lambda/chat/index.js test/chat.test.js
git commit -m "feat: add chat Lambda handler with request limits"
```

---

### Task 5: Public site on the new data, with verification labels

The DOM code is checked in a browser, because the logic it calls is already tested through `lib.js`.

**Files:**
- Create: `scripts/dev.js`
- Replace: `public/app.js`, `public/landing.js`
- Modify: `public/dashboard.html`, `public/index.html`, `public/styles.css` (append), `package.json` (dev script)
- Delete: `public/login.html`, `public/login.js`

**Interfaces:**
- Consumes: `lib.js` globals (Task 3); `/data/cards.json` (Task 2); `POST /api/chat`, which returns `{ reply }` (Task 4).
- Produces: new global handlers `setTier(tier)` and `setVerifiedOnly(checked)`, called from `dashboard.html`. `loadCards()` and `applyQuery()` replace `fetchCards()` and `fetchBanks()`.

- [ ] **Step 1: Create the local preview server**

`scripts/dev.js`:

```js
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
```

- [ ] **Step 2: Point `npm run dev` at it**

In `package.json`, replace `"dev": "node server.js"` with:
```json
    "dev": "node scripts/build.js && node --env-file-if-exists=.env scripts/dev.js"
```

- [ ] **Step 3: Replace `public/app.js`**

What changed from the current file:
- The login gate is gone, and cards come from `/data/cards.json` with no API calls.
- Filtering happens in memory.
- Every card field is escaped, and missing benefits are handled.
- The verification label, the detail-popup verification note and the per-value "ⓘ Source" quotes are added.
- The tier and verified-only filters are added.
- Chat replies are escaped.

`public/app.js`:

```js
/**
 * CardRadar Dashboard — Frontend JavaScript
 */

const API_BASE = '';

// State
let allCardsData = []; // every card from /data/cards.json
let allCards = [];     // cards matching the current filters
let currentFilter = 'all';
let currentSort = 'popularity';
let currentSearch = '';
let currentBank = '';
let currentTier = '';
let verifiedOnly = false;

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (document.getElementById('cardGrid')) loadCards();
});

// ===== THEME TOGGLE =====

function initTheme() {
  const saved = localStorage.getItem('cardradar-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('cardradar-theme', 'dark');
    showToast('Dark mode enabled', 'info');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('cardradar-theme', 'light');
    showToast('Light mode enabled', 'info');
  }
}

// ===== DATA FETCHING =====

async function loadCards() {
  try {
    const res = await fetch('/data/cards.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allCardsData = await res.json();
    updateStats(computeStats(allCardsData));
    renderBankChips(bankCounts(allCardsData));
    applyQuery();
  } catch (err) {
    console.error('Failed to load cards:', err);
    showToast('Failed to load card data', 'error');
  }
}

function applyQuery() {
  allCards = queryCards(allCardsData, {
    filter: currentFilter, bank: currentBank, search: currentSearch, sort: currentSort, tier: currentTier, verifiedOnly,
  });
  renderCards(allCards);
  updateSectionHeader();
}

// ===== RENDERING =====

function renderCards(cards) {
  const standardGrid = document.getElementById('cardGrid');
  const cobrandedGrid = document.getElementById('cobrandedGrid');
  const cobrandedSection = document.getElementById('cobrandedCardsSection');
  const standardCount = document.getElementById('sectionCount');
  const cobrandedCount = document.getElementById('cobrandedCount');

  if (!cards || cards.length === 0) {
    standardGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔍</div>
        <h3>No cards found</h3>
        <p>Try adjusting your filters or search terms</p>
      </div>`;
    cobrandedSection.style.display = 'none';
    return;
  }

  // Split cards based on isCoBranded flag
  const standardCards = cards.filter(c => !c.isCoBranded);
  const cobrandedCardsArray = cards.filter(c => c.isCoBranded);

  // Render Standard Cards
  if (standardCards.length > 0) {
    standardGrid.innerHTML = standardCards.map(card => renderCardHTML(card)).join('');
  } else {
    standardGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">💳</div>
        <h3>No standard cards found</h3>
      </div>`;
  }
  
  if (standardCount && document.getElementById('sectionTitle').textContent !== 'All Credit Cards') {
    // Only override count if it's already updated by updateSectionHeader
  }

  // Render Co-Branded Cards
  if (cobrandedCardsArray.length > 0) {
    cobrandedSection.style.display = 'block';
    cobrandedGrid.innerHTML = cobrandedCardsArray.map(card => renderCardHTML(card)).join('');
    if (cobrandedCount) cobrandedCount.textContent = `${cobrandedCardsArray.length} cards`;
  } else {
    cobrandedSection.style.display = 'none';
  }
}

function renderCardHTML(card) {
  const b = card.benefits;
  const badge = verificationBadge(card);
  const feeText = card.isLTF
    ? '<strong>Lifetime Free</strong> — ₹0 Annual Fee'
    : `Annual Fee: <span class="fee-amount">₹${card.annualFee.toLocaleString('en-IN')}</span>`;
  const icons = b ? [
    { icon: '✈️', on: FILTERS.lounge(card), tip: b.lounges?.airport?.description || 'Airport lounge access' },
    { icon: '🚂', on: FILTERS.railway(card), tip: b.lounges?.railway?.description || 'Railway lounge access' },
    { icon: '⛳', on: FILTERS.golf(card), tip: b.golf?.description || 'Golf' },
    { icon: '💰', on: Boolean(b.cashback), tip: b.cashback?.description || 'Rewards' },
    { icon: '🌍', on: FILTERS.forex(card), tip: b.forex?.description || `Forex markup: ${b.forex?.markupFee || 'not verified'}` },
    { icon: '⛽', on: Boolean(b.fuel?.surchargeWaiver), tip: b.fuel?.description || 'No fuel benefit listed' },
    { icon: '🍽️', on: Boolean(b.dining?.available), tip: b.dining?.description || 'No dining benefit listed' },
    { icon: '🎬', on: Boolean(b.movies?.available), tip: b.movies?.description || 'No movie benefit listed' },
  ] : [];

  return `
    <div class="credit-card ${card.isLTF ? 'ltf-card' : 'premium-card'}" onclick="openModal('${card.id}')">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-bank">${escapeHtml(card.bank)}</span>
          <div class="card-badges">
            ${card.isLTF ? '<span class="badge badge-ltf">LTF</span>' : '<span class="badge badge-premium">Premium</span>'}
            <span class="badge badge-network">${escapeHtml(card.network)}</span>
            <span class="badge badge-${badge.kind}">${escapeHtml(badge.text)}</span>
          </div>
        </div>
        <h3 class="card-name">${escapeHtml(card.name)}</h3>
        <p class="card-fee">${feeText}</p>
        ${b ? `<div class="benefit-icons">${icons.map((i) => `
          <div class="benefit-icon ${i.on ? 'available' : 'unavailable'}">${i.icon}<span class="tooltip">${escapeHtml(i.tip)}</span></div>`).join('')}
        </div>` : '<p class="benefits-pending">Benefits not verified yet — see the bank\'s page.</p>'}
        <div class="card-highlights">
          ${card.highlights.slice(0, 3).map((h) => `<span class="highlight-tag">${escapeHtml(h)}</span>`).join('')}
        </div>
        <div class="card-meta">
          <div class="meta-item"><span class="meta-icon">🏷️</span><span>${escapeHtml(card.category)}</span></div>
          <div class="meta-item"><span class="meta-icon">⭐</span><span>Rewards: ${escapeHtml(card.rewardRate || 'not verified')}</span></div>
        </div>
      </div>
    </div>
  `;
}

// ===== BANK CHIPS =====

const BANK_ICONS = {
  'HDFC Bank': '🔵', 'ICICI Bank': '🟠', 'Axis Bank': '🟣',
  'IDFC FIRST Bank': '🔴', 'SBI Card': '🔷', 'HSBC': '🔺',
  'American Express': '🟢', 'Federal Bank': '🟡', 'AU Small Finance Bank': '🟤',
  'IndusInd Bank': '🟦', 'RBL Bank': '🟥', 'IDBI Bank': '🟧',
};

function renderBankChips(banks) {
  const container = document.getElementById('bankChips');
  if (!container) return;
  const chip = (value, label, count, icon) => `
    <button class="bank-chip ${currentBank === value ? 'active' : ''}" data-bank="${escapeHtml(value)}" onclick="setBank(this.dataset.bank, this)">
      <span class="bank-chip-icon">${icon}</span>
      <span class="bank-chip-name">${escapeHtml(label)}</span>
      <span class="bank-chip-count">${count}</span>
    </button>`;
  container.innerHTML = chip('', 'All Banks', banks.reduce((sum, b) => sum + b.cardCount, 0), '🏦')
    + banks.map((b) => chip(b.name, b.name, b.cardCount, BANK_ICONS[b.name] || '🏛️')).join('');
}

// ===== STATS =====

function updateStats(stats) {
  if (!stats) return;
  animateNumber('statTotal', stats.totalCards);
  animateNumber('statLTF', stats.ltfCount);
  animateNumber('statLounge', stats.withLoungeCount);
  animateNumber('statGolf', stats.withGolfCount);
  animateNumber('statCashback', stats.withCashbackCount);
  animateNumber('statBanks', stats.totalBanks);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 800;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ===== FILTERS & SEARCH =====

function setFilter(filter, chipEl) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');
  applyQuery();
}

function setBank(bank, chipEl) {
  currentBank = bank;
  document.querySelectorAll('.bank-chip').forEach((c) => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');
  applyQuery();
}

function setTier(tier) {
  currentTier = tier;
  applyQuery();
}

function setVerifiedOnly(checked) {
  verifiedOnly = checked;
  applyQuery();
}

function handleSearch() {
  currentSearch = document.getElementById('searchInput').value.trim();
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(applyQuery, 300);
}

function handleSort() {
  currentSort = document.getElementById('sortSelect').value;
  applyQuery();
}

function updateSectionHeader() {
  const titles = {
    'all': 'All Credit Cards',
    'ltf': 'Lifetime Free (LTF) Cards',
    'non-ltf': 'Premium (Non-LTF) Cards',
    'lounge': 'Cards with Lounge Access',
    'railway': 'Cards with Railway Lounge',
    'golf': 'Cards with Golf Benefits',
    'cashback': 'Cashback Cards',
    'forex': 'Zero Forex Markup Cards'
  };

  const icons = {
    'all': '📊', 'ltf': '✨', 'non-ltf': '👑', 'lounge': '✈️',
    'railway': '🚂', 'golf': '⛳', 'cashback': '💰', 'forex': '🌍'
  };

  let title = titles[currentFilter] || 'Credit Cards';
  if (currentBank) {
    title = `${currentBank} — ${title}`;
  }

  document.getElementById('sectionTitle').textContent = title;
  document.getElementById('sectionCount').textContent = `${allCards.length} cards`;

  const iconEl = document.querySelector('.section-icon');
  if (iconEl) iconEl.textContent = icons[currentFilter] || '📊';
}

// ===== MODAL =====

function openModal(cardId) {
  const card = allCardsData.find((c) => c.id === cardId);
  if (!card) return;

  document.getElementById('modalCardName').textContent = card.name;
  document.getElementById('modalCardBank').textContent = `${card.bank} • ${card.network} • ${card.category}`;

  const body = document.getElementById('modalBody');
  body.innerHTML = renderModalContent(card);

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modalOverlay') && event.target !== document.querySelector('.modal-close')) return;
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function renderModalContent(card) {
  const b = card.benefits;
  const v = card.verification || {};
  const badge = verificationBadge(card);
  const apply = safeUrl(card.applyUrl);
  const sourceLinks = card.sources.map((s) => safeUrl(s.url)).filter(Boolean);
  const rupees = (n) => (n == null ? 'Not verified yet' : `₹${n.toLocaleString('en-IN')}`);
  const visits = (n) => (n === -1 ? 'Unlimited' : n ? `${n} visits/year` : 'None');
  const yesNo = (on) => (on ? '✅ Available' : '❌ None');
  // One tile; "field" links it to the verification quote for that value, if any.
  const item = (label, value, cls = '', field = '') => `
    <div class="detail-item">
      <div class="detail-item-label">${escapeHtml(label)}</div>
      <div class="detail-item-value ${cls}">${escapeHtml(value)}</div>
      ${field && v[field] ? `<details class="quote"><summary>ⓘ Source</summary>“${escapeHtml(v[field].quote)}” — checked ${escapeHtml(v[field].verifiedAt)}</details>` : ''}
    </div>`;
  const section = (title, body) => `<div class="detail-section"><div class="detail-section-title">${title}</div>${body}</div>`;

  let html = `
    <div class="detail-section verify-note verify-${badge.kind}">
      <strong>${escapeHtml(badge.text)}</strong>${card.lastCheckedAt ? ` · page last checked ${escapeHtml(card.lastCheckedAt.slice(0, 10))}` : ''}
      <p>${badge.kind === 'verified'
        ? 'Every fee, rate and benefit marked ⓘ is quoted from the bank\'s own page.'
        : 'Some details on this card have not been checked against the bank\'s page yet.'}
        Always confirm on the bank's website before you apply.</p>
      ${sourceLinks.map((u) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">Official card page ↗</a>`).join(' ')}
    </div>`;

  if (apply) {
    html += `
    <div class="detail-section" style="text-align: center;">
      <a href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer" class="apply-btn">🚀 Apply on ${escapeHtml(card.bank)}'s site</a>
    </div>`;
  }

  html += section('💳 Card Overview', `<div class="detail-grid">
    ${item('Type', card.isLTF ? 'Lifetime Free' : 'Annual Fee Card', card.isLTF ? 'green' : 'gold')}
    ${item('Annual Fee', rupees(card.annualFee), card.isLTF ? 'green' : 'gold', 'annualFee')}
    ${item('Joining Fee', rupees(card.joiningFee), '', 'joiningFee')}
    ${item('Reward Rate', card.rewardRate || 'Not verified yet', 'green', 'rewardRate')}
    ${item('Network', card.network)}
    ${item('Category', card.category)}
  </div>`);

  if (!b) {
    html += section('🎁 Benefits', '<p class="benefits-pending">Benefits for this card have not been verified yet. Check the bank\'s page for current rewards and perks.</p>');
  } else {
    if (b.cashback) {
      html += section('💰 Cashback & Rewards', `
        <p class="detail-text">${escapeHtml(b.cashback.description || '')}</p>
        <ul class="detail-list">${(b.cashback.details || []).map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`);
    }
    const air = b.lounges?.airport || {};
    const rail = b.lounges?.railway || {};
    html += section('✈️ Lounge Access', `<div class="detail-grid">
      ${item('Domestic Airport', visits(air.domestic), air.domestic ? 'green' : 'red', 'loungeDomestic')}
      ${item('International Airport', visits(air.international), air.international ? 'green' : 'red', 'loungeInternational')}
      ${item('Railway Lounge', visits(rail.count), rail.count ? 'green' : 'red')}
    </div>`);
    html += section('🎁 Other Benefits', `<div class="detail-grid">
      ${item('Golf', yesNo(b.golf?.available), b.golf?.available ? 'green' : 'red', 'golf')}
      ${item('Forex Markup', b.forex?.markupFee || 'Not verified yet', b.forex?.markupFee === '0%' ? 'green' : '', 'forexMarkup')}
      ${item('Fuel', b.fuel?.surchargeWaiver ? '✅ Surcharge waiver' : '❌ None', b.fuel?.surchargeWaiver ? 'green' : 'red')}
      ${item('Dining', yesNo(b.dining?.available), b.dining?.available ? 'green' : 'red')}
      ${item('Movies', yesNo(b.movies?.available), b.movies?.available ? 'green' : 'red')}
    </div>`);
    if (b.other?.length) {
      html += section('📌 Key Highlights', `<ul class="detail-list">${b.other.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>`);
    }
  }

  const e = card.eligibility || {};
  html += section('📋 Eligibility', `<div class="detail-grid">
    ${item('Min. Annual Income', rupees(e.minIncome), '', 'minIncome')}
    ${item('Min. Age', e.minAge == null ? 'Not verified yet' : `${e.minAge} years`, '', 'minAge')}
  </div>`);

  return html;
}

// ===== TOAST NOTIFICATIONS =====

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

  container.appendChild(toast);

  // Auto-remove after animation
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ===== CHATBOT LOGIC =====

let chatHistory = [];
let isChatbotOpen = false;
let isWaitingForResponse = false;

function toggleChat() {
  const panel = document.getElementById('chatbotPanel');
  const fabPulse = document.querySelector('.chatbot-fab-pulse');

  isChatbotOpen = !isChatbotOpen;

  if (isChatbotOpen) {
    panel.classList.add('active');
    if (fabPulse) fabPulse.style.display = 'none'; // Stop pulsing once opened
    document.getElementById('chatbotInput').focus();
  } else {
    panel.classList.remove('active');
  }
}

function handleSuggestedQuestion(btnEl) {
  const question = btnEl.textContent.replace(/^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]\s*/g, ''); // Remove emoji
  document.getElementById('chatbotInput').value = question;
  sendChatMessage();
}

async function sendChatMessage() {
  if (isWaitingForResponse) return;

  const inputEl = document.getElementById('chatbotInput');
  const message = inputEl.value.trim();

  if (!message) return;

  // Add user message to UI
  addMessageToUI('user', message);
  inputEl.value = '';

  // Hide suggestions if they are visible
  const suggestions = document.getElementById('chatbotSuggestions');
  if (suggestions) suggestions.style.display = 'none';

  isWaitingForResponse = true;
  document.getElementById('chatbotSend').disabled = true;

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, history: chatHistory })
    });

    const data = await res.json();

    // Remove typing indicator
    document.getElementById(typingId)?.remove();

    if (res.ok) {
      addMessageToUI('bot', data.reply);
      // Save history
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'bot', content: data.reply });
    } else {
      addMessageToUI('bot', data.reply || 'Sorry, something went wrong.');
    }
  } catch (err) {
    console.error('Chat error:', err);
    document.getElementById(typingId)?.remove();
    addMessageToUI('bot', 'Network error. Please try again later.');
  } finally {
    isWaitingForResponse = false;
    document.getElementById('chatbotSend').disabled = false;
    inputEl.focus();
  }
}

function addMessageToUI(sender, text) {
  const messagesEl = document.getElementById('chatbotMessages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;

  if (sender === 'bot') {
    bubble.innerHTML = renderMarkdown(text); // escapes the reply before formatting
  } else {
    bubble.textContent = text;
  }

  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chatbotMessages');
  const id = 'typing-' + Date.now();

  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-bubble bot typing-indicator';
  div.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return id;
}
```

- [ ] **Step 4: Replace `public/landing.js`** (removes the login check)

```js
document.addEventListener('DOMContentLoaded', () => {
  initLanding();
});

function initLanding() {
  handleSplashScreen();
  setupScrollAnimations();
}

function handleSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    // Hide splash screen after 4 seconds
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        // Trigger initial fade sections that are in view
        document.body.classList.add('splash-cleared');
      }, 500); // Wait for transition
    }, 4000);
  } else {
    document.body.classList.add('splash-cleared');
  }
}

function setupScrollAnimations() {
  const faders = document.querySelectorAll('.fade-section');
  
  const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const appearOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, appearOptions);

  faders.forEach(fader => {
    appearOnScroll.observe(fader);
  });
}
```

- [ ] **Step 5: Edit `public/dashboard.html`**

a) Delete these lines, which are the login button and user menu:
```html
      <a href="/login.html" class="btn btn-primary" id="loginBtn" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Log In</a>
      <div id="userProfile" style="display: none; align-items: center; gap: 1rem;">
        <span id="userNameDisplay" style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;"></span>
        <button onclick="handleLogout()" class="btn" style="background: var(--bg-glass-light); border: 1px solid var(--border-subtle); color: var(--text-secondary); padding: 0.4rem 1rem; font-size: 0.8rem;">Log Out</button>
      </div>
```

b) Replace:
```html
          <option value="name">🔤 Name A-Z</option>
        </select>
```
with:
```html
          <option value="name">🔤 Name A-Z</option>
        </select>
        <select class="sort-select" id="tierSelect" onchange="setTier(this.value)" aria-label="Card tier">
          <option value="">🎚️ All tiers</option>
          <option value="entry">Entry</option>
          <option value="mid">Mid-range</option>
          <option value="premium">Premium</option>
          <option value="super_premium">Super premium</option>
          <option value="private">Invite only</option>
        </select>
        <label class="verified-toggle">
          <input type="checkbox" id="verifiedOnly" onchange="setVerifiedOnly(this.checked)"> Verified only
        </label>
```

c) Replace:
```html
    <p>Data sourced from official bank websites • Built with ❤️</p>
```
with:
```html
    <p class="disclaimer">Card details are checked against official bank pages but can change at any time. CardRadar is not a bank and this is not financial advice — confirm on the bank's website before you apply.</p>
```

d) Replace:
```html
  <script src="app.js"></script>
```
with:
```html
  <script src="lib.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 6: Edit `public/index.html`**

a) Replace:
```html
      <a href="/login.html" class="btn btn-primary" id="loginBtnLanding" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Log In</a>
      <div id="userProfileLanding" style="display: none; align-items: center; gap: 1rem;">
        <span id="userNameLanding" style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;"></span>
        <a href="/dashboard.html" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Dashboard</a>
      </div>
```
with:
```html
      <a href="/dashboard.html" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Browse Cards</a>
```

b) Replace `Available post-login, our intelligent chatbot is ready to answer your questions instantly.` with `Ask anything about Indian credit cards — no sign-up needed.`

c) Replace `<strong>Live Data:</strong> Pulls real-time accuracy directly from the CardRadar database.` with `<strong>Honest Data:</strong> Answers from the CardRadar card list and tells you when a card's details haven't been verified yet.`

d) Replace the footer line `<p>Data sourced from official bank websites • Built with ❤️</p>` with the same `<p class="disclaimer">…</p>` line as in Step 5c.

e) Replace:
```html
  <script src="app.js"></script>
  <script src="landing.js"></script>
```
with:
```html
  <script src="lib.js"></script>
  <script src="app.js"></script>
  <script src="landing.js"></script>
```

- [ ] **Step 7: Append the new styles to the end of `public/styles.css`**

```css
/* ===== Verification labels ===== */
.badge-verified {
  background: rgba(0, 212, 170, 0.15);
  color: var(--accent-secondary);
  border: 1px solid rgba(0, 212, 170, 0.3);
}

.badge-outdated {
  background: rgba(255, 170, 0, 0.12);
  color: #ffaa00;
  border: 1px solid rgba(255, 170, 0, 0.3);
}

.badge-unverified {
  background: var(--bg-glass-light);
  color: var(--text-muted);
  border: 1px dashed var(--border-subtle);
}

.benefits-pending,
.verify-note p,
.quote {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.verify-note {
  border-left: 3px solid var(--border-subtle);
  padding-left: 0.8rem;
}

.verify-note.verify-verified { border-left-color: var(--accent-secondary); }
.verify-note.verify-outdated { border-left-color: #ffaa00; }
.verify-note p { margin: 0.35rem 0; }

.quote { margin-top: 0.3rem; }
.quote summary { cursor: pointer; }

.verified-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.footer .disclaimer {
  max-width: 720px;
  margin: 0.4rem auto 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}
```

- [ ] **Step 8: Delete the login page**

```bash
git rm public/login.html public/login.js
```

- [ ] **Step 9: Run the tests**

Run: `npm test`
Expected: `ℹ pass 23`, `ℹ fail 0`

- [ ] **Step 10: Check it in a browser**

For the chat, first rename `API_KEY` to `LLM_API_KEY` in `.env`. Then run `npm run dev` and open http://localhost:3000/dashboard.html. Check that:
- [ ] The page opens without redirecting to a login page.
- [ ] The stats read **154** cards, **29** LTF, **50** with lounge, **17** with golf, **18** cashback and **25** banks.
- [ ] Every card shows an **Unverified** label, and fees use Indian formatting (₹12,500).
- [ ] The tier select → **Super premium** shows 17 cards. Ticking **Verified only** shows "No cards found". Untick it and set the tier back to **All tiers**.
- [ ] Searching `zomato` shows 2 cards. Open **Zomato RBL Bank Credit Card**: it reads "Unverified", links to the official page, and shows "Benefits for this card have not been verified yet".
- [ ] The chat answers a question, or shows the friendly error if no key is set.
- [ ] The browser console shows no errors.
- [ ] http://localhost:3000/ (the landing page) has a **Browse Cards** button and no **Log In** button.

- [ ] **Step 11: Commit**

```bash
git add scripts/dev.js package.json public
git commit -m "feat: static catalog with verification labels, no login"
```

---

### Task 6: Remove the Express server, login and Postgres

**Files:**
- Delete: `server.js`, `auth.js`, `db.js`, `knowledgebase.js`, `analyzer.js`, `generate_cobranded.js`, `scripts/migrate-cards.js`, `cards/`, `docker-compose.yml`, `package-lock.json`
- Replace: `package.json`, `README.md`

**Interfaces:**
- Produces: a repository with no runtime dependencies. `npm test`, `npm run build` and `npm run dev` are the only commands.

- [ ] **Step 1: Delete the old server and its data sources**

```bash
git rm -r server.js auth.js db.js knowledgebase.js analyzer.js generate_cobranded.js scripts/migrate-cards.js cards docker-compose.yml package-lock.json
```

- [ ] **Step 2: Replace `package.json`**

```json
{
  "name": "cardradar",
  "version": "3.0.0",
  "private": true,
  "description": "CardRadar — Indian credit card guide, a static site on AWS with a weekly n8n refresh",
  "license": "MIT",
  "scripts": {
    "build": "node scripts/build.js",
    "test": "node scripts/build.js && node --test",
    "dev": "node scripts/build.js && node --env-file-if-exists=.env scripts/dev.js"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Remove the installed packages**

Run (Git Bash): `rm -rf node_modules`. In PowerShell: `Remove-Item -Recurse -Force node_modules`.

- [ ] **Step 4: Confirm nothing still uses the old server**

Run: `git grep -n -E "require\('(express|pg|passport|openai|dotenv|xlsx|bcryptjs)'\)|knowledgebase|analyzer|/api/auth|login\.html|handleLogout"`
Expected: no output

- [ ] **Step 5: Replace `README.md`**

````markdown
# 💳 CardRadar — Indian Credit Card Guide

A free guide to Indian credit cards: fees, rewards, lounge access, eligibility and more, checked against each bank's own page.
Every card shows whether its details are **verified**, **may be outdated**, or **unverified**.

- **Site:** static HTML/CSS/JS on Amazon S3 + CloudFront (`ap-south-1`)
- **Chat:** one AWS Lambda (`lambda/chat/`) behind CloudFront at `/api/chat`
- **Data:** one JSON file per card in `data/cards/`, validated by `scripts/build.js`
- **Weekly refresh:** an n8n workflow on AWS Fargate re-reads each card's page and opens a pull request when something changed ([docs/crawler.md](docs/crawler.md))

## Run it locally

Requires Node.js 22 or newer. There are no npm dependencies.

```bash
npm test      # validates the card data, then runs the tests
npm run dev   # http://localhost:3000
```

The chat needs an LLM key. Put `LLM_API_KEY=...` in a `.env` file (never commit it).

## Add or fix a card

1. Create or edit `data/cards/<id>.json`. Copy an existing card; the file name must match `id`.
2. Links must be `https:` on a domain listed in `config/allowed-domains.json`.
3. Run `npm test`. It explains any problem with the file.
4. Open a pull request. Merging to `main` deploys the site.

Leave `verification` empty for new values: the weekly crawl proposes verified values with quotes from the bank's page.

## Deploy

`main` deploys automatically through `.github/workflows/deploy.yml`. AWS resources live in `infra/cardradar.yml` and are updated by hand:

```bash
aws cloudformation deploy --region ap-south-1 --stack-name cardradar --template-file infra/cardradar.yml --capabilities CAPABILITY_IAM
```

## Project structure

```
data/cards/         one JSON file per card (source of truth)
data/status.json    weekly crawl state (written by the intake workflow)
config/             allowed link domains
public/             the website (public/data/ is generated)
lambda/chat/        chat function
scripts/            build, local preview, crawl intake
n8n/                weekly crawl workflow and its container image
infra/              CloudFormation template
test/               node --test suites
```

## Disclaimer

Card details can change at any time. CardRadar is not a bank and nothing here is financial advice; confirm on the bank's website before you apply.

## License

MIT, see [LICENSE](LICENSE).
````

- [ ] **Step 6: Run everything**

Run: `npm test`
Expected: `ℹ pass 23`, `ℹ fail 0`

Then run `npm run dev` and reload http://localhost:3000/dashboard.html. It should behave exactly as in Task 5, Step 10.

- [ ] **Step 7: Commit**

The deletions were staged by `git rm` in Step 1. Add only the two replaced files; don't use `git add -A`, which would also commit unrelated untracked files such as `desktop.ini`.
```bash
git add package.json README.md
git commit -m "chore: remove Express server, login and Postgres"
```

---

### Task 7: AWS stack for the site, chat and deploy role

**Files:**
- Create: `infra/cardradar.yml`

**Interfaces:**
- Consumes: the SSM SecureString `/cardradar/llm-api-key` (created in Step 5).
- Produces: stack outputs `SiteUrl`, `BucketName`, `DistributionId`, `ChatFunctionName` and `DeployRoleArn`, all used in Task 8.

- [ ] **Step 1: Create the template**

`infra/cardradar.yml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CardRadar - static site (S3 + CloudFront), chat Lambda, GitHub deploy role

Parameters:
  GitHubRepo:
    Type: String
    Default: rineshpatil/CardRadar-CreditCard-Scarper
    Description: owner/name of the GitHub repository whose main branch may deploy
  CreateGitHubOidcProvider:
    Type: String
    AllowedValues: ['true', 'false']
    Default: 'true'
    Description: false if this AWS account already has the token.actions.githubusercontent.com identity provider
  LlmApiKeyParameter:
    Type: String
    Default: /cardradar/llm-api-key
    Description: SSM SecureString parameter holding the LLM API key
  ChatConcurrency:
    Type: Number
    Default: 5
    MinValue: 0
    Description: Max simultaneous chat requests. 0 = no reservation (needed when the account's Lambda concurrency quota is 10)

Conditions:
  CreateOidc: !Equals [!Ref CreateGitHubOidcProvider, 'true']
  LimitChat: !Not [!Equals [!Ref ChatConcurrency, 0]]

Resources:
  SiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  SiteOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: !Sub '${AWS::StackName}-site'
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  SiteBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref SiteBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource: !Sub '${SiteBucket.Arn}/*'
            Condition:
              StringEquals:
                AWS:SourceArn: !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${Distribution}'

  ChatRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: read-llm-key
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: ssm:GetParameter
                Resource: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter${LlmApiKeyParameter}'

  ChatFunction:
    Type: AWS::Lambda::Function
    Properties:
      Description: CardRadar AI chat (code is uploaded by the deploy workflow)
      Runtime: nodejs22.x
      Handler: index.handler
      Architectures: [arm64]
      MemorySize: 256
      Timeout: 60
      Role: !GetAtt ChatRole.Arn
      ReservedConcurrentExecutions: !If [LimitChat, !Ref ChatConcurrency, !Ref AWS::NoValue]
      Environment:
        Variables:
          LLM_API_KEY_PARAM: !Ref LlmApiKeyParameter
          ORIGIN_SECRET: !Select [2, !Split ['/', !Ref AWS::StackId]]
      Code:
        ZipFile: |
          exports.handler = async () => ({ statusCode: 503, body: JSON.stringify({ reply: 'Chat is being deployed. Try again in a few minutes.' }) });

  ChatFunctionUrl:
    Type: AWS::Lambda::Url
    Properties:
      AuthType: NONE
      TargetFunctionArn: !GetAtt ChatFunction.Arn

  # Public function URLs need both permissions (since October 2025).
  ChatUrlPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ChatFunction
      Action: lambda:InvokeFunctionUrl
      Principal: '*'
      FunctionUrlAuthType: NONE

  ChatInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ChatFunction
      Action: lambda:InvokeFunction
      Principal: '*'
      InvokedViaFunctionUrl: true

  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Comment: CardRadar
        Enabled: true
        DefaultRootObject: index.html
        HttpVersion: http2and3
        PriceClass: PriceClass_200
        Origins:
          - Id: site
            DomainName: !GetAtt SiteBucket.RegionalDomainName
            OriginAccessControlId: !GetAtt SiteOriginAccessControl.Id
            S3OriginConfig:
              OriginAccessIdentity: ''
          - Id: chat
            DomainName: !Select [2, !Split ['/', !GetAtt ChatFunctionUrl.FunctionUrl]]
            CustomOriginConfig:
              OriginProtocolPolicy: https-only
              OriginSSLProtocols: [TLSv1.2]
              OriginReadTimeout: 60
            OriginCustomHeaders:
              - HeaderName: X-Origin-Verify
                HeaderValue: !Select [2, !Split ['/', !Ref AWS::StackId]]
        DefaultCacheBehavior:
          TargetOriginId: site
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6          # Managed-CachingOptimized
          ResponseHeadersPolicyId: 67f7725c-6f97-4210-82d7-5512b31e9d03 # Managed-SecurityHeadersPolicy
        CacheBehaviors:
          - PathPattern: /api/*
            TargetOriginId: chat
            ViewerProtocolPolicy: https-only
            AllowedMethods: [GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE]
            CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad          # Managed-CachingDisabled
            OriginRequestPolicyId: b689b0a8-53d0-40ab-baf2-68738e2966ac   # Managed-AllViewerExceptHostHeader
            ResponseHeadersPolicyId: 67f7725c-6f97-4210-82d7-5512b31e9d03

  GitHubOidcProvider:
    Type: AWS::IAM::OIDCProvider
    Condition: CreateOidc
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList: [sts.amazonaws.com]

  DeployRole:
    Type: AWS::IAM::Role
    Properties:
      Description: Assumed by GitHub Actions on the main branch to publish the site
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !If
                - CreateOidc
                - !Ref GitHubOidcProvider
                - !Sub 'arn:aws:iam::${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com'
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: sts.amazonaws.com
                token.actions.githubusercontent.com:sub: !Sub 'repo:${GitHubRepo}:ref:refs/heads/main'
      Policies:
        - PolicyName: publish-site
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: s3:ListBucket
                Resource: !GetAtt SiteBucket.Arn
              - Effect: Allow
                Action: [s3:GetObject, s3:PutObject, s3:DeleteObject]
                Resource: !Sub '${SiteBucket.Arn}/*'
              - Effect: Allow
                Action: cloudfront:CreateInvalidation
                Resource: !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${Distribution}'
              - Effect: Allow
                Action: lambda:UpdateFunctionCode
                Resource: !GetAtt ChatFunction.Arn

Outputs:
  SiteUrl:
    Value: !Sub 'https://${Distribution.DomainName}'
  BucketName:
    Value: !Ref SiteBucket
  DistributionId:
    Value: !Ref Distribution
  ChatFunctionName:
    Value: !Ref ChatFunction
  DeployRoleArn:
    Value: !GetAtt DeployRole.Arn
```

- [ ] **Step 2: Lint it**

Run: `pip install cfn-lint`, then `cfn-lint --regions ap-south-1 -- infra/cardradar.yml`
Expected: no output (exit code 0)

- [ ] **Step 3: Sign in to AWS**

Run: `aws login`, then `aws sts get-caller-identity`
Expected: your account id and user ARN

- [ ] **Step 4: Check two account settings**

Run: `aws lambda get-account-settings --region ap-south-1 --query AccountLimit.ConcurrentExecutions`
- If this prints `10`, use `ChatConcurrency=0` in Step 6 (a new account can't reserve concurrency).
- Optionally, ask for a higher "Concurrent executions" quota in Service Quotas.

Run: `aws iam list-open-id-connect-providers`
- If the output contains `token.actions.githubusercontent.com`, use `CreateGitHubOidcProvider=false` in Step 6.

- [ ] **Step 5: Store the LLM key**

Run this yourself; the key is the `LLM_API_KEY` value in `.env`:
```bash
aws ssm put-parameter --region ap-south-1 --name /cardradar/llm-api-key --type SecureString --value "<LLM API key>"
```
Expected: `{ "Version": 1, "Tier": "Standard" }`

- [ ] **Step 6: Deploy the stack**

```bash
aws cloudformation deploy --region ap-south-1 --stack-name cardradar --template-file infra/cardradar.yml --capabilities CAPABILITY_IAM --parameter-overrides CreateGitHubOidcProvider=true ChatConcurrency=5
```
Change the two values if Step 4 said so.
Expected: `Successfully created/updated stack - cardradar`. The first run takes 5–10 minutes because of CloudFront.

- [ ] **Step 7: Read the outputs**

Run: `aws cloudformation describe-stacks --region ap-south-1 --stack-name cardradar --query "Stacks[0].Outputs" --output table`
Expected: a table with `SiteUrl`, `BucketName`, `DistributionId`, `ChatFunctionName` and `DeployRoleArn`. Keep it open for Task 8.

- [ ] **Step 8: Check the empty site**

Run: `curl -s -o /dev/null -w "%{http_code}\n" <SiteUrl>`
Expected: `403`. The bucket is empty until the first deploy.

- [ ] **Step 9: Commit**

```bash
git add infra/cardradar.yml
git commit -m "infra: CloudFormation stack for site, chat and deploy role"
```

---

### Task 8: Deploy workflow and go live

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: GitHub repository variables `AWS_DEPLOY_ROLE_ARN`, `SITE_BUCKET`, `DISTRIBUTION_ID` and `CHAT_FUNCTION` (the Task 7 outputs).
- Produces: every push to `main` (and a manual "Run workflow") tests, builds, uploads the site, updates the chat code and refreshes CloudFront. Plan 2 dispatches this workflow by the file name `deploy.yml`.

- [ ] **Step 1: Create the workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

concurrency: deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Test and build card data
        run: npm test
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-south-1
      - name: Upload site
        env:
          BUCKET: ${{ vars.SITE_BUCKET }}
        run: |
          aws s3 sync public/ "s3://$BUCKET" --delete --exclude "data/*"
          aws s3 sync public/data/ "s3://$BUCKET/data/" --delete --cache-control "max-age=300"
      - name: Update chat function
        env:
          FUNCTION: ${{ vars.CHAT_FUNCTION }}
        run: |
          (cd lambda/chat && zip -qr ../../chat.zip .)
          aws lambda update-function-code --function-name "$FUNCTION" --zip-file fileb://chat.zip > /dev/null
      - name: Refresh CDN cache
        env:
          DISTRIBUTION: ${{ vars.DISTRIBUTION_ID }}
        run: aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths "/*" > /dev/null
```

- [ ] **Step 2: Lint it (optional, needs Docker)**

Run (Git Bash): `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo" --workdir /repo rhysd/actionlint:latest -no-color .github/workflows/deploy.yml`
Expected: no output

- [ ] **Step 3: Add the repository variables**

On GitHub, go to the repository → **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add each one from the Task 7 outputs:

| Name | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` |
| `SITE_BUCKET` | `BucketName` |
| `DISTRIBUTION_ID` | `DistributionId` |
| `CHAT_FUNCTION` | `ChatFunctionName` |

- [ ] **Step 4: Commit, push and merge to `main`**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy the site from main"
git push -u origin HEAD
```
Open a pull request into `main` and merge it. The deploy role only trusts `main`, so deploys start from the merge.

- [ ] **Step 5: Watch the deploy**

Go to GitHub → **Actions → Deploy site**.
Expected: the run is green. The "Test and build card data" step shows `Built 154 cards and 152 crawl sources.` and `ℹ pass 23`.

- [ ] **Step 6: Check the live site**

- [ ] `<SiteUrl>` shows the landing page; `<SiteUrl>/dashboard.html` shows 154 cards with labels.
- [ ] The chat answers a question on the live site.
- [ ] `curl -sI <SiteUrl>/dashboard.html | grep -i strict-transport-security` prints the header.
- [ ] `curl -s <SiteUrl>/data/sources.json | head -c 120` starts with `{"sources":[{"id":`. Plan 2's crawler reads this file.
- [ ] Get the function URL with `aws lambda get-function-url-config --region ap-south-1 --function-name <ChatFunctionName> --query FunctionUrl --output text`. Then `curl -s -X POST <that URL> -d '{"message":"hi"}'` prints `{"reply":"Forbidden"}`, because direct calls that skip CloudFront are refused.

The site is live. Plan 2 (`docs/superpowers/plans/2026-09-22-n8n-refresh-pipeline.md`) adds the weekly refresh.
