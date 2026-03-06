/**
 * Express Server
 * Main entry point for the CardRadar Credit Card Guide
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { categorizeCards, generateStats } = require('./analyzer');
const { getAllCards, getUniqueBanks, getCardsSummaryForLLM } = require('./knowledgebase');
const OpenAI = require('openai');

// ===== OPENAI (NVIDIA NIM) SETUP =====
const API_KEY = process.env.API_KEY;
let openaiClient = null;
try {
    openaiClient = new OpenAI({
        apiKey: API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    console.log('✅ OpenAI Client (NVIDIA NIM) loaded');
} catch (err) {
    console.warn('⚠️ OpenAI Client not available:', err.message);
}

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

// ===== CHAT API =====

/**
 * POST /api/chat - AI chatbot for credit card queries
 */
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!openaiClient) {
        return res.status(503).json({
            reply: 'AI assistant is not configured properly.'
        });
    }

    try {
        const cardData = getCardsSummaryForLLM();

        const systemPrompt = `You are CardRadar AI — a friendly, knowledgeable credit card advisor for Indian credit cards. You ONLY answer questions related to the credit cards listed on the CardRadar website.

Here is the COMPLETE database of credit cards available on CardRadar:

${cardData}

RULES:
1. ONLY answer questions about the credit cards listed above.
2. If the user asks about a card NOT in the database, say "That card is not currently listed on CardRadar."
3. If the user asks something unrelated to credit cards, politely redirect them: "I'm CardRadar AI — I specialize in Indian credit cards! Ask me about card benefits, fees, eligibility, lounge access, cashback, or which card is best for you."
4. When recommending cards, consider the user's needs (salary/income, spending habits, travel frequency, etc.).
5. Be concise but thorough. Use bullet points and emojis to make responses easy to read.
6. Always mention the card name and bank.
7. If a card has an apply URL, mention the user can find the apply link on CardRadar.
8. For salary-based recommendations: match the user's income against the minIncome eligibility of cards.
9. Format currency in Indian Rupees (₹).`;

        // Build conversation history for OpenAI
        const chatMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'assistant', content: 'Understood! I am CardRadar AI, ready to help with Indian credit card queries based on the CardRadar database. How can I help you?' }
        ];

        if (history && history.length > 0) {
            history.forEach(msg => {
                chatMessages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        chatMessages.push({ role: 'user', content: message });

        const completion = await openaiClient.chat.completions.create({
            model: "moonshotai/kimi-k2.5",
            messages: chatMessages,
            temperature: 0.2,
            max_tokens: 1024,
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });
    } catch (err) {
        console.error('Chat API error:', err);
        res.status(500).json({ reply: 'Sorry, I encountered an error. Please try again.' });
    }
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
