# Verified Card Data — Design Spec

- **Date:** 2026-09-13
- **Status:** Draft, awaiting review
- **Sub-project:** A (of A–E) — see "Context"

## Context

CardRadar is being positioned as a credit card platform for everyone from first-time applicants to high-net-worth (HNI) users, with the primary focus on HNI users choosing premium cards. That launch decomposes into five sub-projects, each with its own spec → plan → implementation cycle:

| | Sub-project | Status |
|---|---|---|
| **A** | **Verified card data** (this spec) | Designing |
| B | Eligibility engine (profile → qualify / near-miss / next tier) | Later |
| C | HNI experience (premium comparison, reward value vs fee, invite-only paths) | Later |
| D | Beginner path (LTF / secured / entry onboarding) | Later |
| E | Launch readiness (hosting hardening, legal, analytics, affiliate links) | Later |

A comes first because B, C and D all depend on trustworthy data.

### Problems this solves

1. 74 of the 134 cards in the knowledge base have benefits guessed from the category name by `generate_cobranded.js` (e.g. "super" → unlimited lounges). HNI users comparing ₹10k–₹60k cards will notice wrong details.
2. Card benefits change often; hand-written `cards/*.js` files go stale with no signal.
3. The premium tier is thin: only 17 cards with a ₹5,000+ fee are in `India_Credit_Cards_Database.xlsx`, and invite-only/private-banking cards are missing.

## Decisions

| Topic | Decision |
|---|---|
| Update mechanism | Scheduled job: weekly change check + monthly full re-read |
| On detected change | Review queue; an admin approves before anything goes live |
| First-release scope | Premium tier (~35–40 cards) incl. invite-only/private cards; other cards stay visible, labelled unverified |
| Hosting | Single VPS, docker-compose (web + worker + Postgres) |
| Architecture | Postgres as source of truth, separate worker container, admin review page; Apify only as a fetch fallback for blocked sources |
| Reviewer | Project owner, single admin account |

## Goals

- Every key figure shown for a premium card is traceable to an official source quote and a verification date.
- Benefit changes on official pages reach the review queue within 7 days.
- Nothing extracted by the AI reaches the public site without human approval.
- The public API keeps its current shape; the existing frontend and chat keep working.

## Non-goals

- Eligibility matching, comparison tools, onboarding flows (sub-projects B–D).
- Verifying non-premium cards in this release (the pipeline supports it; seeding their sources is later work).
- Detecting changes announced only via cardholder email.
- Production hardening (sub-project E), recorded under "Follow-ups".

---

## 1. Data model (Postgres)

Schema changes live in numbered SQL files in `db/migrations/`, applied by `npm run migrate` (tracked in a `schema_migrations` table). The table creation currently inline in `db.js` moves into migration `001`.

### `cards`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Existing slug ids, e.g. `hdfc-infinia` |
| `name`, `bank`, `network`, `category` | text | |
| `tier` | text | `entry \| mid \| premium \| super_premium \| private` |
| `is_ltf` | boolean | |
| `annual_fee`, `joining_fee` | integer | ₹ |
| `reward_rate` | text | e.g. `3.3%` |
| `apply_url` | text | Must pass the URL allow-list (§4) |
| `benefits` | jsonb | Same shape as today's `benefits` object |
| `eligibility` | jsonb | `minIncome`, `minAge`, `maxAge`, `employment[]`, `relationshipValue`, `inviteOnly`, `notes` (all optional except `minIncome`, `minAge`) |
| `highlights` | text[] | |
| `popularity_score` | integer | Seeded from the map currently in `server.js` |
| `verification_status` | text | `verified \| stale \| unverified` (derived; see rules) |
| `last_verified_at` | timestamptz | Oldest `verified_at` across key fields |
| `published` | boolean | Default true |
| `created_at`, `updated_at` | timestamptz | |

### `card_sources`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `card_id` | text FK → cards | |
| `url` | text | Must pass the URL allow-list |
| `kind` | text | `product_page \| mitc_pdf \| fee_schedule` |
| `fetch_method` | text | `http \| playwright \| apify` |
| `last_hash` | text | SHA-256 of cleaned text |
| `last_fetched_at` | timestamptz | Last *successful* fetch |
| `last_error` | text | |
| `consecutive_failures` | integer | Reset to 0 on success |

### `field_verifications`

One row per verification event (append-only; the latest row per `card_id + field_path` is current).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `card_id` | text FK | |
| `field_path` | text | e.g. `benefits.lounges.airport.domestic`, `annual_fee` |
| `value` | jsonb | |
| `source_id` | integer FK → card_sources | |
| `source_quote` | text | Verbatim text from the source |
| `manually_edited` | boolean | True when approved via "Edit & approve" |
| `verified_at` | timestamptz | |
| `verified_by` | integer FK → users, nullable | Null for automatic re-confirmation |

### `change_proposals`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `card_id`, `field_path` | | |
| `kind` | text | `change` (value differs) or `confirm` (first verification of a field; value may equal current) |
| `old_value`, `new_value` | jsonb | |
| `source_id`, `source_quote` | | |
| `confidence` | text | `high \| low` (rule-based, §2 step 5) |
| `flags` | text[] | e.g. `possible_page_change`, `large_fee_change` |
| `run_id` | integer FK → job_runs | |
| `status` | text | `pending \| approved \| rejected \| superseded` |
| `reject_reason` | text | |
| `reviewed_by`, `reviewed_at` | | |

### `job_runs`

`id`, `type` (`weekly_diff \| monthly_full \| manual_card`), `status` (`running \| succeeded \| failed`), `started_at`, `finished_at`, `sources_checked`, `sources_unchanged`, `sources_changed`, `sources_failed`, `proposals_created`, `error`.

### `users`

Add `is_admin boolean not null default false`.

### Rules

- **Key fields:** `annual_fee`, `joining_fee`, `reward_rate`, `benefits.lounges.airport.domestic`, `benefits.lounges.airport.international`, `benefits.golf.available`, `benefits.forex.markupFee`, `eligibility.minIncome`, `eligibility.minAge`.
- **`verified`:** every key field has a current `field_verifications` row, and the card is not stale.
- **`stale`:** the card has at least one verified key field, and either (a) any source has `consecutive_failures >= 3`, or (b) no source has a successful fetch in the last 45 days.
- **`unverified`:** any key field lacks a verification row, and the card is not stale.
- **Pending changes:** a card with a `pending` `change` proposal on a key field is exposed as `hasPendingChanges: true` (separate from status).
- Status is recomputed after every run and every approval.

---

## 2. Worker pipeline

**Process:** `worker/index.js`, run as a `worker` service in `docker-compose.yml` from the same image as the web app. Schedules use `node-cron` with timezone `Asia/Kolkata`:

- `weekly_diff` — Mondays 03:00
- `monthly_full` — 1st of the month, 04:00

Manual runs: `npm run worker -- --once weekly|monthly` and `npm run worker -- --card <id>`.

**Overlap guard:** `pg_try_advisory_lock` at run start; if not acquired, the run exits and logs "run already in progress".

**Concurrency:** 2 sources concurrently; a random 2–5 s delay between requests to the same bank domain.

### Per-source steps

1. **Fetch** by `fetch_method`:
   - `http`: `fetch` with a normal browser user-agent; PDFs (by content-type) converted via `pdf-parse`.
   - `playwright`: Chromium headless, wait for network idle, take page HTML.
   - `apify`: `apify/website-content-crawler` limited to 1 page, only if `APIFY_TOKEN` is set.

   Up to 2 retries with exponential backoff (5 s, 20 s). On final failure: set `last_error`, increment `consecutive_failures`, count as failed, continue. If `consecutive_failures` reaches 3 and `APIFY_TOKEN` is set, switch `fetch_method` to `apify` and log it in the run.
2. **Clean up** (HTML only): parse with `cheerio`, remove `script, style, nav, header, footer, noscript, iframe` and elements whose class/id matches cookie/banner/chat patterns; take text; collapse whitespace; strip date/time strings.
3. **Fingerprint:** SHA-256 of cleaned text. If it equals `last_hash` and the run is `weekly_diff`, mark unchanged and stop. `monthly_full` always continues.
4. **Extract:** call the existing NVIDIA NIM client (`moonshotai/kimi-k2.5`, temperature 0) with the cleaned text (truncated to 60k characters), the card's current key-field values, and a JSON template. Every returned field is `{ value, quote }`; fields not stated in the text are omitted.
5. **Validate** with `zod`:
   - Type and range check per field (fees ≥ 0 integers; lounge counts integer ≥ -1, where -1 = unlimited; `markupFee` matches `^\d+(\.\d+)?%$`).
   - **Quote check:** after whitespace normalisation, `quote` must be a substring of the cleaned text, otherwise the field is dropped and counted in the run log.
   - **Confidence** is `low` if any flag trips, else `high`:
     - `large_fee_change`: fee changes by more than 3x or from > 0 to 0.
     - `benefit_removed`: lounge value goes from -1 or > 0 to 0, or golf goes true → false.
     - `possible_page_change`: more than 50% of key fields present in the current card are absent from the extraction.
6. **Compare** each extracted field with the live card (first matching rule wins):
   1. Field has **no** verification yet → create a `confirm` proposal, whether or not the extracted value equals the current one (the review page shows old → new when they differ).
   2. Field is verified and the value is equal → insert a `field_verifications` row copying the previous one with new `verified_at` and `verified_by = null` (automatic re-confirmation).
   3. Field is verified and the value differs → create a `change` proposal.

   Any older `pending` proposal for the same `card_id + field_path` becomes `superseded`.
7. **Commit:** proposals, verifications and the new `last_hash` / `last_fetched_at` are written in one transaction, so a crash mid-source leaves the hash unchanged and the next run retries.

### After the run

- Update `job_runs` counts and status.
- Recompute `verification_status` for all cards.
- If proposals were created or sources failed, send a summary email via `nodemailer` (to `ADMIN_EMAIL`, with SMTP settings from `.env`) linking to `/admin/review` and `/admin/runs`. Skipped with a log line if SMTP is not configured.

---

## 3. Admin

### Access

- `requireAdmin` middleware: 401 if not logged in, 403 if `!req.user.is_admin`.
- `deserializeUser` in `auth.js` selects `is_admin`.
- `npm run make-admin -- <email>` sets the flag; there is no route to grant admin.
- Admin requests that change data require a CSRF token: issued by `GET /api/admin/csrf`, stored in the session, sent as `X-CSRF-Token`. Requests with a mismatched `Origin` are rejected.
- `express-rate-limit` on `/api/admin/*`: 120 requests / 15 min per session.

### Pages (`public/admin/`, plain HTML/JS/CSS matching the existing frontend)

1. **Review queue — `/admin/review`**
   - Pending proposals grouped by card; low confidence first, then oldest.
   - Row: field path, old → new, source quote with the new value highlighted, source link, confidence + flags, detected date.
   - Actions: **Approve**, **Reject** (optional reason), **Edit & approve** (edited value saved with `manually_edited = true`), **Approve all for this card**.
2. **Cards — `/admin/cards`**
   - Table with filters: tier, verification status, bank, published.
   - Card page: every field with its current verification (value, quote, source, date, by), sources list with last fetch status, publish/unpublish switch.
   - Add/edit sources; add a new card (starts `unverified`, sources required).
3. **Runs — `/admin/runs`**
   - Run history with counts; failed sources with `last_error`; **Re-check now** per card (starts a `manual_card` run in the web process via the same pipeline module). A manual run takes a per-card advisory lock; if a scheduled run holds the global lock, the API returns **409** "scheduled run in progress".

### API (`/api/admin/*`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/csrf` | Issue CSRF token |
| GET | `/proposals?status=pending` | Queue |
| POST | `/proposals/:id/approve` | Body optional `{ value }` for Edit & approve |
| POST | `/proposals/:id/reject` | Body `{ reason? }` |
| POST | `/cards/:id/proposals/approve-all` | Approve all pending for a card |
| GET | `/cards`, `/cards/:id` | List / detail with verifications and sources |
| POST | `/cards` | Create card |
| PATCH | `/cards/:id` | Edit card fields, `published` |
| POST | `/cards/:id/sources` | Add source |
| PATCH | `/sources/:id` | Edit source |
| POST | `/cards/:id/recheck` | Start manual run |
| GET | `/runs` | Run history |

### Approval transaction

In one transaction:

1. Lock the card row (`SELECT … FOR UPDATE`).
2. If the card's current value at `field_path` ≠ `old_value`, abort and return **409** "value changed, re-review".
3. Write the new value into the card.
4. Insert a `field_verifications` row.
5. Mark the proposal `approved`.
6. Recompute the card's `verification_status` and `last_verified_at`.

After commit, clear the public card cache (§4).

---

## 4. Public site

### Data loading

`knowledgebase.js` becomes a Postgres loader. It adds an async `loadCards()` (called at startup before routes are registered, and after every cache clear) and keeps its existing exports (`CREDIT_CARDS`, `getAllCards`, `getCardById`, `getCardsByBank`, `getLTFCards`, `getUniqueBanks`, `getCardsSummaryForLLM`) as synchronous reads of the in-memory cache, so `analyzer.js` and `server.js` call sites stay unchanged. After each successful load the cache is written to `data/cards-cache.json` (gitignored). `server.js` drops its hard-coded popularity map in favour of `popularity_score`.

### API

`/api/cards` and `/api/cards/:id` keep their current fields and add:

```json
{
  "tier": "super_premium",
  "verificationStatus": "verified",
  "lastVerifiedAt": "2026-08-04T03:12:00Z",
  "hasPendingChanges": false,
  "sources": [{ "kind": "mitc_pdf", "url": "https://…" }],
  "fieldVerifications": {
    "annual_fee": { "quote": "…", "verifiedAt": "…", "sourceUrl": "…" }
  }
}
```

New query params: `verified=true`, `tier=<tier>`. Default sort (`popularity`) puts `verified` cards first, then premium tiers, then by popularity.

### Card grid (`public/app.js` `renderCardHTML`)

One label in `.card-badges`:

- ✅ **Verified · <Mon YYYY>** when `verified` and no pending key-field changes.
- ⚠️ **May be outdated** when `stale` or `hasPendingChanges`.
- **Unverified** (grey) otherwise, with a tooltip: "Details not yet checked against the bank's official terms."

### Card detail popup (`renderModalContent`)

- **Verification** section at the top: status, last verified date, source links, "Confirm on the bank's site before applying."
- ⓘ next to each key figure showing its quote and verified date.
- Eligibility section renders `employment`, `relationshipValue`, `inviteOnly` (label) and `notes` when present.

### Filters

"Verified only" switch and a tier filter (`Entry | Premium | Super Premium | Private`) added to the existing filter bar.

### Chat

`getCardsSummaryForLLM` includes each card's status and last verified date. The system prompt adds: "If a card is unverified or stale, say so, and do not present its benefits as confirmed."

### Security

- All card-derived strings rendered via an `escapeHtml` helper before being inserted into HTML (grid, modal, tooltips, highlights).
- URL allow-list (`config/bank-domains.json`): `apply_url` and source URLs must be `https:` on a listed domain or its subdomain.
  - Initial bank domains: `hdfcbank.com`, `icicibank.com`, `axisbank.com`, `sbicard.com`, `idfcfirstbank.com`, `hsbc.co.in`, `americanexpress.com`, `federalbank.co.in`, `aubank.in`, `indusind.com`, `rblbank.com`, `idbibank.in`, `kotak.com`, `yesbank.in`, `sc.com`.
  - The seed step also adds the registrable domain of every existing `applyUrl` in `cards/*.js` (covers fintech/co-brand partners such as `scapia.app`) and prints the list added, so it can be reviewed before `config/bank-domains.json` is committed.
  - Enforced on write (admin API and seed reject the URL) and on render (a disallowed URL hides the Apply button / source link and logs a console warning).

### Disclaimer

Footer on all public pages: "Card data is checked against official bank sources but may change; CardRadar is not a bank and this is not financial advice."

---

## 5. Migration, error handling, testing

### Migration (`npm run migrate`, then `npm run seed`; both idempotent)

1. Apply SQL migrations (tables above, `users.is_admin`).
2. Seed all 134 cards from `cards/*.js` as `published = true`, `unverified`. Tier assignment:
   - `private`: listed in the seed file as invite-only/private.
   - `super_premium`: `annual_fee >= 9999` or category contains "Super Premium" / "Ultra Premium".
   - `premium`: `annual_fee >= 2500` or category contains "Premium".
   - `mid`: `annual_fee >= 500`.
   - `entry`: otherwise.
3. Seed `db/seeds/premium_sources.json`: for every `premium`, `super_premium` and `private` card, the official product page URL and, where published, the MITC/fee-schedule PDF URL, with `fetch_method`. Collecting these URLs from official bank sites is an implementation task. The file also adds cards missing today: Axis Burgundy Private, ICICI Emeralde Private Metal, Kotak Solitaire, Kotak White Reserve, American Express Centurion, plus premium Excel cards not in the knowledge base (YES BANK Marquee, IndusInd Crest, IndusInd Pioneer Heritage, IndusInd Celesta, IndusInd Avios Visa Infinite, Standard Chartered Ultimate, ICICI Times Black, Axis Olympus, Axis Vistara Infinite).
4. Run `npm run worker -- --once monthly`; the admin works through the resulting `confirm` proposals.
5. `cards/*.js` and `generate_cobranded.js` remain only as seed input; no runtime code imports them.

### Error handling

| Failure | Behaviour |
|---|---|
| Fetch fails / blocked | 2 retries → `last_error`, `consecutive_failures++`; at 3, card marked stale and source switched to `apify` if `APIFY_TOKEN` is set |
| AI timeout / invalid JSON | 1 retry; then source counted in `sources_failed` with `last_error` set, hash not updated so it retries next run. Does **not** increment `consecutive_failures`, which tracks fetch failures only |
| Quote not on page / invalid field | Field dropped, logged in run |
| Page structure changed | Proposals flagged `possible_page_change`, confidence `low` |
| DB unavailable during run | Run marked `failed` if possible; no hashes saved; next run retries |
| DB unavailable at web startup | Serve `data/cards-cache.json` if present, log a warning, retry DB every 30 s; if no cache file, `/api/cards` returns 503 |
| Concurrent approvals | Old-value check → 409 |

### Testing

New dev dependencies: `vitest`, `supertest`. Tests use `DATABASE_URL_TEST`; each suite runs migrations on a fresh schema.

- **Unit tests**
  - Text clean-up: fingerprint is unchanged when only ads, dates or cookie banners change.
  - Validation: quote check drops made-up fields; wrong types rejected; each confidence flag triggers.
  - Comparison: equal/verified → re-confirmation; unverified → `confirm`; different → `change`; supersede older pending.
  - Tier assignment and status rules (verified/stale/unverified).
  - `escapeHtml` and the URL allow-list.
- **Saved-page tests** (`test/fixtures/`): saved HTML/PDF for 5 cards (e.g. HDFC Infinia, ICICI Emeralde, Axis Magnus, SBI Aurum, Amex Platinum) with a fake AI returning canned extractions; covers fetch → proposal without network access.
- **API tests**
  - `/api/admin/*` returns 401/403 for logged-out/non-admin users; CSRF required on POST/PATCH.
  - Approve updates the card, inserts a verification, marks the proposal approved and clears the cache.
  - Conflicting approve returns 409.
  - `/api/cards` response still contains every field the current frontend reads, plus the new fields.
- **Manual pre-launch check:** run `monthly_full` against live sites, review the queue, confirm badges, modal verification section and filters in the browser.

---

## Implementation order

Each step leaves the site working:

1. Migrations, seed, Postgres-backed `knowledgebase.js` + cache file. The site serves the same cards from Postgres.
2. Public site: `escapeHtml`, URL allow-list, verification labels, detail-popup verification section, filters, disclaimer, chat prompt change.
3. Worker pipeline (fetch → clean → fingerprint → extract → validate → compare → commit), manual `--once` runs, docker-compose `worker` service.
4. Admin: `is_admin`, `make-admin`, CSRF, rate limit, review queue, cards, runs pages and API.
5. Run summary email, Apify fallback, premium sources seed file, first full run and review.

## New dependencies

Runtime: `node-cron`, `playwright`, `pdf-parse`, `cheerio`, `zod`, `nodemailer`, `express-rate-limit`, `apify-client` (optional use). Dev: `vitest`, `supertest`.

## New environment variables

`ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `APIFY_TOKEN` (optional), `DATABASE_URL_TEST`.

## Follow-ups (sub-project E)

- Replace hard-coded Postgres password in `docker-compose.yml` / `db.js` and the default `SESSION_SECRET` fallback in `server.js`.
- HTTPS / reverse proxy, database backups, worker health monitoring.
- `.env` handling on the VPS.
