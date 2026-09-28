// Renders the compiled Claude Design pages (landing.tpl.js, dashboard.tpl.js).
// A page is a class with `state` and `renderVals()`; setState() re-renders and patches only what changed,
// so inputs keep focus and open <details> stay open.

(() => {
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

// Trusted markup returned from renderVals (card photos, chat replies already escaped by renderMarkdown).
class Raw {
  constructor(html) { this.html = html; }
}
const raw = (html) => new Raw(html);

// {{ value }} in text or inside an attribute value.
function T(v) {
  if (v == null || typeof v === 'boolean') return '';
  if (v instanceof Raw) return v.html;
  return String(v).replace(/[&<>"]/g, (c) => ESC[c]);
}

// attr="{{ value }}": null and false leave the attribute out, true writes a bare or aria/data "true".
function A(name, v) {
  if (v == null) return '';
  if (v === false) return /^(aria|data)-/.test(name) ? ` ${name}="false"` : '';
  if (v === true) return /^(aria|data)-/.test(name) ? ` ${name}="true"` : ` ${name}`;
  return ` ${name}="${T(v)}"`;
}

// Attributes as last written by a render, so styles a handler changed (card tilt) are not fought over.
function stamp(node) {
  if (node.nodeType !== 1) return;
  node.__a = Object.fromEntries([...node.attributes].map((a) => [a.name, a.value]));
  node.childNodes.forEach(stamp);
}

function patchAttributes(el, next) {
  const last = el.__a || {};
  const now = {};
  for (const a of next.attributes) now[a.name] = a.value;
  for (const name in now) if (last[name] !== now[name]) el.setAttribute(name, now[name]);
  for (const name in last) if (!(name in now)) el.removeAttribute(name);
  el.__a = now;
}

function syncValue(el, next) {
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !next.hasAttribute('value')) return;
  const value = next.getAttribute('value');
  if (el.value !== value) el.value = value;
}

function morph(parent, fresh) {
  const olds = parent.childNodes;
  const news = [...fresh.childNodes];
  news.forEach((n, i) => {
    const o = olds[i];
    if (!o) { parent.appendChild(n); stamp(n); return; }
    if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { parent.replaceChild(n, o); stamp(n); return; }
    if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
    patchAttributes(o, n);
    morph(o, n);
    syncValue(o, n);
  });
  while (olds.length > news.length) parent.removeChild(parent.lastChild);
}

// Events reach handlers through one listener per type on the page root. These do not bubble, so they only match their own target.
const OWN_TARGET = new Set(['mouseenter', 'mouseleave', 'pointerleave']);
const EVENT_TYPES = ['click', 'input', 'change', 'keydown', 'focusin', 'focusout', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'pointermove', 'pointerleave', 'submit'];

class Page {
  constructor(root, template) {
    this.root = root;
    this.template = template;
    this.state = {};
    this.handlers = [];
    this.last = '';
    this.queued = false;
    this.after = [];
    for (const type of EVENT_TYPES) {
      root.addEventListener(type, (e) => this.dispatch(type, e), OWN_TARGET.has(type));
    }
  }

  // Like React: merge a patch (or the result of fn(state)), render once for this tick, then run cb.
  setState(patch, cb) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (cb) this.after.push(cb);
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => { this.queued = false; this.render(); });
  }

  render() {
    const handlers = [];
    const H = (fn) => (typeof fn === 'function' ? handlers.push(fn) - 1 : null);
    const html = this.template(this.renderVals(), T, A, H);
    this.handlers = handlers;
    if (html !== this.last) {
      this.last = html;
      const box = document.createElement('template');
      box.innerHTML = html;
      morph(this.root, box.content);
    }
    const callbacks = this.after;
    this.after = [];
    callbacks.forEach((cb) => cb());
  }

  dispatch(type, e) {
    const attr = `data-h-${type}`;
    let stopped = false;
    const stop = e.stopPropagation;
    e.stopPropagation = () => { stopped = true; stop.call(e); };
    for (let el = e.target; el && el !== this.root.parentNode; el = el.parentElement) {
      if (el.nodeType === 1 && el.hasAttribute(attr)) {
        const fn = this.handlers[Number(el.getAttribute(attr))];
        Object.defineProperty(e, 'currentTarget', { value: el, configurable: true });
        if (fn) fn.call(this, e);
        if (stopped) return;
      }
      if (OWN_TARGET.has(type)) return;
    }
  }

  ref(name) { return this.root.querySelector(`[data-ref="${name}"]`); }
}

Object.assign(window, { Page, raw });
})();
