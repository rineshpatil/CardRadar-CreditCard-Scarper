/**
 * Express Server
 * Main entry point for the CardRadar Credit Card Guide
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { categorizeCards, generateStats } = require('./analyzer');
const { getAllCards, getUniqueBanks } = require('./knowledgebase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache
let cachedCards = null;

// Initialize with knowledge base data on startup
function initializeCards() {
    const cards = getAllCards();
    // Assign default popularity based on known market perception
    const defaultPopularity = {
        'hdfc-infinia': 95, 'hdfc-diners-black': 90, 'amazon-pay-icici': 88,
        'idfc-first-select': 85, 'axis-atlas': 83, 'icici-emeralde': 80,
        'idfc-first-wealth': 78, 'scapia-federal': 75, 'idfc-first-millennia': 73,
        'au-lit': 70, 'hsbc-cashback': 68, 'swiggy-hdfc': 65,
        'indusind-tiger': 63, 'icici-sapphiro': 60, 'hsbc-travel-one': 58,
        'amex-platinum': 55, 'hdfc-regalia-gold': 53, 'marriott-bonvoy-hdfc': 50,
        'axis-neo': 48, 'hdfc-tata-neu-infinity': 45, 'idbi-euphoria': 43,
        'sbi-cashback': 40, 'rbl-shoprite': 38
    };

    for (const card of cards) {
        card.popularityScore = defaultPopularity[card.id] || 30;
    }

    cards.sort((a, b) => b.popularityScore - a.popularityScore);
    cachedCards = cards;
}

initializeCards();

// ===== API ROUTES =====

/**
 * GET /api/cards - Get all cards (optionally filtered)
 */
app.get('/api/cards', (req, res) => {
    const { filter, sort, search, bank } = req.query;
    let cards = [...cachedCards];

    // Apply search filter
    if (search) {
        const q = search.toLowerCase();
        cards = cards.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.bank.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.highlights.some(h => h.toLowerCase().includes(q))
        );
    }

    // Apply bank filter
    if (bank) {
        cards = cards.filter(c => c.bank === bank);
    }

    // Apply category filter
    if (filter) {
        const categorized = categorizeCards(cards);
        switch (filter) {
            case 'ltf': cards = categorized.ltf; break;
            case 'non-ltf': cards = categorized.nonLtf; break;
            case 'lounge': cards = categorized.withLounge; break;
            case 'railway': cards = categorized.withRailwayLounge; break;
            case 'golf': cards = categorized.withGolf; break;
            case 'cashback': cards = categorized.withCashback; break;
            case 'forex': cards = categorized.withZeroForex; break;
        }
    }

    // Apply sorting
    if (sort) {
        switch (sort) {
            case 'popularity': cards.sort((a, b) => b.popularityScore - a.popularityScore); break;
            case 'fee-low': cards.sort((a, b) => a.annualFee - b.annualFee); break;
            case 'fee-high': cards.sort((a, b) => b.annualFee - a.annualFee); break;
            case 'name': cards.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'bank': cards.sort((a, b) => a.bank.localeCompare(b.bank)); break;
        }
    }

    res.json({
        cards,
        stats: generateStats(cachedCards)
    });
});

/**
 * GET /api/cards/:id - Get a single card by ID
 */
app.get('/api/cards/:id', (req, res) => {
    const card = cachedCards.find(c => c.id === req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
});

/**
 * GET /api/banks - Get list of unique banks
 */
app.get('/api/banks', (req, res) => {
    const banks = getUniqueBanks();
    // Also include card count per bank
    const bankData = banks.map(bank => ({
        name: bank,
        cardCount: cachedCards.filter(c => c.bank === bank).length
    }));
    res.json(bankData);
});

/**
 * GET /api/stats - Get summary statistics
 */
app.get('/api/stats', (req, res) => {
    res.json(generateStats(cachedCards));
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 CardRadar — Indian Credit Card Guide running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/cards`);
    console.log(`🏦 Banks: http://localhost:${PORT}/api/banks\n`);
});
