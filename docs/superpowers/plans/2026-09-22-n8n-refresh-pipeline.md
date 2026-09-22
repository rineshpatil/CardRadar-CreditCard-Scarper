# CardRadar Weekly Refresh (n8n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Monday, re-read each card's official page with n8n on AWS Fargate. Turn every change into a GitHub pull request with quotes from the page; merging it publishes the values as verified.

**Architecture:**
- **Schedule:** EventBridge Scheduler starts a one-off Fargate task running n8n 2.39.10, with the workflow built into the image.
- **Crawl:** the workflow reads `sources.json` and `status.json` from the live site and fetches each card page. For pages that changed, it asks the LLM for values with verbatim quotes.
- **Handoff:** the workflow commits its results to a `crawl/<runId>` branch, then dispatches the `intake.yml` GitHub workflow.
- **Intake:** `scripts/intake.js` keeps only answers whose quotes are really on the page and compares them with `data/cards/`. The workflow opens one PR per changed card, commits `data/status.json`, posts a report and redeploys.

**Tech Stack:** n8n 2.39.10 (Docker), AWS ECS Fargate + EventBridge Scheduler + ECR + SSM Parameter Store (CloudFormation), GitHub Actions with the preinstalled `gh` CLI, Node.js ≥ 22 standard library.

**Spec:** `docs/superpowers/specs/2026-09-22-cardradar-aws-design.md`

**Prerequisite:** plan 1 (`docs/superpowers/plans/2026-09-22-serverless-site.md`) is done. The site is live, `<SiteUrl>/data/sources.json` loads, and `.github/workflows/deploy.yml` is on `main`.

## Global Constraints

- **n8n:** the image is pinned to `n8nio/n8n:2.39.10`. The workflow id is `cardradarRefresh`, and the container runs it by that id.
- **AWS:** region `ap-south-1`. The existing stack `cardradar` is updated, not replaced.
- **Branches and labels:**
  - Crawl branch `crawl/<runId>`, where `runId` is `YYYYMMDD-HHmm` in UTC.
  - Refresh branches `refresh/<cardId>`.
  - Labels `card-refresh` and `crawl-report`.
- **Review rules:**
  - Only merged pull requests write `verification`. The intake never removes a value.
  - A changed page that couldn't be processed keeps its old fingerprint, so it's retried the next week.
- **Secrets:**
  - The GitHub token is a fine-grained token for this repository only, with **Contents: Read and write** and **Actions: Read and write**. It is stored only in SSM `/cardradar/github-token`.
  - The LLM key is in SSM `/cardradar/llm-api-key` (from plan 1).
- **Merge points:** merge to `main` at the end of Task 3 (the intake workflow must be on `main` to be dispatched) and at the end of Task 4.

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/fields.js` | Adds `setPath` (used when applying proposals) |
| `scripts/intake.js` | Crawl results → per-card proposals, PR text, new `data/status.json`, run report |
| `test/intake.test.js` | Intake tests |
| `n8n/refresh-cards.json` | The n8n workflow (id `cardradarRefresh`) |
| `n8n/Dockerfile` | Crawler image: imports and runs the workflow once |
| `n8n/mock-apis.js` | Local stand-in for the site, the LLM and GitHub, for testing the image |
| `docs/crawler.md` | Runbook: review, settings, manual runs, editing the workflow |
| `.github/workflows/intake.yml` | Turns a crawl branch into PRs, a status commit and a report |
| `.github/workflows/crawler-image.yml` | Builds and pushes the crawler image when `n8n/` changes |
| `infra/cardradar.yml` | Adds ECR, ECS, the task definition, log group, security group and weekly schedule |

---

### Task 1: Crawl intake logic

**Files:**
- Modify: `scripts/fields.js`
- Create: `scripts/intake.js`
- Test: `test/intake.test.js`

**Interfaces:**
- Consumes: `FIELDS` and `getPath` from `scripts/fields.js`; card files in `data/cards/`; `data/status.json`.
- Consumes the crawl files that n8n writes in Task 2. This is the contract between the two:
  - `crawl/<runId>/_run.json` looks like `{ runId, startedAt, finishedAt, results: [...] }`. Each result is one of:
    - unchanged: `{ sourceId, ok: true, changed: false, hash, fetchedAt, error: null }`
    - changed: `{ sourceId, ok: true, changed: true, hash, fetchedAt, extractError: string|null, committed: boolean, commitError: string|null }`
    - failed: `{ sourceId, ok: false, changed: false, hash: null, fetchedAt, error: string }`
  - `crawl/<runId>/<sourceId>.json` looks like `{ sourceId, cardId, url, fetchedAt, hash, text, extraction: { <field>: { value, quote } } | null, extractError }`.
- Produces:
  - `setPath(obj, path, value)`, which creates missing or null parent objects on the way.
  - `validateExtraction(extraction, pageText) → { fields: { <field>: { value, quote } }, dropped: [{ field, reason }] }`
  - `diffCard(card, fields) → { proposals: [{ field, kind: 'confirm'|'change', old, value, quote, flags: string[] }], missing: string[] }`
  - `applyProposals(card, proposals, url, date) → card` (a new object)
  - `intake({ crawlDir, cardsDir, prevStatus, openPrCards }) → { proposals: [{ cardId, card, body }], status: { sources, cards }, report }`
  - CLI: `node scripts/intake.js <crawlDir> <outDir> [open-pr-card-ids.txt]` writes `<outDir>/proposals/<cardId>.json`, `<outDir>/proposals/<cardId>.md`, `<outDir>/status.json` and `<outDir>/report.md`.

- [ ] **Step 1: Write the failing test**

`test/intake.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateExtraction, diffCard, applyProposals, intake } = require('../scripts/intake');

const URL = 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/test-card';
const PAGE = 'HDFC Test Card. Annual fee: ₹2,500 + GST. Get 8   complimentary domestic lounge visits a year.';
const card = (overrides = {}) => ({
  id: 'hdfc-test', name: 'HDFC Test Credit Card', annualFee: 2500, joiningFee: null,
  benefits: null, eligibility: { minIncome: null, minAge: null }, verification: {}, ...overrides,
});
const verified = (verifiedAt = '2026-08-01') => ({ quote: 'old quote', url: URL, verifiedAt });

test('keeps values whose quote is on the page, ignoring spacing and case', () => {
  const { fields, dropped } = validateExtraction({
    annualFee: { value: 2500, quote: 'annual fee: ₹2,500 + gst' },
    loungeDomestic: { value: 8, quote: 'Get 8 complimentary domestic lounge visits' },
  }, PAGE);
  assert.deepEqual(Object.keys(fields), ['annualFee', 'loungeDomestic']);
  assert.deepEqual(dropped, []);
});

test('drops made-up quotes, invalid values and unknown fields', () => {
  const { fields, dropped } = validateExtraction({
    joiningFee: { value: 500, quote: 'Joining fee ₹500' },
    minAge: { value: 12, quote: 'HDFC Test Card' },
    cashbackRate: { value: '5%', quote: 'HDFC Test Card' },
  }, PAGE);
  assert.deepEqual(fields, {});
  assert.deepEqual(dropped.map((d) => [d.field, d.reason.split(' ')[0]]), [['joiningFee', 'quote'], ['minAge', 'invalid'], ['cashbackRate', 'unknown']]);
});

test('unverified fields are proposed for confirmation even when unchanged', () => {
  const { proposals } = diffCard(card(), { annualFee: { value: 2500, quote: 'q' } });
  assert.deepEqual(proposals.map((p) => [p.field, p.kind, p.old, p.value]), [['annualFee', 'confirm', 2500, 2500]]);
});

test('verified fields are only proposed when the value changed, with warnings', () => {
  const c = card({ verification: { annualFee: verified(), loungeDomestic: verified() }, benefits: { lounges: { airport: { domestic: 8 } } } });
  const same = diffCard(c, { annualFee: { value: 2500, quote: 'q' }, loungeDomestic: { value: 8, quote: 'q' } });
  assert.deepEqual(same.proposals, []);
  const changed = diffCard(c, { annualFee: { value: 12500, quote: 'q' }, loungeDomestic: { value: 0, quote: 'q' } });
  assert.deepEqual(changed.proposals.map((p) => [p.field, p.kind, p.flags]), [['annualFee', 'change', ['large fee change']], ['loungeDomestic', 'change', ['benefit removed']]]);
});

test('verified fields missing from the new extraction are reported, not removed', () => {
  const c = card({ verification: { annualFee: verified(), golf: verified() } });
  assert.deepEqual(diffCard(c, { annualFee: { value: 2500, quote: 'q' } }).missing, ['golf']);
});

test('applying proposals fills benefits, records the quote and drops outdated descriptions', () => {
  const c = card({ benefits: { lounges: { airport: { domestic: 4, description: '4 visits a year' } } }, verification: { loungeDomestic: verified() } });
  const next = applyProposals(c, [
    { field: 'loungeDomestic', kind: 'change', value: 8, quote: 'Get 8 complimentary domestic lounge visits' },
    { field: 'golf', kind: 'confirm', value: true, quote: 'Complimentary golf' },
  ], URL, '2026-09-21');
  assert.equal(next.benefits.lounges.airport.domestic, 8);
  assert.equal(next.benefits.lounges.airport.description, undefined);
  assert.equal(next.benefits.golf.available, true);
  assert.deepEqual(next.verification.golf, { quote: 'Complimentary golf', url: URL, verifiedAt: '2026-09-21' });
  assert.equal(c.benefits.lounges.airport.domestic, 4, 'input card is not modified');

  const fromNull = applyProposals(card(), [{ field: 'loungeInternational', kind: 'confirm', value: -1, quote: 'q' }], URL, '2026-09-21');
  assert.equal(fromNull.benefits.lounges.airport.international, -1);
});

test('a full run: proposals for changed pages, new crawl state, report', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-'));
  const crawlDir = path.join(tmp, 'crawl');
  const cardsDir = path.join(tmp, 'cards');
  fs.mkdirSync(crawlDir);
  fs.mkdirSync(cardsDir);
  fs.writeFileSync(path.join(cardsDir, 'hdfc-test.json'), JSON.stringify(card()));
  fs.writeFileSync(path.join(crawlDir, 'hdfc-test-product_page.json'), JSON.stringify({
    sourceId: 'hdfc-test-product_page', cardId: 'hdfc-test', url: URL, fetchedAt: '2026-09-21T03:10:00Z', hash: 'new', text: PAGE,
    extraction: { annualFee: { value: 2500, quote: 'Annual fee: ₹2,500 + GST' }, joiningFee: { value: 500, quote: 'not on the page' } },
  }));
  fs.writeFileSync(path.join(crawlDir, '_run.json'), JSON.stringify({
    runId: '20260921-0300',
    results: [
      { sourceId: 'hdfc-test-product_page', ok: true, changed: true, committed: true, hash: 'new', fetchedAt: '2026-09-21T03:10:00Z', extractError: null },
      { sourceId: 'same-product_page', ok: true, changed: false, hash: 'h1', fetchedAt: '2026-09-21T03:11:00Z' },
      { sourceId: 'down-product_page', ok: false, changed: false, error: '403 - Forbidden' },
      { sourceId: 'llm-product_page', ok: true, changed: true, committed: true, hash: 'h2', fetchedAt: '2026-09-21T03:12:00Z', extractError: 'Unparseable LLM output' },
    ],
  }));
  const prevStatus = {
    sources: { 'down-product_page': { hash: 'h0', lastCheckedAt: '2026-09-01T00:00:00Z', consecutiveFailures: 2, lastError: null }, 'llm-product_page': { hash: 'old', lastCheckedAt: null, consecutiveFailures: 0, lastError: null } },
    cards: { 'waiting-card': { pendingSince: '2026-09-14' }, 'closed-card': { pendingSince: '2026-09-07' } },
  };

  const { proposals, status, report } = intake({ crawlDir, cardsDir, prevStatus, openPrCards: ['waiting-card'] });

  assert.deepEqual(proposals.map((p) => p.cardId), ['hdfc-test']);
  assert.equal(proposals[0].card.verification.annualFee.verifiedAt, '2026-09-21');
  assert.match(proposals[0].body, /\| Annual fee \| ₹2,500 _\(not verified\)_ \| \*\*₹2,500\*\* \|/);
  assert.equal(status.sources['hdfc-test-product_page'].hash, 'new');
  assert.equal(status.sources['same-product_page'].lastCheckedAt, '2026-09-21T03:11:00Z');
  assert.equal(status.sources['down-product_page'].consecutiveFailures, 3);
  assert.equal(status.sources['llm-product_page'].hash, 'old', 'unprocessed page keeps its old fingerprint');
  assert.deepEqual(status.cards, { 'waiting-card': { pendingSince: '2026-09-14' }, 'hdfc-test': { pendingSince: '2026-09-21' } });
  assert.match(report, /Pages checked: 4 · unchanged: 1 · changed: 2 · failed: 2/);
  assert.match(report, /\| hdfc-test \| joiningFee \| quote not found on the page \|/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL in `test/intake.test.js` with `Cannot find module '../scripts/intake'`

- [ ] **Step 3: Add `setPath` to `scripts/fields.js`**

Replace:
```js
const getPath = (obj, path) => path.split('.').reduce((o, key) => (o == null ? undefined : o[key]), obj);
```
with:
```js
const getPath = (obj, path) => path.split('.').reduce((o, key) => (o == null ? undefined : o[key]), obj);

// Creates missing (or null) parent objects on the way, e.g. benefits: null -> { lounges: { airport: {...} } }.
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, key) => (o[key] ??= {}), obj)[last] = value;
}
```
and replace `module.exports = { FIELDS, getPath, isClaim };` with `module.exports = { FIELDS, getPath, setPath, isClaim };`

- [ ] **Step 4: Implement the intake**

`scripts/intake.js`:

```js
// Turns one crawl run (files n8n committed to branch crawl/<runId>) into reviewable changes:
//   <out>/proposals/<cardId>.json  card file with the proposed values (becomes one pull request)
//   <out>/proposals/<cardId>.md    pull request description: old → new, quote, warnings
//   <out>/status.json              new crawl state, saved as data/status.json
//   <out>/report.md                run summary, posted to the "Weekly crawl reports" issue
// Usage: node scripts/intake.js <crawlDir> <outDir> [cards-with-open-prs.txt]
const fs = require('fs');
const path = require('path');
const { FIELDS, getPath, setPath } = require('./fields');

const ROOT = path.join(__dirname, '..');

const CHECKS = {
  annualFee: (v) => Number.isInteger(v) && v >= 0 && v <= 100000,
  joiningFee: (v) => Number.isInteger(v) && v >= 0 && v <= 100000,
  rewardRate: (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 40,
  loungeDomestic: (v) => Number.isInteger(v) && v >= -1 && v <= 100,
  loungeInternational: (v) => Number.isInteger(v) && v >= -1 && v <= 100,
  golf: (v) => typeof v === 'boolean',
  forexMarkup: (v) => typeof v === 'string' && /^\d+(\.\d+)?%$/.test(v) && parseFloat(v) <= 5,
  minIncome: (v) => Number.isInteger(v) && v >= 0 && v <= 100000000,
  minAge: (v) => Number.isInteger(v) && v >= 18 && v <= 70,
};

const LABELS = {
  annualFee: 'Annual fee',
  joiningFee: 'Joining fee',
  rewardRate: 'Reward rate',
  loungeDomestic: 'Domestic lounge visits / year',
  loungeInternational: 'International lounge visits / year',
  golf: 'Golf',
  forexMarkup: 'Forex markup',
  minIncome: 'Minimum income / year',
  minAge: 'Minimum age',
};

const squash = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// Keeps only fields with a valid value AND a quote that really appears on the fetched page.
function validateExtraction(extraction, pageText) {
  const page = squash(pageText);
  const fields = {};
  const dropped = [];
  for (const [field, item] of Object.entries(extraction || {})) {
    if (!(field in FIELDS)) dropped.push({ field, reason: 'unknown field' });
    else if (!item || !CHECKS[field](item.value)) dropped.push({ field, reason: `invalid value ${JSON.stringify(item?.value)}` });
    else if (typeof item.quote !== 'string' || !item.quote.trim() || !page.includes(squash(item.quote))) dropped.push({ field, reason: 'quote not found on the page' });
    else fields[field] = { value: item.value, quote: item.quote.trim() };
  }
  return { fields, dropped };
}

function flagsFor(field, oldValue, newValue) {
  const flags = [];
  const fee = field === 'annualFee' || field === 'joiningFee';
  if (fee && oldValue > 0 && (newValue === 0 || newValue > oldValue * 3 || newValue * 3 < oldValue)) flags.push('large fee change');
  if ((field === 'loungeDomestic' || field === 'loungeInternational') && oldValue && newValue === 0) flags.push('benefit removed');
  if (field === 'golf' && oldValue === true && newValue === false) flags.push('benefit removed');
  return flags;
}

// Unverified field -> "confirm" (even if the value matches), verified field with a new value -> "change".
// Verified fields the page no longer mentions are reported as missing, never removed automatically.
function diffCard(card, fields) {
  const proposals = [];
  for (const [field, { value, quote }] of Object.entries(fields)) {
    const old = getPath(card, FIELDS[field]) ?? null;
    const verified = Boolean(card.verification[field]);
    if (verified && JSON.stringify(old) === JSON.stringify(value)) continue;
    proposals.push({ field, kind: verified ? 'change' : 'confirm', old, value, quote, flags: flagsFor(field, old, value) });
  }
  const missing = Object.keys(card.verification).filter((f) => !(f in fields));
  return { proposals, missing };
}

function applyProposals(card, proposals, url, date) {
  const next = structuredClone(card);
  for (const p of proposals) {
    setPath(next, FIELDS[p.field], p.value);
    // The old free-text description would contradict the new number; the site falls back to the number.
    const parent = getPath(next, FIELDS[p.field].split('.').slice(0, -1).join('.'));
    if (p.kind === 'change' && parent && typeof parent === 'object' && parent !== next) delete parent.description;
    next.verification[p.field] = { quote: p.quote, url, verifiedAt: date };
  }
  return next;
}

function show(field, v) {
  if (v === null || v === undefined) return '—';
  if (field === 'annualFee' || field === 'joiningFee' || field === 'minIncome') return `₹${v.toLocaleString('en-IN')}`;
  if (field.startsWith('lounge')) return v === -1 ? 'Unlimited' : String(v);
  if (field === 'golf') return v ? 'Yes' : 'No';
  return String(v);
}
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function prBody(card, proposals, missing, crawl) {
  const rows = proposals.map((p) => {
    const now = `${show(p.field, p.old)}${p.kind === 'confirm' ? ' _(not verified)_' : ''}`;
    const proposed = `**${show(p.field, p.value)}**${p.flags.length ? ` ⚠️ ${p.flags.join(', ')}` : ''}`;
    return `| ${LABELS[p.field]} | ${now} | ${proposed} | “${cell(p.quote)}” |`;
  });
  return [
    `Proposed updates for **${card.name}** from the weekly crawl.`,
    '',
    `Source: ${crawl.url} (fetched ${crawl.fetchedAt.slice(0, 10)})`,
    '',
    '| Field | On the site now | Proposed | Quote from the bank page |',
    '|---|---|---|---|',
    ...rows,
    '',
    ...(missing.length ? [`⚠️ Verified before but not found on the page this time: ${missing.map((f) => LABELS[f]).join(', ')}. Check whether the bank dropped them.`, ''] : []),
    `**To review:** compare each value with its quote. If the AI misread something, edit \`data/cards/${card.id}.json\` in this pull request before merging, and fix any description or highlight that still mentions an old value. Merge to publish, close to reject.`,
    '',
  ].join('\n');
}

function reportMd(runId, counts, proposals, failed, rejected, notFound) {
  const lines = [
    `## Crawl ${runId}`,
    '',
    `Pages checked: ${counts.checked} · unchanged: ${counts.unchanged} · changed: ${counts.changed} · failed: ${failed.length}`,
    '',
    proposals.length ? `Pull requests opened or updated: ${proposals.map((p) => p.cardId).join(', ')}` : 'No card changes to review this week.',
  ];
  if (failed.length) {
    lines.push('', '### Pages that could not be checked', '', '| Source | Problem | Failures in a row |', '|---|---|---|');
    failed.forEach((f) => lines.push(`| ${f.sourceId} | ${cell(f.error)} | ${f.failures} |`));
  }
  if (rejected.length) {
    lines.push('', '### AI answers that were thrown away', '', '| Card | Field | Why |', '|---|---|---|');
    rejected.forEach((r) => lines.push(`| ${r.cardId} | ${r.field} | ${cell(r.reason)} |`));
  }
  if (notFound.length) {
    lines.push('', '### Verified values no longer found on a changed page', '');
    notFound.forEach((n) => lines.push(`- ${n.cardId}: ${n.missing.map((f) => LABELS[f]).join(', ')}`));
  }
  return lines.join('\n') + '\n';
}

function intake({ crawlDir, cardsDir, prevStatus = {}, openPrCards = [] }) {
  const run = readJson(path.join(crawlDir, '_run.json'));
  const sources = { ...prevStatus.sources };
  const pending = {};
  for (const id of openPrCards) {
    const since = prevStatus.cards?.[id]?.pendingSince;
    if (since) pending[id] = { pendingSince: since };
  }
  const proposals = [];
  const failed = [];
  const rejected = [];
  const notFound = [];
  const counts = { checked: run.results.length, unchanged: 0, changed: 0 };

  for (const r of run.results) {
    const s = { hash: null, lastCheckedAt: null, consecutiveFailures: 0, lastError: null, ...sources[r.sourceId] };
    const file = path.join(crawlDir, `${r.sourceId}.json`);
    if (!r.ok) {
      s.consecutiveFailures += 1;
      s.lastError = r.error || 'fetch failed';
      failed.push({ sourceId: r.sourceId, error: s.lastError, failures: s.consecutiveFailures });
    } else if (!r.changed) {
      counts.unchanged += 1;
      Object.assign(s, { lastCheckedAt: r.fetchedAt, consecutiveFailures: 0, lastError: null });
    } else {
      counts.changed += 1;
      const problem = r.extractError || r.commitError || (!r.committed || !fs.existsSync(file) ? 'crawl file was not saved' : null);
      if (problem) {
        // Keep the old fingerprint so the page is processed again next week.
        s.lastError = problem;
        failed.push({ sourceId: r.sourceId, error: problem, failures: s.consecutiveFailures });
      } else {
        const crawl = readJson(file);
        const cardFile = path.join(cardsDir, `${crawl.cardId}.json`);
        if (fs.existsSync(cardFile)) {
          const card = readJson(cardFile);
          const { fields, dropped } = validateExtraction(crawl.extraction, crawl.text);
          dropped.forEach((d) => rejected.push({ cardId: card.id, ...d }));
          const diff = diffCard(card, fields);
          const date = crawl.fetchedAt.slice(0, 10);
          if (diff.proposals.length) {
            // ponytail: one source per card, so one proposal set per card per run; merge sets if cards get more sources.
            proposals.push({ cardId: card.id, card: applyProposals(card, diff.proposals, crawl.url, date), body: prBody(card, diff.proposals, diff.missing, crawl) });
            pending[card.id] = { pendingSince: date };
          } else if (diff.missing.length) {
            notFound.push({ cardId: card.id, missing: diff.missing });
          }
        }
        Object.assign(s, { hash: r.hash, lastCheckedAt: r.fetchedAt, consecutiveFailures: 0, lastError: null });
      }
    }
    sources[r.sourceId] = s;
  }

  return { proposals, status: { sources, cards: pending }, report: reportMd(run.runId, counts, proposals, failed, rejected, notFound) };
}

if (require.main === module) {
  const [crawlDir, outDir, openPrsFile] = process.argv.slice(2);
  if (!crawlDir || !outDir) {
    console.error('Usage: node scripts/intake.js <crawlDir> <outDir> [cards-with-open-prs.txt]');
    process.exit(1);
  }
  const statusFile = path.join(ROOT, 'data', 'status.json');
  const prevStatus = fs.existsSync(statusFile) ? readJson(statusFile) : {};
  const openPrCards = openPrsFile && fs.existsSync(openPrsFile) ? fs.readFileSync(openPrsFile, 'utf8').split(/\s+/).filter(Boolean) : [];
  const { proposals, status, report } = intake({ crawlDir, cardsDir: path.join(ROOT, 'data', 'cards'), prevStatus, openPrCards });
  fs.mkdirSync(path.join(outDir, 'proposals'), { recursive: true });
  for (const p of proposals) {
    fs.writeFileSync(path.join(outDir, 'proposals', `${p.cardId}.json`), `${JSON.stringify(p.card, null, 2)}\n`);
    fs.writeFileSync(path.join(outDir, 'proposals', `${p.cardId}.md`), p.body);
  }
  fs.writeFileSync(path.join(outDir, 'status.json'), `${JSON.stringify(status, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  console.log(`${proposals.length} card(s) with proposed changes; report written to ${path.join(outDir, 'report.md')}`);
}

module.exports = { validateExtraction, diffCard, applyProposals, intake };
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test`
Expected: `ℹ tests 30`, `ℹ pass 30`, `ℹ fail 0`

- [ ] **Step 6: Commit**

```bash
git add scripts/fields.js scripts/intake.js test/intake.test.js
git commit -m "feat: turn crawl results into reviewable card proposals"
```

---

### Task 2: n8n workflow and crawler image, tested locally

The workflow was checked against n8n 2.39.10 using the fake APIs below. Each node's job:
- **Get status / Get sources:** read the crawler state and source list from the site. A missing `status.json` counts as the first run.
- **Get main ref / Create crawl branch:** create `crawl/<runId>` from `main`.
- **Loop sources:** one source at a time. It goes through **Throttle** (2 s), then **Fetch page** (3 tries), then **Clean and hash**, then **Changed?**.
- For a changed page: **Build LLM request**, then **Extract with LLM**, then **Parse LLM output**, then **Commit crawl file**.
- **Run summary**, then **Commit run summary** (`_run.json`), then **Dispatch intake**.

**Files:**
- Create: `n8n/refresh-cards.json`, `n8n/Dockerfile`, `n8n/mock-apis.js`, `docs/crawler.md`

**Interfaces:**
- Consumes environment variables:
  - `SITE_URL`: serves `/data/status.json` and `/data/sources.json`, as produced by plan 1's build.
  - `GITHUB_API`, `GITHUB_REPO`, `GITHUB_TOKEN`
  - `LLM_URL`, `LLM_MODEL`, `LLM_API_KEY` (OpenAI-compatible chat completions)
- Produces: the crawl files described in Task 1, then `POST /repos/<repo>/actions/workflows/intake.yml/dispatches` with `{ ref: "main", inputs: { run_id } }`. The container exits `0` on success and `1` if the run failed.

- [ ] **Step 1: Create the workflow**

`n8n/refresh-cards.json`:

```json
{
  "id": "cardradarRefresh",
  "name": "CardRadar weekly refresh",
  "active": false,
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "parameters": {},
      "id": "a6122a65-eaa6-76f7-00ae-68d393054a37",
      "position": [
        0,
        0
      ]
    },
    {
      "name": "Run setup",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": "const now = new Date().toISOString();\nreturn [{ json: { runId: now.slice(0, 16).replace(/[-:]/g, '').replace('T', '-'), startedAt: now } }];"
      },
      "id": "b4abcf7c-4419-8601-ace7-14b6ff021711",
      "position": [
        220,
        0
      ]
    },
    {
      "name": "Get status",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "url": "={{ $env.SITE_URL }}/data/status.json"
      },
      "onError": "continueRegularOutput",
      "alwaysOutputData": true,
      "id": "1de25014-a78a-f737-6e7d-35235586fd6c",
      "position": [
        440,
        0
      ]
    },
    {
      "name": "Get sources",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "url": "={{ $env.SITE_URL }}/data/sources.json"
      },
      "id": "29754965-372a-7ce7-8f01-38df7b5a2540",
      "position": [
        660,
        0
      ]
    },
    {
      "name": "Get main ref",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "url": "={{ $env.GITHUB_API }}/repos/{{ $env.GITHUB_REPO }}/git/ref/heads/main",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.GITHUB_TOKEN }}"
            },
            {
              "name": "Accept",
              "value": "application/vnd.github+json"
            },
            {
              "name": "X-GitHub-Api-Version",
              "value": "2022-11-28"
            },
            {
              "name": "User-Agent",
              "value": "cardradar-n8n"
            }
          ]
        }
      },
      "id": "b9d73a26-9755-3aa0-446f-562a2f20c479",
      "position": [
        880,
        0
      ]
    },
    {
      "name": "Create crawl branch",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "method": "POST",
        "url": "={{ $env.GITHUB_API }}/repos/{{ $env.GITHUB_REPO }}/git/refs",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.GITHUB_TOKEN }}"
            },
            {
              "name": "Accept",
              "value": "application/vnd.github+json"
            },
            {
              "name": "X-GitHub-Api-Version",
              "value": "2022-11-28"
            },
            {
              "name": "User-Agent",
              "value": "cardradar-n8n"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ ref: 'refs/heads/crawl/' + $('Run setup').first().json.runId, sha: $json.object.sha }) }}"
      },
      "id": "81b947ec-6c09-f2e9-1507-8e06622ba3f2",
      "position": [
        1100,
        0
      ]
    },
    {
      "name": "Plan",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": "const { runId } = $('Run setup').first().json;\nconst status = $('Get status').first().json;\nconst prev = (status && status.sources) || {};\nreturn $('Get sources').first().json.sources.map((s) => ({\n  json: { sourceId: s.id, cardId: s.cardId, cardName: s.cardName, url: s.url, kind: s.kind, runId, prevHash: prev[s.id] ? prev[s.id].hash : null },\n}));"
      },
      "id": "0b6cbdf7-ad29-2807-8f16-00a3e8979485",
      "position": [
        1320,
        0
      ]
    },
    {
      "name": "Loop sources",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "id": "27bff591-f8aa-a239-fb5b-faa8ed09741a",
      "position": [
        1540,
        0
      ]
    },
    {
      "name": "Throttle",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1.1,
      "parameters": {
        "amount": 2
      },
      "id": "e8aa0585-ad36-d76c-5b79-4fef4fe88857",
      "position": [
        1760,
        200
      ]
    },
    {
      "name": "Fetch page",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {
          "timeout": 30000,
          "response": {
            "response": {
              "responseFormat": "text"
            }
          }
        },
        "url": "={{ $json.url }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
            },
            {
              "name": "Accept-Language",
              "value": "en-IN,en;q=0.9"
            }
          ]
        }
      },
      "onError": "continueRegularOutput",
      "retryOnFail": true,
      "maxTries": 3,
      "waitBetweenTries": 5000,
      "id": "1c52f659-7173-5552-c957-5fbdd5f614fa",
      "position": [
        1980,
        200
      ]
    },
    {
      "name": "Clean and hash",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const src = $('Throttle').item.json;\nconst fetchedAt = new Date().toISOString();\nif ($json.error) {\n  return { json: { ...src, ok: false, changed: false, fetchedAt, error: String($json.error.message || $json.error) } };\n}\nconst decode = (s) => s\n  .replace(/&#(\\d+);/g, (_, n) => String.fromCodePoint(Number(n)))\n  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))\n  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')\n  .replace(/&quot;/g, '\"').replace(/&#39;|&apos;/g, \"'\").replace(/&[a-z]+;/gi, ' ');\nconst text = decode(String($json.data || '')\n  .replace(/<(script|style|noscript|svg|iframe|head|nav|footer)\\b[\\s\\S]*?<\\/\\1>/gi, ' ')\n  .replace(/<!--[\\s\\S]*?-->/g, ' ')\n  .replace(/<[^>]+>/g, ' '))\n  .replace(/\\s+/g, ' ')\n  .trim()\n  .slice(0, 60000);\nconst hash = require('crypto').createHash('sha256').update(text).digest('hex');\nreturn { json: { ...src, ok: true, fetchedAt, text, hash, changed: hash !== src.prevHash } };"
      },
      "id": "c32600ac-36b0-07f0-77cd-29223981fd6c",
      "position": [
        2200,
        200
      ]
    },
    {
      "name": "Changed?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "changed",
              "leftValue": "={{ $json.changed }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "b028b171-76ab-3041-04b6-102a7dba448a",
      "position": [
        2420,
        200
      ]
    },
    {
      "name": "Build LLM request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const SYSTEM = \"You read one Indian credit card web page and extract facts about ONE named card.\\nReturn ONLY a JSON object, no prose. For every field below that the page states for this card, return\\n{\\\"value\\\": <value>, \\\"quote\\\": \\\"<short exact text copied from the page that states it>\\\"}.\\nLeave a field out if the page does not state it. Never guess or use outside knowledge.\\nFields:\\n- annualFee: integer rupees per year after the first year, excluding GST; 0 if lifetime free\\n- joiningFee: integer rupees, excluding GST; 0 if none\\n- rewardRate: base reward rate on regular spends as a percentage string, e.g. \\\"3.3%\\\"\\n- loungeDomestic: domestic airport lounge visits per year as an integer; -1 if unlimited; 0 if none\\n- loungeInternational: international airport lounge visits per year as an integer; -1 if unlimited; 0 if none\\n- golf: true if complimentary golf games or lessons are offered, false if the page says there are none\\n- forexMarkup: foreign currency markup as a percentage string, e.g. \\\"3.5%\\\"\\n- minIncome: minimum annual income in rupees as an integer (salaried if both are given)\\n- minAge: minimum age in years as an integer\";\nreturn { json: { ...$json, llmBody: {\n  model: $env.LLM_MODEL,\n  temperature: 0,\n  max_tokens: 1500,\n  messages: [\n    { role: 'system', content: SYSTEM },\n    { role: 'user', content: 'Card: ' + $json.cardName + '\\nPage: ' + $json.url + '\\n\\n' + $json.text },\n  ],\n} } };"
      },
      "id": "8a95cb05-6a74-300a-810b-0daa4bf81e5f",
      "position": [
        2640,
        100
      ]
    },
    {
      "name": "Extract with LLM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {
          "timeout": 120000
        },
        "method": "POST",
        "url": "={{ $env.LLM_URL }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.LLM_API_KEY }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.llmBody) }}"
      },
      "onError": "continueRegularOutput",
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 10000,
      "id": "5212300e-3239-2462-e7ba-2fa7ad87a22c",
      "position": [
        2860,
        100
      ]
    },
    {
      "name": "Parse LLM output",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const src = $('Build LLM request').item.json;\nlet extraction = null;\nlet extractError = null;\nif ($json.error) {\n  extractError = String($json.error.message || $json.error);\n} else {\n  try {\n    const content = $json.choices[0].message.content;\n    extraction = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));\n  } catch (e) {\n    extractError = 'Unparseable LLM output: ' + e.message;\n  }\n}\nconst file = { sourceId: src.sourceId, cardId: src.cardId, url: src.url, fetchedAt: src.fetchedAt, hash: src.hash, text: src.text, extraction, extractError };\nreturn { json: {\n  path: 'crawl/' + src.runId + '/' + src.sourceId + '.json',\n  content: Buffer.from(JSON.stringify(file, null, 1)).toString('base64'),\n  result: { sourceId: src.sourceId, ok: true, changed: true, hash: src.hash, fetchedAt: src.fetchedAt, extractError },\n} };"
      },
      "id": "b1514a44-3a39-d741-d3b3-4dc92f1b7763",
      "position": [
        3080,
        100
      ]
    },
    {
      "name": "Commit crawl file",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "method": "PUT",
        "url": "={{ $env.GITHUB_API }}/repos/{{ $env.GITHUB_REPO }}/contents/{{ $json.path }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.GITHUB_TOKEN }}"
            },
            {
              "name": "Accept",
              "value": "application/vnd.github+json"
            },
            {
              "name": "X-GitHub-Api-Version",
              "value": "2022-11-28"
            },
            {
              "name": "User-Agent",
              "value": "cardradar-n8n"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ message: 'crawl: ' + $json.result.sourceId, content: $json.content, branch: 'crawl/' + $('Run setup').first().json.runId }) }}"
      },
      "onError": "continueRegularOutput",
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 5000,
      "id": "dac2c46b-368b-91e9-cfea-ea1a49e561a9",
      "position": [
        3300,
        100
      ]
    },
    {
      "name": "Changed result",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "const { result } = $('Parse LLM output').item.json;\nconst commitError = $json.error ? String($json.error.message || $json.error) : null;\nreturn { json: { ...result, committed: !commitError, commitError } };"
      },
      "id": "065f804d-167f-93e7-4a79-4e869c7c6c3d",
      "position": [
        3520,
        100
      ]
    },
    {
      "name": "Unchanged result",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": "return { json: { sourceId: $json.sourceId, ok: $json.ok, changed: false, hash: $json.hash || null, fetchedAt: $json.fetchedAt, error: $json.error || null } };"
      },
      "id": "04350859-3849-dd3f-5409-3c171dad03c3",
      "position": [
        2640,
        340
      ]
    },
    {
      "name": "Run summary",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": "const { runId, startedAt } = $('Run setup').first().json;\nconst summary = { runId, startedAt, finishedAt: new Date().toISOString(), results: $input.all().map((i) => i.json) };\nreturn [{ json: { runId, total: summary.results.length, content: Buffer.from(JSON.stringify(summary, null, 1)).toString('base64') } }];"
      },
      "id": "cbc612cf-a70b-3396-9a81-4a283e5d9809",
      "position": [
        1760,
        -220
      ]
    },
    {
      "name": "Commit run summary",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "method": "PUT",
        "url": "={{ $env.GITHUB_API }}/repos/{{ $env.GITHUB_REPO }}/contents/crawl/{{ $json.runId }}/_run.json",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.GITHUB_TOKEN }}"
            },
            {
              "name": "Accept",
              "value": "application/vnd.github+json"
            },
            {
              "name": "X-GitHub-Api-Version",
              "value": "2022-11-28"
            },
            {
              "name": "User-Agent",
              "value": "cardradar-n8n"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ message: 'crawl: run summary', content: $json.content, branch: 'crawl/' + $json.runId }) }}"
      },
      "retryOnFail": true,
      "maxTries": 3,
      "waitBetweenTries": 5000,
      "id": "cd55ebdb-5c2e-0984-ce91-a699312754c9",
      "position": [
        1980,
        -220
      ]
    },
    {
      "name": "Dispatch intake",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "parameters": {
        "options": {},
        "method": "POST",
        "url": "={{ $env.GITHUB_API }}/repos/{{ $env.GITHUB_REPO }}/actions/workflows/intake.yml/dispatches",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.GITHUB_TOKEN }}"
            },
            {
              "name": "Accept",
              "value": "application/vnd.github+json"
            },
            {
              "name": "X-GitHub-Api-Version",
              "value": "2022-11-28"
            },
            {
              "name": "User-Agent",
              "value": "cardradar-n8n"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ ref: 'main', inputs: { run_id: $('Run setup').first().json.runId } }) }}"
      },
      "retryOnFail": true,
      "maxTries": 3,
      "waitBetweenTries": 5000,
      "id": "ea04f56f-909b-2d7c-3a14-902bebb679a1",
      "position": [
        2200,
        -220
      ]
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "Run setup",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Run setup": {
      "main": [
        [
          {
            "node": "Get status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get status": {
      "main": [
        [
          {
            "node": "Get sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get sources": {
      "main": [
        [
          {
            "node": "Get main ref",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get main ref": {
      "main": [
        [
          {
            "node": "Create crawl branch",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Create crawl branch": {
      "main": [
        [
          {
            "node": "Plan",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Plan": {
      "main": [
        [
          {
            "node": "Loop sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Loop sources": {
      "main": [
        [
          {
            "node": "Run summary",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Throttle",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Throttle": {
      "main": [
        [
          {
            "node": "Fetch page",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch page": {
      "main": [
        [
          {
            "node": "Clean and hash",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Clean and hash": {
      "main": [
        [
          {
            "node": "Changed?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Changed?": {
      "main": [
        [
          {
            "node": "Build LLM request",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Unchanged result",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build LLM request": {
      "main": [
        [
          {
            "node": "Extract with LLM",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract with LLM": {
      "main": [
        [
          {
            "node": "Parse LLM output",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse LLM output": {
      "main": [
        [
          {
            "node": "Commit crawl file",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Commit crawl file": {
      "main": [
        [
          {
            "node": "Changed result",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Changed result": {
      "main": [
        [
          {
            "node": "Loop sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Unchanged result": {
      "main": [
        [
          {
            "node": "Loop sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Run summary": {
      "main": [
        [
          {
            "node": "Commit run summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Commit run summary": {
      "main": [
        [
          {
            "node": "Dispatch intake",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

- [ ] **Step 2: Create the image definition**

`n8n/Dockerfile`:

```dockerfile
# Weekly CardRadar crawl: loads the workflow into a throwaway n8n, runs it once, then exits.
FROM n8nio/n8n:2.39.10

COPY refresh-cards.json /home/node/refresh-cards.json

# The workflow reads its settings and secrets from environment variables and hashes pages with crypto.
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
    NODE_FUNCTION_ALLOW_BUILTIN=crypto \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false

# n8n prints the whole run's data; keep the log short and pass on n8n's exit code (1 = failed run).
ENTRYPOINT ["sh", "-c", "n8n import:workflow --input=/home/node/refresh-cards.json && n8n execute --id=cardradarRefresh > /tmp/run.log 2>&1; code=$?; grep -m1 -E 'Execution was successful|Execution error' /tmp/run.log; tail -c 2000 /tmp/run.log; exit $code"]
```

- [ ] **Step 3: Create the fake APIs for local testing**

`n8n/mock-apis.js`:

````js
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
````

- [ ] **Step 4: Create the runbook**

`docs/crawler.md`:

````markdown
# Weekly crawler

Every Monday at 03:00 IST, EventBridge Scheduler starts a Fargate task in `ap-south-1`. The task runs the n8n workflow in `n8n/refresh-cards.json` once and exits:

1. It reads `data/sources.json` and `data/status.json` from the live site.
2. It creates the branch `crawl/<runId>` from `main`.
3. It fetches each card page, 2 seconds apart. Scripts, menus and footers are removed and the page text is fingerprinted.
4. Pages whose fingerprint changed are sent to the LLM. The LLM returns the card's fees, rates, lounges, golf, forex markup and eligibility, each with an exact quote from the page.
5. It commits one file per changed page plus `_run.json` to the crawl branch, then starts the **Intake crawl results** GitHub workflow.

The intake workflow (`scripts/intake.js`) then does the following:
- It throws away any AI answer whose quote isn't on the page.
- It opens or updates one pull request per changed card.
- It saves `data/status.json` and posts a report on the **Weekly crawl reports** issue.
- It deletes the crawl branch and redeploys the site.

## Reviewing a card pull request

- Each row shows the value on the site now, the proposed value and the quote it came from.
- ⚠️ marks large fee changes and removed benefits.
- If the AI misread something, edit `data/cards/<id>.json` in the pull request (the ✏️ button on GitHub), then merge.
- Close the pull request to reject it. The same page won't be proposed again until it changes.
- Merging publishes the values with a ✅ Verified label.

## Settings

| Variable | Where it's set | Value |
|---|---|---|
| `SITE_URL` | task definition | the CloudFront URL |
| `GITHUB_API`, `GITHUB_REPO` | task definition | `https://api.github.com`, `owner/repo` |
| `LLM_URL`, `LLM_MODEL` | task definition | NVIDIA NIM chat completions URL, `moonshotai/kimi-k2.5` |
| `LLM_API_KEY` | SSM `/cardradar/llm-api-key` | LLM key (shared with the chat) |
| `GITHUB_TOKEN` | SSM `/cardradar/github-token` | fine-grained token for this repository: Contents and Actions, read and write |

To change a task-definition value, edit `infra/cardradar.yml` and redeploy the stack. To change a secret, run:

```bash
aws ssm put-parameter --region ap-south-1 --name /cardradar/github-token --type SecureString --overwrite --value "<new token>"
```

## Run a crawl now

```bash
aws ecs run-task --region ap-south-1 --cluster <CrawlerCluster> --launch-type FARGATE --task-definition <CrawlerTaskDefinition> --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<CrawlerSecurityGroup>],assignPublicIp=ENABLED}"
```

The values in `<…>` are stack outputs (`aws cloudformation describe-stacks --region ap-south-1 --stack-name cardradar --query "Stacks[0].Outputs"`) and one of the subnet IDs the stack was deployed with. To watch a run:

```bash
aws logs tail /cardradar/crawler --region ap-south-1 --follow
```

## Edit the workflow

1. Start n8n locally:

   ```bash
   docker run -it --rm -p 5678:5678 -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false -e NODE_FUNCTION_ALLOW_BUILTIN=crypto n8nio/n8n:2.39.10
   ```

2. Open http://localhost:5678, then go to **Workflows → Import from File** and choose `n8n/refresh-cards.json`.
3. Edit, then download the workflow and overwrite `n8n/refresh-cards.json`. Keep `"id": "cardradarRefresh"`, because the container runs the workflow by that id.
4. Test the image against the fake APIs (below), then merge to `main`. The **Build crawler image** workflow pushes the new image, and the next run uses it.

## Test the image locally

In one terminal, run `node n8n/mock-apis.js`. In another:

```bash
docker build -t cardradar-crawler n8n
docker run --rm --add-host=host.docker.internal:host-gateway -e SITE_URL=http://host.docker.internal:8787 -e LLM_URL=http://host.docker.internal:8787/v1/chat/completions -e LLM_API_KEY=test -e LLM_MODEL=test -e GITHUB_API=http://host.docker.internal:8787 -e GITHUB_REPO=o/r -e GITHUB_TOKEN=test cardradar-crawler
```

Expected result:
- The container prints `Execution was successful` and exits with code 0.
- The mock prints two page fetches, two LLM calls and two committed crawl files, and three `404 GET /page/missing` lines (the retries).
- It also prints the committed run summary with 3 results, and `204 POST …/intake.yml/dispatches`.
````

- [ ] **Step 5: Run the image against the fake APIs**

In terminal 1, run: `node n8n/mock-apis.js`

In terminal 2:
```bash
docker build -t cardradar-crawler n8n
docker run --rm --add-host=host.docker.internal:host-gateway -e SITE_URL=http://host.docker.internal:8787 -e LLM_URL=http://host.docker.internal:8787/v1/chat/completions -e LLM_API_KEY=test -e LLM_MODEL=test -e GITHUB_API=http://host.docker.internal:8787 -e GITHUB_REPO=o/r -e GITHUB_TOKEN=test cardradar-crawler
echo "exit=$?"
```
Expected in terminal 2: `Successfully imported 1 workflow.`, then `Execution was successful:`, then `exit=0`.

Expected in terminal 1, in this order (`<runId>` is the current UTC time):
```
403 GET /data/status.json
200 GET /data/sources.json
200 GET /repos/o/r/git/ref/heads/main
201 POST /repos/o/r/git/refs
200 GET /page/infinia
200 POST /v1/chat/completions
    -> crawl/<runId>: hdfc-infinia-product_page
201 PUT /repos/o/r/contents/crawl/<runId>/hdfc-infinia-product_page.json
200 GET /page/regalia
200 POST /v1/chat/completions
    -> crawl/<runId>: hdfc-regalia-product_page
201 PUT /repos/o/r/contents/crawl/<runId>/hdfc-regalia-product_page.json
404 GET /page/missing
404 GET /page/missing
404 GET /page/missing
    -> crawl/<runId>: run summary (3 results)
201 PUT /repos/o/r/contents/crawl/<runId>/_run.json
204 POST /repos/o/r/actions/workflows/intake.yml/dispatches
```
Stop the fake APIs with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add n8n docs/crawler.md
git commit -m "feat: n8n weekly crawl workflow and crawler image"
```

---

### Task 3: Intake workflow on GitHub, with a dry run

**Files:**
- Create: `.github/workflows/intake.yml`

**Interfaces:**
- Consumes: the `run_id` input (from n8n's dispatch); the branch `crawl/<run_id>`; `scripts/intake.js` (Task 1).
- Produces:
  - A branch `refresh/<cardId>` and an open PR labelled `card-refresh` per changed card. An existing open PR is updated rather than duplicated.
  - A commit `chore: crawl status <run_id>` on `main`.
  - A comment on the open issue labelled `crawl-report`.
  - The crawl branch deleted, and `deploy.yml` dispatched.

- [ ] **Step 1: Create the workflow**

`.github/workflows/intake.yml`:

```yaml
name: Intake crawl results

on:
  workflow_dispatch:
    inputs:
      run_id:
        description: Crawl run id (the crawler pushes branch crawl/<run_id>)
        required: true

permissions:
  contents: write
  pull-requests: write
  issues: write
  actions: write

concurrency: intake

jobs:
  intake:
    runs-on: ubuntu-latest
    env:
      RUN_ID: ${{ inputs.run_id }}
      GH_TOKEN: ${{ github.token }}
    steps:
      - name: Check run id
        run: |
          [[ "$RUN_ID" =~ ^[0-9]{8}-[0-9]{4}$ ]] || { echo "Bad run id: $RUN_ID"; exit 1; }
          echo "OUT=$RUNNER_TEMP/out" >> "$GITHUB_ENV"
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Fetch crawl results
        run: |
          git fetch origin "crawl/$RUN_ID"
          git archive FETCH_HEAD "crawl/$RUN_ID" | tar -x -C "$RUNNER_TEMP"
      - name: List cards that already have an open refresh pull request
        run: |
          gh label create card-refresh --color 0e8a16 --description "Card data proposed by the weekly crawl" --force
          gh pr list --label card-refresh --state open --limit 500 --json headRefName \
            --jq '.[].headRefName | ltrimstr("refresh/")' > "$RUNNER_TEMP/open-prs.txt"
      - name: Build proposals
        run: node scripts/intake.js "$RUNNER_TEMP/crawl/$RUN_ID" "$OUT" "$RUNNER_TEMP/open-prs.txt"
      - name: Open or update one pull request per card
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          for file in "$OUT"/proposals/*.json; do
            [ -e "$file" ] || continue
            id=$(basename "$file" .json)
            branch="refresh/$id"
            git checkout -B "$branch" origin/main
            cp "$file" "data/cards/$id.json"
            git add "data/cards/$id.json"
            git commit -m "refresh($id): changes found by crawl $RUN_ID"
            git push --force origin "$branch"
            pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number')
            if [ -n "$pr" ]; then
              gh pr edit "$pr" --body-file "$OUT/proposals/$id.md"
            else
              gh pr create --base main --head "$branch" --label card-refresh \
                --title "Card refresh: $id" --body-file "$OUT/proposals/$id.md"
            fi
            sleep 2 # stay under GitHub's content-creation rate limit
          done
      - name: Save crawl status
        run: |
          git checkout main
          git pull --rebase origin main
          cp "$OUT/status.json" data/status.json
          git add data/status.json
          if git commit -m "chore: crawl status $RUN_ID"; then git push origin main; fi
      - name: Post run report
        run: |
          gh label create crawl-report --color 1d76db --description "Weekly crawl summaries" --force
          issue=$(gh issue list --label crawl-report --state open --json number --jq '.[0].number')
          if [ -z "$issue" ]; then
            issue=$(gh issue create --title "Weekly crawl reports" --label crawl-report \
              --body "Each weekly crawl posts its summary here." | grep -o '[0-9]*$')
          fi
          gh issue comment "$issue" --body-file "$OUT/report.md"
      - name: Delete crawl branch and redeploy
        run: |
          git push origin --delete "crawl/$RUN_ID"
          gh workflow run deploy.yml --ref main
```

- [ ] **Step 2: Lint it**

Run (Git Bash): `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo" --workdir /repo rhysd/actionlint:latest -no-color .github/workflows/intake.yml`
Expected: no output

- [ ] **Step 3: Let Actions open pull requests**

On GitHub, go to the repository → **Settings → Actions → General → Workflow permissions**. Tick **Allow GitHub Actions to create and approve pull requests**, then click **Save**.

- [ ] **Step 4: Commit and merge to `main`**

```bash
git add .github/workflows/intake.yml
git commit -m "ci: intake workflow for crawl results"
git push -u origin HEAD
```
Open a pull request into `main` and merge it. A dispatched workflow must already be on `main`.

- [ ] **Step 5: Create a dry-run crawl branch**

```bash
git fetch origin && git switch -c crawl/20260101-0000 origin/main
mkdir -p crawl/20260101-0000
cat > crawl/20260101-0000/hdfc-regalia-gold-product_page.json <<'EOF'
{
  "sourceId": "hdfc-regalia-gold-product_page",
  "cardId": "hdfc-regalia-gold",
  "url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-gold-credit-card",
  "fetchedAt": "2026-01-01T00:00:00.000Z",
  "hash": "dry-run",
  "text": "DRY RUN - not a real page. Annual fee: ₹2,500 + GST.",
  "extraction": { "annualFee": { "value": 2500, "quote": "Annual fee: ₹2,500 + GST" } },
  "extractError": null
}
EOF
cat > crawl/20260101-0000/_run.json <<'EOF'
{
  "runId": "20260101-0000",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "finishedAt": "2026-01-01T00:01:00.000Z",
  "results": [
    { "sourceId": "hdfc-regalia-gold-product_page", "ok": true, "changed": true, "committed": true, "hash": "dry-run", "fetchedAt": "2026-01-01T00:00:00.000Z", "extractError": null, "commitError": null }
  ]
}
EOF
node scripts/intake.js crawl/20260101-0000 "$TEMP/intake-dry-run"
```
Expected: `1 card(s) with proposed changes; …`. The file `$TEMP/intake-dry-run/proposals/hdfc-regalia-gold.md` contains the row `| Annual fee | ₹2,500 _(not verified)_ | **₹2,500** | “Annual fee: ₹2,500 + GST” |`.

Then push the branch:
```bash
git add crawl && git commit -m "test: intake dry run" && git push origin crawl/20260101-0000
git switch -
```

- [ ] **Step 6: Run the intake on GitHub**

Go to GitHub → **Actions → Intake crawl results → Run workflow**. Pick branch `main` and set `run_id` = `20260101-0000`.

Expected:
- The run is green.
- An open PR **Card refresh: hdfc-regalia-gold**, labelled `card-refresh`, with the table row from Step 5.
- A commit **chore: crawl status 20260101-0000** on `main`.
- An issue **Weekly crawl reports** with a comment starting `## Crawl 20260101-0000`.
- The branch `crawl/20260101-0000` is gone, and a **Deploy site** run has started.

- [ ] **Step 7: Clean up the dry run**

Close the test PR **without merging**, because its page text is made up, and delete its branch. Then reset the crawl state:
```bash
git switch main && git pull
printf '{\n  "sources": {},\n  "cards": {}\n}\n' > data/status.json
git add data/status.json && git commit -m "chore: reset crawl status after dry run" && git push origin main
```
Expected: a new **Deploy site** run goes green.

---

### Task 4: Crawler on AWS

**Files:**
- Replace: `infra/cardradar.yml`
- Create: `.github/workflows/crawler-image.yml`

**Interfaces:**
- Consumes: plan 1's stack; the SSM parameters `/cardradar/llm-api-key` and `/cardradar/github-token`; the default VPC's public subnets.
- Produces: stack outputs `CrawlerRepositoryUri`, `CrawlerCluster`, `CrawlerTaskDefinition` and `CrawlerSecurityGroup`; the repository variable `CRAWLER_REPOSITORY_URI`; a schedule that runs every Monday at 03:00 IST; and the image `<CrawlerRepositoryUri>:latest`.

- [ ] **Step 1: Create the GitHub token for the crawler**

On GitHub, go to your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
- **Name:** `cardradar-crawler`
- **Expiration:** 1 year (set a reminder to rotate it)
- **Repository access:** Only select repositories → this repository
- **Permissions:** Contents: **Read and write**, Actions: **Read and write** (Metadata: read is added automatically)

Copy the token and store it (run this yourself):
```bash
aws ssm put-parameter --region ap-south-1 --name /cardradar/github-token --type SecureString --value "<token>"
```
Expected: `{ "Version": 1, "Tier": "Standard" }`

- [ ] **Step 2: Replace `infra/cardradar.yml`**

The template keeps everything from plan 1 and adds:
- the crawler parameters (`GitHubTokenParameter`, `VpcId`, `SubnetIds`)
- ECR push rights for the deploy role
- the crawler resources and their outputs

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CardRadar - static site (S3 + CloudFront), chat Lambda, weekly n8n crawler, GitHub deploy role

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
  GitHubTokenParameter:
    Type: String
    Default: /cardradar/github-token
    Description: SSM SecureString parameter holding the GitHub token the crawler uses to commit results
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC for the crawler task (the default VPC is fine)
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Public subnets in that VPC (the crawler gets a public IP, so no NAT gateway is needed)

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
              - Effect: Allow
                Action: ecr:GetAuthorizationToken
                Resource: '*'
              - Effect: Allow
                Action:
                  - ecr:BatchCheckLayerAvailability
                  - ecr:BatchGetImage
                  - ecr:CompleteLayerUpload
                  - ecr:GetDownloadUrlForLayer
                  - ecr:InitiateLayerUpload
                  - ecr:PutImage
                  - ecr:UploadLayerPart
                Resource: !GetAtt CrawlerRepository.Arn

  CrawlerRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: !Sub '${AWS::StackName}-crawler'
      EmptyOnDelete: true
      LifecyclePolicy:
        LifecyclePolicyText: '{"rules":[{"rulePriority":1,"description":"Keep the last 5 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}'

  CrawlerLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/${AWS::StackName}/crawler'
      RetentionInDays: 30

  CrawlerCluster:
    Type: AWS::ECS::Cluster

  CrawlerExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: read-crawler-secrets
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: ssm:GetParameters
                Resource:
                  - !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter${LlmApiKeyParameter}'
                  - !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter${GitHubTokenParameter}'

  CrawlerTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub '${AWS::StackName}-crawler'
      RequiresCompatibilities: [FARGATE]
      NetworkMode: awsvpc
      Cpu: '1024'
      Memory: '2048'
      RuntimePlatform:
        CpuArchitecture: X86_64
        OperatingSystemFamily: LINUX
      ExecutionRoleArn: !GetAtt CrawlerExecutionRole.Arn
      ContainerDefinitions:
        - Name: n8n
          Image: !Sub '${CrawlerRepository.RepositoryUri}:latest'
          Essential: true
          Environment:
            - Name: SITE_URL
              Value: !Sub 'https://${Distribution.DomainName}'
            - Name: GITHUB_API
              Value: https://api.github.com
            - Name: GITHUB_REPO
              Value: !Ref GitHubRepo
            - Name: LLM_URL
              Value: https://integrate.api.nvidia.com/v1/chat/completions
            - Name: LLM_MODEL
              Value: moonshotai/kimi-k2.5
          Secrets:
            - Name: LLM_API_KEY
              ValueFrom: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter${LlmApiKeyParameter}'
            - Name: GITHUB_TOKEN
              ValueFrom: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter${GitHubTokenParameter}'
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref CrawlerLogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: n8n

  CrawlerSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: CardRadar crawler - outbound only
      VpcId: !Ref VpcId

  SchedulerRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: scheduler.amazonaws.com
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                aws:SourceAccount: !Ref AWS::AccountId
      Policies:
        - PolicyName: run-crawler
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: ecs:RunTask
                Resource: !Sub 'arn:aws:ecs:${AWS::Region}:${AWS::AccountId}:task-definition/${AWS::StackName}-crawler:*'
              - Effect: Allow
                Action: iam:PassRole
                Resource: !GetAtt CrawlerExecutionRole.Arn

  WeeklyCrawl:
    Type: AWS::Scheduler::Schedule
    Properties:
      Description: CardRadar weekly crawl, Mondays 03:00 IST
      ScheduleExpression: cron(0 3 ? * MON *)
      ScheduleExpressionTimezone: Asia/Kolkata
      FlexibleTimeWindow:
        Mode: 'OFF'
      Target:
        Arn: !GetAtt CrawlerCluster.Arn
        RoleArn: !GetAtt SchedulerRole.Arn
        RetryPolicy:
          MaximumRetryAttempts: 0
        EcsParameters:
          TaskDefinitionArn: !Ref CrawlerTaskDefinition
          LaunchType: FARGATE
          NetworkConfiguration:
            AwsvpcConfiguration:
              AssignPublicIp: ENABLED
              Subnets: !Ref SubnetIds
              SecurityGroups:
                - !GetAtt CrawlerSecurityGroup.GroupId

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
  CrawlerRepositoryUri:
    Value: !GetAtt CrawlerRepository.RepositoryUri
  CrawlerCluster:
    Value: !Ref CrawlerCluster
  CrawlerTaskDefinition:
    Value: !Ref CrawlerTaskDefinition
  CrawlerSecurityGroup:
    Value: !GetAtt CrawlerSecurityGroup.GroupId
```

- [ ] **Step 3: Lint it**

Run: `cfn-lint --regions ap-south-1 -- infra/cardradar.yml`
Expected: no output

- [ ] **Step 4: Find the default VPC and its subnets**

```bash
aws ec2 describe-vpcs --region ap-south-1 --filters Name=is-default,Values=true --query "Vpcs[0].VpcId" --output text
aws ec2 describe-subnets --region ap-south-1 --filters Name=default-for-az,Values=true --query "Subnets[].SubnetId" --output text
```
Expected: a `vpc-…` id and two or three `subnet-…` ids. If the first command prints `None`, run `aws ec2 create-default-vpc --region ap-south-1`, then repeat both commands.

- [ ] **Step 5: Update the stack**

Parameters you don't pass keep their current values.
```bash
aws cloudformation deploy --region ap-south-1 --stack-name cardradar --template-file infra/cardradar.yml --capabilities CAPABILITY_IAM --parameter-overrides VpcId=<vpc-id> SubnetIds=<subnet-a>,<subnet-b>,<subnet-c>
```
Expected: `Successfully created/updated stack - cardradar`

- [ ] **Step 6: Read the new outputs and add the repository variable**

Run: `aws cloudformation describe-stacks --region ap-south-1 --stack-name cardradar --query "Stacks[0].Outputs" --output table`

On GitHub, go to **Settings → Secrets and variables → Actions → Variables**. Add `CRAWLER_REPOSITORY_URI` with the `CrawlerRepositoryUri` value.

- [ ] **Step 7: Create the image workflow**

`.github/workflows/crawler-image.yml`:

```yaml
name: Build crawler image

on:
  push:
    branches: [main]
    paths: ['n8n/**']
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ap-south-1
      - uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push
        env:
          IMAGE: ${{ vars.CRAWLER_REPOSITORY_URI }}:latest
        run: |
          docker build -t "$IMAGE" n8n
          docker push "$IMAGE"
```

- [ ] **Step 8: Lint, commit and merge**

Run: `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo" --workdir /repo rhysd/actionlint:latest -no-color .github/workflows/crawler-image.yml`
Expected: no output
```bash
git add infra/cardradar.yml .github/workflows/crawler-image.yml
git commit -m "infra: weekly n8n crawler on Fargate"
git push -u origin HEAD
```
Open a pull request into `main` and merge it. If **Actions → Build crawler image** doesn't start by itself, open it and click **Run workflow** on `main`.
Expected: the run is green.

- [ ] **Step 9: Check the image and the schedule**

```bash
aws ecr describe-images --region ap-south-1 --repository-name cardradar-crawler --query "imageDetails[].imageTags" --output text
aws scheduler list-schedules --region ap-south-1 --query "Schedules[].[Name,State]" --output text
```
Expected: `latest`, and one schedule named `cardradar-WeeklyCrawl-…` in state `ENABLED`.

---

### Task 5: First real crawl and review

- [ ] **Step 1: Start a crawl now**

Using the Task 4 outputs and one subnet id:
```bash
aws ecs run-task --region ap-south-1 --cluster <CrawlerCluster> --launch-type FARGATE --task-definition <CrawlerTaskDefinition> --network-configuration "awsvpcConfiguration={subnets=[<subnet-a>],securityGroups=[<CrawlerSecurityGroup>],assignPublicIp=ENABLED}"
```
Expected: JSON with `"lastStatus": "PROVISIONING"` and no `failures`.

- [ ] **Step 2: Follow it**

Run: `aws logs tail /cardradar/crawler --region ap-south-1 --follow`
Expected: `Successfully imported 1 workflow.`, then `Execution was successful:` when it finishes. The first run treats every page as new (about 150 LLM calls), so allow 1–2 hours.

If the task stops right away, check it with `aws ecs describe-tasks --region ap-south-1 --cluster <CrawlerCluster> --tasks <taskArn> --query "tasks[0].stoppedReason"`:
- `CannotPullContainerError` means the image wasn't pushed (redo Task 4, Step 8).
- `ResourceInitializationError … secrets` means an SSM parameter name is wrong (Task 4, Step 1, or plan 1's Task 7, Step 5).

- [ ] **Step 3: Check GitHub**

Expected:
- **Actions → Intake crawl results** is green.
- About 150 open pull requests are labelled `card-refresh`, one per card page that was read.
- The **Weekly crawl reports** issue has a new comment with the page counts and any failures.

- [ ] **Step 4: Review and merge the first cards**

Start with popular cards (for example `hdfc-infinia`, `axis-atlas`, `sbi-cashback`). For each one:
1. Open the card's official page.
2. Compare every proposed value with its quote.
3. Fix misreads by editing the card file in the PR, then merge.

Expected: each merge starts **Deploy site**. In the live popup, the merged values show "ⓘ Source" quotes. When every value a card claims is quoted, its label becomes `Verified · <Mon YYYY>`.

- [ ] **Step 5: Act on the report**

- **Pages that could not be checked** (often bot protection): these cards stay unverified. After 3 failed weeks, any verified values show "May be outdated". If the bank has a different official page for the card, update `sources[0].url` in the card file.
- **Many "Unparseable LLM output" answers:** in n8n, raise `max_tokens` in the **Build LLM request** node, or set a different `LLM_MODEL` in `infra/cardradar.yml` (see `docs/crawler.md`).
- **Verified values no longer found:** open the bank page and edit the card by hand if the benefit is gone.

- [ ] **Step 6: Confirm the schedule the next Monday**

Expected: a new comment on **Weekly crawl reports** after 03:00 IST. Only pages that changed produce pull requests.
