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
    ...idbiCards
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

module.exports = {
    CREDIT_CARDS,
    getAllCards,
    getCardById,
    getCardsByBank,
    getLTFCards,
    getUniqueBanks
};
