/**
 * Analyzer Module
 * Processes and categorizes credit card data
 */

const { getAllCards, CREDIT_CARDS } = require('./knowledgebase');

/**
 * Filter and categorize cards
 */
function categorizeCards(cards) {
    return {
        ltf: cards.filter(c => c.isLTF),
        nonLtf: cards.filter(c => !c.isLTF),
        withLounge: cards.filter(c =>
            c.benefits.lounges.airport.domestic !== 0 ||
            c.benefits.lounges.airport.international !== 0
        ),
        withRailwayLounge: cards.filter(c => c.benefits.lounges.railway.count !== 0),
        withGolf: cards.filter(c => c.benefits.golf.available),
        withCashback: cards.filter(c =>
            c.category === 'Cashback' ||
            c.benefits.cashback.description.toLowerCase().includes('cashback')
        ),
        withZeroForex: cards.filter(c => c.benefits.forex.markupFee === '0%'),
        all: cards
    };
}

/**
 * Generate summary statistics
 */
function generateStats(cards) {
    const categorized = categorizeCards(cards);
    const banks = [...new Set(cards.map(c => c.bank))];
    return {
        totalCards: cards.length,
        ltfCount: categorized.ltf.length,
        nonLtfCount: categorized.nonLtf.length,
        withLoungeCount: categorized.withLounge.length,
        withRailwayLoungeCount: categorized.withRailwayLounge.length,
        withGolfCount: categorized.withGolf.length,
        withCashbackCount: categorized.withCashback.length,
        withZeroForexCount: categorized.withZeroForex.length,
        totalBanks: banks.length
    };
}

module.exports = { categorizeCards, generateStats };
