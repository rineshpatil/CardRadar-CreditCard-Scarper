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
