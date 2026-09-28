// Landing page. Markup comes from landing.tpl.js (compiled from design/landing.dc.html); this file is its state and data.
// Needs lib.js, dc.js, account.js and landing.tpl.js.
(() => {
const QUIZ = [
  { key: 'income', q: 'What is your yearly income?', options: [['Under ₹3 lakh', 250000], ['₹3–6 lakh', 500000], ['₹6–12 lakh', 1000000], ['₹12–25 lakh', 2000000], ['Over ₹25 lakh', 1e9]] },
  { key: 'spend', q: 'Where do you spend the most?', options: [['Online shopping', 'online'], ['Travel', 'travel'], ['Dining & food delivery', 'dining'], ['Fuel', 'fuel'], ['Everyday bills & groceries', 'everyday']] },
  { key: 'maxFee', q: 'How much annual fee is OK?', options: [['Only lifetime free', 0], ['Up to ₹1,000', 1000], ['Up to ₹5,000', 5000], ['Any, if the card is worth it', Infinity]] },
  { key: 'lounge', q: 'Do airport lounges matter to you?', options: [['Yes, I fly often', true], ['Not really', false]] },
];
// Same filters the dashboard reads from #filter=<hash>, so "View all" shows the cards counted here.
const TABS = [
  { label: 'Lifetime free', q: { filter: 'ltf' }, hash: 'filter=ltf' },
  { label: 'Lounge access', q: { filter: 'lounge' }, hash: 'filter=lounge' },
  { label: 'Cashback', q: { filter: 'cashback' }, hash: 'filter=cashback' },
  { label: 'Travel & zero forex', q: { filter: 'forex' }, hash: 'filter=forex' },
  { label: 'Fuel', test: (c) => c.benefits?.fuel?.surchargeWaiver === true, hash: 'filter=fuel' },
  { label: 'Railway', q: { filter: 'railway' }, hash: 'filter=railway' },
  { label: 'Golf', q: { filter: 'golf' }, hash: 'filter=golf' },
  { label: 'Super premium', q: { tier: 'super_premium' }, hash: 'filter=super-premium' },
];
const SPENDS = [['online', 'Online shopping', 50000], ['dining', 'Dining', 30000], ['groceries', 'Groceries', 30000], ['fuel', 'Fuel', 20000], ['travel', 'Travel', 50000]];
const NAV = [['cards', 'Cards'], ['finder', 'Card finder'], ['compare', 'Compare'], ['ai', 'AI'], ['pricing', 'Pricing'], ['faq', 'FAQ']];
const FAQ = [
  ['Is CardRadar free?', 'Yes. The catalog, filters, card finder and 2-card compare are free. PRO (₹99/month or ₹999/year) adds unlimited CardRadar AI and 4-card compare.'],
  ['Where does the card data come from?', "From each bank's own product page. A weekly check compares our data with that page and keeps a quote from the source. Changes are reviewed before they go live."],
  ['What does "Unverified" mean?', "We have not yet matched this card's details against the bank's page. Treat them as a starting point and confirm with the bank."],
  ['Do you earn money when I apply?', "No. There are no affiliate links, and applications happen on the bank's own site."],
  ['Do you store my income or quiz answers?', 'No. The card finder runs in your browser and your answers are not sent anywhere.'],
  ['What does PRO include?', 'Unlimited CardRadar AI answers and comparing up to 4 cards side by side. Free accounts get 3 AI answers a day.'],
  ['Is this financial advice?', "No. CardRadar is not a bank and this is not financial advice. Confirm details on the bank's website before you apply."],
];
// Where each of the five stacked hero cards sits: x, y, z, rotation, scale, opacity.
const SLOTS = [
  { x: 0, y: 0, z: 0, r: -4, s: 1, o: 1 },
  { x: -46, y: -26, z: -60, r: -11, s: .95, o: .96 },
  { x: 48, y: -32, z: -110, r: 5, s: .9, o: .9 },
  { x: -84, y: -56, z: -170, r: -17, s: .85, o: .72 },
  { x: 88, y: -64, z: -220, r: 11, s: .8, o: .55 },
];
const CHAT_Q = 'Best lifetime-free card with lounge access?';
const BADGE = {
  verified: { c: 'var(--lime-ink)', bg: 'rgba(182,255,59,.15)', bd: '1px solid rgba(182,255,59,.3)' },
  outdated: { c: 'var(--amber-ink)', bg: 'rgba(255,170,0,.12)', bd: '1px solid rgba(255,170,0,.3)' },
  unverified: { c: 'var(--t2)', bg: 'var(--glass-l)', bd: '1px dashed var(--bd-a)' },
};
const PLAN_DEFAULTS = { monthly: 99, yearly: 999 };
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const rupee = (n) => (n < 0 ? '−₹' : '₹') + fmt(Math.abs(Math.round(n)));
const hasLounge = (c) => Boolean(c.benefits?.lounges?.airport?.domestic || c.benefits?.lounges?.airport?.international);
const visits = (n) => (n === -1 ? 'Unlimited' : n == null ? '—' : n === 0 ? 'None' : `${n} a year`);
const loungeScore = (n) => (n === -1 ? 999 : n ?? 0);
// Parses "1-5%" / "3.3%" into [low, high] fractions. Point and multiplier rates return null and are skipped.
const rateRange = (c) => {
  const m = String(c.rewardRate || '').match(/^\s*([\d.]+)\s*(?:[-–]\s*([\d.]+))?\s*%/);
  if (!m) return null;
  const lo = parseFloat(m[1]) / 100;
  const hi = m[2] ? parseFloat(m[2]) / 100 : lo;
  return isNaN(lo) ? null : [lo, hi];
};
const forexOf = (c) => { const n = parseFloat(c.benefits?.forex?.markupFee); return isNaN(n) ? null : n; };
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const isPremium = (c) => ['premium', 'super_premium', 'private'].includes(c.tier);
const tabRows = (cards, t) => (t.test ? cards.filter(t.test).sort((a, b) => b.popularityScore - a.popularityScore) : queryCards(cards, t.q));

class Landing extends Page {
  constructor(root) {
    super(root, CRT.landing);
    this.state = {
      theme: 'dark', w: window.innerWidth, menuOpen: false,
      cards: null, loadError: false, broken: {}, active: 'top', statT: 0,
      off: 0, rx: 0, ry: 0, stackHover: false,
      qs: '', qsOpen: false, qsIdx: -1, marqueePaused: false,
      quizStep: 0, answers: {}, tab: 0,
      spend: { online: 8000, dining: 4000, groceries: 6000, fuel: 3000, travel: 5000 },
      side: 'ltf', cmp: [{ q: '', open: false, idx: -1, id: null }, { q: '', open: false, idx: -1, id: null }],
      chatPhase: 0, chatQ: 0, chatA: 0, chatOpen: false, yearly: true, toast: null,
    };
    this.rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.start();
  }

  start() {
    let saved = null;
    try { saved = localStorage.getItem('cardradar-theme'); } catch { /* storage blocked */ }
    if (saved === 'light' || saved === 'dark') this.applyTheme(saved);
    window.addEventListener('resize', () => this.setState({ w: window.innerWidth }));
    // A card photo that fails to load falls back to the drawn card face.
    this.root.addEventListener('error', (e) => {
      const id = e.target.dataset?.broken;
      if (id) this.setState((s) => ({ broken: { ...s.broken, [id]: true } }));
    }, true);
    account.onChange(() => this.setState({}));
    account.say = (text) => this.say(text);
    account.load();
    this.render();
    this.load();
    setInterval(() => {
      if (!this.rm && !this.state.stackHover && document.visibilityState === 'visible') this.setState((s) => ({ off: (s.off + 1) % 5 }));
    }, 3500);
    this.setupObservers();
  }

  setupObservers() {
    const secIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) this.setState({ active: e.target.id }); }), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('[data-nav-sec]').forEach((el) => secIO.observe(el));
    const onceIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      onceIO.unobserve(e.target);
      if (e.target.id === 'stats') this.countUp();
      if (e.target.id === 'ai-demo') this.playChat();
    }), { threshold: 0.35 });
    ['stats', 'ai-demo'].forEach((id) => { const el = document.getElementById(id); if (el) onceIO.observe(el); });
  }

  load() {
    this.setState({ loadError: false });
    fetch('data/cards.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((cards) => {
        this.setState({ cards });
        if (this.wantCount) this.countUp();
        if (this.wantChat) this.playChat();
      })
      .catch(() => this.setState({ loadError: true }));
  }

  applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    this.setState({ theme: t });
  }

  countUp() {
    if (!this.state.cards) { this.wantCount = true; return; }
    this.wantCount = false;
    if (this.rm) { this.setState({ statT: 1 }); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 1200);
      this.setState({ statT: 1 - Math.pow(1 - t, 3) });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // The scripted answer in the AI demo, built from the live card list.
  chatLinesRaw() {
    const cards = this.state.cards || [];
    const picks = queryCards(cards, { filter: 'lounge' }).filter((c) => c.isLTF).slice(0, 3);
    const lines = [{ t: `From CardRadar's list, ${picks.length} lifetime-free cards with airport lounge access:`, k: 'p' }];
    picks.forEach((c) => {
      const a = c.benefits.lounges.airport;
      const parts = [a.domestic ? `${visits(a.domestic)} domestic` : null, a.international ? `${visits(a.international)} international` : null].filter(Boolean);
      lines.push({ t: `• ${c.name}: ${parts.join(', ')}`, k: 'li' });
    });
    const unv = picks.filter((c) => verificationBadge(c).kind !== 'verified').length;
    if (unv) lines.push({ t: `${unv === picks.length ? 'All of these are' : unv + ' of these are'} not verified yet. Check the lounge terms on the bank's site before you apply.`, k: 'warn' });
    return lines;
  }

  playChat() {
    if (!this.state.cards) { this.wantChat = true; return; }
    this.wantChat = false;
    clearInterval(this.chatIv); clearTimeout(this.chatTimer);
    const total = this.chatLinesRaw().map((l) => l.t).join('\n').length;
    if (this.rm) { this.setState({ chatPhase: 4, chatQ: CHAT_Q.length, chatA: total }); return; }
    this.setState({ chatPhase: 1, chatQ: 0, chatA: 0 });
    let q = 0;
    this.chatIv = setInterval(() => {
      q += 1; this.setState({ chatQ: q });
      if (q < CHAT_Q.length) return;
      clearInterval(this.chatIv);
      this.setState({ chatPhase: 2 });
      this.chatTimer = setTimeout(() => {
        this.setState({ chatPhase: 3 });
        let a = 0;
        this.chatIv = setInterval(() => {
          a += 3; this.setState({ chatA: Math.min(a, total) });
          if (a >= total) { clearInterval(this.chatIv); this.setState({ chatPhase: 4 }); }
        }, 18);
      }, 900);
    }, 38);
  }

  go(url) { window.location.href = url; }

  say(text) {
    this.setState({ toast: text });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2800);
  }

  scrollToId(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: this.rm ? 'auto' : 'smooth' });
    this.setState({ menuOpen: false });
  }

  planPrice(id) { return account.config.plans.find((p) => p.id === id)?.price ?? PLAN_DEFAULTS[id]; }

  // Everything the templates show about one card.
  vm(c) {
    const b = verificationBadge(c);
    const st = BADGE[b.kind];
    const prem = isPremium(c);
    const face = c.isLTF ? ['#b6ff3b', 'rgba(182,255,59,.35)'] : prem ? ['#ff2bd6', 'rgba(255,43,214,.4)'] : ['#00f0ff', 'rgba(0,240,255,.35)'];
    const showImg = Boolean(c.image) && !this.state.broken[c.id];
    const photo = (w, h, style) => (showImg ? raw(`<img src="${escapeHtml(c.image)}" alt="" width="${w}" height="${h}" loading="lazy" data-broken="${escapeHtml(c.id)}" style="${style}">`) : null);
    return {
      id: c.id, name: c.name, bank: c.bank,
      shortName: c.name.replace(/\s*Credit Card$/i, ''),
      network: String(c.network || '').split('/')[0].trim(),
      fee: c.isLTF ? 'Lifetime free' : `${rupee(c.annualFee || 0)} a year`,
      feeShort: c.isLTF ? 'LTF' : rupee(c.annualFee || 0),
      feeColor: c.isLTF ? 'var(--lime-ink)' : prem ? 'var(--gold-ink)' : 'var(--t2)',
      showImg, noImg: !showImg,
      photoMd: photo(112, 71, 'width:100%;height:100%;object-fit:contain;border-radius:8px'),
      photoLg: photo(200, 126, 'max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;filter:drop-shadow(0 4px 14px rgba(0,240,255,.25))'),
      photoSm: photo(84, 53, 'width:100%;height:100%;object-fit:contain;border-radius:6px'),
      hl: (c.highlights && c.highlights[0]) || c.category,
      badge: b.text, bColor: st.c, bBg: st.bg, bBorder: st.bd,
      faceBorder: face[0], faceGlow: face[1],
      open: () => this.go(`dashboard.html#card=${c.id}`),
    };
  }

  searchCards(q, limit) {
    const t = q.trim().toLowerCase();
    if (!t || !this.state.cards) return [];
    return this.state.cards.filter((c) => c.name.toLowerCase().includes(t) || c.bank.toLowerCase().includes(t))
      .sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit);
  }

  openChat() {
    if (account.info) this.go('dashboard.html#chat');
    else this.setState({ chatOpen: true });
  }

  renderVals() {
    const S = this.state;
    const cards = S.cards;
    const ready = Boolean(cards);
    const wide = S.w >= 1024;
    const on = (fn) => (e) => { e.preventDefault(); fn(); };
    const signedIn = Boolean(account.info);
    const isPro = Boolean(account.info?.subscribed);

    const navLinks = NAV.map(([id, label]) => ({
      label, href: `#${id}`, onClick: on(() => this.scrollToId(id)),
      current: S.active === id ? 'true' : undefined,
      color: S.active === id ? 'var(--cyan-ink)' : 'var(--t2)',
      line: S.active === id && wide ? 'var(--cyan)' : 'transparent',
    }));

    // Stats
    const stats0 = ready ? computeStats(cards) : null;
    const verifiedCount = ready ? cards.filter((c) => verificationBadge(c).kind === 'verified').length : 0;
    const cnt = (n) => (ready ? fmt(Math.round(n * S.statT)) : '—');
    const stats = [
      { value: cnt(stats0?.totalCards), label: 'cards', color: 'var(--cyan-ink)' },
      { value: cnt(stats0?.totalBanks), label: 'banks', color: 'var(--t1)' },
      { value: cnt(stats0?.ltfCount), label: 'lifetime free', color: 'var(--lime-ink)' },
      { value: cnt(verifiedCount), label: 'verified', color: 'var(--t1)' },
    ];

    // Hero stack
    const top5 = ready ? [...cards].filter((c) => c.image).sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 5) : [];
    const stack = top5.map((c, k) => {
      const i = (k - S.off + 5) % 5;
      const sl = SLOTS[i];
      return {
        photo: raw(`<img src="${escapeHtml(c.image)}" alt="" width="340" height="214" loading="eager"${k === 0 ? ' fetchpriority="high"' : ''} style="width:100%;height:100%;object-fit:contain;border-radius:14px;display:block">`),
        open: this.vm(c).open, aria: `${c.name}, open on dashboard`, tab: i === 0 ? 0 : -1,
        transform: `translate3d(${sl.x}px,${sl.y}px,${sl.z}px) rotate(${sl.r}deg) scale(${sl.s})`,
        z: 10 - i, opacity: sl.o, glow: i === 0 ? 'rgba(0,240,255,.35)' : 'transparent',
      };
    });
    const front = top5[S.off] ? this.vm(top5[S.off]) : { name: '', fee: '', feeColor: '' };
    const stackDots = top5.map((c, k) => ({
      label: `Show ${c.name}`, on: k === S.off ? 'true' : 'false',
      onClick: () => this.setState({ off: k }),
      w: k === S.off ? '22px' : '6px', bg: k === S.off ? 'var(--cyan)' : 'var(--bd-a)',
    }));

    // Quick search
    const qsList = this.searchCards(S.qs, 6);
    const qsExpanded = S.qsOpen && S.qs.trim().length > 0;
    const pickQs = (c) => { this.setState({ qs: c.name, qsOpen: false, qsIdx: -1 }); this.go(`dashboard.html#card=${c.id}`); };
    const qsResults = qsList.map((c, i) => ({
      optId: `qs-opt-${i}`, name: c.name, bank: c.bank, active: i === S.qsIdx ? 'true' : 'false',
      bg: i === S.qsIdx ? 'rgba(0,240,255,.1)' : 'transparent',
      pick: (e) => { e.preventDefault(); pickQs(c); }, hover: () => this.setState({ qsIdx: i }),
    }));

    // Marquee: the bank list twice so the loop is seamless
    const banks = ready ? bankCounts(cards) : [];
    const marquee = [...banks, ...banks].map((b, i) => ({ name: b.name, count: b.cardCount, dup: i >= banks.length ? 'true' : undefined }));

    // Quiz
    const qi = Math.min(S.quizStep, QUIZ.length - 1);
    const quizDone = S.quizStep >= QUIZ.length;
    const recs = quizDone && ready ? recommend(cards, S.answers, 5) : [];
    const quizResults = recs.slice(0, 3).map((r) => ({ ...this.vm(r.card), reasons: r.reasons.filter((x) => x !== 'Details verified') }));

    // Explorer
    const rows = TABS.map((t) => (ready ? tabRows(cards, t) : []));
    const setTab = (i) => {
      this.setState({ tab: i }, () => document.getElementById(`tab-${i}`)?.focus());
      const p = document.getElementById('cat-panel');
      if (p) p.scrollLeft = 0;
    };
    const tabs = TABS.map((t, i) => {
      const sel = i === S.tab;
      return {
        id: `tab-${i}`, label: t.label, count: ready ? rows[i].length : '', selected: sel ? 'true' : 'false', tabIndex: sel ? 0 : -1,
        onClick: () => setTab(i),
        border: sel ? 'var(--cyan)' : 'var(--bd)', bg: sel ? 'rgba(0,240,255,.1)' : 'transparent',
        color: sel ? 'var(--cyan-ink)' : 'var(--t2)', shadow: sel ? '0 0 12px rgba(0,240,255,.35)' : 'none',
      };
    });
    const tabKey = (e) => {
      const n = TABS.length;
      let i = null;
      if (e.key === 'ArrowRight') i = (S.tab + 1) % n;
      else if (e.key === 'ArrowLeft') i = (S.tab - 1 + n) % n;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = n - 1;
      if (i !== null) { e.preventDefault(); setTab(i); }
    };

    // Calculator: yearly rewards minus the annual fee, at the low end of each reward range
    const monthly = Object.values(S.spend).reduce((a, b) => a + b, 0);
    const yearly = monthly * 12;
    const calcAll = ready ? cards.map((c) => {
      const rr = rateRange(c);
      if (!rr) return null;
      const fee = c.isLTF ? 0 : (c.annualFee || 0);
      const rewards = yearly * rr[0];
      return { c, rate: rr[0], fee, rewards, net: rewards - fee };
    }).filter(Boolean).sort((a, b) => b.net - a.net) : [];
    const top3 = calcAll.slice(0, 3);
    const maxNet = Math.max(1, ...top3.map((r) => Math.max(r.net, 0)));
    const calcTop = top3.map((r, i) => ({
      rank: i + 1, name: r.c.name, open: () => this.go(`dashboard.html#card=${r.c.id}`),
      netLabel: `${rupee(r.net)}/yr`, netColor: r.net >= 0 ? 'var(--cyan-ink)' : 'var(--t3)',
      width: `${Math.max(2, (Math.max(r.net, 0) / maxNet) * 100).toFixed(1)}%`,
      detail: `${rupee(r.rewards)} rewards at ${(r.rate * 100).toFixed(2).replace(/\.?0+$/, '')}% − ${r.fee ? rupee(r.fee) + ' fee' : 'no fee'}`,
    }));
    const sliders = SPENDS.map(([k, label, max]) => ({
      id: `sl-${k}`, label, max, value: S.spend[k], valueLabel: rupee(S.spend[k]), valueText: `${rupee(S.spend[k])} per month`,
      onChange: (e) => { const v = Number(e.target.value); this.setState((s) => ({ spend: { ...s.spend, [k]: v } })); },
    }));

    // Lifetime free vs premium
    const ltfCards = ready ? cards.filter((c) => c.isLTF) : [];
    const premCards = ready ? cards.filter((c) => !c.isLTF) : [];
    const pool = S.side === 'ltf' ? ltfCards : premCards;
    const loungePct = pool.length ? Math.round((pool.filter(hasLounge).length / pool.length) * 100) : 0;
    const sideStats = [
      { value: ready ? fmt(pool.length) : '—', label: 'cards' },
      { value: ready ? rupee(median(pool.map((c) => (c.isLTF ? 0 : c.annualFee || 0)))) : '—', label: 'median annual fee' },
      { value: ready ? `${loungePct}%` : '—', label: 'include airport lounges' },
    ];
    const sideCards = ready ? queryCards(cards, { filter: S.side === 'ltf' ? 'ltf' : 'non-ltf' }).slice(0, 3).map((c) => this.vm(c)) : [];
    const sides = [['ltf', 'Lifetime free'], ['prem', 'Paid & premium']].map(([k, label]) => ({
      label, on: S.side === k ? 'true' : 'false', onClick: () => this.setState({ side: k }),
      bg: S.side === k ? (k === 'ltf' ? '#b6ff3b' : '#ffb800') : 'transparent',
      color: S.side === k ? '#05060d' : 'var(--t2)',
    }));
    const ltfShareN = ready ? (ltfCards.length / cards.length) * 100 : 20;

    // Compare
    const cmpCards = S.cmp.map((sl) => (sl.id && cards ? cards.find((c) => c.id === sl.id) : null));
    const setSlot = (i, patch) => this.setState((s) => ({ cmp: s.cmp.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
    const cmpSlots = S.cmp.map((sl, i) => {
      const found = this.searchCards(sl.q, 8);
      const popular = () => (cards || []).slice().sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 8);
      const opts = sl.open ? (found.length ? found : sl.q.trim() ? [] : popular()) : [];
      const pick = (c) => setSlot(i, { q: c.name, id: c.id, open: false, idx: -1 });
      return {
        label: i === 0 ? 'Card A' : 'Card B', inputId: `cmp-in-${i}`, listId: `cmp-list-${i}`,
        q: sl.q, open: sl.open && opts.length > 0, hasPick: Boolean(sl.id),
        border: sl.id ? 'var(--bd-a)' : 'var(--bd)',
        activeId: sl.idx >= 0 ? `cmp-${i}-opt-${sl.idx}` : undefined,
        onInput: (e) => setSlot(i, { q: e.target.value, open: true, idx: -1, id: null }),
        onFocus: () => setSlot(i, { open: true }),
        onBlur: () => setTimeout(() => setSlot(i, { open: false }), 120),
        onKey: (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSlot(i, { open: true, idx: Math.min(opts.length - 1, sl.idx + 1) }); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSlot(i, { idx: Math.max(0, sl.idx - 1) }); }
          else if (e.key === 'Enter' && opts[sl.idx]) { e.preventDefault(); pick(opts[sl.idx]); }
          else if (e.key === 'Escape') setSlot(i, { open: false });
        },
        clear: () => setSlot(i, { q: '', id: null, idx: -1 }),
        options: opts.map((c, j) => ({
          optId: `cmp-${i}-opt-${j}`, name: c.name, bank: c.bank, active: j === sl.idx ? 'true' : 'false',
          bg: j === sl.idx ? 'rgba(0,240,255,.1)' : 'transparent',
          pick: (e) => { e.preventDefault(); pick(c); }, hover: () => setSlot(i, { idx: j }),
        })),
      };
    });
    const [ca, cb] = cmpCards;
    const cmpReady = Boolean(ca && cb);
    const row = (label, show, score, dir) => {
      const va = score ? score(ca) : null;
      const vb = score ? score(cb) : null;
      let best = null;
      if (score && va != null && vb != null && va !== vb) best = (dir === 'low' ? va < vb : va > vb) ? 'a' : 'b';
      const cell = (k) => ({ color: best === k ? 'var(--cyan-ink)' : 'var(--t1)', bg: best === k ? 'rgba(0,240,255,.08)' : 'transparent', w: best === k ? 700 : 500 });
      const A = cell('a');
      const B = cell('b');
      return { label, a: show(ca), b: show(cb), aColor: A.color, aBg: A.bg, aWeight: A.w, bColor: B.color, bBg: B.bg, bWeight: B.w };
    };
    const cmpRows = cmpReady ? [
      row('Annual fee', (c) => (c.isLTF ? 'Lifetime free' : rupee(c.annualFee || 0)), (c) => (c.isLTF ? 0 : c.annualFee || 0), 'low'),
      row('Reward rate', (c) => c.rewardRate || '—', (c) => { const r = rateRange(c); return r ? r[0] : null; }, 'high'),
      row('Domestic lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.domestic) : '—'), (c) => (c.benefits ? loungeScore(c.benefits.lounges?.airport?.domestic) : null), 'high'),
      row('International lounges', (c) => (c.benefits ? visits(c.benefits.lounges?.airport?.international) : '—'), (c) => (c.benefits ? loungeScore(c.benefits.lounges?.airport?.international) : null), 'high'),
      row('Forex markup', (c) => c.benefits?.forex?.markupFee || '—', forexOf, 'low'),
      row('Verification', (c) => verificationBadge(c).text, (c) => ({ verified: 2, outdated: 1, unverified: 0 })[verificationBadge(c).kind], 'high'),
    ] : [];

    // Trust
    const kinds = { verified: 0, outdated: 0, unverified: 0 };
    if (ready) cards.forEach((c) => { kinds[verificationBadge(c).kind] += 1; });
    const trustLabels = [
      ['verified', 'Verified · month', "Matched to the bank's page in the weekly check, with the month shown."],
      ['outdated', 'May be outdated', "The bank's page changed since our last check, or a change is waiting for review."],
      ['unverified', 'Unverified', "Not yet matched against the bank's page. Confirm with the bank."],
    ].map(([k, label, desc]) => ({ label, desc, count: ready ? fmt(kinds[k]) : '—', color: BADGE[k].c, bg: BADGE[k].bg, border: BADGE[k].bd }));
    const exCard = ready ? queryCards(cards, {})[0] : null;

    // Chat demo
    const script = ready ? this.chatLinesRaw() : [];
    const typed = script.map((l) => l.t).join('\n').slice(0, S.chatA).split('\n');
    const chatLines = S.chatPhase >= 3 ? typed.map((t, i) => {
      const k = script[i]?.k;
      return { text: t, indent: k === 'li' ? '4px' : '0', color: k === 'warn' ? 'var(--amber-ink)' : k === 'li' ? 'var(--t1)' : 'var(--t2)', weight: k === 'li' ? 600 : 400, size: k === 'warn' ? '13px' : '14.5px' };
    }) : [];

    const qsMove = (d) => this.setState((s) => ({ qsOpen: true, qsIdx: Math.max(-1, Math.min(qsList.length - 1, s.qsIdx + d)) }));
    const price = this.planPrice(S.yearly ? 'yearly' : 'monthly');

    return {
      wide, narrow: !wide, menuOpen: S.menuOpen ? 'true' : 'false', showMobileMenu: !wide && S.menuOpen,
      toggleMenu: () => this.setState((s) => ({ menuOpen: !s.menuOpen })),
      navLinks, isDark: S.theme === 'dark', isLight: S.theme === 'light',
      themeLabel: S.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      toggleTheme: () => {
        const t = S.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('cardradar-theme', t); } catch { /* storage blocked */ }
        this.applyTheme(t);
      },
      signIn: () => account.open(), signInLabel: isPro ? 'PRO' : signedIn ? 'Account' : 'Sign in',
      goTop: on(() => this.scrollToId('top')), goFinder: on(() => this.scrollToId('finder')),
      cmpFull: (e) => { if (!cmpReady) e.preventDefault(); },
      ready, loading: !ready && !S.loadError, loadError: S.loadError, retry: () => this.load(),
      showRadar: true,
      stats,
      stack, hasFront: top5.length > 0, front, stackDots,
      stageTransform: `rotateX(${S.ry}deg) rotateY(${S.rx}deg)`,
      stackMove: (e) => {
        if (this.rm) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        this.setState({ rx: +(x * 18).toFixed(2), ry: +(-y * 14).toFixed(2), stackHover: true });
      },
      stackLeave: () => this.setState({ rx: 0, ry: 0, stackHover: false }),
      qs: S.qs, qsExpanded, qsResults, qsNone: qsExpanded && ready && qsList.length === 0,
      qsActiveId: S.qsIdx >= 0 && qsExpanded ? `qs-opt-${S.qsIdx}` : undefined,
      qsBorder: S.qsOpen ? 'var(--bd-a)' : 'var(--bd)', qsShadow: S.qsOpen ? '0 0 0 1px rgba(0,240,255,.4),0 0 16px rgba(0,240,255,.2)' : 'none',
      qsInput: (e) => this.setState({ qs: e.target.value, qsOpen: true, qsIdx: -1 }),
      qsFocus: () => this.setState({ qsOpen: true }), qsBlur: () => setTimeout(() => this.setState({ qsOpen: false }), 120),
      qsKey: (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); qsMove(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); qsMove(-1); }
        else if (e.key === 'Enter') { const c = qsList[S.qsIdx] || qsList[0]; if (c) { e.preventDefault(); pickQs(c); } }
        else if (e.key === 'Escape') this.setState({ qsOpen: false, qsIdx: -1 });
      },
      marquee, marqueeState: S.marqueePaused ? 'paused' : 'running',
      marqueeIn: () => this.setState({ marqueePaused: true }), marqueeOut: () => this.setState({ marqueePaused: false }),
      quizAsking: !quizDone, quizDone, quizStep: S.quizStep,
      quizStepLabel: `Question ${qi + 1} of ${QUIZ.length}`, quizPct: `${(S.quizStep / QUIZ.length) * 100}%`,
      quizQuestion: QUIZ[qi].q, quizCanBack: S.quizStep > 0,
      quizBack: () => this.setState((s) => ({ quizStep: Math.max(0, s.quizStep - 1) })),
      quizOptions: QUIZ[qi].options.map(([label, val]) => ({ label, onClick: () => this.setState((s) => ({ answers: { ...s.answers, [QUIZ[qi].key]: val }, quizStep: s.quizStep + 1 })) })),
      quizResults, quizEmpty: quizDone && ready && recs.length === 0,
      quizHeading: recs.length ? `Your top ${Math.min(3, recs.length)} matches` : 'No matches yet',
      quizAllLabel: recs.length > 3 ? `See all ${recs.length} matches` : 'Open the full card finder',
      quizRestart: () => this.setState({ quizStep: 0, answers: {} }),
      tabs, tabKey, tabPanelLabel: `tab-${S.tab}`,
      tabCards: ready ? rows[S.tab].slice(0, 12).map((c) => this.vm(c)) : [],
      tabTotal: ready ? rows[S.tab].length : 0, tabAllHref: `dashboard.html#${TABS[S.tab].hash}`,
      skeleton4: [1, 2, 3, 4], skeleton3: [1, 2, 3],
      sliders, calcYearly: rupee(yearly), calcTop,
      calcBasisNote: `Uses the lower end of ranges like “1–5%”; ${ready ? cards.length - calcAll.length : '—'} cards with points-based rates are skipped.`,
      sides, sideStats, sideCards,
      sideBorder: S.side === 'ltf' ? 'rgba(182,255,59,.45)' : 'rgba(255,184,0,.45)',
      sideInk: S.side === 'ltf' ? 'var(--lime-ink)' : 'var(--gold-ink)',
      sideBlurb: S.side === 'ltf' ? 'No joining or annual fee. Most suit everyday spending; a few include lounge visits.' : 'Annual fees buy lounges, golf, travel perks and higher reward rates. Many banks waive the fee above a yearly spend.',
      ltfShare: `${ltfShareN.toFixed(1)}%`, ltfBarOpacity: S.side === 'ltf' ? 1 : 0.35, premBarOpacity: S.side === 'ltf' ? 0.35 : 1,
      cmpSlots, cmpReady, cmpWaiting: !cmpReady, cmpA: ca?.name, cmpB: cb?.name, cmpRows,
      cmpHref: cmpReady ? `dashboard.html#compare=${ca.id},${cb.id}` : '#',
      trustLabels, hasExample: Boolean(exCard), example: exCard ? this.vm(exCard) : {},
      chatIdle: S.chatPhase === 0, chatShowQ: S.chatPhase >= 1, chatQ: CHAT_Q.slice(0, S.chatQ), chatTypingQ: S.chatPhase === 1,
      chatThinking: S.chatPhase === 2, chatShowA: S.chatPhase >= 3, chatLines,
      replayChat: () => this.playChat(),
      openChat: () => this.openChat(), chatOpen: S.chatOpen,
      toggleChat: () => (S.chatOpen ? this.setState({ chatOpen: false }) : this.openChat()),
      billing: [['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([k, label]) => {
        const sel = (k === 'yearly') === S.yearly;
        return { label, on: sel ? 'true' : 'false', save: k === 'yearly', saveColor: sel ? '#05060d' : 'var(--lime-ink)', onClick: () => this.setState({ yearly: k === 'yearly' }), bg: sel ? 'var(--cyan)' : 'transparent', color: sel ? '#05060d' : 'var(--t2)' };
      }),
      proPrice: `₹${fmt(price)}`, proPer: S.yearly ? '/year' : '/month',
      proSub: S.yearly ? `About ₹${fmt(Math.round(price / 12))} a month, billed yearly` : 'Billed monthly',
      proCta: isPro ? 'You are on PRO' : S.yearly ? 'Get PRO yearly' : 'Get PRO monthly',
      subscribe: () => (isPro ? account.open() : account.subscribe(S.yearly ? 'yearly' : 'monthly')),
      faq: FAQ.map(([q, a]) => ({ q, a })),
      hasToast: Boolean(S.toast), toast: S.toast,
    };
  }
}

new Landing(document.getElementById('app'));
})();
