/* Laboratório: triângulo manipulável com medidas e relações ao vivo. */
(function () {
  'use strict';
  const RM = window.RM;
  const D = RM.draw;

  const W = 1000;
  const CX = 500, CY = 290;       // centro da figura na tela
  const FITW = 860, FITH = 460;   // área ocupada pela figura (com o semicírculo)

  let svg, measuresEl, relationsEl;
  let disp = { rot: 0, s: 1 };    // rotação (graus) e espelho (1 → -1) exibidos na tela
  let frozen = null;              // enquadramento congelado durante o arraste de um vértice
  let settle = null;              // transição do enquadramento depois de soltar
  let dispAnim = null;
  let drag = null;                // { which: 'A' | 'C' | 'rot' }
  let highlight = null;           // id da relação destacada

  const SEG = {
    a: ['B', 'C'], b: ['A', 'C'], c: ['A', 'B'],
    h: ['A', 'H'], m: ['B', 'H'], n: ['H', 'C'],
  };

  /* Relações exibidas. lhs/rhs: lados envolvidos em cada membro (para o destaque). */
  function relations(t) {
    const F = RM.fmt;
    const list = [
      { id: 'c2', f: '<i>c</i>² = <i>a</i> · <i>m</i>', lhs: ['c'], rhs: ['a', 'm'],
        L: t.c * t.c, R: t.a * t.m, nl: F(t.c) + '² = ' + F(t.c * t.c), nr: F(t.a) + ' · ' + F(t.m) + ' = ' + F(t.a * t.m) },
      { id: 'b2', f: '<i>b</i>² = <i>a</i> · <i>n</i>', lhs: ['b'], rhs: ['a', 'n'],
        L: t.b * t.b, R: t.a * t.n, nl: F(t.b) + '² = ' + F(t.b * t.b), nr: F(t.a) + ' · ' + F(t.n) + ' = ' + F(t.a * t.n) },
      { id: 'h2', f: '<i>h</i>² = <i>m</i> · <i>n</i>', lhs: ['h'], rhs: ['m', 'n'],
        L: t.h * t.h, R: t.m * t.n, nl: F(t.h) + '² = ' + F(t.h * t.h), nr: F(t.m) + ' · ' + F(t.n) + ' = ' + F(t.m * t.n) },
      { id: 'ah', f: '<i>a</i> · <i>h</i> = <i>b</i> · <i>c</i>', lhs: ['a', 'h'], rhs: ['b', 'c'],
        L: t.a * t.h, R: t.b * t.c, nl: F(t.a) + ' · ' + F(t.h) + ' = ' + F(t.a * t.h), nr: F(t.b) + ' · ' + F(t.c) + ' = ' + F(t.b * t.c) },
      { id: 'mn', f: '<i>a</i> = <i>m</i> + <i>n</i>', lhs: ['a'], rhs: ['m', 'n'],
        L: t.a, R: t.m + t.n, nl: F(t.a), nr: F(t.m) + ' + ' + F(t.n) + ' = ' + F(t.m + t.n) },
      { id: 'pit', f: '<i>a</i>² = <i>b</i>² + <i>c</i>²', tag: 'Pitágoras', lhs: ['a'], rhs: ['b', 'c'],
        L: t.a * t.a, R: t.b * t.b + t.c * t.c, nl: F(t.a) + '² = ' + F(t.a * t.a),
        nr: F(t.b) + '² + ' + F(t.c) + '² = ' + F(t.b * t.b + t.c * t.c) },
    ];
    if (RM.state.level === 'em') {
      const ih = 1 / (t.h * t.h);
      const ibc = 1 / (t.b * t.b) + 1 / (t.c * t.c);
      list.push({ id: 'inv', f: '<span class="frac"><span>1</span><span><i>h</i>²</span></span> = <span class="frac"><span>1</span><span><i>b</i>²</span></span> + <span class="frac"><span>1</span><span><i>c</i>²</span></span>',
        lhs: ['h'], rhs: ['b', 'c'], L: ih, R: ibc, nl: '1/' + F(t.h) + '² ≈ ' + F(ih, 5), nr: '1/' + F(t.b) + '² + 1/' + F(t.c) + '² ≈ ' + F(ibc, 5) });
    }
    return list;
  }

  /* ---------- Transformação: coordenadas do triângulo (B na origem, y para cima) → tela ---------- */
  function turn(p) {
    const th = (disp.rot * Math.PI) / 180;
    const x = p[0] * disp.s, y = p[1];
    return [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
  }
  function toScreen(p, v) {
    const r = turn(p);
    return [v.ox + v.k * r[0], v.oy - v.k * r[1]];
  }
  function toMath(sp, v) {
    if (Math.abs(disp.s) < 0.3) return null;
    const rx = (sp.x - v.ox) / v.k, ry = -(sp.y - v.oy) / v.k;
    const th = (disp.rot * Math.PI) / 180;
    const x = rx * Math.cos(th) + ry * Math.sin(th);
    const y = -rx * Math.sin(th) + ry * Math.cos(th);
    return [x / disp.s, y];
  }
  /* Enquadra o semicírculo inteiro (onde A pode estar), para a figura não "pular". */
  function fitView(t) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i <= 48; i++) {
      const f = (Math.PI * i) / 48;
      const r = turn([t.a / 2 + (t.a / 2) * Math.cos(f), (t.a / 2) * Math.sin(f)]);
      x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1]);
    }
    const k = Math.min(FITW / Math.max(x1 - x0, 1e-9), FITH / Math.max(y1 - y0, 1e-9));
    return { k, ox: CX - k * (x0 + x1) / 2, oy: CY + k * (y0 + y1) / 2 };
  }
  function currentView(t) {
    if (frozen) return frozen;
    const v = fitView(t);
    if (!settle) return v;
    const e = settle.e, f = settle.from;
    return { k: f.k + (v.k - f.k) * e, ox: f.ox + (v.ox - f.ox) * e, oy: f.oy + (v.oy - f.oy) * e };
  }

  function pts(t, v) {
    return {
      B: toScreen([0, 0], v),
      C: toScreen([t.a, 0], v),
      H: toScreen([t.m, 0], v),
      A: toScreen([t.m, t.h], v),
    };
  }

  function valueText(key, val, power) {
    if (RM.isHidden(key)) return null;
    return RM.withUnit(val, power);
  }

  /* Rótulo de lado: "c = 15", "c" ou "c = ?" (clicável). */
  function sideLabel(key, pos, t, color) {
    const fs = D.fs(28);
    const st = RM.state;
    let str = key;
    let cls = 'slabel';
    let extra = '';
    if (st.values) {
      const v = valueText(key, RM.fmt(t[key]));
      if (v == null) { str = key + ' = ?'; cls += ' clickable'; extra = ' data-reveal="' + key + '"'; }
      else str = key + ' = ' + v;
    }
    return D.text(pos, D.esc(str), 'class="' + cls + '" font-size="' + fs + '"' + extra + (color ? ' style="fill:' + color + '"' : ''));
  }

  function render() {
    const st = RM.state;
    const t = RM.tri();
    const v = currentView(t);
    const P = pts(t, v);
    const hl = highlight ? relations(t).find((r) => r.id === highlight) : null;
    const hlColor = {};
    if (hl) {
      hl.lhs.forEach((s) => { hlColor[s] = 'var(--hl1)'; });
      hl.rhs.forEach((s) => { if (!hlColor[s]) hlColor[s] = 'var(--hl2)'; });
    }
    let out = '';

    if (st.grid) {
      const g = D.grid(P.B[0], P.B[1], v.k, W, 620);
      out += g.svg;
    }

    // Semicírculo: lugar geométrico do vértice A
    if (st.arc) {
      const arc = [];
      for (let i = 0; i <= 64; i++) {
        const f = (Math.PI * i) / 64;
        const q = toScreen([t.a / 2 + (t.a / 2) * Math.cos(f), (t.a / 2) * Math.sin(f)], v);
        arc.push(q[0].toFixed(1) + ',' + q[1].toFixed(1));
      }
      out += '<polyline points="' + arc.join(' ') + '" style="fill:none;stroke:var(--muted);stroke-width:1.6;stroke-dasharray:6 7;opacity:.7"/>';
      const M = toScreen([t.a / 2, 0], v);
      out += '<circle cx="' + M[0] + '" cy="' + M[1] + '" r="3.5" style="fill:var(--muted)"/>';
    }

    // Triângulos
    if (st.fill) {
      out += D.poly([P.B, P.H, P.A], 'style="fill:var(--p1-fill);stroke:none"');
      out += D.poly([P.H, P.C, P.A], 'style="fill:var(--p2-fill);stroke:none"');
    } else {
      out += D.poly([P.B, P.C, P.A], 'style="fill:var(--big-fill);stroke:none"');
    }

    // Ângulos
    if (st.angles) {
      const fs = D.fs(26);
      out += D.angleArc(P.B, P.C, P.A, 48, 'var(--beta)', 'β', fs);
      out += D.angleArc(P.C, P.A, P.B, 48, 'var(--gamma)', 'γ', fs);
      out += D.angleArc(P.A, P.B, P.H, 36, 'var(--gamma)', null, fs);
      out += D.angleArc(P.A, P.H, P.C, 44, 'var(--beta)', null, fs);
    }
    out += D.rightMark(P.A, P.B, P.C, 16, 'var(--ink)');
    out += D.rightMark(P.H, P.C, P.A, 13, 'var(--ink)');

    // Lados
    out += D.poly([P.B, P.C, P.A], 'style="fill:none;stroke:var(--big);stroke-width:3;stroke-linejoin:round"');
    out += D.line(P.A, P.H, 'style="stroke:var(--ink);stroke-width:2.2;stroke-dasharray:8 6"');
    out += '<circle cx="' + P.H[0] + '" cy="' + P.H[1] + '" r="4" style="fill:var(--ink)"/>';

    // Destaque da relação escolhida
    Object.keys(hlColor).forEach((s) => {
      const seg = SEG[s];
      let p = P[seg[0]], q = P[seg[1]];
      if (s === 'a') [p, q] = D.offsetSeg(P.B, P.C, P.A, 58);
      out += D.line(p, q, 'style="stroke:' + hlColor[s] + ';stroke-width:8;stroke-linecap:round;opacity:.85"');
    });

    // Rótulos dos lados
    const off = D.fs(26);
    out += sideLabel('c', D.sideLabelPos(P.A, P.B, P.C, off), t, hlColor.c);
    out += sideLabel('b', D.sideLabelPos(P.A, P.C, P.B, off), t, hlColor.b);
    out += sideLabel('h', D.sideLabelPos(P.A, P.H, P.B, off * 1.1), t, hlColor.h);
    out += sideLabel('m', D.sideLabelPos(P.B, P.H, P.A, D.fs(24)), t, hlColor.m);
    out += sideLabel('n', D.sideLabelPos(P.H, P.C, P.A, D.fs(24)), t, hlColor.n);
    out += D.dimension(P.B, P.C, P.A, 58, (pos) => sideLabel('a', pos, t, hlColor.a),
      hlColor.a || 'var(--muted)', D.fs(28));

    // Vértices
    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    const vfs = D.fs(30);
    out += D.text(D.vertexLabelPos(P.A, G, 30), 'A', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.B, G, 28), 'B', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.C, G, 28), 'C', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.footLabelPos(P.H, P.A, P.B, D.fs(14)), 'H', 'class="vlabel" font-size="' + D.fs(22) + '" style="fill:var(--muted)"');

    // Indicador de posição
    const st2 = RM.state;
    if (st2.rot !== 0 || st2.mirror || (drag && drag.which === 'rot')) {
      const txt = 'Girado ' + RM.fmt(st2.rot, 0) + '°' + (st2.mirror ? ' · espelhado' : '');
      out += '<text x="20" y="' + D.fs(26) + '" class="badge" font-size="' + D.fs(20) + '">' + txt + '</text>';
    }

    // Alças de arraste
    out += handle('A', P.A);
    out += handle('C', P.C);

    svg.innerHTML = out;
    renderSide(t);
  }

  function handle(which, p) {
    return '<g class="handle" data-handle="' + which + '">' +
      '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="26" style="fill:transparent"/>' +
      '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" style="fill:var(--accent);stroke:var(--surface);stroke-width:3"/>' +
      '</g>';
  }

  /* ---------- Painel lateral ---------- */
  function measureBtn(key, label, val, hint) {
    const hidden = RM.isHidden(key);
    return '<button class="meas' + (hidden ? ' hidden-val' : '') + '" data-reveal="' + key + '"' +
      (hidden ? ' title="Toque para revelar"' : ' tabindex="-1"') + '>' +
      '<span><span class="k">' + label + '</span> <span class="hint">' + hint + '</span></span>' +
      '<span class="v">' + (hidden ? '<span class="qmark">?</span>' : val) + '</span></button>';
  }

  function renderSide(t) {
    const F = RM.fmt;
    const U = (x) => RM.withUnit(F(x));
    measuresEl.innerHTML =
      measureBtn('a', 'a', U(t.a), 'hipotenusa') +
      measureBtn('h', 'h', U(t.h), 'altura') +
      measureBtn('b', 'b', U(t.b), 'cateto') +
      measureBtn('c', 'c', U(t.c), 'cateto') +
      measureBtn('m', 'm', U(t.m), 'projeção de c') +
      measureBtn('n', 'n', U(t.n), 'projeção de b') +
      measureBtn('beta', 'β', F(t.beta, 1) + '°', 'ângulo B') +
      measureBtn('gamma', 'γ', F(t.gamma, 1) + '°', 'ângulo C');

    const hideNums = RM.state.hide;
    relationsEl.innerHTML = relations(t).map((r) => {
      const ok = Math.abs(r.L - r.R) < 1e-6 * Math.max(1, Math.abs(r.L));
      return '<li><button class="rel" data-rel="' + r.id + '" aria-pressed="' + (highlight === r.id) + '">' +
        '<span class="f">' + r.f + (r.tag ? '<span class="tag">' + r.tag + '</span>' : '') + '</span>' +
        '<span class="num">' + (hideNums ? 'Valores ocultos' : r.nl + ' &nbsp;|&nbsp; ' + r.nr) + '</span>' +
        '<span class="check" aria-label="' + (ok ? 'confere' : 'não confere') + '">' + (ok ? '✓' : '✗') + '</span>' +
        '</button></li>';
    }).join('');
  }

  /* ---------- Arraste: vértices A e C, ou girar a figura ---------- */
  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onDown(evt) {
    if (evt.button != null && evt.button !== 0) return;
    const h = evt.target.closest('[data-handle]');
    if (!h && evt.target.closest('[data-reveal]')) return;
    evt.preventDefault();
    if (settle) { settle.anim.cancel(); settle = null; }
    const p = svgPoint(evt);
    if (h) {
      frozen = currentView(RM.tri());
      drag = { which: h.getAttribute('data-handle') };
    } else {
      if (dispAnim) { dispAnim.cancel(); dispAnim = null; }
      drag = { which: 'rot', ang0: Math.atan2(p.y - CY, p.x - CX), rot0: disp.rot };
      svg.classList.add('rotating');
    }
    svg.setPointerCapture(evt.pointerId);
  }
  function onMove(evt) {
    if (!drag) return;
    const p = svgPoint(evt);
    const s = RM.state;
    if (drag.which === 'rot') {
      const ang = Math.atan2(p.y - CY, p.x - CX);
      let delta = (-(ang - drag.ang0) * 180) / Math.PI;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      disp.rot = Math.round(drag.rot0 + delta);
      RM.set({ rot: disp.rot });
      return;
    }
    const q = toMath(p, frozen);
    if (!q) return;
    const st = s.snap;
    if (drag.which === 'A') {
      const m = RM.clamp(RM.snap(q[0]), st, s.a - st);
      if (m !== s.m) RM.set({ m });
    } else {
      const a = RM.clamp(RM.snap(q[0]), s.m + st, 500);
      if (a !== s.a) RM.set({ a });
    }
  }
  function onUp() {
    if (!drag) return;
    const was = drag.which;
    drag = null;
    svg.classList.remove('rotating');
    if (was === 'rot') { render(); return; }
    const from = frozen;
    frozen = null;
    settle = { from, e: 0 };
    settle.anim = RM.tween(450, (e) => { if (settle) { settle.e = e; render(); } }, () => { settle = null; render(); });
  }

  /* Anima rotação/espelho até o estado atual. */
  function animateDisp() {
    if (dispAnim) dispAnim.cancel();
    const from = { rot: disp.rot, s: disp.s };
    let diff = RM.state.rot - from.rot;
    diff = ((diff + 180) % 360 + 360) % 360 - 180;
    const to = { rot: from.rot + diff, s: RM.state.mirror ? -1 : 1 };
    dispAnim = RM.tween(700 / (RM.state.speed || 1), (e) => {
      disp.rot = from.rot + (to.rot - from.rot) * e;
      disp.s = from.s + (to.s - from.s) * e;
      render();
    }, () => { dispAnim = null; disp.rot = RM.state.rot; render(); });
  }

  RM.lab = {
    init() {
      svg = document.getElementById('lab-svg');
      measuresEl = document.getElementById('lab-measures');
      relationsEl = document.getElementById('lab-relations');
      svg.addEventListener('pointerdown', onDown);
      svg.addEventListener('pointermove', onMove);
      svg.addEventListener('pointerup', onUp);
      svg.addEventListener('pointercancel', onUp);

      const reveal = (evt) => {
        const el = evt.target.closest('[data-reveal]');
        if (!el || !RM.state.hide) return;
        RM.revealed.add(el.getAttribute('data-reveal'));
        render();
      };
      svg.addEventListener('click', reveal);
      measuresEl.addEventListener('click', reveal);
      relationsEl.addEventListener('click', (evt) => {
        const b = evt.target.closest('[data-rel]');
        if (!b) return;
        const id = b.getAttribute('data-rel');
        highlight = highlight === id ? null : id;
        render();
      });

      RM.on((changed) => {
        if ((changed.includes('rot') || changed.includes('mirror')) && !(drag && drag.which === 'rot')) {
          animateDisp();
          return;
        }
        render();
      });
      disp = { rot: RM.state.rot, s: RM.state.mirror ? -1 : 1 };
      render();
    },
    render,
  };
})();
