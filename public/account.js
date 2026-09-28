// Sign-in and subscription screens for CardRadar AI, shared by the landing and cards pages. Load after lib.js.
// The server enforces sign-in and the free allowance; this file only shows the right screen.
// Pages read `account.info` (null when signed out), call account.open(), and listen with account.onChange(fn).

(() => {
const TOKEN_KEY = 'cardradar-session';

const account = {
  config: { plans: [], freePerDay: 3 }, // GET /api/config
  info: null,                           // GET /api/me, null when signed out
  say: () => {},                        // pages point this at their own toast
  listeners: [],
  pendingEmail: '',
  opener: null,
};

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

account.onChange = (fn) => account.listeners.push(fn);
account.token = sessionToken;
account.headers = authHeaders;

account.setInfo = (info) => {
  account.info = info;
  account.listeners.forEach((fn) => fn(info));
};

account.load = async () => {
  try {
    account.config = await api('/api/config');
  } catch (err) {
    // Static hosting (GitHub Pages) has no /api: hide chat, sign-in and PRO. A 5xx is a server hiccup, not "no server".
    if (!err.status || err.status === 404) { document.documentElement.setAttribute('data-no-server', ''); return; }
  }
  if (sessionToken()) {
    try { account.setInfo(await api('/api/me')); } catch (err) { if (err.status === 401) setSessionToken(null); }
  }
};

account.signOut = () => {
  setSessionToken(null);
  account.setInfo(null);
  account.close();
  account.say('Signed out');
};

// After a request: pick up the account the server sent back and open the right screen for 401 / 402.
account.handleReply = (res, data) => {
  if (data.account) account.setInfo(data.account);
  if (res.status === 401) { setSessionToken(null); account.setInfo(null); account.open('signin'); }
  else if (res.status === 402) account.open('paywall');
};

// ===== Dialog =====

const dialogEl = () => document.getElementById('acct-dialog');

account.close = () => {
  dialogEl()?.remove();
  document.removeEventListener('keydown', onDialogKey);
  const back = account.opener;
  account.opener = null;
  if (back && document.contains(back)) back.focus();
};

function onDialogKey(e) {
  const dialog = dialogEl();
  if (!dialog) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); account.close(); return; }
  if (e.key !== 'Tab') return;
  const items = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')].filter((n) => !n.closest('[hidden]'));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// kind: 'signin' | 'paywall' | 'status'. Defaults to sign-in when signed out, otherwise the account summary.
account.open = (kind, note) => {
  if (!dialogEl()) {
    account.opener = document.activeElement;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="acct-dialog" class="acct-scrim">
        <div class="acct-panel" role="dialog" aria-modal="true" aria-labelledby="acct-title"></div>
      </div>`);
    dialogEl().addEventListener('click', (e) => { if (e.target === dialogEl()) account.close(); });
    document.addEventListener('keydown', onDialogKey, true);
  }
  render(kind || (account.info ? 'status' : 'signin'), note);
};

function message(text, kind = 'error') {
  const el = document.getElementById('acct-message');
  if (el) { el.textContent = text; el.className = `acct-message ${kind}`; }
}

function render(kind, note = '') {
  const panel = dialogEl().querySelector('.acct-panel');
  const close = '<button class="acct-close" type="button" data-acct="close" aria-label="Close">&times;</button>';
  const noteHtml = note ? `<p class="acct-note">${escapeHtml(note)}</p>` : '';
  const free = account.config.freePerDay ?? 3;

  if (kind === 'signin') {
    panel.innerHTML = `${close}
      <h2 id="acct-title">Sign in to CardRadar AI</h2>
      <p>Get ${free} free answers every day. Go PRO for unlimited.</p>
      ${noteHtml}
      ${account.config.googleClientId ? '<div id="acct-google" class="acct-google"></div><div class="acct-divider"><span>or</span></div>' : ''}
      <form id="acct-email-form">
        <label for="acct-email">Email</label>
        <input id="acct-email" type="email" autocomplete="email" required placeholder="you@example.com" value="${escapeHtml(account.pendingEmail)}">
        <button class="acct-btn primary" type="submit">Send me a code</button>
      </form>
      <form id="acct-code-form" hidden>
        <label for="acct-code">6-digit code sent to <strong id="acct-code-email"></strong></label>
        <input id="acct-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="123456">
        <button class="acct-btn primary" type="submit">Verify &amp; sign in</button>
        <button class="acct-link" type="button" data-acct="signin">Use a different email</button>
      </form>
      <p id="acct-message" class="acct-message" role="status"></p>`;
    if (account.config.googleClientId) renderGoogleButton();
    document.getElementById('acct-email').focus();
    return;
  }

  if (kind === 'status') {
    const info = account.info;
    const plan = info.subscribed
      ? `<span class="acct-badge">PRO</span> Unlimited answers, renews ${escapeHtml(info.paidUntil.slice(0, 10))}`
      : `Free plan: ${info.freeLeft} of ${info.freePerDay} questions left today`;
    panel.innerHTML = `${close}
      <h2 id="acct-title">Your account</h2>
      <p><strong>${escapeHtml(info.email)}</strong></p>
      <p>${plan}</p>
      ${noteHtml}
      ${info.subscribed ? '' : '<button class="acct-btn primary" type="button" data-acct="paywall">Go PRO</button>'}
      <button class="acct-btn" type="button" data-acct="signout">Sign out</button>`;
    panel.querySelector('button.primary, button:not(.acct-close)').focus();
    return;
  }

  const plans = account.config.plans || [];
  const monthly = plans.find((p) => p.id === 'monthly');
  panel.innerHTML = `${close}
    <h2 id="acct-title">Go PRO</h2>
    <p>Unlimited CardRadar AI answers and side-by-side comparison of up to 4 cards.</p>
    ${noteHtml}
    <div class="acct-plans">
      ${plans.map((p) => {
        const saving = monthly && p.days > monthly.days ? Math.round(100 - (p.price / (monthly.price * 12)) * 100) : 0;
        return `<button class="acct-plan ${saving ? 'best' : ''}" type="button" data-acct="subscribe" data-plan="${escapeHtml(p.id)}">
          ${saving ? `<span class="acct-tag">Save ${saving}%</span>` : ''}
          <span>${escapeHtml(p.name)}</span>
          <strong>₹${p.price.toLocaleString('en-IN')}<small>/${p.days > 31 ? 'year' : 'month'}</small></strong>
        </button>`;
      }).join('')}
    </div>
    ${account.config.paymentsLive ? '' : '<p class="acct-note">Payments open soon.</p>'}
    <p id="acct-message" class="acct-message" role="status"></p>`;
  panel.querySelector('.acct-plan, .acct-close').focus();
}

// One listener for every button and form inside the dialog.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#acct-dialog [data-acct]');
  if (!btn) return;
  const action = btn.dataset.acct;
  if (action === 'close') account.close();
  else if (action === 'signin') render('signin');
  else if (action === 'paywall') account.open(account.info ? 'paywall' : 'signin');
  else if (action === 'signout') account.signOut();
  else if (action === 'subscribe') account.subscribe(btn.dataset.plan);
  else if (action === 'mock-pay') completeMockPayment(btn.dataset.plan);
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'acct-email-form') { e.preventDefault(); requestCode(); }
  else if (e.target.id === 'acct-code-form') { e.preventDefault(); verifyCode(); }
});

async function requestCode() {
  const email = document.getElementById('acct-email').value.trim();
  try {
    await api('/api/auth/email/start', { email });
    account.pendingEmail = email;
    document.getElementById('acct-email-form').hidden = true;
    document.getElementById('acct-code-form').hidden = false;
    document.getElementById('acct-code-email').textContent = email;
    document.getElementById('acct-code').focus();
    message('Code sent. It expires in 10 minutes.', 'ok');
  } catch (err) {
    message(err.message);
  }
}

async function verifyCode() {
  try {
    const { token } = await api('/api/auth/email/verify', { email: account.pendingEmail, code: document.getElementById('acct-code').value });
    await finishSignIn(token);
  } catch (err) {
    message(err.message);
  }
}

function renderGoogleButton() {
  const draw = () => {
    google.accounts.id.initialize({
      client_id: account.config.googleClientId,
      callback: async ({ credential }) => {
        try { await finishSignIn((await api('/api/auth/google', { credential })).token); } catch (err) { message(err.message); }
      },
    });
    const el = document.getElementById('acct-google');
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
  account.setInfo(await api('/api/me'));
  account.pendingEmail = '';
  account.close();
  account.say(`Signed in as ${account.info.email}`);
}

account.subscribe = async (planId) => {
  if (!account.info) return account.open('signin');
  if (!dialogEl()) account.open('paywall');
  try {
    const checkout = await api('/api/subscribe', { plan: planId });
    if (checkout.checkoutUrl) { window.location.href = checkout.checkoutUrl; return; } // real gateway
    if (checkout.mode === 'mock') {
      document.querySelector('.acct-mock')?.remove();
      document.querySelector('.acct-plans').insertAdjacentHTML('afterend', `
        <div class="acct-mock">
          <p><strong>Test mode:</strong> no payment gateway is connected yet.</p>
          <button class="acct-btn primary" type="button" data-acct="mock-pay" data-plan="${escapeHtml(planId)}">Simulate successful payment</button>
        </div>`);
    }
  } catch (err) {
    message(err.message);
  }
};

async function completeMockPayment(planId) {
  try {
    account.setInfo(await api('/api/subscribe/mock-complete', { plan: planId }));
    account.close();
    account.say('Welcome to CardRadar PRO');
  } catch (err) {
    message(err.message);
  }
}

window.account = account;
})();
