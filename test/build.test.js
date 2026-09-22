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
  assert.equal(describe(card(), pending, NOW).hasPendingChanges, false, 'a card that was never verified stays unverified');
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

  const status = { sources: { 'hdfc-test-product_page': { hash: 'abc', lastCheckedAt: '2026-09-21T03:00:00Z', consecutiveFailures: 0, lastError: null } }, cards: {} };
  fs.writeFileSync(path.join(root, 'data', 'status.json'), JSON.stringify(status));
  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-popular.json'), JSON.stringify(card({ id: 'hdfc-popular', name: 'HDFC Popular Credit Card', popularityScore: 90, applyUrl: `${URL}-2`, sources: [{ kind: 'product_page', url: `${URL}-2` }] })));
  build({ root, now: NOW });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'status.json'), 'utf8')), status, 'crawl state is published for the crawler');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'cards.json'), 'utf8')).map((c) => c.id), ['hdfc-popular', 'hdfc-test'], 'cards are ordered by popularity');

  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-popular.json'), JSON.stringify(card({ id: 'hdfc-popular', name: 'HDFC Popular Credit Card' })));
  assert.throws(() => build({ root, now: NOW }), /already used by/, 'two cards may not share a crawl source');
  fs.rmSync(path.join(root, 'data', 'cards', 'hdfc-popular.json'));

  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-test.json'), JSON.stringify(card({ tier: 'gold' })));
  assert.throws(() => build({ root, now: NOW }), /tier must be one of/);

  fs.writeFileSync(path.join(root, 'data', 'cards', 'hdfc-test.json'), JSON.stringify(card({ sources: null })));
  assert.throws(() => build({ root, now: NOW }), /sources must be a list/, 'a malformed sources field is reported, not a crash');
});
