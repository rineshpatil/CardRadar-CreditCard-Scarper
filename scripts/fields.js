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
