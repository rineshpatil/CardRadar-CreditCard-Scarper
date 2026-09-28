// Interactive extras on the cards page: 3D tilt, card comparison, and the card finder quiz.

// Comparing more cards is a PRO perk. ponytail: enforced in the browser only — the card data is public anyway.
const COMPARE_FREE = 2;
const COMPARE_PRO = 4;
const isPro = () => Boolean(accountInfo?.subscribed);
const compareLimit = () => (isPro() ? COMPARE_PRO : COMPARE_FREE);
const COMPARE_KEY = 'cardradar-compare';
let compareIds = (() => {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; } catch { return []; }
})();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== 3D TILT =====

function tiltCard(event, el) {
  if (reduceMotion || event.pointerType === 'touch') return;
  const r = el.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width - 0.5;
  const y = (event.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--ry', `${x * 16}deg`);
  el.style.setProperty('--rx', `${-y * 12}deg`);
  el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
  el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
}

function untiltCard(el) {
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

// ===== OVERLAY (compare table and quiz share one) =====

function openTool(title, html) {
  let overlay = document.getElementById('toolOverlay');
  if (!overlay) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay tool-overlay" id="toolOverlay" onclick="if (event.target === this) closeTool()">
        <div class="modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="toolTitle">
          <div class="modal-header">
            <h2 class="modal-card-name" id="toolTitle"></h2>
            <button class="modal-close" type="button" onclick="closeTool()" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body" id="toolBody"></div>
        </div>
      </div>`);
    overlay = document.getElementById('toolOverlay');
  }
  document.getElementById('toolTitle').textContent = title;
  document.getElementById('toolBody').innerHTML = html;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.modal-close').focus();
}

function closeTool() {
  document.getElementById('toolOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTool(); });

// ===== COMPARE =====

function saveCompare() {
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds)); } catch { /* selection just won't survive a reload */ }
}

function toggleCompare(id, on) {
  if (on && !compareIds.includes(id)) {
    if (compareIds.length >= compareLimit()) {
      document.querySelectorAll(`[data-compare="${id}"]`).forEach((box) => { box.checked = false; });
      if (isPro()) return showToast(`You can compare up to ${COMPARE_PRO} cards`, 'info');
      showToast(`Go PRO to compare up to ${COMPARE_PRO} cards`, 'info');
      return openAccount();
    }
    compareIds.push(id);
  } else if (!on) {
    compareIds = compareIds.filter((x) => x !== id);
  }
  document.querySelectorAll(`[data-compare="${id}"]`).forEach((box) => { box.checked = on; });
  saveCompare();
  renderCompareTray();
}

function clearCompare() {
  compareIds.forEach((id) => document.querySelectorAll(`[data-compare="${id}"]`).forEach((box) => { box.checked = false; }));
  compareIds = [];
  saveCompare();
  renderCompareTray();
}

function renderCompareTray() {
  let tray = document.getElementById('compareTray');
  if (!tray) {
    document.body.insertAdjacentHTML('beforeend', '<div class="compare-tray" id="compareTray" aria-live="polite"></div>');
    tray = document.getElementById('compareTray');
  }
  const cards = compareIds.map((id) => allCardsData.find((c) => c.id === id)).filter(Boolean);
  const empty = Math.max(0, compareLimit() - cards.length);
  const locked = !isPro();
  tray.classList.toggle('open', cards.length > 0);
  tray.innerHTML = `
    <div class="compare-slots" style="--slots:${cards.length + empty + (locked ? 1 : 0)}">
      ${cards.map((c) => `
        <div class="compare-slot">
          ${c.image ? `<img src="/${escapeHtml(c.image)}" alt="">` : '<span class="slot-face"></span>'}
          <span>${escapeHtml(c.name)}</span>
          <button type="button" onclick="toggleCompare('${c.id}', false)" aria-label="Remove ${escapeHtml(c.name)}">&times;</button>
        </div>`).join('')}
      ${Array.from({ length: empty }, () => '<div class="compare-slot empty">+ Tick "Compare" on a card</div>').join('')}
      ${locked ? `<button class="compare-slot locked" type="button" onclick="openAccount()">✦ PRO: compare up to ${COMPARE_PRO}</button>` : ''}
    </div>
    <div class="compare-actions">
      <button class="gate-link" type="button" onclick="clearCompare()">Clear</button>
      <button class="btn btn-primary" type="button" onclick="openCompare()" ${cards.length < 2 ? 'disabled' : ''}>Compare ${cards.length}</button>
    </div>`;
}

function openCompare() {
  const cards = compareIds.map((id) => allCardsData.find((c) => c.id === id)).filter(Boolean);
  if (cards.length < 2) return;
  if (cards.length > compareLimit()) { // e.g. signed out after picking 4 as PRO
    showToast(`Go PRO to compare more than ${COMPARE_FREE} cards`, 'info');
    return openAccount();
  }
  const rupees = (n) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);
  const visits = (n) => (n === -1 ? 'Unlimited' : n ? `${n}/yr` : 'None');
  const yes = (on) => (on ? '✅' : '—');
  const rows = [
    ['Annual fee', (c) => (c.isLTF ? 'Lifetime free' : rupees(c.annualFee)), (c) => (c.isLTF ? 0 : c.annualFee), 'low'],
    ['Joining fee', (c) => rupees(c.joiningFee), (c) => c.joiningFee, 'low'],
    ['Reward rate', (c) => c.rewardRate || '—'],
    ['Domestic lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.domestic) : '—'), (c) => loungeScore(c.benefits?.lounges?.airport?.domestic), 'high'],
    ['International lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.international) : '—'), (c) => loungeScore(c.benefits?.lounges?.airport?.international), 'high'],
    ['Railway lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.railway?.count) : '—')],
    ['Golf', (c) => yes(FILTERS.golf(c))],
    ['Forex markup', (c) => c.benefits?.forex?.markupFee || '—', (c) => parseFloat(c.benefits?.forex?.markupFee), 'low'],
    ['Fuel surcharge waiver', (c) => yes(c.benefits?.fuel?.surchargeWaiver)],
    ['Min. income', (c) => rupees(c.eligibility?.minIncome), (c) => c.eligibility?.minIncome, 'low'],
    ['Data status', (c) => verificationBadge(c).text],
  ];
  // Highlight the best value in rows where "better" is clear-cut.
  const best = (score, dir) => {
    const vals = cards.map(score).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (vals.length < 2 || new Set(vals).size < 2) return null;
    return dir === 'low' ? Math.min(...vals) : Math.max(...vals);
  };
  openTool('Compare cards', `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th scope="col"><span class="sr-only">Feature</span></th>${cards.map((c) => `
          <th scope="col">
            ${renderCardVisual(c)}
            <button class="compare-name" type="button" onclick="closeTool(); openModal('${c.id}')">${escapeHtml(c.name)}</button>
          </th>`).join('')}</tr></thead>
        <tbody>${rows.map(([label, show, score, dir]) => {
          const top = score ? best(score, dir) : null;
          return `<tr><th scope="row">${label}</th>${cards.map((c) => `<td class="${top !== null && score(c) === top ? 'best' : ''}">${escapeHtml(show(c))}</td>`).join('')}</tr>`;
        }).join('')}</tbody>
      </table>
    </div>`);
}

const loungeScore = (n) => (n === -1 ? 999 : n ?? 0);

// ===== CARD FINDER QUIZ =====

const QUIZ = [
  { key: 'income', q: 'What is your yearly income?', options: [
    ['Under ₹3 lakh', 250000], ['₹3–6 lakh', 500000], ['₹6–12 lakh', 1000000], ['₹12–25 lakh', 2000000], ['Over ₹25 lakh', 1e9]] },
  { key: 'spend', q: 'Where do you spend the most?', options: [
    ['🛒 Online shopping', 'online'], ['✈️ Travel', 'travel'], ['🍽️ Dining & food delivery', 'dining'], ['⛽ Fuel', 'fuel'], ['🧾 Everyday bills & groceries', 'everyday']] },
  { key: 'maxFee', q: 'How much annual fee is OK?', options: [
    ['Only lifetime free', 0], ['Up to ₹1,000', 1000], ['Up to ₹5,000', 5000], ['Any, if the card is worth it', Infinity]] },
  { key: 'lounge', q: 'Do airport lounges matter to you?', options: [['Yes, I fly often', true], ['Not really', false]] },
];
let quizAnswers = {};

function openQuiz() {
  quizAnswers = {};
  showQuizStep(0);
}

function showQuizStep(step) {
  if (step >= QUIZ.length) return showQuizResults();
  const { q, options } = QUIZ[step];
  openTool('Find my card', `
    <div class="quiz">
      <div class="quiz-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${QUIZ.length}" aria-valuenow="${step + 1}">
        ${QUIZ.map((_, i) => `<span class="${i <= step ? 'done' : ''}"></span>`).join('')}
      </div>
      <p class="quiz-step">Question ${step + 1} of ${QUIZ.length}</p>
      <h3 class="quiz-q">${q}</h3>
      <div class="quiz-options">
        ${options.map(([label], i) => `<button type="button" class="quiz-option" onclick="answerQuiz(${step}, ${i})">${label}</button>`).join('')}
      </div>
      ${step > 0 ? `<button class="gate-link" type="button" onclick="showQuizStep(${step - 1})">← Back</button>` : ''}
    </div>`);
  document.querySelector('.quiz-option')?.focus();
}

function answerQuiz(step, optionIndex) {
  quizAnswers[QUIZ[step].key] = QUIZ[step].options[optionIndex][1];
  showQuizStep(step + 1);
}

function showQuizResults() {
  const picks = recommend(allCardsData, quizAnswers);
  openTool('Your best matches', picks.length ? `
    <p class="quiz-step">Based on your answers. Always check eligibility on the bank's site before applying.</p>
    <div class="quiz-results">
      ${picks.map(({ card, reasons }, i) => `
        <button type="button" class="quiz-result" style="--i:${i}" onclick="closeTool(); openModal('${card.id}')">
          <span class="quiz-rank">#${i + 1}</span>
          ${card.image ? `<img src="/${escapeHtml(card.image)}" alt="">` : '<span class="slot-face"></span>'}
          <span class="quiz-result-text">
            <strong>${escapeHtml(card.name)}</strong>
            <small>${card.isLTF ? 'Lifetime free' : `₹${card.annualFee.toLocaleString('en-IN')}/yr`} · ${reasons.filter((r) => r !== 'Lifetime free').map(escapeHtml).join(' · ')}</small>
          </span>
        </button>`).join('')}
    </div>
    <div class="quiz-footer">
      <button class="gate-link" type="button" onclick="openQuiz()">Start over</button>
      <button class="btn btn-primary" type="button" onclick="closeTool(); openAccount()">Ask CardRadar AI about these</button>
    </div>` : `
    <p>No listed card fits all of those answers. Try a higher fee budget.</p>
    <button class="btn btn-primary" type="button" onclick="openQuiz()">Start over</button>`);
}

// ===== SCROLL REVEAL =====

function revealOnScroll(selector) {
  const els = document.querySelectorAll(selector);
  if (reduceMotion || !('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('revealed'));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cardGrid')) revealOnScroll('.stats-bar, .bank-filter-section, .filter-section, .section-header');
});

// Called by account.js when the user signs in, upgrades or signs out.
function onAccountChanged() {
  if (allCardsData.length) renderCompareTray();
}

// Called by app.js once the card list has loaded.
function onCardsLoaded() {
  compareIds = compareIds.filter((id) => allCardsData.some((c) => c.id === id)); // drop cards removed since last visit
  renderCompareTray();
  if (location.hash === '#quiz') openQuiz();
}
