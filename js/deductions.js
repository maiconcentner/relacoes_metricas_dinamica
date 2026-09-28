/* Deduções: um cartão por relação, com animação curta, e Pitágoras com áreas (Euclides). */
(function () {
  'use strict';
  const RM = window.RM;
  const D = RM.draw;

  const W = 1000;
  const F = (x) => RM.fmt(x);
  const i = (v) => '<i>' + v + '</i>';
  const fr = (a, b) => '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>';
  const ml = (html) => '<div class="mathline">' + html + '</div>';
  const COLNAME = { hip: 'hipotenusa', ob: 'lado oposto a <span class="c-beta">β</span>', og: 'lado oposto a <span class="c-gamma">γ</span>' };
  const TRI = { big: '△ABC', p1: '<span class="c-p1">△HBA</span>', p2: '<span class="c-p2">△HAC</span>' };

  const CARDS = [
    { id: 'c2', kind: 'sim', formula: i('c') + '² = ' + i('a') + ' · ' + i('m'), sub: 'Cateto ' + i('c') + ' e sua projeção',
      result: i('c') + '² = ' + i('a') + ' · ' + i('m'), check: (t) => [F(t.c) + '²', t.c * t.c, F(t.a) + ' · ' + F(t.m), t.a * t.m] },
    { id: 'b2', kind: 'sim', formula: i('b') + '² = ' + i('a') + ' · ' + i('n'), sub: 'Cateto ' + i('b') + ' e sua projeção',
      result: i('b') + '² = ' + i('a') + ' · ' + i('n'), check: (t) => [F(t.b) + '²', t.b * t.b, F(t.a) + ' · ' + F(t.n), t.a * t.n] },
    { id: 'h2', kind: 'sim', formula: i('h') + '² = ' + i('m') + ' · ' + i('n'), sub: 'Altura e projeções',
      result: i('h') + '² = ' + i('m') + ' · ' + i('n'), check: (t) => [F(t.h) + '²', t.h * t.h, F(t.m) + ' · ' + F(t.n), t.m * t.n] },
    { id: 'ah', kind: 'sim', formula: i('a') + ' · ' + i('h') + ' = ' + i('b') + ' · ' + i('c'), sub: 'Hipotenusa, altura e catetos',
      result: i('a') + ' · ' + i('h') + ' = ' + i('b') + ' · ' + i('c'), check: (t) => [F(t.a) + ' · ' + F(t.h), t.a * t.h, F(t.b) + ' · ' + F(t.c), t.b * t.c] },
    { id: 'area', kind: 'area', formula: i('a') + '² = ' + i('b') + '² + ' + i('c') + '²', sub: 'Pitágoras com áreas' },
    { id: 'inv', kind: 'alg', em: true, formula: fr('1', i('h') + '²') + ' = ' + fr('1', i('b') + '²') + ' + ' + fr('1', i('c') + '²'), sub: 'Só no nível EM' },
  ];

  let els = {};
  let mini = null;
  let sel = 'c2';
  let step = 0;
  let steps = [];
  let area = { gc: 0, gb: 0, ga: 0, ext: 0, sc: 0, sb: 0, fillC: 0, fillB: 0 };
  let areaAnim = null;

  /* ---------- Cartões de semelhança ---------- */
  function simSteps(card) {
    const rel = RM.sim.REL[card.id];
    const r1 = RM.sim.ROWS.find((r) => r.name === rel.rows[0]);
    const r2 = RM.sim.ROWS.find((r) => r.name === rel.rows[1]);
    const [c1, c2] = rel.cols;
    const keys = [r1.key, r2.key];
    const hl = {};
    hl[r1.key] = { [r1[c1]]: 'hl1', [r1[c2]]: 'hl2' };
    hl[r2.key] = { [r2[c1]]: 'hl1', [r2[c2]]: 'hl2' };
    const inplace = {};
    keys.forEach((k) => { inplace[k] = 'inplace'; });
    const aligned = {};
    keys.forEach((k) => { aligned[k] = 'rot'; });
    const pairTxt = TRI[keys[0]] + ' e ' + TRI[keys[1]];
    const letters = fr(i(r1[c1]), i(r2[c1])) + ' = ' + fr(i(r1[c2]), i(r2[c2]));
    const lettersHl = fr('<span class="c-hl1">' + i(r1[c1]) + '</span>', '<span class="c-hl1">' + i(r2[c1]) + '</span>') + ' = ' +
      fr('<span class="c-hl2">' + i(r1[c2]) + '</span>', '<span class="c-hl2">' + i(r2[c2]) + '</span>');
    const cross = i(r1[c1]) + ' · ' + i(r2[c2]) + ' = ' + i(r2[c1]) + ' · ' + i(r1[c2]);

    const t0 = RM.tri();
    const seq = mini.seq(t0, keys);
    const md = (dir) => (Math.abs(dir) === 1 ? 900 / (RM.state.speed || 1) : 0);
    const out = [
      {
        title: 'Onde estão os triângulos',
        html: () => '<p>A altura <b>AH</b> divide △ABC em dois triângulos menores. Para esta relação comparamos ' + pairTxt + '.</p>' +
          '<p>O contorno tracejado é o triângulo ABC inteiro.</p>',
        enter: (dir) => mini.show({ t: RM.tri(), ghost: true }, keys, inplace, md(dir)),
      },
      {
        title: 'Separando os triângulos',
        move: true, dur: 900,
        html: () => '<p>Tiramos os dois de dentro de △ABC e colocamos lado a lado, ainda na mesma posição em que estavam.</p>' +
          '<p>Agora vamos deixá-los na mesma posição, <b>um movimento por clique</b>.</p>',
        enter: (dir) => mini.show({ t: RM.tri() }, keys, seq[0].phases, md(dir)),
      },
    ];
    seq.slice(1, -1).forEach((it) => {
      const dsc = RM.sim.describeMove(it.move);
      out.push({
        title: dsc.title,
        move: true, dur: 900,
        html: () => dsc.html,
        enter: (dir) => mini.show({ t: RM.tri(), mirrorKey: it.move.type === 'flip' ? it.move.key : null }, keys, it.phases, md(dir)),
      });
    });
    out.push(
      {
        title: 'Lados correspondentes',
        html: () => '<p>Agora o ângulo reto, <span class="c-beta">β</span> e <span class="c-gamma">γ</span> estão nos mesmos lugares: os triângulos são <b>semelhantes</b> (caso AA).</p>' +
          '<p>Comparamos <span class="c-hl1">' + COLNAME[c1] + '</span> com ' + COLNAME[c1] +
          ' e <span class="c-hl2">' + COLNAME[c2] + '</span> com ' + COLNAME[c2] + '. Em triângulos semelhantes, essas razões são iguais:</p>' +
          ml(lettersHl),
        enter: (dir) => mini.show({ t: RM.tri(), hl }, keys, aligned, md(dir)),
      },
      {
        title: 'A relação',
        html: () => {
          const t = RM.tri();
          const [lt, lv, rt, rv] = card.check(t);
          return ml(letters + ' &nbsp;⇒&nbsp; ' + cross) +
            ml('<span class="result">' + card.result + '</span>') +
            (card.id === 'ah' ? '<p>Também sai da área de △ABC: ' + fr(i('b') + ' · ' + i('c'), '2') + ' = ' + fr(i('a') + ' · ' + i('h'), '2') + '.</p>' : '') +
            (RM.state.hide ? '<p class="note">Valores ocultos.</p>'
              : ml('<span class="num">Conferindo:</span> ' + lt + ' = ' + F(lv) + ' &nbsp; e &nbsp; ' + rt + ' = ' + F(rv) + ' <span style="color:var(--ok)">✓</span>'));
        },
        enter: () => mini.show({ t: RM.tri(), hl }, keys, aligned, 0),
      },
    );
    return out;
  }

  /* ---------- Pitágoras com áreas (cisalhamentos de Euclides) ---------- */
  function areaGeom(t) {
    const { a, m, n, h } = t;
    const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
    const B = [0, 0], C = [a, 0], A = [m, h], H = [m, 0];
    const B2 = [0, -a], C2 = [a, -a], L = [m, -a], K = [m, h - a];
    const v = [-h, m], v2 = [h, n];
    return {
      B, C, A, H, B2, C2, L,
      c: { pivot: B, dir: -1, sq: [B, A, add(A, v), add(B, v)], par1: [B, C, add(C, v), add(B, v)], par2: [B, B2, K, A], rect: [B, B2, L, H] },
      b: { pivot: C, dir: 1, sq: [C, A, add(A, v2), add(C, v2)], par1: [C, B, add(B, v2), add(C, v2)], par2: [C, C2, K, A], rect: [C, C2, L, H] },
    };
  }
  function lerpPts(P, Q, e) { return P.map((p, k) => [p[0] + (Q[k][0] - p[0]) * e, p[1] + (Q[k][1] - p[1]) * e]); }
  function rotPts(P, c, ang) {
    const cs = Math.cos(ang), sn = Math.sin(ang);
    return P.map((p) => { const dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs]; });
  }
  /* s ∈ [0, 3]: 0 quadrado, 1 paralelogramo, 2 girado 90°, 3 retângulo. */
  function shapeAt(g, s) {
    if (s <= 1) return lerpPts(g.sq, g.par1, s);
    if (s <= 2) return rotPts(g.par1, g.pivot, g.dir * (Math.PI / 2) * (s - 1));
    return lerpPts(g.par2, g.rect, s - 2);
  }

  /* Estado da demonstração: g* = quanto cada quadrado já cresceu, ext = altura prolongada,
     sc/sb = etapa do movimento de cada quadrado (0 quadrado → 1 paralelogramo → 2 girado → 3 retângulo). */
  const AREA_ZERO = { gc: 0, gb: 0, ga: 0, ext: 0, sc: 0, sb: 0, fillC: 0, fillB: 0 };
  const AS = (o) => Object.assign({}, AREA_ZERO, o);
  const AREA_STEPS = [
    { title: 'O triângulo retângulo', st: AS({}),
      html: () => '<p>Começamos com o triângulo retângulo ABC: catetos ' + i('b') + ' e ' + i('c') + ' e hipotenusa ' + i('a') + '.</p>' +
        '<p>Vamos construir, um de cada vez, um quadrado sobre cada lado.</p>' },
    { title: 'Um quadrado sobre o cateto c', st: AS({ gc: 1 }), move: true,
      html: () => '<p>O quadrado cresce a partir do lado <b>AB</b>. Seu lado mede ' + i('c') + ', então sua área é ' + i('c') + ' · ' + i('c') + ' = ' + i('c') + '².</p>' + areaNum('c') },
    { title: 'Um quadrado sobre o cateto b', st: AS({ gc: 1, gb: 1 }), move: true,
      html: () => '<p>Agora sobre o lado <b>AC</b>. A área é ' + i('b') + '².</p>' + areaNum('b') },
    { title: 'E um sobre a hipotenusa', st: AS({ gc: 1, gb: 1, ga: 1 }), move: true,
      html: () => '<p>Por último, o quadrado sobre a hipotenusa <b>BC</b>, de área ' + i('a') + '².</p>' + areaNum('a') },
    { title: 'A pergunta', st: AS({ gc: 1, gb: 1, ga: 1 }),
      html: () => '<p>O Teorema de Pitágoras diz que os dois quadrados menores, juntos, têm a mesma área do maior:</p>' +
        ml(i('c') + '² + ' + i('b') + '² = ' + i('a') + '² &nbsp;?') +
        '<p>Vamos mostrar isso <b>mudando as figuras de lugar sem mudar a área</b> delas.</p>' },
    { title: 'A altura corta o quadrado maior', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1 }), move: true,
      html: () => '<p>Prolongamos a altura <b>AH</b> até o outro lado do quadrado maior. Ele fica dividido em dois retângulos:</p>' +
        ml('lados ' + i('a') + ' e ' + i('m') + ' → área ' + i('a') + ' · ' + i('m')) + ml('lados ' + i('a') + ' e ' + i('n') + ' → área ' + i('a') + ' · ' + i('n')) },
    { title: 'Deslizando o quadrado amarelo', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 1 }), move: true,
      html: () => '<p>Deslizamos o lado de cima do quadrado ao longo da sua própria reta (um <b>cisalhamento</b>). Ele vira um paralelogramo.</p>' +
        '<p>A base e a altura continuam as mesmas, então <b>a área não muda</b>: repare no número junto da figura.</p>' },
    { title: 'Girando 90°', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 2 }), move: true,
      html: () => '<p>Giramos o paralelogramo 90° no sentido horário, em torno de <b>B</b>. Girar também não muda a área.</p>' },
    { title: 'Deslizando de novo', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 3, fillC: 1 }), move: true,
      html: () => '<p>Mais um deslizamento, agora na vertical, e o paralelogramo vira exatamente o retângulo ' + i('a') + ' · ' + i('m') + '.</p>' +
        '<p>A área nunca mudou. Então:</p>' + ml('<span class="result">' + i('c') + '² = ' + i('a') + ' · ' + i('m') + '</span>') +
        '<p>É a mesma relação que tiramos da semelhança!</p>' + check('c') },
    { title: 'Deslizando o quadrado verde', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 3, fillC: 1, sb: 1 }), move: true,
      html: () => '<p>Fazemos o mesmo com o quadrado de ' + i('b') + '. Primeiro, o deslizamento: a área não muda.</p>' },
    { title: 'Girando 90°', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 3, fillC: 1, sb: 2 }), move: true,
      html: () => '<p>Giramos 90° no sentido anti-horário, em torno de <b>C</b>.</p>' },
    { title: 'Deslizando de novo', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 3, fillC: 1, sb: 3, fillB: 1 }), move: true,
      html: () => '<p>O paralelogramo vira o retângulo ' + i('a') + ' · ' + i('n') + ':</p>' +
        ml('<span class="result">' + i('b') + '² = ' + i('a') + ' · ' + i('n') + '</span>') + check('b') },
    { title: 'Pitágoras', st: AS({ gc: 1, gb: 1, ga: 1, ext: 1, sc: 3, fillC: 1, sb: 3, fillB: 1 }),
      html: () => '<p>Os dois retângulos, juntos, formam o quadrado da hipotenusa:</p>' +
        ml(i('a') + '² = ' + i('a') + ' · ' + i('m') + ' + ' + i('a') + ' · ' + i('n')) +
        ml('<span class="result">' + i('a') + '² = ' + i('c') + '² + ' + i('b') + '²</span>') + check('a') },
  ];

  function areaNum(which) {
    if (RM.state.hide) return '';
    const t = RM.tri();
    return ml('<span class="num">Com os valores:</span> ' + i(which) + '² = ' + F(t[which]) + '² = ' + F(t[which] * t[which]));
  }

  function check(which) {
    if (RM.state.hide) return '';
    const t = RM.tri();
    const ok = ' <span style="color:var(--ok)">✓</span>';
    if (which === 'c') return ml('<span class="num">Conferindo:</span> ' + F(t.c) + '² = ' + F(t.c * t.c) + ' &nbsp; e &nbsp; ' + F(t.a) + ' · ' + F(t.m) + ' = ' + F(t.a * t.m) + ok);
    if (which === 'b') return ml('<span class="num">Conferindo:</span> ' + F(t.b) + '² = ' + F(t.b * t.b) + ' &nbsp; e &nbsp; ' + F(t.a) + ' · ' + F(t.n) + ' = ' + F(t.a * t.n) + ok);
    return ml('<span class="num">Conferindo:</span> ' + F(t.a) + '² = ' + F(t.a * t.a) + ' &nbsp; e &nbsp; ' + F(t.c * t.c) + ' + ' + F(t.b * t.b) + ' = ' + F(t.b * t.b + t.c * t.c) + ok);
  }

  function areaFit(t, g, plain) {
    const pts = [g.B, g.C, g.A, g.B2, g.C2];
    if (plain) pts.splice(3, 2);
    else [g.c, g.b].forEach((sh) => { [0, 0.5, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].forEach((s) => pts.push(...shapeAt(sh, s))); });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((plain ? 760 : 900) / (x1 - x0), (plain ? 420 : 570) / (y1 - y0));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return (p) => [W / 2 + k * (p[0] - cx), 310 - k * (p[1] - cy)];
  }

  /* Quadrado "crescendo" a partir do lado PQ (g de 0 a 1). */
  function grown(P, Q, far1, far2, g) {
    return [P, Q, [Q[0] + (far1[0] - Q[0]) * g, Q[1] + (far1[1] - Q[1]) * g], [P[0] + (far2[0] - P[0]) * g, P[1] + (far2[1] - P[1]) * g]];
  }

  function renderArea(mode) {
    const t = RM.tri();
    const g = areaGeom(t);
    const S = areaFit(t, g, mode === 'plain');
    const s = area;
    const fs = D.fs(26);
    const poly = (P, style) => D.poly(P.map(S), 'style="' + style + '"');
    const cen = (P) => { const q = P.map(S); return [q.reduce((x, p) => x + p[0], 0) / q.length, q.reduce((x, p) => x + p[1], 0) / q.length]; };
    const showNum = !RM.state.hide;
    const areaTxt = (sym, v) => sym + (showNum ? ' = ' + F(v) : '');
    const P = { A: S(g.A), B: S(g.B), C: S(g.C), H: S(g.H) };
    let out = '';

    if (mode !== 'plain') {
      // Quadrado da hipotenusa (cresce para baixo) e seus retângulos
      if (s.ga > 0) {
        const hq = grown(g.B, g.C, g.C2, g.B2, s.ga);
        out += poly(hq, 'fill:var(--big-fill);stroke:var(--big);stroke-width:2.6');
        if (s.fillC > 0) out += poly(g.c.rect, 'fill:var(--p1-fill);stroke:none;opacity:' + s.fillC.toFixed(2));
        if (s.fillB > 0) out += poly(g.b.rect, 'fill:var(--p2-fill);stroke:none;opacity:' + s.fillB.toFixed(2));
        if (s.ext > 0.01) {
          const end = [g.H[0] + (g.L[0] - g.H[0]) * s.ext, g.H[1] + (g.L[1] - g.H[1]) * s.ext];
          out += D.line(S(g.H), S(end), 'style="stroke:var(--ink);stroke-width:2.2;stroke-dasharray:8 6"');
          const op = Math.max(0, (s.ext - 0.6) / 0.4).toFixed(2);
          if (s.sc < 2.5) out += D.text(cen(g.c.rect), 'a·m', 'class="alabel" font-size="' + fs + '" style="fill:var(--muted);opacity:' + op + '"');
          if (s.sb < 2.5) out += D.text(cen(g.b.rect), 'a·n', 'class="alabel" font-size="' + fs + '" style="fill:var(--muted);opacity:' + op + '"');
        }
        if (s.ext < 0.3 && s.ga > 0.6) out += D.text(cen(hq), areaTxt('a²', t.a * t.a), 'class="alabel" font-size="' + D.fs(28) + '" style="fill:var(--big)"');
      }
      // Contorno do lugar original de cada quadrado que já se moveu
      if (s.sc > 0.02) out += poly(g.c.sq, 'fill:none;stroke:var(--p1);stroke-width:1.6;stroke-dasharray:6 6;opacity:.7');
      if (s.sb > 0.02) out += poly(g.b.sq, 'fill:none;stroke:var(--p2);stroke-width:1.6;stroke-dasharray:6 6;opacity:.7');
    }

    // Triângulo (as figuras que se movem passam por cima dele)
    out += D.poly([P.A, P.B, P.C], 'style="fill:var(--surface);stroke:none"');
    out += D.poly([P.A, P.B, P.C], 'style="fill:var(--big-fill);stroke:none"');
    if (mode === 'plain' || s.ext > 0) {
      out += D.line(P.A, P.H, 'style="stroke:var(--ink);stroke-width:2.2;stroke-dasharray:8 6"');
      out += D.rightMark(P.H, P.C, P.A, 10, 'var(--ink)');
    }

    if (mode !== 'plain') {
      const shape = (sh, gg, st, fill, stroke, sym, val) => {
        if (gg <= 0) return '';
        const pts = st > 0 ? shapeAt(sh, st) : grown(sh.sq[0], sh.sq[1], sh.sq[2], sh.sq[3], gg);
        let o = poly(pts, 'fill:' + fill + ';stroke:' + stroke + ';stroke-width:2.6;stroke-linejoin:round');
        if (gg > 0.6) o += D.text(cen(pts), areaTxt(sym, val), 'class="alabel" font-size="' + D.fs(26) + '" style="fill:' + stroke + '"');
        return o;
      };
      out += shape(g.c, s.gc, s.sc, 'var(--p1-fill)', 'var(--p1)', 'c²', t.c * t.c);
      out += shape(g.b, s.gb, s.sb, 'var(--p2-fill)', 'var(--p2)', 'b²', t.b * t.b);
    }

    // Contorno e marcas do triângulo por cima de tudo
    out += D.poly([P.A, P.B, P.C], 'style="fill:none;stroke:var(--big);stroke-width:3;stroke-linejoin:round"');
    out += D.rightMark(P.A, P.B, P.C, 13, 'var(--ink)');
    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    const vfs = D.fs(26);
    out += D.text(D.vertexLabelPos(P.A, G, 26), 'A', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.B, G, 24), 'B', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.C, G, 24), 'C', 'class="vlabel" font-size="' + vfs + '"');
    const sl = (v, p, q, r, color) => D.text(D.sideLabelPos(p, q, r, D.fs(20)), v, 'class="slabel" font-size="' + fs + '"' + (color ? ' style="fill:' + color + '"' : ''));
    if (mode === 'plain') {
      out += D.text(D.footLabelPos(P.H, P.A, P.B, D.fs(13)), 'H', 'class="vlabel" font-size="' + D.fs(20) + '" style="fill:var(--muted)"');
      out += sl('c', P.A, P.B, P.C, 'var(--hl2)') + sl('b', P.A, P.C, P.B, 'var(--hl2)') + sl('h', P.A, P.H, P.B, 'var(--hl1)');
      out += sl('a', P.B, P.C, P.A);
    } else {
      // Nomes dos lados enquanto os quadrados ainda não cobrem o lado
      if (s.gc < 0.3) out += sl('c', P.A, P.B, P.C);
      if (s.gb < 0.3) out += sl('b', P.A, P.C, P.B);
      if (s.ga < 0.3) out += sl('a', P.B, P.C, P.A);
      if (s.ext > 0) out += D.text(D.footLabelPos(P.H, P.A, P.B, D.fs(13)), 'H', 'class="vlabel" font-size="' + D.fs(20) + '" style="fill:var(--muted)"');
    }
    els.svg.innerHTML = out;
  }

  function stopAll() {
    if (areaAnim) { areaAnim.cancel(); areaAnim = null; }
    if (mini) mini.stop();
  }

  function areaGo(target, dur, done) {
    stopAll();
    const from = Object.assign({}, area);
    areaAnim = RM.tween(dur, (e) => {
      Object.keys(target).forEach((k) => { area[k] = from[k] + (target[k] - from[k]) * e; });
      renderArea();
    }, () => { areaAnim = null; if (done) done(); });
  }

  function areaSteps() {
    return AREA_STEPS.map((st, idx) => ({
      title: st.title,
      html: st.html,
      dur: st.move ? 1700 : 0,
      move: !!st.move,
      enter: (dir, done) => {
        const jump = dir !== 1;
        areaGo(st.st, jump ? 0 : 1700 / (RM.state.speed || 1), done);
      },
    }));
  }

  /* ---------- Cartão algébrico (EM) ---------- */
  function algSteps() {
    const plain = () => { stopAll(); renderArea('plain'); };
    return [
      { title: 'Ponto de partida', enter: plain,
        html: () => '<p>Da semelhança (ou da área) sabemos que:</p>' + ml(i('a') + ' · ' + i('h') + ' = ' + i('b') + ' · ' + i('c') + ' &nbsp;⇒&nbsp; ' + i('h') + ' = ' + fr(i('b') + ' · ' + i('c'), i('a'))) },
      { title: 'Elevando ao quadrado', enter: plain,
        html: () => ml(i('h') + '² = ' + fr(i('b') + '² · ' + i('c') + '²', i('a') + '²')) },
      { title: 'Usando Pitágoras', enter: plain,
        html: () => '<p>Trocamos ' + i('a') + '² por ' + i('b') + '² + ' + i('c') + '²:</p>' + ml(i('h') + '² = ' + fr(i('b') + '² · ' + i('c') + '²', i('b') + '² + ' + i('c') + '²')) },
      { title: 'Invertendo', enter: plain,
        html: () => {
          const t = RM.tri();
          const ih = 1 / (t.h * t.h), ibc = 1 / (t.b * t.b) + 1 / (t.c * t.c);
          return ml(fr('1', i('h') + '²') + ' = ' + fr(i('b') + '² + ' + i('c') + '²', i('b') + '² · ' + i('c') + '²') + ' = ' +
            fr(i('b') + '²', i('b') + '² · ' + i('c') + '²') + ' + ' + fr(i('c') + '²', i('b') + '² · ' + i('c') + '²')) +
            ml('<span class="result">' + CARDS[5].formula + '</span>') +
            (RM.state.hide ? '' : ml('<span class="num">Conferindo:</span> 1/' + F(t.h) + '² ≈ ' + RM.fmt(ih, 5) + ' &nbsp; e &nbsp; 1/' + F(t.b) + '² + 1/' + F(t.c) + '² ≈ ' + RM.fmt(ibc, 5)));
        } },
    ];
  }

  /* ---------- Navegação ---------- */
  function build() {
    const card = CARDS.find((c) => c.id === sel);
    steps = card.kind === 'sim' ? simSteps(card) : card.kind === 'area' ? areaSteps() : algSteps();
    step = RM.clamp(step, 0, steps.length - 1);
  }

  function renderText() {
    const st = steps[step];
    els.count.textContent = 'Passo ' + (step + 1) + ' de ' + steps.length;
    els.title.textContent = st.title;
    els.body.innerHTML = st.html();
    document.getElementById('ded-replay').hidden = !st.move;
    els.prev.disabled = step === 0;
    els.next.disabled = step === steps.length - 1;
    els.dots.innerHTML = steps.map((s, idx) =>
      '<button class="dot' + (idx < step ? ' done' : '') + (idx === step ? ' current' : '') + '" data-dstep="' + idx +
      '" aria-label="Passo ' + (idx + 1) + ': ' + s.title + '" title="' + (idx + 1) + '. ' + s.title + '"></button>').join('');
  }

  function renderList() {
    const em = RM.state.level === 'em';
    els.list.innerHTML = CARDS.filter((c) => !c.em || em).map((c) =>
      '<button class="ded-card" data-card="' + c.id + '" aria-pressed="' + (c.id === sel) + '">' +
      '<span class="ded-f">' + c.formula + '</span><span class="ded-sub">' + c.sub + '</span></button>').join('');
  }

  function goTo(n, fromPlay) {
    if (!fromPlay) setPlaying(false);
    stopAll();
    const dir = n - step;
    step = RM.clamp(n, 0, steps.length - 1);
    renderText();
    steps[step].enter(dir);
    if (playing) schedulePlay();
  }

  /* Reprodução automática: avança sozinho, esperando cada movimento terminar. */
  let playing = false;
  let playTimer = null;
  function setPlaying(on) {
    playing = on;
    clearTimeout(playTimer);
    const b = document.getElementById('ded-play');
    b.classList.toggle('playing', on);
    b.setAttribute('aria-label', on ? 'Pausar' : 'Reproduzir automaticamente');
  }
  function schedulePlay() {
    clearTimeout(playTimer);
    if (!playing) return;
    if (step >= steps.length - 1) { setPlaying(false); return; }
    const st = steps[step];
    const sp = RM.state.speed || 1;
    const wait = (st.dur || 0) / sp + 2600 / sp;
    playTimer = setTimeout(() => { if (playing) goTo(step + 1, true); }, wait);
  }

  function select(id) {
    setPlaying(false);
    stopAll();
    sel = id;
    step = 0;
    area = Object.assign({}, AREA_ZERO);
    build();
    renderList();
    renderText();
    steps[0].enter(0);
  }

  RM.ded = {
    init() {
      els = {
        svg: document.getElementById('ded-svg'),
        list: document.getElementById('ded-list'),
        count: document.getElementById('ded-count'),
        title: document.getElementById('ded-title'),
        body: document.getElementById('ded-body'),
        dots: document.getElementById('ded-dots'),
        prev: document.getElementById('ded-prev'),
        next: document.getElementById('ded-next'),
      };
      mini = RM.sim.createMini(els.svg);
      els.list.addEventListener('click', (e) => { const b = e.target.closest('[data-card]'); if (b) select(b.dataset.card); });
      els.prev.addEventListener('click', () => goTo(step - 1));
      document.getElementById('ded-replay').addEventListener('click', () => {
        setPlaying(false);
        stopAll();
        if (step > 0) steps[step - 1].enter(9); // volta ao estado anterior sem animar
        steps[step].enter(1);                   // e refaz só este movimento
      });
      els.next.addEventListener('click', () => goTo(step + 1));
      document.getElementById('ded-play').addEventListener('click', () => {
        if (playing) { setPlaying(false); return; }
        setPlaying(true);
        if (step >= steps.length - 1) goTo(0, true); else goTo(step + 1, true);
      });
      els.dots.addEventListener('click', (e) => { const d = e.target.closest('[data-dstep]'); if (d) goTo(Number(d.dataset.dstep)); });
      RM.on((changed) => {
        if (changed.includes('level')) {
          if (RM.state.level !== 'em' && sel === 'inv') { select('c2'); return; }
          renderList();
        }
        if (['a', 'm', 'rot', 'mirror', 'pose', 'hide', 'dec', 'font'].some((k) => changed.includes(k))) {
          stopAll();
          build(); // a quantidade de movimentos pode mudar com a posição
          renderText();
          steps[step].enter(9); // redesenha sem animar
        }
      });
      select('c2');
    },
    render() { if (steps[step]) steps[step].enter(9); },
    next() { goTo(step + 1); },
    prev() { goTo(step - 1); },
  };
})();
