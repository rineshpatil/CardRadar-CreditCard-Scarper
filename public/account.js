// Sign-in and subscription screens for CardRadar AI. Loaded after app.js on every page that has the chat panel.
// The server enforces sign-in and the free allowance; this file only shows the right screen.

const TOKEN_KEY = 'cardradar-session';
let accountConfig = null; // GET /api/config
let accountInfo = null;   // GET /api/me, null when signed out
let pendingEmail = '';

function sessionToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: stays signed in for this page only */ }
}

function authHeaders() {
  const token = sessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status, data });
  return data;
}

document.addEventListener('DOMContentLoaded', initAccount);

// Escape closes the sign-in / Go PRO screen first, before anything else on the page.
document.addEventListener('keydown', (e) => {
  const gate = document.getElementById('chatbotGate');
  if (e.key === 'Escape' && gate && !gate.hidden) hideChatGate();
});

async function initAccount() {
  const panel = document.getElementById('chatbotPanel');
  if (!panel) return;
  panel.querySelector('.chatbot-header').insertAdjacentHTML('afterend', `
    <div class="chatbot-account" id="chatbotAccount"></div>
    <div class="chatbot-gate" id="chatbotGate" hidden></div>`);
  document.querySelector('.navbar-actions')?.insertAdjacentHTML('afterbegin',
    '<button class="account-pill" id="accountPill" type="button" onclick="openAccount()">Sign in</button>');

  try { accountConfig = await api('/api/config'); } catch { accountConfig = { plans: [], freePerDay: 3 }; }
  if (sessionToken()) {
    try { accountInfo = await api('/api/me'); } catch (err) { if (err.status === 401) setSessionToken(null); }
  }
  renderAccountBar();
}

function setAccountInfo(info) {
  accountInfo = info;
  renderAccountBar();
  if (typeof onAccountChanged === 'function') onAccountChanged(); // tools.js, cards page only
}

function renderAccountBar() {
  const bar = document.getElementById('chatbotAccount');
  const pill = document.getElementById('accountPill');
  if (!bar) return;
  const free = accountConfig?.freePerDay ?? 3;
  if (!accountInfo) {
    bar.innerHTML = `<span>🔒 Sign in to ask · ${free} free questions a day</span><button type="button" onclick="showChatGate('signin')">Sign in</button>`;
    if (pill) { pill.textContent = 'Sign in'; pill.classList.remove('pro'); }
  } else if (accountInfo.subscribed) {
    bar.innerHTML = `<span class="pro-badge">✦ PRO</span><span>Unlimited · renews ${escapeHtml(accountInfo.paidUntil.slice(0, 10))}</span><button type="button" onclick="signOut()">Sign out</button>`;
    if (pill) { pill.textContent = '✦ PRO'; pill.classList.add('pro'); }
  } else {
    bar.innerHTML = `<span>${accountInfo.freeLeft} of ${accountInfo.freePerDay} free questions left today</span><button type="button" class="upgrade" onclick="showChatGate('paywall')">Go PRO</button>`;
    if (pill) { pill.textContent = 'Go PRO'; pill.classList.remove('pro'); }
  }
}

function openAccount() {
  if (!isChatbotOpen) toggleChat();
  if (!accountInfo) showChatGate('signin');
  else if (!accountInfo.subscribed) showChatGate('paywall');
}

function hideChatGate() {
  const gate = document.getElementById('chatbotGate');
  if (gate) gate.hidden = true;
  if (isChatbotOpen) document.getElementById('chatbotInput')?.focus();
}

function gateMessage(text, kind = 'error') {
  const el = document.getElementById('gateMessage');
  if (el) { el.textContent = text; el.className = `gate-message ${kind}`; }
}

function showChatGate(kind) {
  const gate = document.getElementById('chatbotGate');
  if (!gate) return;
  gate.hidden = false;
  const close = '<button class="gate-close" type="button" onclick="hideChatGate()" aria-label="Close">&times;</button>';

  if (kind === 'signin') {
    const free = accountConfig?.freePerDay ?? 3;
    gate.innerHTML = `${close}
      <div class="gate-icon">🔐</div>
      <h3>Sign in to CardRadar AI</h3>
      <p>Get ${free} free answers every day. Go PRO for unlimited.</p>
      ${accountConfig?.googleClientId ? '<div id="googleButton" class="google-button"></div><div class="gate-divider"><span>or</span></div>' : ''}
      <form id="emailForm" onsubmit="event.preventDefault(); requestCode()">
        <label for="gateEmail">Email</label>
        <input id="gateEmail" type="email" autocomplete="email" required placeholder="you@example.com" value="${escapeHtml(pendingEmail)}">
        <button class="btn btn-primary" type="submit">Send me a code</button>
      </form>
      <form id="codeForm" hidden onsubmit="event.preventDefault(); verifyCode()">
        <label for="gateCode">6-digit code sent to <strong id="codeEmail"></strong></label>
        <input id="gateCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="123456">
        <button class="btn btn-primary" type="submit">Verify &amp; sign in</button>
        <button class="gate-link" type="button" onclick="showChatGate('signin')">Use a different email</button>
      </form>
      <p class="gate-message" id="gateMessage" role="status"></p>`;
    if (accountConfig?.googleClientId) renderGoogleButton();
    document.getElementById('gateEmail').focus();
    return;
  }

  const plans = accountConfig?.plans || [];
  const monthly = plans.find((p) => p.id === 'monthly');
  gate.innerHTML = `${close}
    <div class="gate-icon">✦</div>
    <h3>Go PRO</h3>
    <p>Unlimited CardRadar AI answers and side-by-side comparison of up to 4 cards.</p>
    <div class="plan-list">
      ${plans.map((p) => {
        const saving = monthly && p.days > monthly.days ? Math.round(100 - (p.price / (monthly.price * 12)) * 100) : 0;
        return `<button class="plan-card ${saving ? 'best' : ''}" type="button" onclick="subscribe('${escapeHtml(p.id)}')">
          ${saving ? `<span class="plan-tag">Save ${saving}%</span>` : ''}
          <span class="plan-name">${escapeHtml(p.name)}</span>
          <span class="plan-price">₹${p.price.toLocaleString('en-IN')}<small>/${p.days > 31 ? 'year' : 'month'}</small></span>
        </button>`;
      }).join('')}
    </div>
    ${accountConfig?.paymentsLive ? '' : '<p class="gate-note">Payments open soon.</p>'}
    <p class="gate-message" id="gateMessage" role="status"></p>`;
}

async function requestCode() {
  const email = document.getElementById('gateEmail').value.trim();
  try {
    await api('/api/auth/email/start', { email });
    pendingEmail = email;
    document.getElementById('emailForm').hidden = true;
    document.getElementById('codeForm').hidden = false;
    document.getElementById('codeEmail').textContent = email;
    document.getElementById('gateCode').focus();
    gateMessage('Code sent. It expires in 10 minutes.', 'ok');
  } catch (err) {
    gateMessage(err.message);
  }
}

async function verifyCode() {
  try {
    const { token } = await api('/api/auth/email/verify', { email: pendingEmail, code: document.getElementById('gateCode').value });
    await finishSignIn(token);
  } catch (err) {
    gateMessage(err.message);
  }
}

function renderGoogleButton() {
  const draw = () => {
    google.accounts.id.initialize({
      client_id: accountConfig.googleClientId,
      callback: async ({ credential }) => {
        try { await finishSignIn((await api('/api/auth/google', { credential })).token); } catch (err) { gateMessage(err.message); }
      },
    });
    const el = document.getElementById('googleButton');
    if (el) google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', width: 280 });
  };
  if (window.google?.accounts) return draw();
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = draw;
  document.head.appendChild(script);
}

async function finishSignIn(token) {
  setSessionToken(token);
  setAccountInfo(await api('/api/me'));
  pendingEmail = '';
  hideChatGate();
  showToast(`Signed in as ${accountInfo.email}`, 'success');
}

function signOut() {
  setSessionToken(null);
  setAccountInfo(null);
  showToast('Signed out', 'info');
}

async function subscribe(planId) {
  if (!accountInfo) return showChatGate('signin');
  try {
    const checkout = await api('/api/subscribe', { plan: planId });
    if (checkout.checkoutUrl) { window.location.href = checkout.checkoutUrl; return; } // real gateway
    if (checkout.mode === 'mock') {
      document.querySelector('.mock-pay')?.remove();
      document.querySelector('.plan-list').insertAdjacentHTML('afterend', `
        <div class="mock-pay">
          <p><strong>Test mode:</strong> no payment gateway is connected yet.</p>
          <button class="btn btn-primary" type="button" onclick="completeMockPayment('${escapeHtml(planId)}')">Simulate successful payment</button>
        </div>`);
    }
  } catch (err) {
    gateMessage(err.message);
  }
}

async function completeMockPayment(planId) {
  try {
    setAccountInfo(await api('/api/subscribe/mock-complete', { plan: planId }));
    hideChatGate();
    showToast('Welcome to CardRadar PRO ✦', 'success');
  } catch (err) {
    gateMessage(err.message);
  }
}
