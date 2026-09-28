// Cards page. Markup comes from dashboard.tpl.js (compiled from design/dashboard.dc.html); this file is its state and data.
// Needs lib.js, dc.js, account.js and dashboard.tpl.js.
(() => {
const BEN = [
  { key: 'ltf', label: 'Lifetime free', icon: 'spark', test: (c) => c.isLTF },
  { key: 'premium', label: 'Premium', icon: 'crown', test: (c) => !c.isLTF },
  { key: 'lounge', label: 'Airport lounge', icon: 'plane', test: (c) => FILTERS.lounge(c) },
  { key: 'railway', label: 'Railway lounge', icon: 'train', test: (c) => FILTERS.railway(c) },
  { key: 'golf', label: 'Golf', icon: 'flag', test: (c) => FILTERS.golf(c) },
  { key: 'cashback', label: 'Cashback', icon: 'coin', test: (c) => FILTERS.cashback(c) },
  { key: 'forex', label: 'Zero forex', icon: 'globe', test: (c) => FILTERS.forex(c) },
  { key: 'fuel', label: 'Fuel waiver', icon: 'fuel', test: (c) => c.benefits?.fuel?.surchargeWaiver === true },
  { key: 'dining', label: 'Dining', icon: 'dine', test: (c) => c.benefits?.dining?.available === true },
  { key: 'movies', label: 'Movies', icon: 'film', test: (c) => c.benefits?.movies?.available === true },
];
const BENMAP = Object.fromEntries(BEN.map((b) => [b.key, b]));
const TIERS = [['entry', 'Entry'], ['mid', 'Mid-range'], ['premium', 'Premium'], ['super_premium', 'Super premium'], ['private', 'Invite only']];
const TIERMAP = Object.fromEntries(TIERS);
const NETS = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Diners'];
const NETFILL = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const STATUS = {
  verified: { label: 'Verified', color: 'var(--status-verified)' },
  outdated: { label: 'May be outdated', color: 'var(--status-outdated)' },
  unverified: { label: 'Unverified', color: 'var(--status-unverified)' },
};
const FEE_B = [
  { k: 'free', label: 'Free', r: [0, 0] }, { k: '1k', label: '≤ ₹1,000', r: [1, 1000] },
  { k: '5k', label: '≤ ₹5,000', r: [1001, 5000] }, { k: '10k', label: '≤ ₹10,000', r: [5001, 10000] },
  { k: 'max', label: '> ₹10,000', r: [10001, Infinity] },
];
// #filter=<name> links from the landing page, mapped to a benefit filter.
const ALIAS = { ltf: 'ltf', 'non-ltf': 'premium', lounge: 'lounge', railway: 'railway', golf: 'golf', cashback: 'cashback', forex: 'forex', fuel: 'fuel' };
const SORT_ALIAS = { popularity: ['pop', 'desc'], 'fee-low': ['fee', 'asc'], 'fee-high': ['fee', 'desc'], reward: ['reward', 'desc'], name: ['name', 'asc'], bank: ['bank', 'asc'] };
const QUIZ = [
  { key: 'income', q: 'What is your yearly income?', options: [['Under ₹3 lakh', 250000], ['₹3–6 lakh', 500000], ['₹6–12 lakh', 1000000], ['₹12–25 lakh', 2000000], ['Over ₹25 lakh', 1e9]] },
  { key: 'spend', q: 'Where do you spend the most?', options: [['Online shopping', 'online', 'coin'], ['Travel', 'travel', 'plane'], ['Dining & food delivery', 'dining', 'dine'], ['Fuel', 'fuel', 'fuel'], ['Everyday bills & groceries', 'everyday', 'spark']] },
  { key: 'maxFee', q: 'How much annual fee is OK?', options: [['Only lifetime free', 0], ['Up to ₹1,000', 1000], ['Up to ₹5,000', 5000], ['Any, if the card is worth it', Infinity]] },
  { key: 'lounge', q: 'Do airport lounges matter to you?', options: [['Yes, I fly often', true], ['Not really', false]] },
];
const COMPARE_FREE = 2;
const COMPARE_PRO = 4;
const inrFmt = new Intl.NumberFormat('en-IN');
const inr = (n) => `₹${inrFmt.format(n)}`;
const netsOf = (s) => {
  const out = [];
  if (/visa/i.test(s)) out.push('Visa');
  if (/master/i.test(s)) out.push('Mastercard');
  if (/rupay/i.test(s)) out.push('RuPay');
  if (/amex|american express/i.test(s)) out.push('Amex');
  if (/diners/i.test(s)) out.push('Diners');
  return out;
};
const rewardNum = (s) => { if (!s || !s.includes('%')) return null; const m = s.match(/\d+(\.\d+)?/g); return m ? Math.max(...m.map(Number)) : null; };
const lounge = (n) => (n === -1 ? 999 : n ?? null);
const visits = (n) => (n === -1 ? 'Unlimited' : n ? String(n) : '0');
// Table columns you can sort by, and how to read a card's value for each.
const GET = {
  name: (c) => c.name.toLowerCase(), bank: (c) => c.bank.toLowerCase(), fee: (c) => c._fee, joining: (c) => c.joiningFee,
  reward: (c) => c._reward, dom: (c) => (c.benefits ? lounge(c.benefits.lounges?.airport?.domestic) : null),
  intl: (c) => (c.benefits ? lounge(c.benefits.lounges?.airport?.international) : null),
  forex: (c) => { const v = parseFloat(c.benefits?.forex?.markupFee); return Number.isNaN(v) ? null : v; },
  income: (c) => c.eligibility?.minIncome ?? null, status: (c) => ({ verified: 0, outdated: 1, unverified: 2 })[c._status],
};
const parseSort = (s) => SORT_ALIAS[s] || (/^[a-z]+-(asc|desc)$/.test(s || '') && GET[s.split('-')[0]] ? s.split('-') : ['pop', 'desc']);
const encodeSort = (k, d) => { for (const [n, [kk, dd]] of Object.entries(SORT_ALIAS)) if (kk === k && dd === d) return n; return `${k}-${d}`; };
function sortCards(list, s) {
  const [k, d] = parseSort(s);
  if (k === 'pop') return list.sort((a, b) => ((a._status === 'verified' ? 0 : 1) - (b._status === 'verified' ? 0 : 1)) || b.popularityScore - a.popularityScore);
  const g = GET[k] || GET.name;
  const m = d === 'desc' ? -1 : 1;
  return list.sort((a, b) => {
    const x = g(a);
    const y = g(b);
    if (x == null && y == null) return a.name.localeCompare(b.name);
    if (x == null) return 1;
    if (y == null) return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * m || a.name.localeCompare(b.name);
  });
}
// The filters, view and sort live in the URL (?benefits=lounge&banks=...) so a filtered list can be shared.
const F0 = () => ({ benefits: [], banks: [], networks: [], tiers: [], fee: null, income: '', status: '', hideCo: false, seg: 'all', q: '', sort: 'popularity', view: 'grid' });
function stateToQuery(f) {
  const p = new URLSearchParams();
  for (const k of ['benefits', 'banks', 'networks', 'tiers']) if (f[k].length) p.set(k, f[k].join(','));
  if (f.fee) p.set('fee', `${f.fee[0]}-${f.fee[1]}`);
  if (f.status) p.set('status', f.status);
  if (f.hideCo) p.set('cobranded', 'hide');
  if (f.seg !== 'all') p.set('type', f.seg);
  if (f.q) p.set('q', f.q);
  if (f.sort !== 'popularity') p.set('sort', f.sort);
  if (f.view !== 'grid') p.set('view', f.view);
  return p.toString().replace(/\+/g, '%20');
}
function queryToState(str, base) {
  const p = new URLSearchParams(str);
  const f = { ...base };
  const list = (k) => (p.get(k) ? p.get(k).split(',').map((s) => s.trim()).filter(Boolean) : []);
  f.benefits = list('benefits').filter((k) => BENMAP[k]);
  f.banks = list('banks');
  f.networks = list('networks').filter((n) => NETS.includes(n));
  f.tiers = list('tiers').filter((t) => TIERMAP[t]);
  const fee = (p.get('fee') || '').match(/^(\d+)-(\d+)$/);
  f.fee = fee ? [+fee[1], +fee[2]] : null;
  f.status = STATUS[p.get('status')] ? p.get('status') : '';
  f.hideCo = p.get('cobranded') === 'hide';
  f.seg = ['bank', 'co'].includes(p.get('type')) ? p.get('type') : 'all';
  f.q = p.get('q') || '';
  if (p.get('sort')) f.sort = p.get('sort');
  if (['grid', 'list', 'table'].includes(p.get('view'))) f.view = p.get('view');
  return f;
}
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const CHAT_SUGGESTIONS = ['What is your salary range?', 'What are you looking for in a card?', 'Which cards have zero forex markup?', 'Best LTF cards with lounge access?', 'Best cashback card for online shopping?'];
const DRAWER_TABS = [['overview', 'Overview'], ['fees', 'Fees & rewards'], ['travel', 'Lounges & travel'], ['elig', 'Eligibility'], ['sources', 'Sources']];
const FIELD_LABEL = { annualFee: 'Annual fee', joiningFee: 'Joining fee', rewardRate: 'Reward rate', loungeDomestic: 'Domestic lounges', loungeInternational: 'International lounges', golf: 'Golf', forexMarkup: 'Forex markup', minIncome: 'Min. income', minAge: 'Min. age' };
const TABLE_COLS = [['name', 'Card', 'asc'], ['bank', 'Bank', 'asc'], ['fee', 'Annual fee', 'asc'], ['joining', 'Joining fee', 'asc'], ['reward', 'Reward rate', 'desc'], ['dom', 'Dom. lounges', 'desc'], ['intl', 'Intl. lounges', 'desc'], ['forex', 'Forex markup', 'asc'], ['income', 'Min. income', 'asc'], ['status', 'Status', 'asc']];

class Dashboard extends Page {
  constructor(root) {
    super(root, CRT.dashboard);
    let theme = 'dark';
    try { theme = localStorage.getItem('cardradar-theme') === 'light' ? 'light' : 'dark'; } catch { /* storage blocked */ }
    this.state = {
      loading: true, error: null, f: F0(), qInput: '', qFocus: false, w: window.innerWidth, theme,
      radarOpen: store.get('cardradar-radar-open', true), drawerId: null, tab: 'overview', sheetOpen: false, shortOpen: false,
      modal: null, quizStep: 0, quizAns: {}, chatOpen: false, chatMsgs: [], chatInput: '', chatWaiting: false,
      saved: store.get('cardradar-shortlist', []), compare: store.get('cardradar-compare', []), flipped: {},
      countP: 1, tips: {}, bankQ: '', toasts: [], incomeInput: '',
    };
    this.cards = [];
    this.focusStack = [];
    this.h = {};
    this.pushed = false;
    this.chatHistory = [];
    this.start();
  }

  isPro() { return Boolean(account.info?.subscribed); }

  start() {
    document.documentElement.removeAttribute('data-theme');
    if (this.state.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    window.addEventListener('resize', () => this.setState({ w: window.innerWidth }));
    document.addEventListener('keydown', (e) => this.handleKey(e));
    window.addEventListener('popstate', () => this.readHash(false));
    account.onChange(() => this.setState({}));
    account.say = (text) => this.toast(text);
    account.load();
    this.render();
    this.load();
  }

  load() {
    this.setState({ loading: true, error: null });
    fetch('data/cards.json').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((raw) => {
      raw.forEach((c) => {
        c._fee = c.isLTF ? 0 : c.annualFee; c._nets = netsOf(c.network); c._reward = rewardNum(c.rewardRate);
        c._badge = verificationBadge(c); c._status = c._badge.kind;
        c._text = [c.name, c.bank, c.category, ...(c.highlights || [])].join(' ').toLowerCase();
        c._ben = Object.fromEntries(BEN.map((b) => [b.key, b.test(c)]));
        this.h[c.id] = this.makeHandlers(c.id);
        c._vm = this.staticVm(c);
      });
      raw.sort((a, b) => b.popularityScore - a.popularityScore || a.name.localeCompare(b.name));
      this.cards = raw;
      this.byId = Object.fromEntries(raw.map((c) => [c.id, c]));
      this.feeMaxVal = Math.max(...raw.map((c) => c._fee));
      this.bankList = [...new Set(raw.map((c) => c.bank))].sort();
      let f = { ...this.state.f };
      try { f = queryToState(location.search, f); } catch { /* bad query string: start unfiltered */ }
      const alias = (location.hash.match(/^#filter=([\w-]+)/) || [])[1];
      if (alias === 'super-premium') f.tiers = ['super_premium'];
      else if (ALIAS[alias] && !f.benefits.includes(ALIAS[alias])) f.benefits = [...f.benefits, ALIAS[alias]];
      f.banks = f.banks.filter((b) => this.bankList.includes(b));
      const compare = this.state.compare.filter((id) => this.byId[id]);
      const saved = this.state.saved.filter((id) => this.byId[id]);
      this.setState({ loading: false, f, qInput: f.q, compare, saved, countP: reduceMotion() ? 1 : 0 }, () => {
        this.readHash(true);
        this.syncUrl();
        this.countUp();
      });
    }).catch((err) => this.setState({ loading: false, error: String(err.message || err) }));
  }

  countUp() {
    if (this.state.countP >= 1) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 800, 1);
      this.setState({ countP: 1 - Math.pow(1 - p, 3) });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Links into this page: #card=<id>, #quiz, #chat, #compare=<id>,<id>.
  readHash(initial) {
    const h = location.hash;
    const m = h.match(/^#card=([\w-]+)/);
    if (m && this.byId?.[m[1]]) { if (this.state.drawerId !== m[1]) this.openCard(m[1], false); }
    else if (this.state.drawerId) { this.pushed = false; this.setState({ drawerId: null }, () => this.restoreFocus()); }
    if (!initial) return;
    if (h === '#quiz') this.openQuiz();
    else if (h === '#chat') this.setState({ chatOpen: true });
    else if (/^#compare=/.test(h)) {
      const ids = h.slice(9).split(',').filter((id) => this.byId[id]).slice(0, this.limit());
      this.setState({ compare: ids });
      store.set('cardradar-compare', ids);
      if (ids.length >= 2) this.openModal('compare');
    }
  }

  syncUrl() {
    try {
      const q = stateToQuery(this.state.f);
      const hash = this.state.drawerId ? `#card=${this.state.drawerId}` : (location.hash === '#quiz' ? '#quiz' : '');
      history.replaceState(history.state, '', `${location.pathname}${q ? `?${q}` : ''}${hash}`);
    } catch { /* history blocked */ }
  }

  setF(patch) { this.setState((s) => ({ f: { ...s.f, ...patch } }), () => this.syncUrl()); }
  toggleIn(key, v) { const cur = this.state.f[key]; this.setF({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }); }
  toast(text) {
    const id = Math.random();
    this.setState((s) => ({ toasts: [...s.toasts, { id, text }] }));
    setTimeout(() => this.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  }

  // A card passes if it meets every active filter; `skip` leaves one out so its facet counts show what selecting it would add.
  match(c, f, skip) {
    if (skip !== 'benefits' && f.benefits.some((k) => !c._ben[k])) return false;
    if (skip !== 'banks' && f.banks.length && !f.banks.includes(c.bank)) return false;
    if (skip !== 'networks' && f.networks.length && !c._nets.some((n) => f.networks.includes(n))) return false;
    if (skip !== 'tiers' && f.tiers.length && !f.tiers.includes(c.tier)) return false;
    if (skip !== 'fee' && f.fee && (c._fee < f.fee[0] || c._fee > f.fee[1])) return false;
    const inc = Number(f.income);
    if (skip !== 'income' && inc > 0 && c.eligibility?.minIncome != null && c.eligibility.minIncome > inc) return false;
    if (skip !== 'status' && f.status && c._status !== f.status) return false;
    if (skip !== 'hideCo' && f.hideCo && c.isCoBranded) return false;
    if (skip !== 'seg' && ((f.seg === 'bank' && c.isCoBranded) || (f.seg === 'co' && !c.isCoBranded))) return false;
    const q = f.q.trim().toLowerCase();
    if (skip !== 'q' && q && !c._text.includes(q)) return false;
    return true;
  }

  query(f, skip) { return this.cards.filter((c) => this.match(c, f, skip)); }

  results() {
    const key = JSON.stringify(this.state.f);
    if (this._rk !== key || this._rc !== this.cards) { this._rk = key; this._rc = this.cards; this._res = sortCards(this.query(this.state.f), this.state.f.sort); }
    return this._res;
  }

  makeHandlers(id) {
    return {
      open: () => this.openCard(id, true),
      openFromShort: () => { this.setState({ shortOpen: false }); this.openCard(id, true); },
      openFromCompare: () => { this.setState({ modal: null }); this.openCard(id, true); },
      save: () => this.toggleSave(id),
      compare: () => this.toggleCompare(id),
      flip: () => this.setState((s) => ({ flipped: { ...s.flipped, [id]: !s.flipped[id] } })),
      tilt: (e) => {
        if (reduceMotion() || e.pointerType === 'touch') return;
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${x * 16}deg`); el.style.setProperty('--rx', `${-y * 12}deg`);
        el.style.setProperty('--gx', `${(x + 0.5) * 100}%`); el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
      },
      untilt: (e) => { const el = e.currentTarget; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); },
    };
  }

  // The parts of a card's view that never change, computed once at load.
  staticVm(c) {
    const b = c.benefits;
    const st = STATUS[c._status];
    const air = b?.lounges?.airport;
    const icon = (key, on, tip) => ({ icon: BENMAP[key].icon, tip, aria: `${BENMAP[key].label}: ${on ? 'yes' : 'no'}. ${tip}`, border: on ? 'var(--border-accent)' : 'var(--border-subtle)', bg: on ? 'var(--accent-wash)' : 'transparent', color: on ? 'var(--accent-text)' : 'var(--text-muted)' });
    return {
      id: c.id, name: c.name, bank: c.bank, img: c.image || '', hasImg: Boolean(c.image), noImg: !c.image,
      faceName: c.name.replace(/\s*credit card\s*$/i, ''), faceBorder: c.isLTF ? 'var(--accent-secondary)' : 'var(--accent-pink)',
      faceGlow: c.isLTF ? 'rgba(182,255,59,.35)' : 'rgba(255,43,214,.4)', thumbBorder: 'var(--border-subtle)',
      netShort: c.network, typeLabel: c.isLTF ? 'LTF' : 'Premium', typeColor: c.isLTF ? 'var(--ltf-text)' : 'var(--gold-text)', typeBg: c.isLTF ? 'var(--ltf-wash)' : 'var(--gold-wash)',
      accentBar: c.isLTF ? 'var(--accent-secondary)' : 'linear-gradient(90deg,var(--accent-gold),var(--accent-pink))',
      status: c._badge.text, statusColor: st.color,
      fee: c.isLTF ? 'Lifetime free' : inr(c.annualFee), feeColor: c.isLTF ? 'var(--ltf-text)' : 'var(--text-primary)',
      reward: c.rewardRate || '—', joining: c.joiningFee == null ? '—' : inr(c.joiningFee),
      dom: b ? visits(air?.domestic) : '—', intl: b ? visits(air?.international) : '—', forex: b?.forex?.markupFee || '—',
      income: c.eligibility?.minIncome == null ? '—' : inr(c.eligibility.minIncome),
      hasBen: Boolean(b), noBen: !b,
      icons: b ? [
        icon('lounge', c._ben.lounge, air?.description || 'Airport lounge access'),
        icon('golf', c._ben.golf, b.golf?.description || 'Golf'),
        icon('cashback', Boolean(b.cashback), b.cashback?.description || 'Rewards'),
        icon('forex', c._ben.forex, b.forex?.description || `Forex markup: ${b.forex?.markupFee || 'not verified'}`),
      ] : [],
      facts: [
        { k: 'Annual fee', v: c.isLTF ? 'Lifetime free' : inr(c.annualFee) },
        { k: 'Rewards', v: c.rewardRate || '—' },
        { k: 'Lounges', v: air ? `${air.domestic === -1 ? 'Unl.' : air.domestic || 0} dom · ${air.international === -1 ? 'Unl.' : air.international || 0} intl` : '—' },
        { k: 'Forex', v: b?.forex?.markupFee || '—' },
      ],
      ...this.h[c.id],
    };
  }

  // A card plus what depends on shortlist, compare and flip state.
  vm(c, i) {
    const s = this.state;
    const saved = s.saved.includes(c.id);
    const cmp = s.compare.includes(c.id);
    const fl = Boolean(s.flipped[c.id]);
    return {
      ...c._vm, savedPressed: String(saved), saveAria: saved ? `Remove ${c.name} from shortlist` : `Save ${c.name} to shortlist`,
      saveColor: saved ? 'var(--accent-pink)' : 'var(--text-secondary)', saveBorder: saved ? 'var(--accent-pink)' : 'var(--border-subtle)', heartFill: saved ? 'currentColor' : 'none',
      cmpPressed: String(cmp), cmpLabel: cmp ? 'Comparing' : 'Compare', cmpAria: cmp ? `Remove ${c.name} from compare` : `Add ${c.name} to compare`,
      cmpBorder: cmp ? 'var(--accent-primary)' : 'var(--border-subtle)', cmpBg: cmp ? 'var(--accent-wash)' : 'transparent', cmpColor: cmp ? 'var(--accent-text)' : 'var(--text-primary)',
      flipped: String(fl), flipDeg: fl ? 180 : 0, backHidden: String(!fl), flipLabel: fl ? 'Show card front' : 'Flip card to see key benefits',
      anim: s.countP < 1 || reduceMotion() ? 'none' : `cr-rise 240ms ease-out ${Math.min(i, 12) * 30}ms both`,
    };
  }

  // ===== Layers: drawer, shortlist, filter sheet, modal and chat share one focus stack and Escape order =====
  pushFocus() { this.focusStack.push(document.activeElement); }
  restoreFocus() { const el = this.focusStack.pop(); setTimeout(() => { if (el && document.contains(el)) el.focus(); }, 0); }
  focusInto(ref) { setTimeout(() => { this.ref(ref)?.querySelector(FOCUSABLE)?.focus(); }, 30); }
  topLayer() {
    const s = this.state;
    if (s.modal) return 'modal';
    if (s.drawerId) return 'drawer';
    if (s.shortOpen) return 'short';
    if (s.sheetOpen && s.w < 1024) return 'sheet';
    if (s.chatOpen) return 'chat';
    return null;
  }
  layerEl(n) { return this.ref({ modal: 'modalRef', drawer: 'drawerRef', short: 'shortRef', sheet: 'railRef', chat: 'chatRef' }[n]); }
  closeTop() {
    const t = this.topLayer();
    if (this.state.qFocus && this.state.qInput) { this.setState({ qFocus: false }); return; }
    if (t === 'modal') this.closeModal();
    else if (t === 'drawer') this.closeDrawer();
    else if (t === 'short') this.closeShort();
    else if (t === 'sheet') this.closeSheet();
    else if (t === 'chat') this.toggleChat();
  }
  handleKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.key === '/' && !typing) { e.preventDefault(); this.ref('searchRef')?.focus(); return; }
    if (e.key === 'Escape') { this.closeTop(); return; }
    const top = this.topLayer();
    if (top === 'drawer' && !typing && e.target.getAttribute?.('role') !== 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); this.step(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.key === 'Tab' && top && top !== 'chat') {
      const root = this.layerEl(top);
      if (!root) return;
      const els = [...root.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  openCard(id, push) {
    if (!this.byId[id]) return;
    const already = Boolean(this.state.drawerId);
    if (!already) this.pushFocus();
    this.setState({ drawerId: id, tab: 'overview' }, () => {
      try {
        const url = `${location.pathname}${location.search}#card=${id}`;
        if (push && !already) { history.pushState({ card: id }, '', url); this.pushed = true; } else history.replaceState(history.state, '', url);
      } catch { /* history blocked */ }
      if (!already) this.focusInto('drawerRef');
    });
  }
  closeDrawer() {
    if (this.pushed) { this.pushed = false; try { history.back(); } catch { /* history blocked */ } }
    this.setState({ drawerId: null }, () => { this.syncUrl(); this.restoreFocus(); });
  }
  step(d) {
    const list = this.results();
    const i = list.findIndex((c) => c.id === this.state.drawerId);
    const n = list[i + d];
    if (i < 0 || !n) return;
    this.setState({ drawerId: n.id }, () => this.syncUrl());
  }
  closeShort() { this.setState({ shortOpen: false }, () => this.restoreFocus()); }
  closeSheet() { const was = this.state.sheetOpen; this.setState({ sheetOpen: false }, () => { if (was) this.restoreFocus(); }); }
  closeModal() { this.setState({ modal: null }, () => this.restoreFocus()); }
  openModal(kind, extra = {}) { if (!this.state.modal) this.pushFocus(); this.setState({ modal: kind, ...extra }, () => this.focusInto('modalRef')); }
  openQuiz() { this.openModal('quiz', { quizStep: 0, quizAns: {} }); }
  toggleChat() {
    const open = !this.state.chatOpen;
    if (open) this.pushFocus();
    this.setState({ chatOpen: open }, () => { if (open) this.focusInto('chatRef'); else this.restoreFocus(); });
  }

  limit() { return this.isPro() ? COMPARE_PRO : COMPARE_FREE; }
  // Free accounts compare 2 cards; hitting the limit opens sign-in or the PRO plans.
  goPro(note) { account.open(account.info ? 'paywall' : 'signin', note); }
  toggleCompare(id) {
    const cur = this.state.compare;
    if (cur.includes(id)) { const next = cur.filter((x) => x !== id); this.setState({ compare: next }); store.set('cardradar-compare', next); return; }
    if (cur.length >= this.limit()) {
      if (this.isPro()) return this.toast(`You can compare up to ${COMPARE_PRO} cards`);
      return this.goPro(`You've picked ${COMPARE_FREE} cards, the most the free plan compares. PRO compares up to ${COMPARE_PRO}.`);
    }
    const next = [...cur, id];
    this.setState({ compare: next });
    store.set('cardradar-compare', next);
  }
  toggleSave(id) {
    const cur = this.state.saved;
    const on = !cur.includes(id);
    const next = on ? [...cur, id] : cur.filter((x) => x !== id);
    this.setState({ saved: next });
    store.set('cardradar-shortlist', next);
    this.toast(on ? 'Saved to shortlist' : 'Removed from shortlist');
  }

  async sendChat(t) {
    const text = (t || '').trim();
    if (!text || this.state.chatWaiting) return;
    if (!account.token()) return account.open('signin', 'Sign in to ask CardRadar AI. Free accounts get 3 answers a day.'); // the question stays in the box
    this.setState((s) => ({ chatInput: '', chatWaiting: true, chatMsgs: [...s.chatMsgs, { me: true, text }] }), () => this.scrollChat());
    let reply;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...account.headers() },
        body: JSON.stringify({ message: text, history: this.chatHistory }),
      });
      const data = await res.json();
      account.handleReply(res, data);
      reply = res.ok ? data.reply : (data.reply || 'Sorry, something went wrong.');
      if (res.ok) this.chatHistory.push({ role: 'user', content: text }, { role: 'bot', content: data.reply });
    } catch {
      reply = 'Network error. Please try again later.';
    }
    this.setState((s) => ({ chatWaiting: false, chatMsgs: [...s.chatMsgs, { me: false, text: reply }] }), () => this.scrollChat());
  }
  scrollChat() {
    const box = this.ref('chatRef')?.querySelector('[aria-live]');
    if (box) box.scrollTop = box.scrollHeight;
  }

  openBankFilter() {
    if (this.state.w < 1024) { this.pushFocus(); this.setState({ sheetOpen: true }, () => setTimeout(() => this.ref('bankSearchRef')?.focus(), 60)); return; }
    const el = this.ref('bankSearchRef');
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }
  }

  renderVals() {
    const s = this.state;
    const f = s.f;
    const w = s.w;
    const desk = w >= 1024;
    const mob = w < 640;
    const cards = this.cards;
    const ready = !s.loading && !s.error;
    const res = ready ? this.results() : [];
    const total = cards.length || 143;
    const P = s.countP;
    const cnt = (n) => Math.round(n * P);
    const feeMax = this.feeMaxVal || 60000;
    const isPro = this.isPro();
    const tip = (k, text) => () => this.setState((st) => ({ tips: { ...st.tips, [k]: text } }));
    const untip = (k) => () => this.setState((st) => ({ tips: { ...st.tips, [k]: '' } }));
    const optStyle = (active, n) => ({
      pressed: String(active), disabled: !active && n === 0, opacity: !active && n === 0 ? 0.4 : 1, cursor: !active && n === 0 ? 'not-allowed' : 'pointer',
      border: active ? 'var(--accent-primary)' : 'var(--border-subtle)', bg: active ? 'var(--accent-wash)' : 'transparent', color: active ? 'var(--accent-text)' : 'var(--text-primary)',
      box: active ? 'var(--accent-primary)' : 'var(--text-muted)', boxBg: active ? 'var(--accent-primary)' : 'transparent', tick: active ? '✓' : '',
    });

    // Facet counts: how many cards each option would leave, given every other filter
    const benefitOpts = ready ? BEN.map((b) => {
      const active = f.benefits.includes(b.key);
      const n = active ? res.length : this.query({ ...f, benefits: [...f.benefits, b.key] }).length;
      return { ...optStyle(active, n), key: b.key, label: b.label, icon: b.icon, count: n, title: `${b.label}: ${n} cards`, toggle: () => this.toggleIn('benefits', b.key) };
    }) : [];
    const baseBank = ready ? this.query(f, 'banks') : [];
    const bq = s.bankQ.trim().toLowerCase();
    const bankOpts = ready ? this.bankList.filter((b) => !bq || b.toLowerCase().includes(bq)).map((b) => {
      const active = f.banks.includes(b);
      const n = baseBank.filter((c) => c.bank === b).length;
      return { ...optStyle(active, n), label: b, count: n, toggle: () => this.toggleIn('banks', b) };
    }) : [];
    const baseNet = ready ? this.query(f, 'networks') : [];
    const netOpts = NETS.map((n) => { const active = f.networks.includes(n); const k = baseNet.filter((c) => c._nets.includes(n)).length; return { ...optStyle(active, k), label: n, count: k, toggle: () => this.toggleIn('networks', n) }; });
    const baseTier = ready ? this.query(f, 'tiers') : [];
    const tierOpts = TIERS.map(([k, l]) => { const active = f.tiers.includes(k); const n = baseTier.filter((c) => c.tier === k).length; return { ...optStyle(active, n), label: l, count: n, toggle: () => this.toggleIn('tiers', k) }; });
    const baseSt = ready ? this.query(f, 'status') : [];
    const baseCo = ready ? this.query(f, 'hideCo') : [];
    const sw = (active, n, label, toggle) => ({ ...optStyle(active, n), label, count: n, toggle, trackBg: active ? 'var(--accent-primary)' : 'var(--track)', knob: active ? 'var(--on-accent)' : 'var(--text-secondary)', knobX: active ? 14 : 0 });
    const vN = baseSt.filter((c) => c._status === 'verified').length;
    const switchOpts = [
      sw(f.status === 'verified', vN, 'Verified only', () => this.setF({ status: f.status === 'verified' ? '' : 'verified' })),
      sw(f.hideCo, baseCo.filter((c) => !c.isCoBranded).length, 'Hide co-branded', () => this.setF({ hideCo: !f.hideCo })),
    ];

    // Active-filter pills
    const pills = [];
    const pill = (label, patch) => pills.push({ label, aria: `Remove filter: ${label}`, remove: () => this.setF(patch), patch });
    f.benefits.forEach((k) => pill(BENMAP[k].label, { benefits: f.benefits.filter((x) => x !== k) }));
    f.banks.forEach((b) => pill(b, { banks: f.banks.filter((x) => x !== b) }));
    f.networks.forEach((n) => pill(n, { networks: f.networks.filter((x) => x !== n) }));
    f.tiers.forEach((t) => pill(TIERMAP[t], { tiers: f.tiers.filter((x) => x !== t) }));
    if (f.fee) pill(`Fee ${inr(f.fee[0])}–${inr(f.fee[1])}`, { fee: null });
    if (Number(f.income) > 0) pill(`Income ${inr(Number(f.income))}`, { income: '' });
    if (f.status) pill(STATUS[f.status].label, { status: '' });
    if (f.hideCo) pill('No co-branded', { hideCo: false });
    if (f.seg !== 'all') pill(f.seg === 'bank' ? 'Bank cards' : 'Co-branded', { seg: 'all' });
    if (f.q) pill(`“${f.q}”`, { q: '' });
    pills.forEach((p) => { if ('q' in p.patch) { const r = p.remove; p.remove = () => { this.setState({ qInput: '' }); r(); }; } });
    const clearAll = () => { this.setState({ qInput: '', incomeInput: '', bankQ: '' }); this.setF({ ...F0(), sort: f.sort, view: f.view }); };
    const emptySuggest = ready && !res.length ? pills.map((p) => ({ label: p.label, count: this.query({ ...f, ...p.patch }).length, onClick: p.remove })).filter((e) => e.count > 0).sort((a, b) => b.count - a.count).slice(0, 3) : [];

    // Radar: a live summary of the cards in view, where every tile and bar is also a filter
    const inView = res;
    const tile = (label, value, active, onClick, color) => ({ label, value: cnt(value), pressed: String(active), onClick, title: `${label}: ${value}`, border: active ? 'var(--accent-primary)' : 'var(--border-subtle)', bg: active ? 'var(--accent-wash)' : 'var(--bg-glass-light)', shadow: active ? 'var(--glow-soft)' : 'none', color: color || 'var(--text-primary)' });
    const tb = (k) => () => this.toggleIn('benefits', k);
    const statTiles = [
      tile('Cards in view', inView.length, false, clearAll),
      tile('Lifetime free', inView.filter((c) => c._ben.ltf).length, f.benefits.includes('ltf'), tb('ltf'), 'var(--ltf-text)'),
      tile('With lounge', inView.filter((c) => c._ben.lounge).length, f.benefits.includes('lounge'), tb('lounge')),
      tile('With golf', inView.filter((c) => c._ben.golf).length, f.benefits.includes('golf'), tb('golf')),
      tile('Cashback', inView.filter((c) => c._ben.cashback).length, f.benefits.includes('cashback'), tb('cashback')),
      tile('Banks', new Set(inView.map((c) => c.bank)).size, f.banks.length > 0, () => this.openBankFilter()),
      tile('Verified', inView.filter((c) => c._status === 'verified').length, f.status === 'verified', () => this.setF({ status: f.status === 'verified' ? '' : 'verified' })),
    ];
    const feeCounts = FEE_B.map((b) => inView.filter((c) => c._fee >= b.r[0] && c._fee <= b.r[1]).length);
    const feeTop = Math.max(1, ...feeCounts);
    const feeBars = FEE_B.map((b, i) => {
      const r = [b.r[0], Math.min(b.r[1], feeMax)];
      const active = Boolean(f.fee && f.fee[0] === r[0] && f.fee[1] === r[1]);
      const pct = inView.length ? Math.round((feeCounts[i] / inView.length) * 100) : 0;
      const text = `${b.label} · ${feeCounts[i]} cards · ${pct}%`;
      return { label: b.label, count: feeCounts[i], pct: Math.round((feeCounts[i] / feeTop) * 100), pressed: String(active), aria: `${text}. ${active ? 'Active filter, select to clear' : 'Select to filter'}`,
        fill: active ? 'var(--accent-primary)' : 'var(--chart-2)', shadow: active ? 'var(--glow-soft)' : 'none', labelColor: active ? 'var(--accent-text)' : 'var(--text-muted)',
        onClick: () => this.setF({ fee: active ? null : r }), onTip: tip('fee', text), offTip: untip('fee') };
    });
    const bc = {};
    inView.forEach((c) => { bc[c.bank] = (bc[c.bank] || 0) + 1; });
    const banksSorted = Object.entries(bc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const bTop = Math.max(1, ...banksSorted.map((x) => x[1]));
    const bankBars = banksSorted.slice(0, 8).map(([name, n]) => {
      const active = f.banks.includes(name);
      const text = `${name} · ${n} cards`;
      return { label: name, count: n, pct: Math.round((n / bTop) * 100), pressed: String(active), aria: `${text}. ${active ? 'Active filter' : 'Select to filter'}`, fill: active ? 'var(--accent-primary)' : 'var(--chart-2)', labelColor: active ? 'var(--accent-text)' : 'var(--text-secondary)', onClick: () => this.toggleIn('banks', name), onTip: tip('bank', text), offTip: untip('bank') };
    });
    const netCounts = NETS.map((n) => inView.filter((c) => c._nets.includes(n)).length);
    const netSum = Math.max(1, netCounts.reduce((a, b) => a + b, 0));
    const netBars = NETS.map((n, i) => {
      const active = f.networks.includes(n);
      const text = `${n} · ${netCounts[i]} cards`;
      return { label: n, count: netCounts[i], pct: (netCounts[i] / netSum) * 100, fill: NETFILL[i], pressed: String(active), aria: `${text}. ${active ? 'Active filter' : 'Select to filter'}`, disabled: !active && !netCounts[i], opacity: !active && !netCounts[i] ? 0.45 : 1, border: active ? 'var(--accent-primary)' : 'var(--border-subtle)', onClick: () => this.toggleIn('networks', n), onTip: tip('net', text), offTip: untip('net') };
    });
    const vc = { verified: 0, outdated: 0, unverified: 0 };
    inView.forEach((c) => { vc[c._status]++; });
    const vt = Math.max(1, inView.length);
    const a1 = (vc.verified / vt) * 360;
    const a2 = a1 + (vc.outdated / vt) * 360;
    const ringBg = `conic-gradient(var(--status-verified) 0deg ${a1}deg, var(--status-outdated) ${a1}deg ${a2}deg, var(--status-unverified) ${a2}deg 360deg)`;
    const verBars = Object.keys(STATUS).map((k) => {
      const active = f.status === k;
      const n = vc[k];
      const text = `${STATUS[k].label} · ${n} of ${inView.length}`;
      return { label: STATUS[k].label, count: n, fill: STATUS[k].color, pressed: String(active), aria: `${text}. ${active ? 'Active filter' : 'Select to filter'}`, disabled: !active && !n, opacity: !active && !n ? 0.45 : 1, cursor: !active && !n ? 'not-allowed' : 'pointer', border: active ? 'var(--accent-primary)' : 'var(--border-subtle)', onClick: () => this.setF({ status: active ? '' : k }), onTip: tip('ver', text), offTip: untip('ver') };
    });

    // Table columns
    const [sk, sd] = parseSort(f.sort);
    const tableCols = TABLE_COLS.map(([k, label, def], i) => {
      const on = sk === k;
      const num = i >= 2 && i <= 8;
      return { label, ariaSort: on ? (sd === 'asc' ? 'ascending' : 'descending') : 'none', arrow: on ? (sd === 'asc' ? '▲' : '▼') : '', color: on ? 'var(--accent-text)' : 'var(--text-secondary)',
        align: num ? 'right' : 'left', justify: num ? 'flex-end' : 'flex-start', left: i === 0 ? '0' : 'auto', z: i === 0 ? 3 : 2,
        onClick: () => this.setF({ sort: encodeSort(k, on ? (sd === 'asc' ? 'desc' : 'asc') : def) }) };
    });

    // Search suggestions: cards, banks and benefits that match what is typed
    const q = s.qInput.trim().toLowerCase();
    const suggestions = [];
    if (ready && q) {
      const pick = (fn) => (e) => { e.preventDefault(); fn(); this.setState({ qFocus: false }); };
      cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5).forEach((c) => suggestions.push({ label: c.name, kind: 'Card', icon: 'compare', pick: pick(() => this.openCard(c.id, true)) }));
      this.bankList.filter((b) => b.toLowerCase().includes(q)).slice(0, 3).forEach((b) => suggestions.push({ label: b, kind: 'Bank', icon: 'bank', pick: pick(() => { this.setState({ qInput: '' }); this.setF({ q: '', banks: f.banks.includes(b) ? f.banks : [...f.banks, b] }); }) }));
      BEN.filter((b) => b.label.toLowerCase().includes(q)).slice(0, 3).forEach((b) => suggestions.push({ label: b.label, kind: 'Benefit', icon: b.icon, pick: pick(() => { this.setState({ qInput: '' }); this.setF({ q: '', benefits: f.benefits.includes(b.key) ? f.benefits : [...f.benefits, b.key] }); }) }));
    }
    const suggestShow = s.qFocus && suggestions.length > 0;

    // Drawer: everything about the open card
    let dv = {};
    let prevDisabled = true;
    let nextDisabled = true;
    const dc = s.drawerId && this.byId?.[s.drawerId];
    if (dc) {
      const idx = res.findIndex((c) => c.id === dc.id);
      prevDisabled = idx <= 0;
      nextDisabled = idx < 0 || idx >= res.length - 1;
      const base = this.vm(dc, 0);
      const b = dc.benefits;
      const e = dc.eligibility || {};
      const v = dc.verification || {};
      const air = b?.lounges?.airport || {};
      const rail = b?.lounges?.railway || {};
      const rupees = (n) => (n == null ? 'Not verified yet' : inr(n));
      const vis = (n) => (n === -1 ? 'Unlimited' : n ? `${n} visits/year` : 'None');
      const ben = (key, on, label, tipText) => ({ icon: BENMAP[key]?.icon || key, label, tip: tipText || '', state: on ? 'Yes' : 'No', border: on ? 'var(--border-accent)' : 'var(--border-subtle)', bg: on ? 'var(--accent-wash)' : 'transparent', color: on ? 'var(--text-primary)' : 'var(--text-muted)' });
      const inc = Number(f.income);
      const similar = cards.filter((c) => c.id !== dc.id && (c.tier === dc.tier || c.category === dc.category)).slice(0, 3).map((c) => ({ name: c.name, sub: `${c.bank} · ${c.isLTF ? 'Lifetime free' : inr(c.annualFee)}`, img: c.image || '', hasImg: Boolean(c.image), open: () => this.openCard(c.id, false) }));
      const quotes = Object.entries(v).map(([k, x]) => ({ field: FIELD_LABEL[k] || k, quote: x.quote, date: x.verifiedAt, url: safeUrl(x.url) || '#' }));
      const apply = safeUrl(dc.applyUrl);
      dv = {
        ...base, sub: `${dc.bank} · ${dc.network} · ${dc.category}`, pos: idx >= 0 ? `${idx + 1} of ${res.length}` : 'Not in current results',
        note: `${dc._badge.text}. ${dc._status === 'verified' ? "Every fee, rate and benefit is quoted from the bank's own page." : dc._status === 'outdated' ? "These details were checked against the bank's page before, but not recently — they may have changed." : "Some details on this card have not been checked against the bank's page yet."} Always confirm on the bank's website before you apply.`,
        keyFacts: [
          { label: 'Annual fee', value: dc.isLTF ? 'Lifetime free' : inr(dc.annualFee), color: dc.isLTF ? 'var(--ltf-text)' : 'var(--gold-text)' },
          { label: 'Reward rate', value: dc.rewardRate || 'Not verified yet', color: 'var(--text-primary)' },
          { label: 'Airport lounges', value: b ? `${visits(air.domestic)} dom · ${visits(air.international)} intl` : '—', color: 'var(--text-primary)' },
          { label: 'Forex markup', value: b?.forex?.markupFee || '—', color: b?.forex?.markupFee === '0%' ? 'var(--accent-text)' : 'var(--text-primary)' },
        ],
        benefits: b ? [
          ben('lounge', dc._ben.lounge, 'Airport lounge', air.description), ben('railway', dc._ben.railway, 'Railway lounge', rail.description),
          ben('golf', dc._ben.golf, 'Golf', b.golf?.description), ben('cashback', Boolean(b.cashback), 'Cashback / rewards', b.cashback?.description),
          ben('forex', dc._ben.forex, 'Zero forex', b.forex?.description), ben('fuel', dc._ben.fuel, 'Fuel waiver', b.fuel?.description),
          ben('dining', dc._ben.dining, 'Dining', b.dining?.description), ben('movies', dc._ben.movies, 'Movies', b.movies?.description),
        ] : [],
        highlights: (dc.highlights || []).map((t) => ({ text: t })), hasHighlights: (dc.highlights || []).length > 0,
        feeItems: [
          { label: 'Type', value: dc.isLTF ? 'Lifetime Free' : 'Annual Fee Card', color: dc.isLTF ? 'var(--ltf-text)' : 'var(--gold-text)' },
          { label: 'Annual fee', value: rupees(dc.annualFee), color: dc.isLTF ? 'var(--ltf-text)' : 'var(--gold-text)' },
          { label: 'Joining fee', value: rupees(dc.joiningFee), color: 'var(--text-primary)' },
          { label: 'Reward rate', value: dc.rewardRate || 'Not verified yet', color: 'var(--text-primary)' },
          { label: 'Network', value: dc.network, color: 'var(--text-primary)' },
          { label: 'Category', value: dc.category, color: 'var(--text-primary)' },
        ],
        hasCashback: Boolean(b?.cashback), cashDesc: b?.cashback?.description || '', cashDetails: (b?.cashback?.details || []).map((t) => ({ text: t })),
        hasOther: Boolean(b?.other?.length), other: (b?.other || []).map((t) => ({ text: t })),
        travelItems: b ? [
          { label: 'Domestic airport', value: vis(air.domestic), desc: '', color: air.domestic ? 'var(--accent-text)' : 'var(--text-muted)' },
          { label: 'International airport', value: vis(air.international), desc: air.description || '', color: air.international ? 'var(--accent-text)' : 'var(--text-muted)' },
          { label: 'Railway lounge', value: vis(rail.count), desc: rail.description || '', color: rail.count ? 'var(--accent-text)' : 'var(--text-muted)' },
          { label: 'Forex markup', value: b.forex?.markupFee || 'Not verified yet', desc: b.forex?.description || '', color: b.forex?.markupFee === '0%' ? 'var(--accent-text)' : 'var(--text-primary)' },
          { label: 'Golf', value: b.golf?.available ? 'Available' : 'None', desc: b.golf?.description || '', color: b.golf?.available ? 'var(--accent-text)' : 'var(--text-muted)' },
        ] : [],
        eligItems: [{ label: 'Min. annual income', value: rupees(e.minIncome) }, { label: 'Min. age', value: e.minAge == null ? 'Not verified yet' : `${e.minAge} years` }],
        qualify: inc > 0 ? (e.minIncome == null ? `The minimum income for this card isn't listed, so we can't tell whether ${inr(inc)} qualifies. Check with ${dc.bank}.` : e.minIncome <= inc ? `Your income of ${inr(inc)} meets the listed minimum of ${inr(e.minIncome)}.` : `The listed minimum is ${inr(e.minIncome)}, above your ${inr(inc)}.`) : 'Enter your yearly income under "Cards I can get" to see whether you meet the listed minimum. It stays in your browser.',
        qualBorder: inc > 0 && e.minIncome != null ? (e.minIncome <= inc ? 'var(--border-accent)' : 'var(--accent-pink)') : 'var(--border-subtle)',
        quotes, hasQuotes: quotes.length > 0, noQuotes: quotes.length === 0,
        checkedText: dc.lastCheckedAt ? `Bank page last checked ${dc.lastCheckedAt.slice(0, 10)}.` : 'The weekly crawl has not checked this card’s page yet.',
        sourceLinks: (dc.sources || []).map((x) => ({ url: safeUrl(x.url) })).filter((x) => x.url),
        similar, hasSimilar: similar.length > 0, apply: apply || '', hasApply: Boolean(apply),
      };
    }
    const tabs = DRAWER_TABS.map(([k, l]) => ({ id: `tab-${k}`, label: l, selected: String(s.tab === k), tabindex: s.tab === k ? 0 : -1, border: s.tab === k ? 'var(--accent-primary)' : 'transparent', color: s.tab === k ? 'var(--accent-text)' : 'var(--text-secondary)', onClick: () => this.setState({ tab: k }) }));

    // Compare
    const lim = this.limit();
    const cmpList = s.compare.map((id) => this.byId?.[id]).filter(Boolean);
    const traySlots = [...cmpList.map((c) => ({ filled: true, label: c.name, img: c.image || '', hasImg: Boolean(c.image), aria: `Remove ${c.name} from compare`, remove: () => this.toggleCompare(c.id), color: 'var(--text-primary)', borderStyle: 'solid' })),
      ...Array.from({ length: Math.max(0, lim - cmpList.length) }, () => ({ filled: false, label: 'Add a card', color: 'var(--text-muted)', borderStyle: 'dashed' }))];
    const best = (score, dir) => { const vals = cmpList.map(score).filter((x) => typeof x === 'number' && !Number.isNaN(x)); if (vals.length < 2 || new Set(vals).size < 2) return null; return dir === 'low' ? Math.min(...vals) : Math.max(...vals); };
    const yes = (on) => (on ? 'Yes' : '—');
    const rowsDef = [
      ['Annual fee', (c) => (c.isLTF ? 'Lifetime free' : inr(c.annualFee)), (c) => c._fee, 'low'],
      ['Joining fee', (c) => (c.joiningFee == null ? '—' : inr(c.joiningFee)), (c) => c.joiningFee, 'low'],
      ['Reward rate', (c) => c.rewardRate || '—'],
      ['Domestic lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.domestic) : '—'), (c) => lounge(c.benefits?.lounges?.airport?.domestic) ?? 0, 'high'],
      ['International lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.international) : '—'), (c) => lounge(c.benefits?.lounges?.airport?.international) ?? 0, 'high'],
      ['Railway lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.railway?.count) : '—')],
      ['Golf', (c) => yes(c._ben.golf)],
      ['Forex markup', (c) => c.benefits?.forex?.markupFee || '—', (c) => parseFloat(c.benefits?.forex?.markupFee), 'low'],
      ['Fuel surcharge waiver', (c) => yes(c._ben.fuel)],
      ['Min. income', (c) => (c.eligibility?.minIncome == null ? '—' : inr(c.eligibility.minIncome)), (c) => c.eligibility?.minIncome, 'low'],
      ['Data status', (c) => c._badge.text],
    ];
    const cmpRows = s.modal === 'compare' ? rowsDef.map(([label, show, score, dir]) => {
      const top = score ? best(score, dir) : null;
      return { label, cells: cmpList.map((c) => { const hit = top !== null && score(c) === top; return { v: show(c), color: hit ? 'var(--accent-text)' : 'var(--text-primary)', bg: hit ? 'var(--accent-wash)' : 'transparent', weight: hit ? 700 : 500 }; }) };
    }) : [];

    // Quiz
    const qs = QUIZ[Math.min(s.quizStep, 3)];
    let quizResults = [];
    if (s.modal === 'quiz' && s.quizStep >= 4) {
      const answers = { income: 0, spend: 'everyday', maxFee: Infinity, lounge: false, ...s.quizAns };
      quizResults = recommend(cards, answers, 5).map(({ card, reasons }, i) => ({
        rank: i + 1, name: card.name, img: card.image || '', hasImg: Boolean(card.image),
        why: `${card.isLTF ? 'Lifetime free' : `${inr(card.annualFee)}/yr`} · ${reasons.filter((r) => r !== 'Lifetime free').join(' · ')}`,
        open: () => { this.setState({ modal: null }); this.openCard(card.id, true); },
      }));
    }

    const hasActive = pills.length > 0;
    const isSheet = !desk && s.sheetOpen;
    const railStyle = desk
      ? 'position:sticky;top:88px;align-self:start;max-height:calc(100vh - 104px);display:flex;flex-direction:column;background:var(--bg-glass);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden'
      : `position:fixed;left:0;right:0;bottom:0;z-index:60;max-height:86vh;display:${s.sheetOpen ? 'flex' : 'none'};flex-direction:column;background:var(--bg-solid);border-top:1px solid var(--border-accent);border-radius:20px 20px 0 0;box-shadow:var(--shadow-lg);animation:cr-in-up 220ms ease-out`;
    const incNum = Number(f.income);
    const hiddenByIncome = ready && incNum > 0 ? this.query(f, 'income').length - res.length : 0;
    const wideList = w >= 900;
    const modalTitle = { quiz: s.quizStep >= 4 ? 'Your best matches' : 'Find my card', compare: 'Compare cards' }[s.modal] || '';
    const chatMsgs = s.chatMsgs.map((m) => ({ text: m.me ? m.text : raw(renderMarkdown(m.text)), align: m.me ? 'flex-end' : 'flex-start', bg: m.me ? 'var(--accent-wash)' : 'var(--bg-glass-light)' }));
    if (s.chatWaiting) chatMsgs.push({ text: 'CardRadar AI is typing…', align: 'flex-start', bg: 'var(--bg-glass-light)' });

    return {
      searchFlex: w < 760 ? '1 1 100%' : '1 1 320px', searchOrder: w < 760 ? 3 : 1, showLabels: w >= 900,
      qInput: s.qInput, suggestions, suggestShow, suggestExpanded: String(suggestShow),
      onQ: (e) => { const v = e.target.value; this.setState({ qInput: v, qFocus: true }); clearTimeout(this.qT); this.qT = setTimeout(() => this.setF({ q: v.trim() }), 150); },
      onQFocus: () => this.setState({ qFocus: true }), onQBlur: () => setTimeout(() => this.setState({ qFocus: false }), 120),
      onQKey: (e) => { if (e.key === 'Enter') { clearTimeout(this.qT); this.setF({ q: s.qInput.trim() }); this.setState({ qFocus: false }); } if (e.key === 'ArrowDown') { const n = document.querySelector('#cr-suggest button'); if (n) { e.preventDefault(); n.focus(); } } },
      openQuiz: () => this.openQuiz(), openShort: () => { this.pushFocus(); this.setState({ shortOpen: true }, () => this.focusInto('shortRef')); }, closeShort: () => this.closeShort(),
      shortAria: `Shortlist, ${s.saved.length} saved`, hasSaved: s.saved.length > 0, noSaved: s.saved.length === 0, savedCount: s.saved.length,
      toggleTheme: () => {
        const t = s.theme === 'light' ? 'dark' : 'light';
        if (t === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('cardradar-theme', t); } catch { /* storage blocked */ }
        this.setState({ theme: t });
      },
      themeAria: s.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme', themeIcon: s.theme === 'light' ? 'moon' : 'sun',
      toggleChat: () => this.toggleChat(), chatOpen: s.chatOpen, chatExpanded: String(s.chatOpen),
      openAccount: () => account.open(), accountAria: isPro ? 'Account, PRO plan' : account.info ? 'Account' : 'Sign in', accountBorder: isPro ? 'var(--accent-gold)' : 'var(--accent-pink)', isPro, notProLabel: !isPro && w >= 900,
      shellCols: desk ? '280px minmax(0,1fr)' : 'minmax(0,1fr)', sheetScrim: isSheet, closeSheet: () => this.closeSheet(), isSheet,
      railStyle, railRole: isSheet ? 'dialog' : undefined, railModal: isSheet ? 'true' : undefined, rowH: mob ? 44 : 36,
      hasActive, clearAll, applyLabel: `Show ${res.length} cards`,
      benefitOpts, bankOpts, netOpts, tierOpts, switchOpts, bankQ: s.bankQ, onBankQ: (e) => this.setState({ bankQ: e.target.value }),
      feeMax, feeLo: f.fee ? f.fee[0] : 0, feeHi: f.fee ? f.fee[1] : feeMax, feeLoText: inr(f.fee ? f.fee[0] : 0), feeHiText: inr(f.fee ? f.fee[1] : feeMax),
      feeReadout: `${inr(f.fee ? f.fee[0] : 0)} – ${inr(f.fee ? f.fee[1] : feeMax)}`,
      onFeeLo: (e) => { const lo = Number(e.target.value); const hi = Math.max(lo, f.fee ? f.fee[1] : feeMax); this.setF({ fee: lo === 0 && hi === feeMax ? null : [lo, hi] }); },
      onFeeHi: (e) => { const hi = Number(e.target.value); const lo = Math.min(hi, f.fee ? f.fee[0] : 0); this.setF({ fee: lo === 0 && hi === feeMax ? null : [lo, hi] }); },
      incomeInput: s.incomeInput || (incNum > 0 ? inrFmt.format(incNum) : ''),
      onIncome: (e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 10); this.setState({ incomeInput: digits ? inrFmt.format(Number(digits)) : '' }); clearTimeout(this.iT); this.iT = setTimeout(() => this.setF({ income: digits }), 150); },
      incomeNote: incNum > 0 ? `Hiding ${hiddenByIncome} ${hiddenByIncome === 1 ? 'card' : 'cards'} that list a higher minimum income. Your income stays in this browser and is never sent anywhere.` : 'Cards that list a higher minimum income are hidden. Your income stays in this browser and is never sent anywhere.',
      radarSub: ready ? `Live summary of the ${res.length} cards in view. Every tile and bar is also a filter.` : 'Loading the card list…',
      toggleRadar: () => { const o = !s.radarOpen; store.set('cardradar-radar-open', o); this.setState({ radarOpen: o }); },
      radarOpen: s.radarOpen, radarExpanded: String(s.radarOpen), radarToggleLabel: s.radarOpen ? 'Collapse' : 'Expand', radarChevron: s.radarOpen ? 180 : 0,
      statTiles, feeBars, bankBars, netBars, verBars, ringBg, ringAria: `Verification: ${vc.verified} verified, ${vc.outdated} may be outdated, ${vc.unverified} unverified`,
      verifiedPct: `${inView.length ? Math.round((vc.verified / inView.length) * 100) : 0}%`,
      tipFee: s.tips.fee || 'Select a bar to filter', tipBank: s.tips.bank || 'Top 8 in view', tipNet: s.tips.net || 'Select to filter', tipVer: s.tips.ver || 'Checked weekly',
      hasMoreBanks: banksSorted.length > 8, moreBanksLabel: `+${banksSorted.length - 8} more banks`, openBankFilter: () => this.openBankFilter(),
      resultCount: ready ? res.length : '—', totalCount: total, showFilterBtn: !desk, openSheet: () => { this.pushFocus(); this.setState({ sheetOpen: true }, () => this.focusInto('railRef')); },
      filterBtnLabel: hasActive ? `Filters · ${pills.length}` : 'Filters',
      segOpts: [['bank', 'Bank cards'], ['co', 'Co-branded'], ['all', 'All']].map(([k, l]) => ({ label: l, pressed: String(f.seg === k), bg: f.seg === k ? 'var(--accent-wash)' : 'transparent', color: f.seg === k ? 'var(--accent-text)' : 'var(--text-secondary)', onClick: () => this.setF({ seg: k }) })),
      sortVal: SORT_ALIAS[f.sort] ? f.sort : 'custom', onSort: (e) => this.setF({ sort: e.target.value }),
      viewOpts: [['grid', 'Grid view', 'grid'], ['list', 'List view', 'list'], ['table', 'Table view', 'table']].map(([k, l, ic]) => ({ label: l, icon: ic, pressed: String(f.view === k), bg: f.view === k ? 'var(--accent-wash)' : 'transparent', color: f.view === k ? 'var(--accent-text)' : 'var(--text-secondary)', onClick: () => this.setF({ view: k }) })),
      pills, hasPills: hasActive,
      skel: [1, 2, 3, 4, 5, 6], showSkelGrid: s.loading && f.view === 'grid', showSkelRows: s.loading && f.view !== 'grid',
      showError: Boolean(s.error), errorText: `The request for cards.json failed (${s.error || ''}). Check your connection and try again.`, retry: () => this.load(),
      showEmpty: ready && res.length === 0, emptySuggest,
      items: ready ? res.map((c, i) => this.vm(c, i)) : [],
      showGrid: ready && res.length > 0 && f.view === 'grid', showList: ready && res.length > 0 && f.view === 'list', showTable: ready && res.length > 0 && f.view === 'table',
      listCols: wideList ? 'minmax(0,1fr) 110px 90px auto 110px auto' : 'minmax(0,1fr) auto auto', listNameCol: wideList ? 'auto' : '1 / -1', listWide: wideList,
      tableCols,
      trayShow: cmpList.length > 0 && !s.modal, traySlots, clearCompare: () => { this.setState({ compare: [] }); store.set('cardradar-compare', []); },
      trayLimit: isPro ? `${cmpList.length} of ${COMPARE_PRO}` : `${cmpList.length} of ${COMPARE_FREE} · PRO compares up to ${COMPARE_PRO}`,
      openCompare: () => { if (cmpList.length < 2) return; if (cmpList.length > lim) return this.goPro(`Go PRO to compare more than ${COMPARE_FREE} cards.`); this.openModal('compare'); },
      compareDisabled: cmpList.length < 2, compareOpacity: cmpList.length < 2 ? 0.45 : 1, compareBtnLabel: cmpList.length < 2 ? 'Pick 2 to compare' : `Compare ${cmpList.length}`,
      drawerOpen: Boolean(dc), dv, closeDrawer: () => this.closeDrawer(), prevCard: () => this.step(-1), nextCard: () => this.step(1),
      prevDisabled, nextDisabled, prevOpacity: prevDisabled ? 0.35 : 1, nextOpacity: nextDisabled ? 0.35 : 1, drawerW: mob ? '100%' : 'min(560px,100%)',
      tabs, tabLabelledBy: `tab-${s.tab}`, tabOverview: s.tab === 'overview', tabFees: s.tab === 'fees', tabTravel: s.tab === 'travel', tabElig: s.tab === 'elig', tabSources: s.tab === 'sources',
      onTabKey: (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault(); e.stopPropagation();
        const i = DRAWER_TABS.findIndex(([k]) => k === s.tab);
        const n = e.key === 'Home' ? 0 : e.key === 'End' ? DRAWER_TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + DRAWER_TABS.length) % DRAWER_TABS.length;
        this.setState({ tab: DRAWER_TABS[n][0] }, () => document.getElementById(`tab-${DRAWER_TABS[n][0]}`)?.focus());
      },
      shortW: mob ? '100%' : 'min(420px,100%)', savedItems: s.saved.map((id) => this.byId?.[id]).filter(Boolean).map((c, i) => this.vm(c, i)),
      sendLabel: `Send ${Math.min(s.saved.length, lim)} to Compare`,
      limitNote: isPro ? `PRO compares up to ${COMPARE_PRO} cards.` : `Free compares ${COMPARE_FREE} cards. PRO compares up to ${COMPARE_PRO}.`,
      sendToCompare: () => {
        const ids = [...new Set([...s.compare, ...s.saved])].slice(0, lim);
        const dropped = s.saved.filter((id) => !ids.includes(id)).length;
        this.setState({ compare: ids, shortOpen: false });
        store.set('cardradar-compare', ids);
        this.toast(dropped ? `Added ${ids.length} of ${lim}. ${isPro ? '' : `PRO compares up to ${COMPARE_PRO}.`}` : `${ids.length} cards ready to compare`);
      },
      modalOpen: Boolean(s.modal), closeModal: () => this.closeModal(), stop: (e) => e.stopPropagation(), modalTitle, modalMax: s.modal === 'compare' ? '960px' : '520px',
      mQuizQ: s.modal === 'quiz' && s.quizStep < 4, mQuizR: s.modal === 'quiz' && s.quizStep >= 4, mCompare: s.modal === 'compare', mAccount: false,
      quizNow: Math.min(s.quizStep, 3) + 1, quizQ: qs.q, quizDots: QUIZ.map((_, i) => ({ bg: i <= s.quizStep ? 'var(--accent-primary)' : 'var(--track)' })),
      quizOpts: qs.options.map(([label, val, icon]) => ({ label, icon: icon || '', hasIcon: Boolean(icon), onClick: () => this.setState((st) => ({ quizAns: { ...st.quizAns, [qs.key]: val }, quizStep: st.quizStep + 1 }), () => this.focusInto('modalRef')) })),
      quizBack: s.quizStep > 0 && s.quizStep < 4, quizPrev: () => this.setState((st) => ({ quizStep: st.quizStep - 1 })),
      quizResults, quizResNote: quizResults.length ? "Based on your answers. Always check eligibility on the bank's site before applying." : 'No listed card fits all of those answers. Try a higher fee budget.',
      quizToChat: () => { this.setState({ modal: null, chatOpen: true }); },
      cmpCards: cmpList.map((c) => ({ name: c.name, img: c.image || '', hasImg: Boolean(c.image), noImg: !c.image, netShort: c.network, openFromCompare: this.h[c.id].openFromCompare })), cmpRows,
      noChatMsgs: s.chatMsgs.length === 0,
      chatSuggest: CHAT_SUGGESTIONS.map((t) => ({ label: t, onClick: () => this.sendChat(t) })),
      chatMsgs, chatInput: s.chatInput, onChatInput: (e) => this.setState({ chatInput: e.target.value }), sendChat: (e) => { e.preventDefault(); this.sendChat(s.chatInput); },
      toasts: s.toasts,
    };
  }
}

new Dashboard(document.getElementById('app'));
})();
