# CardRadar — Product Specification

- **Date:** 2026-09-28
- **Status:** Draft for review
- **Owner:** Rinesh Patil
- **Builds on:** [AWS design spec](superpowers/specs/2026-09-22-cardradar-aws-design.md) (hosting, data, weekly refresh)

## 1. What CardRadar is

CardRadar helps people in India choose a credit card. It lists the country's cards with their fees, rewards and benefits, shows the bank's own card photo, lets people compare cards side by side, recommends cards from a short quiz, and offers an AI assistant that answers questions using only CardRadar's card data.

The card catalog, comparison of 2 cards and the quiz are free for everyone. The AI assistant and comparing up to 4 cards are paid (CardRadar PRO).

## 2. Who it is for

| Person | Needs | What CardRadar gives them |
|---|---|---|
| **First-time applicant** (student, first job, ₹3–6 L income) | A card they can actually get, no annual fee, simple explanations | Lifetime-free filter, quiz filtered by income, entry and secured cards |
| **Everyday spender** (₹6–25 L) | The best card for their biggest spend (online, fuel, dining, travel) | Filters by benefit, quiz ranked by spend, 2-card compare |
| **Premium / HNI user** (₹25 L+) | Lounges, golf, forex, reward value vs fee, invite-only cards | Premium and super-premium tiers, lounge and forex data, 4-card compare (PRO), AI assistant (PRO) |

## 3. Goals and non-goals

**Goals**

1. A visitor finds a suitable card within 2 minutes (quiz or filters).
2. Every fee and benefit shown traces back to the bank's official page, with a visible "Verified / Unverified / May be outdated" label.
3. Only cards a bank is still offering are listed.
4. The AI assistant earns enough through PRO subscriptions to cover its running cost.

**Non-goals (this release)**

- Applying for a card inside CardRadar (we link to the bank's page).
- Affiliate or referral links.
- Credit score checks or storing anything beyond an email address and subscription status.
- Mobile apps (the site works on phones).

## 4. Features

Status: ✅ built and tested locally · 🟡 built, needs setup before launch · ⬜ not built

### 4.1 Card catalog — ✅

- 143 cards from 25 banks, one data file per card in `data/cards/`.
- Each card shows: bank photo (103 cards) or a generated neon card face (40), bank, network, LTF/Premium badge, verification badge, annual fee, 8 benefit icons with tooltips, top 3 highlights, category and reward rate.
- Main cards and co-branded cards are shown in separate sections.
- **Filters:** bank chips, search, All / LTF / Premium / Lounge / Railway / Golf / Cashback / Zero Forex, tier, "Verified only".
- **Sort:** popularity (verified first), fee low→high, fee high→low, name, bank.
- **Card details:** a popup with fees, rewards, lounges, benefits, eligibility, source quotes for verified figures, and a link to the bank's page.
- **Removed:** 11 cards the banks confirmed as discontinued (removed 2026-09-27).

### 4.2 Card interactions — ✅

- Card photos tilt in 3D with the mouse and have a moving glare.
- A flip button turns the card over to show annual fee, reward rate, lounges and forex markup.
- Cards fade in one after another, sections appear on scroll, and all motion is off for users whose device asks for reduced motion.

### 4.3 Compare — ✅

- Tick "Compare" on a card; a tray at the bottom collects the picks.
- The comparison table covers annual fee, joining fee, reward rate, domestic, international and railway lounges, golf, forex markup, fuel waiver, minimum income and data status. The best value in each row is starred.
- **Limit:** 2 cards free, 4 cards with PRO. Picking beyond the limit opens the Go PRO screen.

### 4.4 Card finder quiz — ✅

- 4 questions: yearly income, where you spend most, fee budget, whether lounges matter.
- Cards the user can't qualify for (minimum income) or can't afford (fee budget) are dropped.
- The top 5 matches are ranked by spend match, lounges, lifetime-free, zero forex (for travellers), verified data and popularity, with the reasons shown.
- Opens from the cards page hero or from `/dashboard.html#quiz` (landing page button).

### 4.5 Accounts — ✅ locally, 🟡 for launch

- Sign in with a 6-digit email code (10-minute expiry, 5 wrong tries lock the code, 1 resend per minute) or with Google.
- Sessions last 30 days and are signed by the server; the browser keeps the token.
- **Stored per user:** email, sign-up date, plan, paid-until date, today's question count. Nothing else.
- **Before launch:** an email sender for codes (AWS SES), a Google OAuth client ID, a `SESSION_SECRET`, and a database (DynamoDB) instead of the local JSON file.

### 4.6 CardRadar AI and PRO subscription — ✅ locally, 🟡 for launch

| | Not signed in | Free account | PRO |
|---|---|---|---|
| Browse, filter, card details, quiz | ✅ | ✅ | ✅ |
| Compare | 2 cards | 2 cards | 4 cards |
| CardRadar AI | Sign-in prompt | 3 answered questions a day | Unlimited |
| Price | — | ₹0 | ₹99/month or ₹999/year |

- The server enforces sign-in and the daily allowance; failed AI answers don't count.
- The AI only answers from the CardRadar card list, flags unverified data, and refuses off-topic questions.
- **Payments:** simulated locally. A gateway (e.g. Razorpay) plugs into `startCheckout` in `lambda/chat/index.js`; its payment confirmation calls `activatePlan(email, plan)`, which stacks the plan's days on any time left.

### 4.7 Look and feel — ✅

- Neon theme: near-black background with a faint grid, cyan primary, magenta secondary, lime for lifetime-free, amber for premium; Space Grotesk headings, Inter body.
- Light theme toggle kept.
- Works from 375 px phones to desktop with no sideways scrolling.

### 4.8 Data freshness — ✅ built earlier (see AWS design spec)

- A weekly crawl reads each card's official page, extracts fees and benefits with source quotes, and opens one GitHub pull request per changed card. Nothing goes live without review.

## 5. User flows

1. **Find a card:** Landing → "Find my card" → 4 questions → 5 matches → card details → bank's page.
2. **Compare:** Cards page → tick Compare on 2 cards → "Compare 2" → table → card details.
3. **Ask the AI (free):** Chat button → Sign in → email code → ask up to 3 questions a day → Go PRO prompt.
4. **Upgrade:** Go PRO → pick Monthly or Yearly → gateway checkout → PRO badge, unlimited AI, 4-card compare.

## 6. System overview

| Part | Technology | Where |
|---|---|---|
| Site | Static HTML, CSS, plain JavaScript (no build step) | `public/`, S3 + CloudFront |
| Card data | JSON files checked by `scripts/build.js` | `data/cards/` → `public/data/cards.json` |
| Card photos | Official bank images, max 640 px, mostly WebP (3 MB total) | `public/img/cards/` |
| API (`/api/*`) | One Node.js Lambda: AI chat, sign-in, account, subscribe | `lambda/chat/` |
| AI model | OpenAI-compatible endpoint (default NVIDIA, Kimi K2.5), key in SSM | `LLM_URL`, `LLM_MODEL` |
| Accounts | Local JSON file now; DynamoDB at launch | `lambda/chat/account.js` |
| Weekly refresh | n8n on Fargate, GitHub pull requests | `n8n/`, `scripts/intake.js` |

**API**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/config` | Plans, free allowance, Google client ID, whether payments are live |
| POST | `/api/auth/email/start` | Send a sign-in code |
| POST | `/api/auth/email/verify` | Check the code, return a session |
| POST | `/api/auth/google` | Exchange a Google ID token for a session |
| GET | `/api/me` | Plan, paid-until, free questions left |
| POST | `/api/chat` | Ask CardRadar AI (sign-in required, allowance enforced) |
| POST | `/api/subscribe` | Start checkout for a plan |
| POST | `/api/subscribe/mock-complete` | Local only: simulate a successful payment |

## 7. Quality requirements

- **Security:** sessions are HMAC-signed and compared in constant time; sign-in codes are stored hashed; the API refuses requests that bypass CloudFront; in production a missing secret refuses service instead of falling back. All card text is escaped before display; only `https` links are rendered.
- **Privacy:** only email and subscription status are stored; no card numbers, income or quiz answers leave the browser.
- **Accessibility:** keyboard access to every control, visible focus, labelled buttons and dialogs, reduced-motion support, WCAG AA contrast on the dark theme.
- **Performance:** no framework; card photos lazy-load; photos total 3 MB for 143 cards.
- **Tests:** 39 automated tests (card data checks, filters and quiz ranking, chat handler, sign-in, sessions, allowance, plans) run with `npm test`.

## 8. Launch plan

| Step | Work | Status |
|---|---|---|
| 1 | Neon UI, card photos, interactions, compare, quiz | ✅ Done |
| 2 | Accounts and PRO subscription (local, simulated payments) | ✅ Done |
| 3 | End-to-end browser testing (TestSprite) and fixes | In progress |
| 4 | Clean card data: fix ~60 broken apply links (banks moved to `.bank.in` addresses), merge duplicates, decide on the 29 cards banks no longer list | ⬜ |
| 5 | Payment gateway (Razorpay recommended for India: UPI, cards, subscriptions) with webhook → `activatePlan` | ⬜ |
| 6 | Production accounts: DynamoDB table, AWS SES sender, `SESSION_SECRET` and Google client ID in SSM | ⬜ |
| 7 | Legal pages: terms, privacy policy, refund policy (needed by payment gateways), "not financial advice" notice | ⬜ |
| 8 | Deploy to AWS (CloudFormation stack in `ap-south-1`) and smoke-test | ⬜ |

## 9. Success measures

- Quiz completion rate (started → saw results) above 60%.
- Share of visitors who open at least one card's details above 40%.
- Free → PRO conversion of signed-in users above 3% in the first 3 months.
- Zero known discontinued cards listed; fewer than 5% of apply links broken at any weekly check.

## 10. Decisions changed from earlier specs

| Earlier decision | Now | Why |
|---|---|---|
| "Login removed; no user data is stored" (AWS spec, 2026-09-22) | Optional sign-in; email and subscription status are stored | The AI assistant is paid, so the server must know who is subscribed |
| AI chat free for everyone | 3 free answers a day, then PRO | Covers AI model cost |
| No money-making in scope | PRO subscription; still no affiliate links | Sustainable without biasing card rankings |

## 11. Open questions

1. **Pricing:** are ₹99/month and ₹999/year right, and should there be a free trial?
2. **Cards no longer listed by their banks (29):** remove them, or keep them marked "Not accepting applications"?
3. **Refunds and cancellations:** what policy for PRO?
4. **Google sign-in:** which Google Cloud project owns the OAuth client?
5. **Should the quiz and compare results be shareable links?**
