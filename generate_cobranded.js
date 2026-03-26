/**
 * Script to generate cards/cobranded.js from India_Credit_Cards_Database.xlsx
 * Only includes cards NOT already in the existing knowledgebase.
 */
const xlsx = require('xlsx');
const kb = require('./knowledgebase');

const wb = xlsx.readFile('India_Credit_Cards_Database.xlsx');
const ltfData = xlsx.utils.sheet_to_json(wb.Sheets['LTF Cards']);
const nonLtfData = xlsx.utils.sheet_to_json(wb.Sheets['Non-LTF Cards']);

const allExcel = [
  ...ltfData.map(r => ({ ...r, isLTF: true })),
  ...nonLtfData.map(r => ({ ...r, isLTF: false }))
];

// Existing card names (lowercase)
const existingNames = kb.CREDIT_CARDS.map(c => c.name.toLowerCase().trim());

// Filter out duplicates
const newCards = allExcel.filter(r => !existingNames.includes(r['Card Name'].toLowerCase().trim()));

console.log(`Found ${newCards.length} new cards to add.`);

// Generate ID from card name
function makeId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generate default benefits based on category
function generateBenefits(card) {
  const cat = (card.Category || '').toLowerCase();
  const isTravel = cat.includes('travel') || cat.includes('airline');
  const isCashback = cat.includes('cashback') || cat.includes('shopping') || cat.includes('online');
  const isPremium = cat.includes('premium') || cat.includes('super') || cat.includes('ultra');
  const isDining = cat.includes('dining') || cat.includes('restaurant') || cat.includes('grocery');
  const isFuel = cat.includes('fuel');
  const isReward = cat.includes('reward') || cat.includes('lifestyle');
  const isEntry = cat.includes('entry') || cat.includes('secured') || cat.includes('credit builder');

  const domesticLounge = isPremium ? (cat.includes('super') ? -1 : 12) : (isTravel ? 8 : (isReward ? 4 : 0));
  const intlLounge = isPremium ? (cat.includes('super') ? -1 : 6) : (isTravel ? 4 : 0);

  return {
    cashback: {
      description: isCashback ? 'Cashback on select categories' : (isReward ? 'Reward points on spends' : 'Rewards on spends'),
      details: isCashback
        ? ['Cashback on online and partner merchants', 'Cashback credited as statement credit', 'Monthly cashback cap applies', 'Higher cashback on select categories']
        : ['Reward points on all spends', 'Bonus points on select categories', 'Points redeemable for vouchers/travel', 'Welcome bonus on first spend']
    },
    lounges: {
      airport: { domestic: domesticLounge, international: intlLounge, description: domesticLounge === -1 ? 'Unlimited lounge access' : domesticLounge > 0 ? `${domesticLounge} domestic + ${intlLounge} international lounge visits/year` : 'No lounge access' },
      railway: { count: isTravel || isPremium ? 2 : 0, description: isTravel || isPremium ? 'Railway lounge access available' : 'No railway lounge' }
    },
    golf: { available: isPremium, description: isPremium ? 'Complimentary golf rounds at partner courses' : 'No golf benefits' },
    fuel: { surchargeWaiver: !isEntry, description: !isEntry ? '1% fuel surcharge waiver' : 'No fuel benefits' },
    dining: { available: isDining || isPremium || isReward, description: isDining ? 'Enhanced rewards on dining & groceries' : (isPremium ? 'Privileges at select restaurants' : (isReward ? 'Offers at partner restaurants' : 'No dining benefits')) },
    movies: { available: isCashback || isReward, description: isCashback || isReward ? 'Offers on movie bookings' : 'No movie benefits' },
    forex: { markupFee: isTravel || isPremium ? '2%' : '3.5%', description: isTravel || isPremium ? '2% forex markup' : '3.5% forex markup' },
    other: generateOtherBenefits(card, cat)
  };
}

function generateOtherBenefits(card, cat) {
  const other = [];
  if (cat.includes('co-brand') || cat.includes('airline')) other.push('Co-branded rewards with partner brand');
  if (card.isLTF) other.push('Lifetime free — no annual fee');
  else other.push(`Annual fee: ₹${card['Annual Fee (₹)'] || 'N/A'}`);
  other.push(`Category: ${card.Category}`);
  return other;
}

function getMinIncome(card, cat) {
  if (cat.includes('super') || cat.includes('ultra')) return 1800000;
  if (cat.includes('premium') || cat.includes('invite')) return 1200000;
  if (cat.includes('travel') || cat.includes('airline')) return 600000;
  if (cat.includes('lifestyle') || cat.includes('reward')) return 400000;
  return 300000;
}

function generateHighlights(card, cat) {
  const h = [];
  if (cat.includes('cashback') || cat.includes('shopping')) h.push('Cashback on purchases');
  if (cat.includes('travel') || cat.includes('airline')) h.push('Travel benefits');
  if (cat.includes('premium') || cat.includes('super')) h.push('Premium perks');
  if (cat.includes('reward') || cat.includes('lifestyle')) h.push('Lifestyle rewards');
  if (cat.includes('dining')) h.push('Dining rewards');
  if (cat.includes('fuel')) h.push('Fuel benefits');
  if (cat.includes('upi')) h.push('UPI-linked rewards');
  if (card.isLTF) h.push('Lifetime Free');
  if (h.length === 0) h.push(card.Category);
  return h.slice(0, 3);
}

// Build card objects
const cardObjects = newCards.map(row => {
  const cat = (row.Category || '').toLowerCase();
  const fee = row.isLTF ? 0 : (parseInt(row['Annual Fee (₹)']) || 0);
  return {
    id: makeId(row['Card Name']),
    name: row['Card Name'],
    bank: row.Bank,
    network: row.Network || 'Visa',
    isLTF: row.isLTF,
    annualFee: fee,
    joiningFee: fee,
    rewardRate: cat.includes('cashback') ? '1-5%' : (cat.includes('reward') ? '1-3%' : '1%'),
    category: row.Category || 'General',
    applyUrl: row['Apply Link'] || null,
    image: null,
    benefits: generateBenefits(row),
    eligibility: { minIncome: getMinIncome(row, cat), minAge: 21 },
    highlights: generateHighlights(row, cat),
    isCoBranded: true
  };
});

// Generate JS module
let output = '/**\n * Co-Branded and Additional Credit Cards\n * Auto-generated from India_Credit_Cards_Database.xlsx\n */\n\nmodule.exports = [\n';

cardObjects.forEach((card, i) => {
  output += '    ' + JSON.stringify(card);
  if (i < cardObjects.length - 1) output += ',';
  output += '\n';
});

output += '];\n';

const fs = require('fs');
fs.writeFileSync('./cards/cobranded.js', output, 'utf8');
console.log(`Generated cards/cobranded.js with ${cardObjects.length} cards.`);
