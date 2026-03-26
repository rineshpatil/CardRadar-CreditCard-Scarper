/**
 * Credit Card Knowledge Base
 * Curated database of popular Indian credit cards with detailed benefits
 * Data sourced from official bank websites
 * 
 * Cards are organized into separate bank-specific files under ./cards/
 */

const hdfcCards = require('./cards/hdfc');
const iciciCards = require('./cards/icici');
const axisCards = require('./cards/axis');
const idfcCards = require('./cards/idfc');
const sbiCards = require('./cards/sbi');
const hsbcCards = require('./cards/hsbc');
const amexCards = require('./cards/amex');
const federalCards = require('./cards/federal');
const auCards = require('./cards/au');
const indusindCards = require('./cards/indusind');
const rblCards = require('./cards/rbl');
const idbiCards = require('./cards/idbi');
const cobrandedCards = require('./cards/cobranded');

// Combine all bank cards into a single array
const CREDIT_CARDS = [
    ...hdfcCards,
    ...iciciCards,
    ...axisCards,
    ...idfcCards,
    ...sbiCards,
    ...hsbcCards,
    ...amexCards,
    ...federalCards,
    ...auCards,
    ...indusindCards,
    ...rblCards,
    ...idbiCards,
    ...cobrandedCards
];

// ===== HELPER FUNCTIONS =====

function getAllCards() {
    return CREDIT_CARDS;
}

function getCardById(id) {
    return CREDIT_CARDS.find(card => card.id === id);
}

function getCardsByBank(bank) {
    return CREDIT_CARDS.filter(card => card.bank.toLowerCase() === bank.toLowerCase());
}

function getLTFCards() {
    return CREDIT_CARDS.filter(card => card.isLTF);
}

function getUniqueBanks() {
    return [...new Set(CREDIT_CARDS.map(card => card.bank))].sort();
}

function getCardsSummaryForLLM() {
    return CREDIT_CARDS.map(card => {
        const lines = [
            `## ${card.name}`,
            `- Bank: ${card.bank}`,
            `- Network: ${card.network}`,
            `- Type: ${card.isLTF ? 'Lifetime Free (LTF)' : 'Annual Fee Card'}`,
            `- Annual Fee: ₹${card.annualFee}`,
            `- Joining Fee: ₹${card.joiningFee}`,
            `- Reward Rate: ${card.rewardRate}`,
            `- Category: ${card.category}`,
        ];
        if (card.eligibility) {
            lines.push(`- Min Income: ₹${card.eligibility.minIncome.toLocaleString()}`);
            lines.push(`- Min Age: ${card.eligibility.minAge} years`);
        }
        const b = card.benefits;
        lines.push(`- Cashback: ${b.cashback.description}`);
        b.cashback.details.forEach(d => lines.push(`  - ${d}`));
        lines.push(`- Airport Lounge (Domestic): ${b.lounges.airport.domestic === -1 ? 'Unlimited' : b.lounges.airport.domestic === 0 ? 'None' : b.lounges.airport.domestic + ' visits'}`);
        lines.push(`- Airport Lounge (International): ${b.lounges.airport.international === -1 ? 'Unlimited' : b.lounges.airport.international === 0 ? 'None' : b.lounges.airport.international + ' visits'}`);
        lines.push(`- Railway Lounge: ${b.lounges.railway.count === 0 ? 'None' : b.lounges.railway.count + ' visits'}`);
        lines.push(`- Golf: ${b.golf.available ? 'Yes — ' + b.golf.description : 'No'}`);
        lines.push(`- Forex Markup: ${b.forex.markupFee} — ${b.forex.description}`);
        if (b.fuel) lines.push(`- Fuel: ${b.fuel.surchargeWaiver ? b.fuel.description : 'No fuel benefits'}`);
        if (b.dining) lines.push(`- Dining: ${b.dining.available ? b.dining.description : 'No dining benefits'}`);
        if (b.movies) lines.push(`- Movies: ${b.movies.available ? b.movies.description : 'No movie benefits'}`);
        if (b.other && b.other.length) lines.push(`- Other: ${b.other.join('; ')}`);
        lines.push(`- Highlights: ${card.highlights.join(', ')}`);
        if (card.applyUrl) lines.push(`- Apply URL: ${card.applyUrl}`);
        return lines.join('\n');
    }).join('\n\n');
}

module.exports = {
    CREDIT_CARDS,
    getAllCards,
    getCardById,
    getCardsByBank,
    getLTFCards,
    getUniqueBanks,
    getCardsSummaryForLLM
};
