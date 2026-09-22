/**
 * CardRadar Dashboard — Frontend JavaScript
 */

const API_BASE = '';

// State
let allCardsData = []; // every card from /data/cards.json
let allCards = [];     // cards matching the current filters
let currentFilter = 'all';
let currentSort = 'popularity';
let currentSearch = '';
let currentBank = '';
let currentTier = '';
let verifiedOnly = false;

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (document.getElementById('cardGrid')) loadCards();
});

// ===== THEME TOGGLE =====

function initTheme() {
  const saved = localStorage.getItem('cardradar-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('cardradar-theme', 'dark');
    showToast('Dark mode enabled', 'info');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('cardradar-theme', 'light');
    showToast('Light mode enabled', 'info');
  }
}

// ===== DATA FETCHING =====

async function loadCards() {
  try {
    const res = await fetch('/data/cards.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allCardsData = await res.json();
    updateStats(computeStats(allCardsData));
    renderBankChips(bankCounts(allCardsData));
    applyQuery();
  } catch (err) {
    console.error('Failed to load cards:', err);
    showToast('Failed to load card data', 'error');
  }
}

function applyQuery() {
  allCards = queryCards(allCardsData, {
    filter: currentFilter, bank: currentBank, search: currentSearch, sort: currentSort, tier: currentTier, verifiedOnly,
  });
  renderCards(allCards);
  updateSectionHeader();
}

// ===== RENDERING =====

function renderCards(cards) {
  const standardGrid = document.getElementById('cardGrid');
  const cobrandedGrid = document.getElementById('cobrandedGrid');
  const cobrandedSection = document.getElementById('cobrandedCardsSection');
  const cobrandedCount = document.getElementById('cobrandedCount');

  if (!cards || cards.length === 0) {
    standardGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔍</div>
        <h3>No cards found</h3>
        <p>Try adjusting your filters or search terms</p>
      </div>`;
    cobrandedSection.style.display = 'none';
    return;
  }

  // Split cards based on isCoBranded flag
  const standardCards = cards.filter(c => !c.isCoBranded);
  const cobrandedCardsArray = cards.filter(c => c.isCoBranded);

  // Render Standard Cards
  if (standardCards.length > 0) {
    standardGrid.innerHTML = standardCards.map(card => renderCardHTML(card)).join('');
  } else {
    standardGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">💳</div>
        <h3>No standard cards found</h3>
      </div>`;
  }

  // Render Co-Branded Cards
  if (cobrandedCardsArray.length > 0) {
    cobrandedSection.style.display = 'block';
    cobrandedGrid.innerHTML = cobrandedCardsArray.map(card => renderCardHTML(card)).join('');
    if (cobrandedCount) cobrandedCount.textContent = `${cobrandedCardsArray.length} cards`;
  } else {
    cobrandedSection.style.display = 'none';
  }
}

function renderCardHTML(card) {
  const b = card.benefits;
  const badge = verificationBadge(card);
  const feeText = card.isLTF
    ? '<strong>Lifetime Free</strong> — ₹0 Annual Fee'
    : `Annual Fee: <span class="fee-amount">₹${card.annualFee.toLocaleString('en-IN')}</span>`;
  const icons = b ? [
    { icon: '✈️', on: FILTERS.lounge(card), tip: b.lounges?.airport?.description || 'Airport lounge access' },
    { icon: '🚂', on: FILTERS.railway(card), tip: b.lounges?.railway?.description || 'Railway lounge access' },
    { icon: '⛳', on: FILTERS.golf(card), tip: b.golf?.description || 'Golf' },
    { icon: '💰', on: Boolean(b.cashback), tip: b.cashback?.description || 'Rewards' },
    { icon: '🌍', on: FILTERS.forex(card), tip: b.forex?.description || `Forex markup: ${b.forex?.markupFee || 'not verified'}` },
    { icon: '⛽', on: Boolean(b.fuel?.surchargeWaiver), tip: b.fuel?.description || 'No fuel benefit listed' },
    { icon: '🍽️', on: Boolean(b.dining?.available), tip: b.dining?.description || 'No dining benefit listed' },
    { icon: '🎬', on: Boolean(b.movies?.available), tip: b.movies?.description || 'No movie benefit listed' },
  ] : [];

  return `
    <div class="credit-card ${card.isLTF ? 'ltf-card' : 'premium-card'}" onclick="openModal('${card.id}')">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-bank">${escapeHtml(card.bank)}</span>
          <div class="card-badges">
            ${card.isLTF ? '<span class="badge badge-ltf">LTF</span>' : '<span class="badge badge-premium">Premium</span>'}
            <span class="badge badge-network">${escapeHtml(card.network)}</span>
            <span class="badge badge-${badge.kind}">${escapeHtml(badge.text)}</span>
          </div>
        </div>
        <h3 class="card-name">${escapeHtml(card.name)}</h3>
        <p class="card-fee">${feeText}</p>
        ${b ? `<div class="benefit-icons">${icons.map((i) => `
          <div class="benefit-icon ${i.on ? 'available' : 'unavailable'}">${i.icon}<span class="tooltip">${escapeHtml(i.tip)}</span></div>`).join('')}
        </div>` : '<p class="benefits-pending">Benefits not verified yet — see the bank\'s page.</p>'}
        <div class="card-highlights">
          ${card.highlights.slice(0, 3).map((h) => `<span class="highlight-tag">${escapeHtml(h)}</span>`).join('')}
        </div>
        <div class="card-meta">
          <div class="meta-item"><span class="meta-icon">🏷️</span><span>${escapeHtml(card.category)}</span></div>
          <div class="meta-item"><span class="meta-icon">⭐</span><span>Rewards: ${escapeHtml(card.rewardRate || 'not verified')}</span></div>
        </div>
      </div>
    </div>
  `;
}

// ===== BANK CHIPS =====

const BANK_ICONS = {
  'HDFC Bank': '🔵', 'ICICI Bank': '🟠', 'Axis Bank': '🟣',
  'IDFC FIRST Bank': '🔴', 'SBI Card': '🔷', 'HSBC': '🔺',
  'American Express': '🟢', 'Federal Bank': '🟡', 'AU Small Finance Bank': '🟤',
  'IndusInd Bank': '🟦', 'RBL Bank': '🟥', 'IDBI Bank': '🟧',
};

function renderBankChips(banks) {
  const container = document.getElementById('bankChips');
  if (!container) return;
  const chip = (value, label, count, icon) => `
    <button class="bank-chip ${currentBank === value ? 'active' : ''}" data-bank="${escapeHtml(value)}" onclick="setBank(this.dataset.bank, this)">
      <span class="bank-chip-icon">${icon}</span>
      <span class="bank-chip-name">${escapeHtml(label)}</span>
      <span class="bank-chip-count">${count}</span>
    </button>`;
  container.innerHTML = chip('', 'All Banks', banks.reduce((sum, b) => sum + b.cardCount, 0), '🏦')
    + banks.map((b) => chip(b.name, b.name, b.cardCount, BANK_ICONS[b.name] || '🏛️')).join('');
}

// ===== STATS =====

function updateStats(stats) {
  if (!stats) return;
  animateNumber('statTotal', stats.totalCards);
  animateNumber('statLTF', stats.ltfCount);
  animateNumber('statLounge', stats.withLoungeCount);
  animateNumber('statGolf', stats.withGolfCount);
  animateNumber('statCashback', stats.withCashbackCount);
  animateNumber('statBanks', stats.totalBanks);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 800;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ===== FILTERS & SEARCH =====

function setFilter(filter, chipEl) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chips .chip').forEach((c) => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');
  applyQuery();
}

function setBank(bank, chipEl) {
  currentBank = bank;
  document.querySelectorAll('.bank-chip').forEach((c) => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');
  applyQuery();
}

function setTier(tier) {
  currentTier = tier;
  applyQuery();
}

function setVerifiedOnly(checked) {
  verifiedOnly = checked;
  applyQuery();
}

function handleSearch() {
  currentSearch = document.getElementById('searchInput').value.trim();
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(applyQuery, 300);
}

function handleSort() {
  currentSort = document.getElementById('sortSelect').value;
  applyQuery();
}

function updateSectionHeader() {
  const titles = {
    'all': 'All Credit Cards',
    'ltf': 'Lifetime Free (LTF) Cards',
    'non-ltf': 'Premium (Non-LTF) Cards',
    'lounge': 'Cards with Lounge Access',
    'railway': 'Cards with Railway Lounge',
    'golf': 'Cards with Golf Benefits',
    'cashback': 'Cashback Cards',
    'forex': 'Zero Forex Markup Cards'
  };

  const icons = {
    'all': '📊', 'ltf': '✨', 'non-ltf': '👑', 'lounge': '✈️',
    'railway': '🚂', 'golf': '⛳', 'cashback': '💰', 'forex': '🌍'
  };

  let title = titles[currentFilter] || 'Credit Cards';
  if (currentBank) {
    title = `${currentBank} — ${title}`;
  }

  document.getElementById('sectionTitle').textContent = title;
  document.getElementById('sectionCount').textContent = `${allCards.length} cards`;

  const iconEl = document.querySelector('.section-icon');
  if (iconEl) iconEl.textContent = icons[currentFilter] || '📊';
}

// ===== MODAL =====

function openModal(cardId) {
  const card = allCardsData.find((c) => c.id === cardId);
  if (!card) return;

  document.getElementById('modalCardName').textContent = card.name;
  document.getElementById('modalCardBank').textContent = `${card.bank} • ${card.network} • ${card.category}`;

  const body = document.getElementById('modalBody');
  body.innerHTML = renderModalContent(card);

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modalOverlay') && event.target !== document.querySelector('.modal-close')) return;
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function renderModalContent(card) {
  const b = card.benefits;
  const v = card.verification || {};
  const badge = verificationBadge(card);
  const apply = safeUrl(card.applyUrl);
  const sourceLinks = card.sources.map((s) => safeUrl(s.url)).filter(Boolean);
  const rupees = (n) => (n == null ? 'Not verified yet' : `₹${n.toLocaleString('en-IN')}`);
  const visits = (n) => (n === -1 ? 'Unlimited' : n ? `${n} visits/year` : 'None');
  const yesNo = (on) => (on ? '✅ Available' : '❌ None');
  // One tile; "field" links it to the verification quote for that value, if any.
  const item = (label, value, cls = '', field = '') => `
    <div class="detail-item">
      <div class="detail-item-label">${escapeHtml(label)}</div>
      <div class="detail-item-value ${cls}">${escapeHtml(value)}</div>
      ${field && v[field] ? `<details class="quote"><summary>ⓘ Source</summary>“${escapeHtml(v[field].quote)}” — checked ${escapeHtml(v[field].verifiedAt)}</details>` : ''}
    </div>`;
  const section = (title, body) => `<div class="detail-section"><div class="detail-section-title">${title}</div>${body}</div>`;

  let html = `
    <div class="detail-section verify-note verify-${badge.kind}">
      <strong>${escapeHtml(badge.text)}</strong>${card.lastCheckedAt ? ` · page last checked ${escapeHtml(card.lastCheckedAt.slice(0, 10))}` : ''}
      <p>${badge.kind === 'verified'
        ? 'Every fee, rate and benefit marked ⓘ is quoted from the bank\'s own page.'
        : badge.kind === 'outdated'
          ? 'These details were checked against the bank\'s page before, but not recently — they may have changed.'
          : 'Some details on this card have not been checked against the bank\'s page yet.'}
        Always confirm on the bank's website before you apply.</p>
      ${sourceLinks.map((u) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer">Official card page ↗</a>`).join(' ')}
    </div>`;

  if (apply) {
    html += `
    <div class="detail-section" style="text-align: center;">
      <a href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer" class="apply-btn">🚀 Apply on ${escapeHtml(card.bank)}'s site</a>
    </div>`;
  }

  html += section('💳 Card Overview', `<div class="detail-grid">
    ${item('Type', card.isLTF ? 'Lifetime Free' : 'Annual Fee Card', card.isLTF ? 'green' : 'gold')}
    ${item('Annual Fee', rupees(card.annualFee), card.isLTF ? 'green' : 'gold', 'annualFee')}
    ${item('Joining Fee', rupees(card.joiningFee), '', 'joiningFee')}
    ${item('Reward Rate', card.rewardRate || 'Not verified yet', 'green', 'rewardRate')}
    ${item('Network', card.network)}
    ${item('Category', card.category)}
  </div>`);

  if (!b) {
    html += section('🎁 Benefits', '<p class="benefits-pending">Benefits for this card have not been verified yet. Check the bank\'s page for current rewards and perks.</p>');
  } else {
    if (b.cashback) {
      html += section('💰 Cashback & Rewards', `
        <p class="detail-text">${escapeHtml(b.cashback.description || '')}</p>
        <ul class="detail-list">${(b.cashback.details || []).map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`);
    }
    const air = b.lounges?.airport || {};
    const rail = b.lounges?.railway || {};
    html += section('✈️ Lounge Access', `<div class="detail-grid">
      ${item('Domestic Airport', visits(air.domestic), air.domestic ? 'green' : 'red', 'loungeDomestic')}
      ${item('International Airport', visits(air.international), air.international ? 'green' : 'red', 'loungeInternational')}
      ${item('Railway Lounge', visits(rail.count), rail.count ? 'green' : 'red')}
    </div>`);
    html += section('🎁 Other Benefits', `<div class="detail-grid">
      ${item('Golf', yesNo(b.golf?.available), b.golf?.available ? 'green' : 'red', 'golf')}
      ${item('Forex Markup', b.forex?.markupFee || 'Not verified yet', b.forex?.markupFee === '0%' ? 'green' : '', 'forexMarkup')}
      ${item('Fuel', b.fuel?.surchargeWaiver ? '✅ Surcharge waiver' : '❌ None', b.fuel?.surchargeWaiver ? 'green' : 'red')}
      ${item('Dining', yesNo(b.dining?.available), b.dining?.available ? 'green' : 'red')}
      ${item('Movies', yesNo(b.movies?.available), b.movies?.available ? 'green' : 'red')}
    </div>`);
    if (b.other?.length) {
      html += section('📌 Key Highlights', `<ul class="detail-list">${b.other.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>`);
    }
  }

  const e = card.eligibility || {};
  html += section('📋 Eligibility', `<div class="detail-grid">
    ${item('Min. Annual Income', rupees(e.minIncome), '', 'minIncome')}
    ${item('Min. Age', e.minAge == null ? 'Not verified yet' : `${e.minAge} years`, '', 'minAge')}
  </div>`);

  return html;
}

// ===== TOAST NOTIFICATIONS =====

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

  container.appendChild(toast);

  // Auto-remove after animation
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ===== CHATBOT LOGIC =====

let chatHistory = [];
let isChatbotOpen = false;
let isWaitingForResponse = false;

function toggleChat() {
  const panel = document.getElementById('chatbotPanel');
  const fabPulse = document.querySelector('.chatbot-fab-pulse');

  isChatbotOpen = !isChatbotOpen;

  if (isChatbotOpen) {
    panel.classList.add('active');
    if (fabPulse) fabPulse.style.display = 'none'; // Stop pulsing once opened
    document.getElementById('chatbotInput').focus();
  } else {
    panel.classList.remove('active');
  }
}

function handleSuggestedQuestion(btnEl) {
  const question = btnEl.textContent.replace(/^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]\s*/g, ''); // Remove emoji
  document.getElementById('chatbotInput').value = question;
  sendChatMessage();
}

async function sendChatMessage() {
  if (isWaitingForResponse) return;

  const inputEl = document.getElementById('chatbotInput');
  const message = inputEl.value.trim();

  if (!message) return;

  // Add user message to UI
  addMessageToUI('user', message);
  inputEl.value = '';

  // Hide suggestions if they are visible
  const suggestions = document.getElementById('chatbotSuggestions');
  if (suggestions) suggestions.style.display = 'none';

  isWaitingForResponse = true;
  document.getElementById('chatbotSend').disabled = true;

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, history: chatHistory })
    });

    const data = await res.json();

    // Remove typing indicator
    document.getElementById(typingId)?.remove();

    if (res.ok) {
      addMessageToUI('bot', data.reply);
      // Save history
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'bot', content: data.reply });
    } else {
      addMessageToUI('bot', data.reply || 'Sorry, something went wrong.');
    }
  } catch (err) {
    console.error('Chat error:', err);
    document.getElementById(typingId)?.remove();
    addMessageToUI('bot', 'Network error. Please try again later.');
  } finally {
    isWaitingForResponse = false;
    document.getElementById('chatbotSend').disabled = false;
    inputEl.focus();
  }
}

function addMessageToUI(sender, text) {
  const messagesEl = document.getElementById('chatbotMessages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;

  if (sender === 'bot') {
    bubble.innerHTML = renderMarkdown(text); // escapes the reply before formatting
  } else {
    bubble.textContent = text;
  }

  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chatbotMessages');
  const id = 'typing-' + Date.now();

  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-bubble bot typing-indicator';
  div.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return id;
}
