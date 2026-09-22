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
