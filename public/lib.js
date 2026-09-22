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
