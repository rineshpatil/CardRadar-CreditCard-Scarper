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

// Card finder quiz. answers: { income (₹/year), spend: online|travel|dining|fuel|everyday, maxFee (₹), lounge (bool) }.
// Drops cards the user can't get or doesn't want to pay for, then ranks by how well the card fits.
const text = (c) => [c.name, c.category, ...(c.highlights || []), c.benefits?.cashback?.description || ''].join(' ').toLowerCase();
const SPEND = {
  online: { test: (c) => /online|shopping|amazon|flipkart|myntra|e-?commerce|cashback/.test(text(c)), why: 'Rewards online shopping' },
  travel: { test: (c) => FILTERS.lounge(c) || /travel|miles|air|flight|hotel|forex/.test(text(c)), why: 'Built for travel' },
  dining: { test: (c) => c.benefits?.dining?.available === true || /dining|swiggy|zomato|food|restaurant/.test(text(c)), why: 'Dining benefits' },
  fuel: { test: (c) => c.benefits?.fuel?.surchargeWaiver === true || /fuel|petrol|bpcl|hpcl|indianoil|iocl/.test(text(c)), why: 'Saves on fuel' },
  everyday: { test: (c) => /cashback|rewards|everyday|all spends/.test(text(c)), why: 'Good on everyday spends' },
};

function recommend(cards, { income = 0, spend = 'everyday', maxFee = Infinity, lounge = false } = {}, limit = 5) {
  return cards
    .filter((c) => c.eligibility?.minIncome == null || c.eligibility.minIncome <= income)
    .filter((c) => (c.isLTF ? 0 : c.annualFee) <= maxFee)
    .map((c) => {
      const reasons = [];
      let score = (c.popularityScore || 0) / 10;
      if (SPEND[spend]?.test(c)) { score += 10; reasons.push(SPEND[spend].why); }
      if (lounge && FILTERS.lounge(c)) { score += 6; reasons.push('Airport lounge access'); }
      if (c.isLTF) { score += 2; reasons.push('Lifetime free'); }
      if (c.benefits?.forex?.markupFee === '0%' && spend === 'travel') { score += 3; reasons.push('Zero forex markup'); }
      if (c.verificationStatus === 'verified') { score += 2; reasons.push('Details verified'); }
      return { card: c, score, reasons };
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name))
    .slice(0, limit);
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
  module.exports = { escapeHtml, safeUrl, FILTERS, queryCards, computeStats, bankCounts, monthYear, verificationBadge, renderMarkdown, recommend };
}
