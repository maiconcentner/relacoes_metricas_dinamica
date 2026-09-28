/* Estado compartilhado, cálculos do triângulo e utilidades. */
(function () {
  'use strict';

  const DEFAULTS = {
    view: 'lab',      // 'lab' | 'sem'
    a: 25,            // hipotenusa
    m: 9,             // projeção de AB (= c) sobre a hipotenusa
    step: 0,          // passo da animação de semelhança
    level: 'ef',      // 'ef' | 'em'
    hide: false,      // modo mistério
    values: true,     // valores junto às figuras
    angles: true,
    fill: true,
    arc: true,
    grid: true,
    snap: 0.5,
    dec: 2,
    unit: '',
    theme: 'auto',
    font: 1,
    speed: 1,
  };

  const STORE_KEY = 'relacoes-metricas:v1';
  const listeners = [];

  const RM = (window.RM = {
    DEFAULTS,
    state: Object.assign({}, DEFAULTS),
    revealed: new Set(), // medidas reveladas individualmente no modo mistério
  });

  /* ---------- Triângulo ---------- */
  RM.tri = function (s) {
    s = s || RM.state;
    const a = s.a;
    const m = s.m;
    const n = a - m;
    const h = Math.sqrt(m * n);
    const b = Math.sqrt(a * n); // AC
    const c = Math.sqrt(a * m); // AB
    const beta = (Math.atan2(b, c) * 180) / Math.PI; // ângulo em B
    const gamma = 90 - beta;                          // ângulo em C
    return { a, b, c, h, m, n, beta, gamma };
  };

  /* ---------- Formatação (pt-BR) ---------- */
  RM.fmt = function (x, dec) {
    const d = dec == null ? RM.state.dec : dec;
    const r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
    return r.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
  };
  RM.withUnit = function (txt, power) {
    const u = RM.state.unit;
    if (!u) return txt;
    return txt + ' ' + u + (power === 2 ? '²' : '');
  };
  RM.isHidden = function (key) {
    return RM.state.hide && !RM.revealed.has(key);
  };

  /* ---------- Eventos ---------- */
  RM.on = function (fn) { listeners.push(fn); };
  RM.set = function (patch, opts) {
    const prev = Object.assign({}, RM.state);
    Object.assign(RM.state, patch);
    sanitize(RM.state);
    if ('hide' in patch && patch.hide !== prev.hide) RM.revealed.clear();
    const changed = Object.keys(patch).filter((k) => prev[k] !== RM.state[k]);
    if (!changed.length && !(opts && opts.force)) return;
    save();
    listeners.forEach((fn) => fn(changed, prev, opts || {}));
  };

  function sanitize(s) {
    s.a = clamp(Number(s.a) || DEFAULTS.a, 1, 500);
    const minM = Math.min(0.01 * s.a, 0.05);
    s.m = clamp(Number(s.m) || s.a / 2, minM, s.a - minM);
    s.step = Math.max(0, Math.round(Number(s.step) || 0));
    if (s.level !== 'em') s.level = 'ef';
    if (s.view !== 'sem') s.view = 'lab';
    s.dec = clamp(Math.round(Number(s.dec)), 0, 3);
    s.font = clamp(Number(s.font) || 1, 0.85, 1.6);
    s.speed = clamp(Number(s.speed) || 1, 0.25, 3);
    s.snap = [0.1, 0.5, 1].includes(Number(s.snap)) ? Number(s.snap) : 0.5;
  }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  RM.clamp = clamp;

  RM.snap = function (x, stepSize) {
    const st = stepSize || RM.state.snap;
    return Math.round(Math.round(x / st) * st * 1000) / 1000;
  };

  /* ---------- Persistência local ---------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(RM.state)); } catch (e) { /* sem armazenamento */ }
  }
  RM.loadSaved = function () {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) Object.assign(RM.state, JSON.parse(raw));
    } catch (e) { /* ignora */ }
    sanitize(RM.state);
  };

  /* ---------- Link compartilhável ----------
     Usa só caracteres seguros em âncoras: #sem~a25~m9~s3~em~o1
  */
  RM.encodeHash = function () {
    const s = RM.state;
    const parts = [s.view, 'a' + s.a, 'm' + s.m, 's' + s.step, s.level, 'o' + (s.hide ? 1 : 0), 'd' + s.dec];
    if (s.unit) parts.push('u' + s.unit);
    return parts.join('~');
  };
  RM.decodeHash = function (hash) {
    const h = (hash || '').replace(/^#/, '');
    if (!h) return null;
    const out = {};
    h.split('~').forEach((tok) => {
      if (tok === 'lab' || tok === 'sem') out.view = tok;
      else if (tok === 'ef' || tok === 'em') out.level = tok;
      else if (/^a[\d.]+$/.test(tok)) out.a = parseFloat(tok.slice(1));
      else if (/^m[\d.]+$/.test(tok)) out.m = parseFloat(tok.slice(1));
      else if (/^s\d+$/.test(tok)) out.step = parseInt(tok.slice(1), 10);
      else if (/^o[01]$/.test(tok)) out.hide = tok === 'o1';
      else if (/^d\d$/.test(tok)) out.dec = parseInt(tok.slice(1), 10);
      else if (/^u(cm|m)$/.test(tok)) out.unit = tok.slice(1);
    });
    return Object.keys(out).length ? out : null;
  };

  /* ---------- Animação ---------- */
  RM.reducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  RM.ease = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  RM.tween = function (duration, onFrame, onDone) {
    let raf = 0;
    let start = 0;
    let cancelled = false;
    if (duration <= 0 || RM.reducedMotion()) {
      onFrame(1);
      if (onDone) onDone();
      return { cancel() {} };
    }
    function frame(ts) {
      if (cancelled) return;
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      onFrame(RM.ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    raf = requestAnimationFrame(frame);
    return { cancel() { cancelled = true; cancelAnimationFrame(raf); } };
  };
})();
