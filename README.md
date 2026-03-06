# 💳 CardRadar — Indian Credit Card Guide

A sleek, dark-themed dashboard to discover, compare, and apply for the best credit cards in India. Filter by bank, benefits (lounge, golf, cashback, forex), and card type (LTF vs Premium).

![Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v18+-green) ![Express](https://img.shields.io/badge/Express-4.x-blue)

## ✨ Features

- **22+ Credit Cards** — Curated from official bank websites with accurate benefits
- **Bank-Based Filtering** — Browse cards by bank (HDFC, ICICI, Axis, SBI, IDFC FIRST, etc.)
- **Benefit Filters** — Filter by LTF, Lounge Access, Railway Lounge, Golf, Cashback, Zero Forex
- **Smart Search** — Search across card names, banks, categories, and highlights
- **Sorting** — Sort by popularity, fee, bank, or name
- **Card Detail Modal** — View full benefits: rewards, lounge access, golf, dining, movies, forex, eligibility
- **Apply Now** — Direct links to official bank application pages
- **Responsive Design** — Works on desktop and mobile
- **Dark Theme** — Premium glassmorphism UI with smooth animations

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/rineshpatil/CardRadar-CreditCard-Scarper.git
cd CardRadar-CreditCard-Scarper

# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cards` | GET | Get all cards (supports `filter`, `sort`, `search`, `bank` query params) |
| `/api/cards/:id` | GET | Get a single card by ID |
| `/api/banks` | GET | Get all banks with card counts |
| `/api/stats` | GET | Get summary statistics |

### Query Parameters for `/api/cards`

| Param | Values | Example |
|-------|--------|---------|
| `filter` | `ltf`, `non-ltf`, `lounge`, `railway`, `golf`, `cashback`, `forex` | `?filter=ltf` |
| `sort` | `popularity`, `fee-low`, `fee-high`, `bank`, `name` | `?sort=fee-low` |
| `search` | Any text | `?search=hdfc` |
| `bank` | Bank name | `?bank=HDFC%20Bank` |

## 🏗️ Tech Stack

- **Backend** — Node.js + Express
- **Frontend** — Vanilla HTML/CSS/JS
- **Styling** — Custom CSS with CSS variables, glassmorphism, Inter font
- **Data** — Curated knowledge base from official bank websites

## 📁 Project Structure

```
├── server.js              # Express server with API routes
├── knowledgebase.js        # Credit card database (22+ cards)
├── analyzer.js             # Card categorization and stats
├── package.json
├── .gitignore
└── public/
    ├── index.html          # Dashboard HTML
    ├── app.js              # Frontend logic
    └── styles.css          # Dark theme styles
```

## 🏦 Supported Banks

HDFC Bank • ICICI Bank • Axis Bank • IDFC FIRST Bank • SBI Card • HSBC • American Express • Federal Bank • AU Small Finance Bank • IndusInd Bank • RBL Bank • IDBI Bank

## 📄 License

MIT License

Copyright (c) 2025 Rinesh Patil

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Built with ❤️ | Data sourced from official bank websites
