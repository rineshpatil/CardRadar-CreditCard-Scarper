/**
 * CardRadar Dashboard — Frontend JavaScript
 */

const API_BASE = '';

// State
let allCards = [];
let allBanks = [];
let currentFilter = 'all';
let currentSort = 'popularity';
let currentSearch = '';
let currentBank = '';

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  // Auth-gate: redirect to login if not authenticated
  try {
    const res = await fetch('/api/auth/user');
    if (!res.ok) {
      window.location.href = '/login.html';
      return;
    }
    const data = await res.json();
    // Show user profile
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'flex';
    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) nameDisplay.textContent = data.user.name || data.user.email.split('@')[0];
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  initTheme();
  fetchBanks();
  fetchCards();
});

// ===== AUTH =====
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/user');
    if (res.ok) {
      const data = await res.json();
      const loginBtn = document.getElementById('loginBtn');
      const userProfile = document.getElementById('userProfile');
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      const nameDisplay = document.getElementById('userNameDisplay');
      if (nameDisplay) nameDisplay.textContent = data.user.name || data.user.email.split('@')[0];
    }
  } catch (err) {
    console.error('Auth check error', err);
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch(err) {
    console.error('Logout error', err);
  }
}


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

async function fetchCards() {
  try {
    const params = new URLSearchParams();
    if (currentFilter !== 'all') params.set('filter', currentFilter);
    if (currentSort) params.set('sort', currentSort);
    if (currentSearch) params.set('search', currentSearch);
    if (currentBank) params.set('bank', currentBank);

    const res = await fetch(`${API_BASE}/api/cards?${params}`);
    const data = await res.json();

    allCards = data.cards;
    updateStats(data.stats);
    renderCards(data.cards);
    updateSectionHeader();
  } catch (err) {
    console.error('Failed to fetch cards:', err);
    showToast('Failed to load card data', 'error');
  }
}

async function fetchBanks() {
  try {
    const res = await fetch(`${API_BASE}/api/banks`);
    const banks = await res.json();
    allBanks = banks;
    renderBankChips(banks);
  } catch (err) {
    console.error('Failed to fetch banks:', err);
  }
}

// ===== RENDERING =====

function renderCards(cards) {
  const standardGrid = document.getElementById('cardGrid');
  const cobrandedGrid = document.getElementById('cobrandedGrid');
  const cobrandedSection = document.getElementById('cobrandedCardsSection');
  const standardCount = document.getElementById('sectionCount');
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
  
  if (standardCount && document.getElementById('sectionTitle').textContent !== 'All Credit Cards') {
    // Only override count if it's already updated by updateSectionHeader
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
  const isLTF = card.isLTF;
  const cardClass = isLTF ? 'ltf-card' : 'premium-card';
  const feeText = isLTF
    ? '<strong>Lifetime Free</strong> — ₹0 Annual Fee'
    : `Annual Fee: <span class="fee-amount">₹${card.annualFee.toLocaleString()}</span>`;

  const benefitIcons = [
    {
      icon: '✈️',
      key: 'airport',
      available: card.benefits.lounges.airport.domestic !== 0 || card.benefits.lounges.airport.international !== 0,
      tip: card.benefits.lounges.airport.description
    },
    {
      icon: '🚂',
      key: 'railway',
      available: card.benefits.lounges.railway.count !== 0,
      tip: card.benefits.lounges.railway.description
    },
    {
      icon: '⛳',
      key: 'golf',
      available: card.benefits.golf.available,
      tip: card.benefits.golf.description
    },
    {
      icon: '💰',
      key: 'cashback',
      available: true,
      tip: card.benefits.cashback.description
    },
    {
      icon: '🌍',
      key: 'forex',
      available: card.benefits.forex.markupFee === '0%',
      tip: card.benefits.forex.description
    },
    {
      icon: '⛽',
      key: 'fuel',
      available: card.benefits.fuel && card.benefits.fuel.surchargeWaiver,
      tip: card.benefits.fuel ? card.benefits.fuel.description : 'No fuel benefits'
    },
    {
      icon: '🍽️',
      key: 'dining',
      available: card.benefits.dining && card.benefits.dining.available,
      tip: card.benefits.dining ? card.benefits.dining.description || 'Dining offers available' : 'No dining benefits'
    },
    {
      icon: '🎬',
      key: 'movies',
      available: card.benefits.movies && card.benefits.movies.available,
      tip: card.benefits.movies ? card.benefits.movies.description || 'Movie benefits available' : 'No movie benefits'
    }
  ];

  const maxPopularity = 100;
  const popPercent = Math.min((card.popularityScore / maxPopularity) * 100, 100);

  return `
    <div class="credit-card ${cardClass}" onclick="openModal('${card.id}')">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-bank">${card.bank}</span>
          <div class="card-badges">
            ${isLTF ? '<span class="badge badge-ltf">LTF</span>' : '<span class="badge badge-premium">Premium</span>'}
            <span class="badge badge-network">${card.network}</span>
          </div>
        </div>
        <h3 class="card-name">${card.name}</h3>
        <p class="card-fee">${feeText}</p>
        <div class="benefit-icons">
          ${benefitIcons.map(b => `
            <div class="benefit-icon ${b.available ? 'available' : 'unavailable'}">
              ${b.icon}
              <span class="tooltip">${b.tip}</span>
            </div>
          `).join('')}
        </div>
        <div class="card-highlights">
          ${card.highlights.slice(0, 3).map(h => `<span class="highlight-tag">${h}</span>`).join('')}
        </div>
        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-icon">🏷️</span>
            <span>${card.category}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⭐</span>
            <span>Rewards: ${card.rewardRate}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📊</span>
            <span>Score: ${card.popularityScore}</span>
          </div>
        </div>
        <div class="popularity-bar">
          <div class="fill" style="width: ${popPercent}%"></div>
        </div>
      </div>
    </div>
  `;
}

// ===== BANK CHIPS =====

function renderBankChips(banks) {
  const container = document.getElementById('bankChips');
  if (!container) return;

  let html = `
    <button class="bank-chip ${currentBank === '' ? 'active' : ''}" onclick="setBank('', this)">
      <span class="bank-chip-icon">🏦</span>
      <span class="bank-chip-name">All Banks</span>
      <span class="bank-chip-count">${banks.reduce((sum, b) => sum + b.cardCount, 0)}</span>
    </button>
  `;

  const bankIcons = {
    'HDFC Bank': '🔵', 'ICICI Bank': '🟠', 'Axis Bank': '🟣',
    'IDFC FIRST Bank': '🔴', 'SBI Card': '🔷', 'HSBC': '🔺',
    'American Express': '🟢', 'Federal Bank': '🟡', 'AU Small Finance Bank': '🟤',
    'IndusInd Bank': '🟦', 'RBL Bank': '🟥', 'IDBI Bank': '🟧'
  };

  for (const bank of banks) {
    const icon = bankIcons[bank.name] || '🏛️';
    html += `
      <button class="bank-chip ${currentBank === bank.name ? 'active' : ''}" onclick="setBank('${bank.name.replace(/'/g, "\\'")}', this)">
        <span class="bank-chip-icon">${icon}</span>
        <span class="bank-chip-name">${bank.name}</span>
        <span class="bank-chip-count">${bank.cardCount}</span>
      </button>
    `;
  }

  container.innerHTML = html;
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

  // Update active chip
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  fetchCards();
}

function setBank(bank, chipEl) {
  currentBank = bank;

  // Update active bank chip
  document.querySelectorAll('.bank-chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  fetchCards();
}

function handleSearch() {
  const input = document.getElementById('searchInput');
  currentSearch = input.value.trim();

  // Debounce
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(() => fetchCards(), 300);
}

function handleSort() {
  currentSort = document.getElementById('sortSelect').value;
  fetchCards();
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
  const card = allCards.find(c => c.id === cardId);
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
  const isLTF = card.isLTF;

  let html = '';

  // Apply Now Button
  if (card.applyUrl) {
    html += `
    <div class="detail-section" style="text-align: center;">
      <a href="${card.applyUrl}" target="_blank" rel="noopener noreferrer" class="apply-btn">
        🚀 Apply Now on ${card.bank}
      </a>
    </div>
    `;
  }

  // Fee & Basics
  html += `
    <div class="detail-section">
      <div class="detail-section-title">💳 Card Overview</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Type</div>
          <div class="detail-item-value ${isLTF ? 'green' : 'gold'}">${isLTF ? 'Lifetime Free' : 'Annual Fee Card'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Annual Fee</div>
          <div class="detail-item-value ${isLTF ? 'green' : 'gold'}">₹${card.annualFee.toLocaleString()}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Joining Fee</div>
          <div class="detail-item-value">₹${card.joiningFee.toLocaleString()}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Reward Rate</div>
          <div class="detail-item-value green">${card.rewardRate}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Network</div>
          <div class="detail-item-value">${card.network}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Category</div>
          <div class="detail-item-value">${card.category}</div>
        </div>
      </div>
    </div>
  `;

  // Cashback / Rewards
  html += `
    <div class="detail-section">
      <div class="detail-section-title">💰 Cashback & Rewards</div>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${card.benefits.cashback.description}</p>
      <ul class="detail-list">
        ${card.benefits.cashback.details.map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>
  `;

  // Lounge Access
  const lounge = card.benefits.lounges;
  html += `
    <div class="detail-section">
      <div class="detail-section-title">✈️ Lounge Access</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Domestic Airport</div>
          <div class="detail-item-value ${lounge.airport.domestic !== 0 ? 'green' : 'red'}">
            ${lounge.airport.domestic === -1 ? 'Unlimited' : lounge.airport.domestic === 0 ? 'None' : `${lounge.airport.domestic} visits${lounge.airport.perQuarter ? '/quarter' : lounge.airport.perYear ? '/year' : ''}`}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">International Airport</div>
          <div class="detail-item-value ${lounge.airport.international !== 0 ? 'green' : 'red'}">
            ${lounge.airport.international === -1 ? 'Unlimited' : lounge.airport.international === 0 ? 'None' : `${lounge.airport.international} visits${lounge.airport.perQuarter ? '/quarter' : lounge.airport.perYear ? '/year' : ''}`}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Railway Lounge</div>
          <div class="detail-item-value ${lounge.railway.count !== 0 ? 'green' : 'red'}">
            ${lounge.railway.count === 0 ? 'None' : `${lounge.railway.count} visits${lounge.railway.perQuarter ? '/quarter' : '/year'}`}
          </div>
        </div>
      </div>
    </div>
  `;

  // Golf
  html += `
    <div class="detail-section">
      <div class="detail-section-title">⛳ Golf Benefits</div>
      <div class="detail-item">
        <div class="detail-item-label">Golf Access</div>
        <div class="detail-item-value ${card.benefits.golf.available ? 'green' : 'red'}">
          ${card.benefits.golf.available ? '✅ Available' : '❌ Not Available'}
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">${card.benefits.golf.description}</p>
      </div>
    </div>
  `;

  // Other Benefits
  html += `
    <div class="detail-section">
      <div class="detail-section-title">🎁 Additional Benefits</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Forex Markup</div>
          <div class="detail-item-value ${card.benefits.forex.markupFee === '0%' ? 'green' : ''}">${card.benefits.forex.markupFee}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Fuel Benefit</div>
          <div class="detail-item-value ${card.benefits.fuel?.surchargeWaiver ? 'green' : 'red'}">
            ${card.benefits.fuel?.surchargeWaiver ? '✅ Surcharge Waiver' : '❌ None'}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Dining</div>
          <div class="detail-item-value ${card.benefits.dining?.available ? 'green' : 'red'}">
            ${card.benefits.dining?.available ? '✅ Available' : '❌ None'}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Movies</div>
          <div class="detail-item-value ${card.benefits.movies?.available ? 'green' : 'red'}">
            ${card.benefits.movies?.available ? '✅ Available' : '❌ None'}
          </div>
        </div>
      </div>
    </div>
  `;

  // Other notes
  if (card.benefits.other && card.benefits.other.length > 0) {
    html += `
      <div class="detail-section">
        <div class="detail-section-title">📌 Key Highlights</div>
        <ul class="detail-list">
          ${card.benefits.other.map(o => `<li>${o}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Eligibility
  if (card.eligibility) {
    html += `
      <div class="detail-section">
        <div class="detail-section-title">📋 Eligibility</div>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-item-label">Min. Annual Income</div>
            <div class="detail-item-value">₹${card.eligibility.minIncome.toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-item-label">Min. Age</div>
            <div class="detail-item-value">${card.eligibility.minAge} years</div>
          </div>
        </div>
      </div>
    `;
  }

  // Apply Button at bottom too
  if (card.applyUrl) {
    html += `
    <div class="detail-section" style="text-align: center; padding-top: 0.5rem;">
      <a href="${card.applyUrl}" target="_blank" rel="noopener noreferrer" class="apply-btn apply-btn-outline">
        🌐 Visit Official ${card.bank} Page
      </a>
    </div>
    `;
  }

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
    // Simple markdown formatting for bold and lists
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\s*-\s+(.*)/g, '<li>$1</li>');

    if (formattedText.includes('<li>')) {
      formattedText = formattedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    // Convert newlines to br
    formattedText = formattedText.replace(/\n(?!<ul|<\/ul>|<li>)/g, '<br>');
    bubble.innerHTML = formattedText;
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
