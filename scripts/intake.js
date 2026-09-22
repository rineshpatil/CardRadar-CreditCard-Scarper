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
  // A fee that trebles, disappears, or appears on a card that had none is what a reviewer must look at.
  const feeJump = oldValue > 0 ? newValue === 0 || newValue > oldValue * 3 || newValue * 3 < oldValue : newValue > 0;
  if (fee && Number.isInteger(oldValue) && feeJump) flags.push('large fee change');
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
    return `| ${LABELS[p.field]} | ${cell(now)} | ${cell(proposed)} | "${cell(p.quote)}" |`;
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
    failed.forEach((f) => lines.push(`| ${cell(f.sourceId)} | ${cell(f.error)} | ${f.failures} |`));
  }
  if (rejected.length) {
    lines.push('', '### AI answers that were thrown away', '', '| Card | Field | Why |', '|---|---|---|');
    rejected.forEach((r) => lines.push(`| ${cell(r.cardId)} | ${cell(r.field)} | ${cell(r.reason)} |`));
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
