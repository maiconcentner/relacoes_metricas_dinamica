/* Inicialização, navegação e painel do professor. */
(function () {
  'use strict';
  const RM = window.RM;
  const $ = (id) => document.getElementById(id);

  const PRESETS = [
    { a: 25, m: 9, title: '15 · 20 · 25', desc: 'tudo inteiro: h = 12, m = 9, n = 16' },
    { a: 5, m: 1.8, title: '3 · 4 · 5', desc: 'o clássico; h = 2,4' },
    { a: 10, m: 3.6, title: '6 · 8 · 10', desc: 'h = 4,8; m = 3,6' },
    { a: 50, m: 18, title: '30 · 40 · 50', desc: 'tudo inteiro: h = 24' },
    { a: 20, m: 4, title: 'm = 4, n = 16', desc: 'h = 8 exato (h² = m·n)' },
    { a: 10, m: 5, title: 'Isósceles', desc: 'b = c, β = γ = 45°' },
  ];

  /* ---------- Reflete o estado na interface ---------- */
  function syncUI() {
    const s = RM.state;
    const t = RM.tri();

    $('view-lab').hidden = s.view !== 'lab';
    $('view-sem').hidden = s.view !== 'sem';
    $('tab-lab').setAttribute('aria-selected', s.view === 'lab');
    $('tab-sem').setAttribute('aria-selected', s.view === 'sem');

    $('lvl-ef').setAttribute('aria-pressed', s.level === 'ef');
    $('lvl-em').setAttribute('aria-pressed', s.level === 'em');
    $('btn-hide').setAttribute('aria-pressed', s.hide);
    $('btn-hide').querySelector('span').textContent = s.hide ? 'Mostrar valores' : 'Ocultar valores';

    // Painel
    const aMax = Math.max(60, Math.ceil(s.a));
    const rgA = $('rg-a');
    rgA.max = aMax; rgA.step = s.snap; rgA.value = s.a;
    const rgM = $('rg-m');
    rgM.min = s.snap; rgM.max = Math.max(s.snap, s.a - s.snap); rgM.step = s.snap; rgM.value = s.m;
    if (document.activeElement !== $('in-a')) $('in-a').value = s.a;
    if (document.activeElement !== $('in-m')) $('in-m').value = s.m;
    $('in-m').max = s.a;
    if (!document.activeElement || !['in-b', 'in-c'].includes(document.activeElement.id)) {
      $('in-b').value = round(t.b); $('in-c').value = round(t.c);
    }

    segSync('seg-snap', String(s.snap));
    segSync('seg-dec', String(s.dec));
    segSync('seg-unit', s.unit);
    segSync('seg-theme', s.theme);
    segSync('seg-speed', String(s.speed));
    $('ck-hide').checked = s.hide;
    $('ck-values').checked = s.values;
    $('ck-alt').checked = s.alt;
    $('ck-names').checked = s.names;
    document.querySelectorAll('[data-layer]').forEach((b) => b.setAttribute('aria-pressed', !!s[b.dataset.layer]));
    $('ck-angles').checked = s.angles;
    $('ck-fill').checked = s.fill;
    $('ck-arc').checked = s.arc;
    $('ck-grid').checked = s.grid;
    $('rg-font').value = s.font;
    $('rg-rot').value = s.rot;
    $('rot-val').textContent = RM.fmt(s.rot, 0) + '°';
    $('ck-mirror').checked = s.mirror;
    segSync('seg-pose', s.pose);
    document.querySelectorAll('[data-pose]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pose === s.pose));
    document.querySelectorAll('.fb[data-act="mirror"]').forEach((b) => b.setAttribute('aria-pressed', s.mirror));

    document.documentElement.style.setProperty('--fs', s.font);
    if (s.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', s.theme);

    $('share-url').value = shareUrl();
  }

  function round(x) { return Math.round(x * 1000) / 1000; }
  function segSync(id, val) {
    Array.from($(id).querySelectorAll('button')).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === val));
  }
  function shareUrl() {
    const base = location.href.split('#')[0];
    return base + '#' + RM.encodeHash();
  }

  /* ---------- Painel ---------- */
  function openPanel(open) {
    $('panel').hidden = !open;
    $('scrim').hidden = !open;
    $('btn-panel').setAttribute('aria-expanded', open);
    if (open) $('panel-close').focus();
  }

  function bindPanel() {
    $('btn-panel').addEventListener('click', () => openPanel($('panel').hidden));
    $('panel-close').addEventListener('click', () => { openPanel(false); $('btn-panel').focus(); });
    $('scrim').addEventListener('click', () => openPanel(false));

    $('rg-a').addEventListener('input', (e) => {
      const a = Number(e.target.value);
      RM.set({ a, m: Math.min(RM.state.m, a - RM.state.snap) });
    });
    $('rg-m').addEventListener('input', (e) => RM.set({ m: Number(e.target.value) }));
    $('in-a').addEventListener('change', (e) => {
      const a = parseNum(e.target.value);
      if (a > 0) RM.set({ a, m: Math.min(RM.state.m, a * 0.99) });
      syncUI();
    });
    $('in-m').addEventListener('change', (e) => {
      const m = parseNum(e.target.value);
      if (m > 0) RM.set({ m });
      syncUI();
    });
    $('apply-bc').addEventListener('click', () => {
      const b = parseNum($('in-b').value), c = parseNum($('in-c').value);
      if (!(b > 0 && c > 0)) return;
      const a = Math.sqrt(b * b + c * c);
      RM.set({ a: round(a), m: round((c * c) / a) });
    });

    $('presets').innerHTML = PRESETS.map((p, i) =>
      '<button class="preset" data-i="' + i + '"><b>' + p.title + '</b><span>' + p.desc + '</span></button>').join('');
    $('presets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const p = PRESETS[Number(b.dataset.i)];
      RM.set({ a: p.a, m: p.m, dec: Math.max(RM.state.dec, 1) });
    });

    segBind('seg-snap', (v) => RM.set({ snap: Number(v) }));
    segBind('seg-dec', (v) => RM.set({ dec: Number(v) }));
    segBind('seg-unit', (v) => RM.set({ unit: v }));
    segBind('seg-theme', (v) => RM.set({ theme: v }));
    segBind('seg-speed', (v) => RM.set({ speed: Number(v) }));

    [['ck-hide', 'hide'], ['ck-alt', 'alt'], ['ck-names', 'names'], ['ck-values', 'values'], ['ck-angles', 'angles'], ['ck-fill', 'fill'], ['ck-arc', 'arc'], ['ck-grid', 'grid']]
      .forEach(([id, key]) => $(id).addEventListener('change', (e) => RM.set({ [key]: e.target.checked })));
    $('rg-font').addEventListener('input', (e) => RM.set({ font: Number(e.target.value) }));
    $('rg-rot').addEventListener('input', (e) => RM.set({ rot: Number(e.target.value) }));
    $('ck-mirror').addEventListener('change', (e) => RM.set({ mirror: e.target.checked }));
    segBind('seg-pose', (v) => RM.set({ pose: v }));
    document.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.layer;
      RM.set({ [k]: !RM.state[k] });
    }));
    document.querySelectorAll('[data-layers]').forEach((b) => b.addEventListener('click', () => {
      const on = b.dataset.layers === 'all';
      const patch = {};
      Object.keys(RM.LAYERS).forEach((k) => { patch[k] = on && k !== 'grid' && k !== 'arc' ? true : on && false; });
      if (on) patch.shown = 'abchmn';
      RM.set(patch);
    }));
    document.querySelectorAll('[data-pose]').forEach((b) => b.addEventListener('click', () => RM.set({ pose: b.dataset.pose })));
    document.querySelectorAll('.fb[data-act]').forEach((b) => b.addEventListener('click', () => figAction(b.dataset.act)));

    $('share-copy').addEventListener('click', () => {
      const url = shareUrl();
      const input = $('share-url');
      const done = (ok) => {
        $('share-msg').textContent = ok ? 'Link copiado. Cole no chat ou no mural da turma.' : 'Selecione o link acima e copie manualmente.';
        if (!ok) { input.focus(); input.select(); }
      };
      try {
        navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
      } catch (e) { done(false); }
    });
    $('reset-all').addEventListener('click', () => {
      const keepView = RM.state.view;
      RM.set(Object.assign({}, RM.DEFAULTS, { view: keepView }), { force: true });
    });
  }

  /* Ações da barra de posição da figura */
  function figAction(act) {
    const s = RM.state;
    switch (act) {
      case 'rotL': RM.set({ rot: s.rot + 15 }); break;
      case 'rotR': RM.set({ rot: s.rot - 15 }); break;
      case 'mirror': RM.set({ mirror: !s.mirror }); break;
      case 'stand': RM.set({ rot: RM.standingRot() }); break;
      case 'random': {
        let r;
        do { r = Math.round(Math.random() * 360) - 180; } while (Math.abs(RM.normDeg(r - s.rot)) < 40);
        RM.set({ rot: r, mirror: Math.random() < 0.5 });
        break;
      }
      case 'reset': RM.set({ rot: 0, mirror: false }); break;
    }
  }

  function segBind(id, fn) {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (b) fn(b.dataset.v);
    });
  }
  function parseNum(s) { return parseFloat(String(s).replace(',', '.')); }

  /* ---------- Tela cheia ---------- */
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { /* sem suporte */ }
  }

  /* ---------- Teclado ---------- */
  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;
    const s = RM.state;
    if (key === 'Escape' && !$('panel').hidden) { openPanel(false); return; }
    if (s.view === 'sem' && (key === 'ArrowRight' || key === 'PageDown' || key === ' ')) {
      if (key === ' ' && tag === 'button') return;
      e.preventDefault(); RM.sim.next(); return;
    }
    if (s.view === 'sem' && (key === 'ArrowLeft' || key === 'PageUp')) { e.preventDefault(); RM.sim.prev(); return; }
    if (s.view === 'sem' && key === 'Home') { e.preventDefault(); RM.sim.first(); return; }
    switch (key.toLowerCase()) {
      case 'l': RM.set({ view: 'lab' }); break;
      case 's': RM.set({ view: 'sem' }); break;
      case 'o': RM.set({ hide: !s.hide }); break;
      case 'n': RM.set({ level: s.level === 'ef' ? 'em' : 'ef' }); break;
      case 'f': toggleFullscreen(); break;
      case 'g': figAction(e.shiftKey ? 'rotR' : 'rotL'); break;
      case 'e': figAction('mirror'); break;
      case 'r': figAction('random'); break;
      case 'p': openPanel($('panel').hidden); break;
      default: return;
    }
  }

  /* ---------- Início ---------- */
  function init() {
    RM.loadSaved();
    const fromHash = RM.decodeHash(location.hash);
    if (fromHash) Object.assign(RM.state, fromHash);
    RM.set({}, { force: true });

    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
      RM.sim.stop();
      RM.set({ view: b.dataset.view });
    }));
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => RM.set({ level: b.dataset.level })));
    $('btn-hide').addEventListener('click', () => RM.set({ hide: !RM.state.hide }));
    $('btn-full').addEventListener('click', toggleFullscreen);
    bindPanel();
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => {
      const h = RM.decodeHash(location.hash);
      if (h) RM.set(h);
    });

    RM.on(syncUI);
    syncUI();
    RM.lab.init();
    RM.sim.init();

    // Em telas estreitas, aumenta as letras das figuras para continuarem legíveis.
    let lastBoost = 0;
    const updateBoost = () => {
      const svg = RM.state.view === 'lab' ? $('lab-svg') : $('sem-svg');
      const w = svg.getBoundingClientRect().width;
      if (!w) return;
      const boost = RM.clamp(620 / w, 1, 1.8);
      if (Math.abs(boost - lastBoost) < 0.02) return;
      lastBoost = boost;
      RM.draw.screenBoost = boost;
      RM.lab.render();
      RM.sim.render();
    };
    window.addEventListener('resize', updateBoost);
    RM.on((changed) => { if (changed.includes('view')) { lastBoost = 0; updateBoost(); } });
    updateBoost();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
