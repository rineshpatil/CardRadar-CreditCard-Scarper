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
