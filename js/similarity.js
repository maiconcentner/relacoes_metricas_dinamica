/* Semelhança passo a passo: separar, refletir, girar e comparar os três triângulos. */
(function () {
  'use strict';
  const RM = window.RM;
  const D = RM.draw;

  const W = 1000;
  const H = 620;

  let svg, titleEl, bodyEl, countEl, dotsEl, tableCard, tableEl, prevBtn, nextBtn, playBtn;
  let cur = null;       // estados atuais das peças
  let anim = null;
  let playTimer = null;
  let playing = false;

  /* ---------- Peças (coordenadas matemáticas, y para cima) ---------- */
  function pieces(t) {
    const B = [0, 0], C = [t.a, 0], A = [t.m, t.h], Hh = [t.m, 0];
    return {
      big: mk({ A, B, C }, { beta: 'B', gamma: 'C', right: 'A' }, { a: ['B', 'C'], b: ['C', 'A'], c: ['A', 'B'] },
        'var(--big)', 'var(--big-fill)', 'ABC'),
      p1: mk({ H: Hh, B, A }, { beta: 'B', gamma: 'A', right: 'H' }, { c: ['B', 'A'], h: ['A', 'H'], m: ['H', 'B'] },
        'var(--p1)', 'var(--p1-fill)', 'HBA'),
      p2: mk({ H: Hh, A, C }, { beta: 'A', gamma: 'C', right: 'H' }, { b: ['A', 'C'], n: ['C', 'H'], h: ['H', 'A'] },
        'var(--p2)', 'var(--p2-fill)', 'HAC'),
    };
  }
  function mk(verts, roles, sides, stroke, fill, name) {
    const names = Object.keys(verts);
    const g = [0, 0];
    names.forEach((n) => { g[0] += verts[n][0] / 3; g[1] += verts[n][1] / 3; });
    const local = {};
    names.forEach((n) => { local[n] = [verts[n][0] - g[0], verts[n][1] - g[1]]; });
    return { names, local, roles, sides, stroke, fill, name };
  }

  /* Estado: {x, y (tela), s (px/unidade), rot (rad, anti-horário), flip (1..-1), op} */
  function screenVerts(pc, st) {
    const out = {};
    // Espelho ao longo de um eixo inclinado (ax), depois rotação: R(rot + ax) · diag(1, flip) · R(-ax)
    const ax = st.ax || 0;
    const c1 = Math.cos(ax), s1 = Math.sin(ax);
    const c2 = Math.cos(st.rot + ax), s2 = Math.sin(st.rot + ax);
    pc.names.forEach((n) => {
      const lx = pc.local[n][0], ly = pc.local[n][1];
      const ux = lx * c1 + ly * s1;
      const uy = (-lx * s1 + ly * c1) * st.flip;
      const rx = ux * c2 - uy * s2;
      const ry = ux * s2 + uy * c2;
      out[n] = [st.x + st.s * rx, st.y - st.s * ry];
    });
    return out;
  }
  function bbox(v) {
    const xs = Object.values(v).map((p) => p[0]);
    const ys = Object.values(v).map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  /* Rotação/reflexão (R(rot)·diag(1,flip)) que leva a peça à posição de comparação.
     'fixo': a mesma posição do triângulo amarelo, que não se move.
     'pe'  : ângulo reto embaixo à esquerda, vértice de γ acima dele, β à direita.
     'base': hipotenusa horizontal, β à esquerda, ângulo reto em cima. */
  function legs(pc) {
    const L = pc.local, r = pc.roles;
    const g = [L[r.gamma][0] - L[r.right][0], L[r.gamma][1] - L[r.right][1]];
    const b = [L[r.beta][0] - L[r.right][0], L[r.beta][1] - L[r.right][1]];
    return { g, cross: g[0] * b[1] - g[1] * b[0] };
  }
  /* Posição em que a direção (reto → γ) tem o ângulo refDir e a "mão" (sinal) é refSign. */
  function orientByRef(pc, refDir, refSign) {
    const { g, cross } = legs(pc);
    const flip = Math.sign(cross) === refSign ? 1 : -1;
    return { rot: refDir - Math.atan2(g[1] * flip, g[0]), flip };
  }
  function orientation(pc, pose, P, fc) {
    if (pose === 'fixo') {
      const y = legs(P.p1);
      return orientByRef(pc, fc.rot + Math.atan2(y.g[1] * fc.flip, y.g[0]), Math.sign(y.cross * fc.flip));
    }
    if (pose === 'pe') return orientByRef(pc, Math.PI / 2, -1);
    const L = pc.local, r = pc.roles;
    for (const flip of [1, -1]) {
      let rot, v;
      {
        const d = [L[r.gamma][0] - L[r.beta][0], (L[r.gamma][1] - L[r.beta][1]) * flip];
        rot = -Math.atan2(d[1], d[0]);
        v = screenVerts(pc, { x: 0, y: 0, s: 1, rot, flip, op: 1 });
        if (v[r.right][1] < v[r.beta][1] - 1e-9) return { rot, flip };
      }
    }
    return { rot: 0, flip: 1 };
  }

  /* Posição da figura original escolhida pelo professor (girada/espelhada). */
  function figConf() {
    const th = (RM.state.rot * Math.PI) / 180;
    return RM.state.mirror ? { rot: th + Math.PI, flip: -1 } : { rot: th, flip: 1 };
  }
  function near(rot, ref) { return rot + 2 * Math.PI * Math.round((ref - rot) / (2 * Math.PI)); }

  /* Configurações (rot/flip) de cada peça em cada fase da montagem. */
  function normRad(x) { return Math.atan2(Math.sin(x), Math.cos(x)); }

  /* Configurações de cada peça em cada fase da montagem:
     - mesma "mão" da posição final: só uma rotação (pelo menor ângulo);
     - "mão" trocada: reflexão numa reta vertical ou horizontal (fácil de ver) e depois rotação. */
  function phaseConfs(P) {
    const fc = figConf();
    const out = {};
    ['big', 'p1', 'p2'].forEach((key) => {
      const o = orientation(P[key], RM.state.pose, P, fc);
      if (o.flip === fc.flip) {
        const base = { rot: fc.rot, ax: 0, flip: fc.flip };
        const d = normRad(o.rot - fc.rot);
        const fin = { rot: fc.rot + d, ax: 0, flip: fc.flip };
        out[key] = { split: base, flip: base, rot: fin, final: fin, reflects: false, rotates: Math.abs(d) > 1e-3, turn: d };
      } else {
        // Espelho vertical (β = 90°) ou horizontal (β = 0°): o que deixar o giro seguinte menor.
        // Depois da reflexão na reta de ângulo β, a parte de rotação vira 2β − θ.
        const a0 = fc.rot;
        let best = null;
        [Math.PI / 2, 0].forEach((beta) => {
          const d = normRad(o.rot - (2 * beta - a0));
          if (!best || Math.abs(d) < Math.abs(best.d) - 1e-6) best = { beta, d };
        });
        const beta = best.beta;
        const split = fc.flip === 1
          ? { rot: a0, ax: beta - a0, flip: 1 }
          : { rot: 2 * beta - a0, ax: a0 - beta, flip: -1 };
        const after = Object.assign({}, split, { flip: -split.flip });
        const fin = Object.assign({}, after, { rot: after.rot + best.d });
        out[key] = { split, flip: after, rot: fin, final: fin, reflects: true, rotates: Math.abs(best.d) > 1e-3, turn: best.d, axis: beta };
      }
    });
    return out;
  }

  const PIECE_NAME = {
    big: 'o triângulo grande (<b>ABC</b>)',
    p1: 'o <span class="c-p1">amarelo</span> (<b>HBA</b>)',
    p2: 'o <span class="c-p2">verde</span> (<b>HAC</b>)',
  };
  function listNames(keys) {
    const n = keys.map((k) => PIECE_NAME[k]);
    return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1];
  }
  function moves() {
    const C = phaseConfs(pieces(RM.tri()));
    const keys = ['big', 'p1', 'p2'];
    return {
      reflect: keys.filter((k) => C[k].reflects),
      rotate: keys.filter((k) => C[k].rotates),
      still: keys.filter((k) => !C[k].reflects && !C[k].rotates),
    };
  }
  function dims(pc, conf) {
    const b = bbox(screenVerts(pc, Object.assign({ x: 0, y: 0, s: 1, op: 1 }, conf)));
    return { w: b.x1 - b.x0, h: b.y1 - b.y0 };
  }
  function placeBottom(pc, base, cx, bottom) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const b = bbox(screenVerts(pc, st));
    st.x = cx - (b.x0 + b.x1) / 2;
    st.y = bottom - b.y1;
    return st;
  }
  function placeCenter(pc, base, cx, cy) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const b = bbox(screenVerts(pc, st));
    st.x = cx - (b.x0 + b.x1) / 2;
    st.y = cy - (b.y0 + b.y1) / 2;
    return st;
  }

  function placeVertex(pc, base, vname, P) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const v = screenVerts(pc, st);
    st.x = P[0] - v[vname][0];
    st.y = P[1] - v[vname][1];
    return st;
  }
  function placeLeftBottom(pc, base, left, bottom) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const b = bbox(screenVerts(pc, st));
    st.x = left - b.x0;
    st.y = bottom - b.y1;
    return st;
  }

  /* ---------- Layout de cada fase ---------- */
  /* Fase de cada peça na montagem, conforme os movimentos já feitos (done). */
  function phaseOf(key, done) {
    if (done === 'all' || done.includes('rot:' + key)) return 'rot';
    if (done.includes('flip:' + key)) return 'flip';
    return 'split';
  }

  function layout(kind, t, P, step) {
    const C = phaseConfs(P);
    const keys = ['big', 'p1', 'p2'];
    const S = {};
    const withS = (conf, k) => Object.assign({ s: k, op: 1 }, conf);

    if (kind === 'whole') {
      const d = dims(P.big, C.big.split);
      const k = Math.min(800 / d.w, 410 / d.h);
      S.big = placeCenter(P.big, withS(C.big.split, k), W / 2, 290);
      const vb = screenVerts(P.big, S.big);
      S.p1 = placeVertex(P.p1, withS(C.p1.split, k), 'B', vb.B);
      S.p2 = placeVertex(P.p2, withS(C.p2.split, k), 'C', vb.C);
      return S;
    }

    if (kind === 'asm') {
      const done = step.done || [];
      // Tamanho máximo de cada peça nas três fases, para nada sair da tela durante a animação
      const D0 = {};
      keys.forEach((key) => {
        const ds = ['split', 'flip', 'rot'].map((ph) => dims(P[key], C[key][ph]));
        D0[key] = { w: Math.max(...ds.map((d) => d.w)), h: Math.max(...ds.map((d) => d.h)) };
      });
      const gapX = 90, gapY = 82;
      const hRow = Math.max(D0.p1.h, D0.p2.h);
      const k = Math.min(900 / D0.big.w, (880 - gapX) / (D0.p1.w + D0.p2.w), (500 - gapY) / (D0.big.h + hRow));
      const ph = (key) => C[key][phaseOf(key, done)];
      S.big = placeCenter(P.big, withS(ph('big'), k), W / 2, 34 + (D0.big.h * k) / 2);
      // Os menores ficam apoiados na mesma linha
      const bottom = 34 + D0.big.h * k + gapY + hRow * k;
      const start = (W - (D0.p1.w + D0.p2.w) * k - gapX) / 2;
      S.p1 = placeBottom(P.p1, withS(ph('p1'), k), start + (D0.p1.w * k) / 2, bottom);
      S.p2 = placeBottom(P.p2, withS(ph('p2'), k), start + D0.p1.w * k + gapX + (D0.p2.w * k) / 2, bottom);
      return S;
    }

    if (kind === 'nest') {
      // Os três com o vértice de β no mesmo ponto
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      keys.forEach((key) => {
        const st = placeVertex(P[key], withS(C[key].final, 1), P[key].roles.beta, [0, 0]);
        const b = bbox(screenVerts(P[key], st));
        x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1);
      });
      const k = Math.min(820 / (x1 - x0), 450 / (y1 - y0));
      const P0 = [W / 2 - (k * (x0 + x1)) / 2, 300 - (k * (y0 + y1)) / 2];
      keys.forEach((key) => { S[key] = placeVertex(P[key], withS(C[key].final, k), P[key].roles.beta, P0); });
      return S;
    }

    // 'row': os três lado a lado, na mesma posição
    const gap = 78;
    const ds = keys.map((key) => dims(P[key], C[key].final));
    const sumW = ds.reduce((a, d) => a + d.w, 0);
    const maxH = Math.max(...ds.map((d) => d.h));
    const k = Math.min((W - 80 - 2 * gap) / sumW, 330 / maxH);
    const bottom = 300 + (maxH * k) / 2;
    let x = (W - sumW * k - 2 * gap) / 2;
    keys.forEach((key, idx) => {
      S[key] = placeLeftBottom(P[key], withS(C[key].final, k), x, bottom);
      x += ds[idx].w * k + gap;
    });
    return S;
  }

  /* ---------- Tabela de correspondência ---------- */
  const ROWS = [
    { key: 'big', name: 'ABC', hip: 'a', ob: 'b', og: 'c' },
    { key: 'p1', name: 'HBA', hip: 'c', ob: 'h', og: 'm' },
    { key: 'p2', name: 'HAC', hip: 'b', ob: 'n', og: 'h' },
  ];
  const COLS = [
    { key: 'hip', label: 'hipotenusa' },
    { key: 'ob', label: 'oposto a β' },
    { key: 'og', label: 'oposto a γ' },
  ];
  const rowByName = (n) => ROWS.find((r) => r.name === n);

  /* ---------- Textos ---------- */
  const i = (x) => '<i>' + x + '</i>';
  const fr = (a, b) => '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>';
  const ml = (html) => '<div class="mathline">' + html + '</div>';
  const deg = '°';

  function numCheck(t, lhsTxt, lhs, rhsTxt, rhs) {
    if (RM.state.hide) return '<p class="note">Valores ocultos. Desligue o modo mistério para conferir com números.</p>';
    return ml('<span class="num">Conferindo:</span> ' + lhsTxt + ' = ' + RM.fmt(lhs) + ' &nbsp; e &nbsp; ' + rhsTxt + ' = ' + RM.fmt(rhs) + ' <span class="c-ok" style="color:var(--ok)">✓</span>');
  }

  function propStep(rel, t, lv) {
    const r1 = rowByName(rel.rows[0]), r2 = rowByName(rel.rows[1]);
    const c1 = rel.cols[0], c2 = rel.cols[1];
    const eq = fr('<span class="c-hl1">' + i(r1[c1]) + '</span>', '<span class="c-hl1">' + i(r2[c1]) + '</span>') + ' = ' +
      fr('<span class="c-hl2">' + i(r1[c2]) + '</span>', '<span class="c-hl2">' + i(r2[c2]) + '</span>');
    return { eq, r1, r2 };
  }

  function poseName() {
    if (RM.state.pose === 'fixo') return 'a do <span class="c-p1">amarelo</span>, que <b>fica parado</b>';
    return RM.state.pose === 'pe' ? '<b>em pé</b>, com a hipotenusa na diagonal' : 'com a <b>hipotenusa na base</b>';
  }
  function cap(html) { return html.replace(/^(<[^>]+>)*([a-zà-ú])/, (m) => m.slice(0, -1) + m.slice(-1).toUpperCase()); }

  const REL = {
    c2: { rows: ['ABC', 'HBA'], cols: ['hip', 'og'] },
    b2: { rows: ['ABC', 'HAC'], cols: ['hip', 'ob'] },
    h2: { rows: ['HBA', 'HAC'], cols: ['ob', 'og'] },
    ah: { rows: ['ABC', 'HBA'], cols: ['hip', 'ob'] },
  };

  const MOVES_MARK = { marker: true };
  const SHORT = { big: 'o triângulo grande', p1: 'o amarelo', p2: 'o verde' };

  /* Um passo para cada movimento: primeiro termina um triângulo, depois o outro. */
  function moveSteps() {
    const C = phaseConfs(pieces(RM.tri()));
    const list = [];
    ['big', 'p1', 'p2'].forEach((key) => {
      if (C[key].reflects) list.push({ type: 'flip', key });
      if (C[key].rotates) list.push({ type: 'rot', key });
    });
    const done = [];
    return list.map((mv, idx) => {
      done.push(mv.type + ':' + mv.key);
      const first = idx === 0, last = idx === list.length - 1;
      const step = {
        title: (mv.type === 'flip' ? 'Espelhando ' : 'Girando ') + SHORT[mv.key],
        layout: 'asm', done: done.slice(), active: mv.type + ':' + mv.key,
        pieces: 1, angles: 3, labels: 'piece',
        text: (t, lv) => moveText(mv, first, last, lv),
      };
      return step;
    });
  }

  function moveText(mv, first, last, lv) {
    const C = phaseConfs(pieces(RM.tri()));
    const c = C[mv.key];
    let html = first ? '<p>Para comparar, vamos colocar os três na mesma posição: ' + poseName() + '. Um movimento de cada vez.</p>' : '';
    if (mv.type === 'flip') {
      const vertical = Math.abs(Math.cos(c.axis)) < 0.5;
      html += lv === 'em'
        ? '<p>Aplicamos em ' + PIECE_NAME[mv.key] + ' uma <b>reflexão</b> na reta ' + (vertical ? 'vertical' : 'horizontal') + ' tracejada. Reflexões preservam comprimentos e ângulos e invertem a orientação dos vértices.</p>'
        : '<p><b>Espelhamos</b> ' + PIECE_NAME[mv.key] + ' na linha tracejada ' + (vertical ? '(em pé): o que estava à esquerda passa para a direita.' : '(deitada): ele fica de cabeça para baixo.') + '</p><p>Espelhar não muda o tamanho nem os ângulos.</p>';
    } else {
      const deg = Math.round(Math.abs(c.turn) * 180 / Math.PI);
      const dir = c.turn > 0 ? 'anti-horário' : 'horário';
      html += '<p><b>Giramos</b> ' + PIECE_NAME[mv.key] + ' ' + deg + '° no sentido ' + dir + ', em torno do seu centro, até ficar na mesma posição ' +
        (RM.state.pose === 'fixo' ? 'do <span class="c-p1">amarelo</span>' : 'escolhida') + '.</p>';
    }
    if (last) {
      const mv2 = moves();
      if (mv2.still.length) html += '<p>' + cap(listNames(mv2.still)) + (mv2.still.length > 1 ? ' ficaram parados' : ' ficou parado') + (RM.state.pose === 'fixo' ? ' o tempo todo: ele é a referência.' : '.') + '</p>';
      html += '<p>Pronto: o ângulo reto, <span class="c-beta">β</span> e <span class="c-gamma">γ</span> estão no mesmo lugar nos três.</p>';
    }
    return html;
  }

  const STEP_TEMPLATE = [
    { title: 'O triângulo retângulo', layout: 'whole', pieces: 0, angles: 0, labels: 'fig',
      text: (t, lv) => lv === 'em'
        ? '<p>Seja <b>ABC</b> um triângulo retângulo em <b>A</b>. Chamamos ' + i('a') + ' = BC de hipotenusa e ' + i('b') + ' = AC, ' + i('c') + ' = AB de catetos.</p>'
        : '<p>O triângulo <b>ABC</b> tem um ângulo reto (90' + deg + ') no vértice <b>A</b>.</p><p>O lado maior, oposto ao ângulo reto, é a <b>hipotenusa</b> ' + i('a') + '. Os outros dois lados, ' + i('b') + ' e ' + i('c') + ', são os <b>catetos</b>.</p>' },
    { title: 'Os ângulos agudos', layout: 'whole', pieces: 0, angles: 1, labels: 'fig',
      text: (t, lv) => (lv === 'em'
        ? '<p>Como a soma dos ângulos internos é 180' + deg + ', os ângulos agudos <span class="c-beta">β</span> (em B) e <span class="c-gamma">γ</span> (em C) são complementares.</p>'
        : '<p>Os outros dois ângulos são agudos. Vamos chamá-los de <span class="c-beta">β</span> (em B) e <span class="c-gamma">γ</span> (em C).</p><p>A soma dos ângulos de um triângulo é 180' + deg + ':</p>') +
        ml('<span class="c-beta">β</span> + <span class="c-gamma">γ</span> + 90' + deg + ' = 180' + deg + ' &nbsp;⇒&nbsp; <span class="result"><span class="c-beta">β</span> + <span class="c-gamma">γ</span> = 90' + deg + '</span>') },
    { title: 'A altura relativa à hipotenusa', layout: 'whole', pieces: 1, angles: 1, labels: 'fig',
      text: (t, lv) => (lv === 'em'
        ? '<p>Seja <b>H</b> o pé da perpendicular traçada por A sobre BC. A altura ' + i('h') + ' = AH determina as projeções ortogonais ' + i('m') + ' = BH (de ' + i('c') + ') e ' + i('n') + ' = HC (de ' + i('b') + ') sobre a hipotenusa.</p>'
        : '<p>Traçamos a <b>altura</b> ' + i('h') + ' = AH: ela sai de A e encontra a hipotenusa formando 90' + deg + '.</p><p>A altura divide o triângulo em dois menores (<span class="c-p1">amarelo</span> e <span class="c-p2">verde</span>) e divide a hipotenusa em duas partes, ' + i('m') + ' e ' + i('n') + '.</p>') +
        ml(i('a') + ' = ' + i('m') + ' + ' + i('n')) },
    { title: 'Descobrindo os ângulos', layout: 'whole', pieces: 1, angles: 2, labels: 'fig',
      text: (t, lv) => lv === 'em'
        ? '<p>Em △HBA: B̂ = <span class="c-beta">β</span> e Ĥ = 90' + deg + ', logo BÂH = 90' + deg + ' − <span class="c-beta">β</span> = <span class="c-gamma">γ</span>.</p><p>Em △HAC: Ĉ = <span class="c-gamma">γ</span> e Ĥ = 90' + deg + ', logo HÂC = 90' + deg + ' − <span class="c-gamma">γ</span> = <span class="c-beta">β</span>.</p>'
        : '<p>No triângulo <span class="c-p1">amarelo</span> já conhecemos dois ângulos: <span class="c-beta">β</span> em B e 90' + deg + ' em H. O ângulo em A completa 180' + deg + ', então ele é <span class="c-gamma">γ</span>.</p>' +
          ml('90' + deg + ' + <span class="c-beta">β</span> + ? = 180' + deg + ' &nbsp;⇒&nbsp; ? = <span class="c-gamma">γ</span>') +
          '<p>No <span class="c-p2">verde</span> acontece o mesmo: <span class="c-gamma">γ</span> em C, 90' + deg + ' em H, e o ângulo em A é <span class="c-beta">β</span>.</p>' },
    { title: 'Separando os triângulos', layout: 'asm', done: [], pieces: 1, angles: 3, labels: 'piece',
      text: (t, lv) => lv === 'em'
        ? '<p>Destacamos △ABC, △HBA e △HAC. Os três têm ângulos <span class="c-beta">β</span>, <span class="c-gamma">γ</span> e 90' + deg + ', mas estão em posições diferentes.</p>'
        : '<p>Agora temos <b>três triângulos</b>: o grande ABC e os dois menores. Vamos separá-los para comparar.</p><p>Repare nas cores dos ângulos: todos têm um <span class="c-beta">β</span>, um <span class="c-gamma">γ</span> e um ângulo reto.</p>' },
    MOVES_MARK,
    { title: 'Mesma forma, tamanhos diferentes', layout: 'asm', done: 'all', pieces: 1, angles: 3, labels: 'piece',
      text: (t, lv) => (lv === 'em'
        ? '<p>Pelo caso <b>AA</b> (ângulo-ângulo):</p>'
        : '<p>Agora os três estão na mesma posição. Têm os <b>mesmos ângulos</b> (<span class="c-beta">β</span>, <span class="c-gamma">γ</span> e 90' + deg + '), só mudam de tamanho.</p><p>Triângulos assim são <b>semelhantes</b>. Basta ter dois ângulos iguais para garantir isso: é o caso <b>AA</b>.</p>') +
        ml('△<b>ABC</b> ~ △<b class="c-p1">HBA</b> ~ △<b class="c-p2">HAC</b>') +
        (lv === 'em' ? '<p>A ordem das letras indica a correspondência: a 1ª letra é o vértice do ângulo reto, a 2ª o de <span class="c-beta">β</span> e a 3ª o de <span class="c-gamma">γ</span>.</p>' : '') },
    { title: 'Um dentro do outro', layout: 'nest', pieces: 1, angles: 4, labels: 'nest',
      text: (t, lv) => lv === 'em'
        ? '<p>Sobrepondo os vértices de <span class="c-beta">β</span> e alinhando as hipotenusas, os lados opostos a <span class="c-beta">β</span> ficam <b>paralelos</b>. Os triângulos são homotéticos com centro nesse vértice: mesma forma, lados proporcionais.</p>'
        : '<p>Encaixando os três pelo ângulo <span class="c-beta">β</span>, as hipotenusas ficam na mesma linha e os lados destacados ficam <b>paralelos</b>.</p><p>Um triângulo é uma <b>ampliação</b> do outro, como uma foto ampliada.</p>' },
    { title: 'Lados correspondentes', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true,
      text: (t, lv) => lv === 'em'
        ? '<p>Na semelhança, as razões entre lados correspondentes são iguais. Organizamos os lados por papel: hipotenusa, oposto a <span class="c-beta">β</span> e oposto a <span class="c-gamma">γ</span>.</p><p>Escolhendo duas linhas e duas colunas da tabela, obtemos uma proporção.</p>'
        : '<p>Em triângulos semelhantes, os lados que ocupam a mesma posição são <b>proporcionais</b>.</p><p>Na tabela, cada linha é um triângulo. Escolhendo duas linhas e duas colunas, formamos uma proporção.</p>' },
    { title: 'Relação do cateto c', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true, rel: 'c2',
      text: (t, lv) => {
        const p = propStep(REL.c2);
        return (lv === 'em' ? '<p>De △ABC ~ △HBA:</p>' : '<p>Comparando o triângulo grande (ABC) com o <span class="c-p1">amarelo</span> (HBA), pela <span class="c-hl1">hipotenusa</span> e pelo <span class="c-hl2">lado oposto a γ</span>:</p>') +
          ml(p.eq + ' &nbsp;⇒&nbsp; ' + i('c') + ' · ' + i('c') + ' = ' + i('a') + ' · ' + i('m') + ' &nbsp;⇒&nbsp; <span class="result">' + i('c') + '² = ' + i('a') + ' · ' + i('m') + '</span>') +
          (lv === 'em' ? '<p>O cateto é média geométrica entre a hipotenusa e sua projeção.</p>' : '<p>Multiplicamos cruzado, como na regra de três.</p>') +
          numCheck(t, RM.fmt(t.c) + '²', t.c * t.c, RM.fmt(t.a) + ' · ' + RM.fmt(t.m), t.a * t.m);
      } },
    { title: 'Relação do cateto b', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true, rel: 'b2',
      text: (t, lv) => {
        const p = propStep(REL.b2);
        return (lv === 'em' ? '<p>De △ABC ~ △HAC:</p>' : '<p>Agora o grande (ABC) com o <span class="c-p2">verde</span> (HAC), pela <span class="c-hl1">hipotenusa</span> e pelo <span class="c-hl2">lado oposto a β</span>:</p>') +
          ml(p.eq + ' &nbsp;⇒&nbsp; <span class="result">' + i('b') + '² = ' + i('a') + ' · ' + i('n') + '</span>') +
          numCheck(t, RM.fmt(t.b) + '²', t.b * t.b, RM.fmt(t.a) + ' · ' + RM.fmt(t.n), t.a * t.n);
      } },
    { title: 'Relação da altura', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true, rel: 'h2',
      text: (t, lv) => {
        const p = propStep(REL.h2);
        return (lv === 'em' ? '<p>De △HBA ~ △HAC:</p>' : '<p>Comparando os dois menores, <span class="c-p1">amarelo</span> e <span class="c-p2">verde</span>, pelos lados <span class="c-hl1">opostos a β</span> e <span class="c-hl2">opostos a γ</span>:</p>') +
          ml(p.eq + ' &nbsp;⇒&nbsp; <span class="result">' + i('h') + '² = ' + i('m') + ' · ' + i('n') + '</span>') +
          (lv === 'em' ? '<p>A altura é média geométrica das projeções.</p>' : '') +
          numCheck(t, RM.fmt(t.h) + '²', t.h * t.h, RM.fmt(t.m) + ' · ' + RM.fmt(t.n), t.m * t.n);
      } },
    { title: 'Altura, hipotenusa e catetos', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true, rel: 'ah',
      text: (t, lv) => {
        const p = propStep(REL.ah);
        return '<p>De novo ABC e HBA, agora pela <span class="c-hl1">hipotenusa</span> e pelo <span class="c-hl2">lado oposto a β</span>:</p>' +
          ml(p.eq + ' &nbsp;⇒&nbsp; <span class="result">' + i('a') + ' · ' + i('h') + ' = ' + i('b') + ' · ' + i('c') + '</span>') +
          (lv === 'em'
            ? '<p>Equivalente a calcular a área de ABC de dois modos: ' + fr(i('b') + ' · ' + i('c'), '2') + ' = ' + fr(i('a') + ' · ' + i('h'), '2') + '.</p>'
            : '<p>Dá para chegar nisso pela área também: usando os catetos ou usando a hipotenusa e a altura, a área do triângulo é a mesma.</p>') +
          numCheck(t, RM.fmt(t.a) + ' · ' + RM.fmt(t.h), t.a * t.h, RM.fmt(t.b) + ' · ' + RM.fmt(t.c), t.b * t.c);
      } },
    { title: 'Pitágoras de brinde', layout: 'row', pieces: 1, angles: 3, labels: 'piece', table: true, rel: 'pit',
      text: (t, lv) =>
        (lv === 'em' ? '<p>Somando as relações dos catetos:</p>' : '<p>Somando as duas relações dos catetos, chegamos ao <b>Teorema de Pitágoras</b>:</p>') +
        ml('<span class="c-hl2">' + i('b') + '²</span> + <span class="c-hl2">' + i('c') + '²</span> = ' + i('a') + '·' + i('n') + ' + ' + i('a') + '·' + i('m')) +
        ml('= ' + i('a') + ' · (' + i('m') + ' + ' + i('n') + ') = ' + i('a') + ' · ' + i('a')) +
        ml('<span class="result"><span class="c-hl1">' + i('a') + '²</span> = ' + i('b') + '² + ' + i('c') + '²</span>') +
        numCheck(t, RM.fmt(t.b) + '² + ' + RM.fmt(t.c) + '²', t.b * t.b + t.c * t.c, RM.fmt(t.a) + '²', t.a * t.a) },
  ];

  let STEPS = [];
  function buildSteps() {
    const out = [];
    STEP_TEMPLATE.forEach((st) => { if (st === MOVES_MARK) out.push(...moveSteps()); else out.push(st); });
    STEPS = out;
  }

  /* Destaques de lados por peça: { big: { a: 'hl1' } } */
  function highlights(step) {
    const out = { big: {}, p1: {}, p2: {} };
    if (!step.rel) return out;
    if (step.rel === 'pit') {
      out.big.a = 'hl1'; out.big.b = 'hl2'; out.big.c = 'hl2';
      return out;
    }
    const rel = REL[step.rel];
    rel.rows.forEach((rn) => {
      const r = rowByName(rn);
      out[r.key][r[rel.cols[0]]] = 'hl1';
      out[r.key][r[rel.cols[1]]] = out[r.key][r[rel.cols[1]]] || 'hl2';
    });
    return out;
  }

  /* ---------- Desenho ---------- */
  function render() {
    const st = RM.state;
    const step = STEPS[st.step];
    const t = RM.tri();
    const P = pieces(t);
    const V = { big: screenVerts(P.big, cur.big), p1: screenVerts(P.p1, cur.p1), p2: screenVerts(P.p2, cur.p2) };
    const hl = highlights(step);
    const fs = D.fs(26);
    let out = '';

    // Ordem de desenho: maior atrás
    const order = ['big', 'p1', 'p2'];
    if (step.layout === 'nest') order.sort((x, y) => hypLen(t, y) - hypLen(t, x));

    order.forEach((key) => {
      const pc = P[key];
      const v = V[key];
      const op = cur[key].op;
      if (op <= 0.01) return;
      const pts = pc.names.map((n) => v[n]);
      const isBigCovered = key === 'big' && step.pieces && step.layout === 'whole';
      out += '<g style="opacity:' + op.toFixed(3) + '">';
      out += D.poly(pts, 'style="fill:' + (isBigCovered ? 'none' : pc.fill) + ';stroke:' + pc.stroke + ';stroke-width:' + (key === 'big' ? 3 : 2.6) + ';stroke-linejoin:round"');
      out += '</g>';
    });

    // Espelho (passo de reflexão)
    if (step.active && step.active.startsWith('flip:')) {
      ['big', 'p1', 'p2'].forEach((key) => {
        if (step.active !== 'flip:' + key) return;
        const b = bbox(V[key]);
        const half = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 26;
        const ang = cur[key].rot + (cur[key].ax || 0);
        const dx = Math.cos(ang), dy = -Math.sin(ang);
        const c = [cur[key].x, cur[key].y];
        out += D.line([c[0] - half * dx, c[1] - half * dy], [c[0] + half * dx, c[1] + half * dy],
          'style="stroke:var(--muted);stroke-width:2;stroke-dasharray:10 7"');
      });
    }

    // Destaques
    ['big', 'p1', 'p2'].forEach((key) => {
      const pc = P[key];
      Object.keys(hl[key]).forEach((side) => {
        const [p, q] = pc.sides[side];
        out += D.line(V[key][p], V[key][q], 'style="stroke:var(--' + hl[key][side] + ');stroke-width:8;stroke-linecap:round;opacity:.85"');
      });
    });
    if (step.layout === 'nest') {
      out += D.line(V.big.C, V.big.A, 'style="stroke:var(--hl2);stroke-width:6;stroke-linecap:round;opacity:.8"');
      out += D.line(V.p1.A, V.p1.H, 'style="stroke:var(--hl2);stroke-width:6;stroke-linecap:round;opacity:.8"');
      out += D.line(V.p2.C, V.p2.H, 'style="stroke:var(--hl2);stroke-width:6;stroke-linecap:round;opacity:.8"');
    }

    // Ângulos e ângulos retos
    out += angleMarks(step, P, V, fs);
    out += rightMarks(step, P, V);

    // Rótulos
    if (step.labels === 'fig') out += figLabels(step, V, fs);
    else if (step.labels === 'piece') out += pieceLabels(step, P, V, hl, fs);
    else if (step.labels === 'nest') out += nestLabels(V, fs);

    if (step.layout === 'row') {
      ['big', 'p1', 'p2'].forEach((key) => {
        const b = bbox(V[key]);
        out += D.text([(b.x0 + b.x1) / 2, b.y1 + D.fs(62)], '△' + P[key].name,
          'class="vlabel" font-size="' + D.fs(24) + '" style="fill:' + P[key].stroke + '"');
      });
    }

    svg.innerHTML = out;
  }

  function hypLen(t, key) { return key === 'big' ? t.a : key === 'p1' ? t.c : t.b; }

  function angleMarks(step, P, V, fs) {
    let out = '';
    const arc = (key, role, r) => {
      const pc = P[key], v = V[key];
      const vn = pc.roles[role];
      const others = pc.names.filter((n) => n !== vn);
      const color = role === 'beta' ? 'var(--beta)' : 'var(--gamma)';
      return D.angleArc(v[vn], v[others[0]], v[others[1]], r, color, role === 'beta' ? 'β' : 'γ', fs);
    };
    if (step.angles >= 1 && step.angles <= 2) {
      out += arc('big', 'beta', 46) + arc('big', 'gamma', 46);
      if (step.angles === 2) {
        out += D.angleArc(V.p1.A, V.p1.B, V.p1.H, 38, 'var(--gamma)', null, fs);
        out += D.angleArc(V.p2.A, V.p2.H, V.p2.C, 50, 'var(--beta)', null, fs);
        out += D.text(angleLabelPos(V.p1.A, V.p1.B, V.p1.H, 38 + fs * 0.8), 'γ', 'class="alabel" font-size="' + fs + '" style="fill:var(--gamma)"');
        out += D.text(angleLabelPos(V.p2.A, V.p2.H, V.p2.C, 50 + fs * 0.8), 'β', 'class="alabel" font-size="' + fs + '" style="fill:var(--beta)"');
      }
    } else if (step.angles === 3) {
      ['big', 'p1', 'p2'].forEach((key) => { out += arc(key, 'beta', 34) + arc(key, 'gamma', 34); });
    } else if (step.angles === 4) {
      out += arc('big', 'beta', 40);
      ['big', 'p1', 'p2'].forEach((key) => { out += arcNoLabel(P, V, key, 'gamma', 30); });
    }
    return out;
  }
  function arcNoLabel(P, V, key, role, r) {
    const pc = P[key], v = V[key];
    const vn = pc.roles[role];
    const others = pc.names.filter((n) => n !== vn);
    return D.angleArc(v[vn], v[others[0]], v[others[1]], r, role === 'beta' ? 'var(--beta)' : 'var(--gamma)', null, 20);
  }
  function angleLabelPos(Vx, P1, P2, r) {
    const u = D.unit(D.sub(P1, Vx)), w = D.unit(D.sub(P2, Vx));
    const bis = D.unit([u[0] + w[0], u[1] + w[1]]);
    return [Vx[0] + r * bis[0], Vx[1] + r * bis[1]];
  }

  function rightMarks(step, P, V) {
    let out = '';
    const mark = (key, size) => {
      const pc = P[key], v = V[key];
      const vn = pc.roles.right;
      const others = pc.names.filter((n) => n !== vn);
      return D.rightMark(v[vn], v[others[0]], v[others[1]], size, 'var(--ink)');
    };
    if (step.labels === 'fig') {
      if (step.pieces === 0 || step.angles < 2) out += mark('big', 16);
      if (step.pieces) out += D.rightMark(V.p2.H, V.p2.C, V.p2.A, 13, 'var(--ink)');
    } else {
      ['big', 'p1', 'p2'].forEach((key) => { out += mark(key, 12); });
    }
    return out;
  }

  function vtext(p, s, fs, color) {
    return D.text(p, s, 'class="vlabel" font-size="' + fs + '"' + (color ? ' style="fill:' + color + '"' : ''));
  }
  function stext(p, s, fs, color) {
    return D.text(p, s, 'class="slabel" font-size="' + fs + '"' + (color ? ' style="fill:' + color + '"' : ''));
  }

  function figLabels(step, V, fs) {
    const v = V.big;
    const G = centroid(v);
    const vfs = D.fs(28);
    let out = '';
    out += vtext(D.vertexLabelPos(v.A, G, 28), 'A', vfs);
    out += vtext(D.vertexLabelPos(v.B, G, 26), 'B', vfs);
    out += vtext(D.vertexLabelPos(v.C, G, 26), 'C', vfs);
    const off = D.fs(24);
    out += stext(D.sideLabelPos(v.A, v.B, v.C, off), 'c', fs);
    out += stext(D.sideLabelPos(v.A, v.C, v.B, off), 'b', fs);
    if (step.pieces) {
      const Hp = V.p1.H;
      out += D.line(v.A, Hp, 'style="stroke:var(--ink);stroke-width:2.2;stroke-dasharray:8 6"');
      out += vtext(D.footLabelPos(Hp, v.A, v.B, D.fs(13)), 'H', D.fs(22), 'var(--muted)');
      out += stext(D.sideLabelPos(v.A, Hp, v.B, off), 'h', fs);
      out += stext(D.sideLabelPos(v.B, Hp, v.A, D.fs(22)), 'm', fs);
      out += stext(D.sideLabelPos(Hp, v.C, v.A, D.fs(22)), 'n', fs);
      out += D.dimension(v.B, v.C, v.A, 56, (pos) => stext(pos, 'a', fs), 'var(--muted)', fs);
    } else {
      out += stext(D.sideLabelPos(v.B, v.C, v.A, D.fs(24)), 'a', fs);
    }
    return out;
  }

  function pieceLabels(step, P, V, hl, fs) {
    let out = '';
    const vfs = D.fs(22);
    const sfs = D.fs(24);
    ['big', 'p1', 'p2'].forEach((key) => {
      const pc = P[key], v = V[key];
      const G = centroid(v);
      pc.names.forEach((n) => { out += vtext(D.vertexLabelPos(v[n], G, 22), n, vfs, 'var(--muted)'); });
      Object.keys(pc.sides).forEach((side) => {
        const [p, q] = pc.sides[side];
        const third = pc.names.find((n) => n !== p && n !== q);
        const color = hl[key][side] ? 'var(--' + hl[key][side] + ')' : null;
        out += stext(D.sideLabelPos(v[p], v[q], v[third], D.fs(20)), side, sfs, color);
      });
    });
    return out;
  }

  function nestLabels(V, fs) {
    let out = '';
    const sfs = D.fs(24);
    out += stext(D.sideLabelPos(V.big.C, V.big.A, V.big.B, D.fs(20)), 'b', sfs, 'var(--hl2)');
    out += stext(D.sideLabelPos(V.p1.A, V.p1.H, V.p1.B, D.fs(20)), 'h', sfs, 'var(--hl2)');
    out += stext(D.sideLabelPos(V.p2.C, V.p2.H, V.p2.A, D.fs(20)), 'n', sfs, 'var(--hl2)');
    return out;
  }

  function centroid(v) {
    const ks = Object.keys(v);
    return [ks.reduce((s, n) => s + v[n][0], 0) / 3, ks.reduce((s, n) => s + v[n][1], 0) / 3];
  }

  /* ---------- Painel lateral ---------- */
  function renderSide() {
    const st = RM.state;
    const step = STEPS[st.step];
    const t = RM.tri();
    countEl.textContent = 'Passo ' + (st.step + 1) + ' de ' + STEPS.length;
    titleEl.textContent = step.title;
    bodyEl.innerHTML = step.text(t, st.level);

    tableCard.hidden = !step.table;
    if (step.table) {
      const rel = step.rel && REL[step.rel];
      let html = '<thead><tr><th>Triângulo</th>' + COLS.map((c) => '<th>' + c.label + '</th>').join('') + '</tr></thead><tbody>';
      ROWS.forEach((r) => {
        const inRel = !rel || rel.rows.includes(r.name);
        const color = r.key === 'big' ? 'var(--big)' : r.key === 'p1' ? 'var(--p1)' : 'var(--p2)';
        html += '<tr class="' + (inRel ? '' : 'dim') + '"><th><span class="swatch" style="background:' + color + '"></span>△' + r.name + '</th>';
        COLS.forEach((c) => {
          let cls = '';
          if (rel && inRel) {
            if (c.key === rel.cols[0]) cls = 'hl1';
            else if (c.key === rel.cols[1]) cls = 'hl2';
          }
          const letter = r[c.key];
          const val = st.hide ? '' : '<small>' + RM.fmt(t[letter]) + '</small>';
          html += '<td class="' + cls + '">' + letter + val + '</td>';
        });
        html += '</tr>';
      });
      tableEl.innerHTML = html + '</tbody>';
    }

    // navegação
    prevBtn.disabled = st.step === 0;
    nextBtn.disabled = st.step === STEPS.length - 1;
    Array.from(dotsEl.children).forEach((d, idx) => {
      d.className = 'dot' + (idx < st.step ? ' done' : '') + (idx === st.step ? ' current' : '');
      d.setAttribute('aria-selected', idx === st.step);
    });
  }

  /* ---------- Transições ---------- */
  function lerpState(a, b, e) {
    return {
      x: a.x + (b.x - a.x) * e,
      y: a.y + (b.y - a.y) * e,
      s: a.s + (b.s - a.s) * e,
      rot: a.rot + (b.rot - a.rot) * e,
      ax: (a.ax || 0) + ((b.ax || 0) - (a.ax || 0)) * e,
      flip: a.flip + (b.flip - a.flip) * e,
      op: a.op + (b.op - a.op) * e,
    };
  }

  function targetStates(stepIdx) {
    const step = STEPS[stepIdx];
    const t = RM.tri();
    const S = layout(step.layout, t, pieces(t), step);
    if (!step.pieces) { S.p1.op = 0; S.p2.op = 0; }
    return S;
  }

  function animateTo(stepIdx, duration) {
    const target = targetStates(stepIdx);
    if (anim) anim.cancel();
    if (!cur || duration <= 0) {
      cur = target;
      render();
      return;
    }
    const from = { big: cur.big, p1: cur.p1, p2: cur.p2 };
    anim = RM.tween(duration, (e) => {
      cur = { big: lerpState(from.big, target.big, e), p1: lerpState(from.p1, target.p1, e), p2: lerpState(from.p2, target.p2, e) };
      render();
    }, () => { anim = null; schedulePlay(); });
  }

  function duration() { return 1200 / (RM.state.speed || 1); }

  function go(delta) {
    const s = RM.clamp(RM.state.step + delta, 0, STEPS.length - 1);
    if (s !== RM.state.step) RM.set({ step: s });
    else if (playing) setPlaying(false);
  }

  /* Reprodução automática */
  function setPlaying(on) {
    playing = on;
    playBtn.classList.toggle('playing', on);
    playBtn.setAttribute('aria-label', on ? 'Pausar' : 'Reproduzir automaticamente');
    clearTimeout(playTimer);
    if (on) {
      if (RM.state.step >= STEPS.length - 1) RM.set({ step: 0 });
      else schedulePlay();
    }
  }
  function schedulePlay() {
    clearTimeout(playTimer);
    if (!playing || anim) return;
    if (RM.state.step >= STEPS.length - 1) { setPlaying(false); return; }
    playTimer = setTimeout(() => { if (playing) go(1); }, 3800 / (RM.state.speed || 1));
  }

  /* ---------- Mini-animação para os cartões de dedução ----------
     Mostra só alguns triângulos: no lugar (dentro de ABC) ou alinhados lado a lado,
     passando pelas fases split → flip → rot, uma peça e um movimento de cada vez. */
  function miniLayout(t, keys, phases) {
    const P = pieces(t);
    const C = phaseConfs(P);
    const whole = layout('whole', t, P, {});
    const ds = keys.map((key) => {
      const d = ['split', 'flip', 'rot'].map((ph) => dims(P[key], C[key][ph]));
      return { w: Math.max(...d.map((x) => x.w)), h: Math.max(...d.map((x) => x.h)) };
    });
    const gap = 110;
    const sumW = ds.reduce((acc, d) => acc + d.w, 0);
    const maxH = Math.max(...ds.map((d) => d.h));
    const k = Math.min((880 - gap * (keys.length - 1)) / sumW, 380 / maxH);
    const bottom = 300 + (maxH * k) / 2;
    let x = (W - sumW * k - gap * (keys.length - 1)) / 2;
    const S = {};
    keys.forEach((key, idx) => {
      const ph = phases[key] || 'inplace';
      if (ph === 'inplace') S[key] = Object.assign({}, whole[key], { op: 1 });
      else S[key] = placeBottom(P[key], Object.assign({ s: k, op: 1 }, C[key][ph]), x + (ds[idx].w * k) / 2, bottom);
      x += ds[idx].w * k + gap;
    });
    ['big', 'p1', 'p2'].forEach((key) => { if (!S[key]) S[key] = Object.assign({}, whole[key], { op: 0 }); });
    S.ghost = whole.big;
    return S;
  }

  /* Sequência de fases para alinhar as peças, um movimento por vez. */
  function alignSequence(t, keys) {
    const C = phaseConfs(pieces(t));
    const phases = {};
    keys.forEach((k) => { phases[k] = 'split'; });
    const seq = [{ phases: Object.assign({}, phases), move: null }];
    ['big', 'p1', 'p2'].filter((k) => keys.includes(k)).forEach((k) => {
      if (C[k].reflects) { phases[k] = 'flip'; seq.push({ phases: Object.assign({}, phases), move: { type: 'flip', key: k } }); }
      if (C[k].rotates) { phases[k] = 'rot'; seq.push({ phases: Object.assign({}, phases), move: { type: 'rot', key: k, turn: C[k].turn } }); }
    });
    keys.forEach((k) => { phases[k] = 'rot'; });
    seq.push({ phases: Object.assign({}, phases), move: null });
    return seq;
  }

  function createMini(svgEl) {
    let cur = null;
    let anim = null;
    let opts = {};
    let token = 0;

    function draw() {
      if (!cur) return;
      const t = opts.t;
      const P = pieces(t);
      const fs = D.fs(26);
      let out = '';
      if (opts.ghost) {
        const g = screenVerts(P.big, cur.ghost);
        out += D.poly(['A', 'B', 'C'].map((n) => g[n]), 'style="fill:none;stroke:var(--muted);stroke-width:1.6;stroke-dasharray:6 6;opacity:.7"');
      }
      // No lugar (dentro de ABC), vértices e lados repetidos são escritos uma vez só
      const seenV = new Set(), seenS = new Set();
      const shown = ['big', 'p1', 'p2'].filter((k) => cur[k] && cur[k].op >= 0.02);
      ['big', 'p1', 'p2'].forEach((key) => {
        const st = cur[key];
        if (!st || st.op < 0.02) return;
        const pc = P[key];
        const v = screenVerts(pc, st);
        out += '<g style="opacity:' + st.op.toFixed(3) + '">';
        out += D.poly(pc.names.map((n) => v[n]), 'style="fill:' + pc.fill + ';stroke:' + pc.stroke + ';stroke-width:2.8;stroke-linejoin:round"');
        const hl = (opts.hl && opts.hl[key]) || {};
        Object.keys(hl).forEach((side) => {
          const [p, q] = pc.sides[side];
          out += D.line(v[p], v[q], 'style="stroke:var(--' + hl[side] + ');stroke-width:8;stroke-linecap:round;opacity:.85"');
        });
        const r = pc.roles;
        const oth = (vn) => pc.names.filter((n) => n !== vn);
        out += D.angleArc(v[r.beta], v[oth(r.beta)[0]], v[oth(r.beta)[1]], 32, 'var(--beta)', 'β', D.fs(22));
        out += D.angleArc(v[r.gamma], v[oth(r.gamma)[0]], v[oth(r.gamma)[1]], 32, 'var(--gamma)', 'γ', D.fs(22));
        out += D.rightMark(v[r.right], v[oth(r.right)[0]], v[oth(r.right)[1]], 12, 'var(--ink)');
        const G = centroid(v);
        const dedupe = !!opts.ghost;
        pc.names.forEach((n) => {
          if (dedupe && seenV.has(n)) return;
          seenV.add(n);
          out += vtext(D.vertexLabelPos(v[n], G, 22), n, D.fs(22), 'var(--muted)');
        });
        Object.keys(pc.sides).forEach((side) => {
          if (dedupe && seenS.has(side)) return;
          seenS.add(side);
          const [p, q] = pc.sides[side];
          const third = pc.names.find((n) => n !== p && n !== q);
          const color = hl[side] ? 'var(--' + hl[side] + ')' : null;
          if (dedupe && key === 'big' && side === 'a' && shown.length > 1) {
            // m e n ficam junto à hipotenusa; a vai numa cota afastada
            out += D.dimension(v.B, v.C, v.A, 54, (pos) => stext(pos, 'a', fs, color), 'var(--muted)', fs);
            return;
          }
          out += stext(D.sideLabelPos(v[p], v[q], v[third], D.fs(20)), side, fs, color);
        });
        out += '</g>';
      });
      if (opts.mirrorKey && cur[opts.mirrorKey]) {
        const st = cur[opts.mirrorKey];
        const b = bbox(screenVerts(P[opts.mirrorKey], st));
        const half = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 26;
        const ang = st.rot + (st.ax || 0);
        const dx = Math.cos(ang), dy = -Math.sin(ang);
        out += D.line([st.x - half * dx, st.y - half * dy], [st.x + half * dx, st.y + half * dy],
          'style="stroke:var(--muted);stroke-width:2;stroke-dasharray:10 7"');
      }
      svgEl.innerHTML = out;
    }

    function tweenTo(target, dur, done) {
      if (anim) anim.cancel();
      if (!cur || dur <= 0) { cur = target; draw(); if (done) done(); return; }
      const from = cur;
      anim = RM.tween(dur, (e) => {
        cur = { ghost: lerpState(from.ghost, target.ghost, e) };
        ['big', 'p1', 'p2'].forEach((k) => { cur[k] = lerpState(from[k], target[k], e); });
        draw();
      }, () => { anim = null; if (done) done(); });
    }

    return {
      /* Vai direto (ou com uma transição) para uma arrumação. */
      show(o, keys, phases, dur) {
        token++;
        opts = Object.assign({}, o);
        tweenTo(miniLayout(o.t, keys, phases), dur || 0);
      },
      /* Alinha as peças, um movimento por vez. onMove(move) é chamado a cada movimento. */
      align(o, keys, onMove) {
        const my = ++token;
        opts = Object.assign({}, o);
        const seq = alignSequence(o.t, keys);
        const dur = 800 / (RM.state.speed || 1);
        let idx = 0;
        const nextStep = () => {
          if (my !== token || idx >= seq.length) { opts.mirrorKey = null; draw(); return; }
          const it = seq[idx++];
          opts.mirrorKey = it.move && it.move.type === 'flip' ? it.move.key : null;
          if (onMove) onMove(it.move);
          tweenTo(miniLayout(o.t, keys, it.phases), dur, () => setTimeout(nextStep, 250));
        };
        nextStep();
      },
      redraw() { draw(); },
      moves(t, keys) { return alignSequence(t, keys).map((x) => x.move).filter(Boolean); },
    };
  }

  /* Desenho compacto de alguns triângulos lado a lado, na mesma posição (usado nos Exercícios).
     opts: { t, keys, hl: {big: {a: 'hl1'}}, label: (key, side) => texto, captions: true } */
  function pairSVG(opts) {
    const t = opts.t;
    const P = pieces(t);
    const pose = RM.state.pose === 'base' ? 'base' : 'fixo';
    const fc0 = { rot: 0, flip: 1 };
    const keys = opts.keys;
    const confs = {};
    keys.forEach((key) => { confs[key] = orientation(P[key], pose, P, fc0); });
    const W2 = 600, H2 = 270, gap = 70;
    const ds = keys.map((key) => dims(P[key], confs[key]));
    const sumW = ds.reduce((a, d) => a + d.w, 0);
    const maxH = Math.max(...ds.map((d) => d.h));
    const k = Math.min((W2 - 80 - gap * (keys.length - 1)) / sumW, 170 / maxH);
    const bottom = 40 + maxH * k;
    let x = (W2 - sumW * k - gap * (keys.length - 1)) / 2;
    const fs = 22;
    let out = '';
    keys.forEach((key, idx) => {
      const pc = P[key];
      const st = placeLeftBottom(pc, Object.assign({ s: k, op: 1 }, confs[key]), x, bottom);
      x += ds[idx].w * k + gap;
      const v = screenVerts(pc, st);
      out += D.poly(pc.names.map((n) => v[n]), 'style="fill:' + pc.fill + ';stroke:' + pc.stroke + ';stroke-width:2.6;stroke-linejoin:round"');
      const hl = (opts.hl && opts.hl[key]) || {};
      Object.keys(hl).forEach((side) => {
        const [p, q] = pc.sides[side];
        out += D.line(v[p], v[q], 'style="stroke:var(--' + hl[side] + ');stroke-width:7;stroke-linecap:round;opacity:.85"');
      });
      const r = pc.roles;
      const oth = (vn) => pc.names.filter((n) => n !== vn);
      out += D.angleArc(v[r.beta], v[oth(r.beta)[0]], v[oth(r.beta)[1]], 24, 'var(--beta)', 'β', 18);
      out += D.angleArc(v[r.gamma], v[oth(r.gamma)[0]], v[oth(r.gamma)[1]], 24, 'var(--gamma)', 'γ', 18);
      out += D.rightMark(v[r.right], v[oth(r.right)[0]], v[oth(r.right)[1]], 11, 'var(--ink)');
      Object.keys(pc.sides).forEach((side) => {
        const [p, q] = pc.sides[side];
        const third = pc.names.find((n) => n !== p && n !== q);
        const txt = opts.label ? opts.label(key, side) : side;
        if (!txt) return;
        const color = hl[side] ? 'var(--' + hl[side] + ')' : null;
        out += D.text(D.sideLabelPos(v[p], v[q], v[third], 18), txt,
          'class="slabel" font-size="' + fs + '"' + (color ? ' style="fill:' + color + '"' : ''));
      });
      if (opts.captions !== false) {
        const b = bbox(v);
        out += D.text([(b.x0 + b.x1) / 2, bottom + 52], '△' + pc.name, 'class="vlabel" font-size="20" style="fill:' + pc.stroke + '"');
      }
    });
    return '<svg class="stage pair" viewBox="0 0 ' + W2 + ' ' + H2 + '" role="img" aria-label="Triângulos semelhantes lado a lado">' + out + '</svg>';
  }

  function buildDots() {
    dotsEl.innerHTML = STEPS.map((s, idx) =>
      '<button class="dot" role="tab" data-step="' + idx + '" aria-label="Passo ' + (idx + 1) + ': ' + s.title + '" title="' + (idx + 1) + '. ' + s.title + '"></button>').join('');
  }

  RM.sim = {
    get STEPS() { return STEPS; },
    pairSVG,
    createMini,
    PIECE_NAME,
    REL,
    ROWS,
    init() {
      svg = document.getElementById('sem-svg');
      titleEl = document.getElementById('step-title');
      bodyEl = document.getElementById('step-body');
      countEl = document.getElementById('step-count');
      dotsEl = document.getElementById('step-dots');
      tableCard = document.getElementById('sem-table-card');
      tableEl = document.getElementById('sem-table');
      prevBtn = document.getElementById('step-prev');
      nextBtn = document.getElementById('step-next');
      playBtn = document.getElementById('step-play');

      buildSteps();
      buildDots();
      dotsEl.addEventListener('click', (e) => {
        const d = e.target.closest('[data-step]');
        if (d) { setPlaying(false); RM.set({ step: Number(d.getAttribute('data-step')) }); }
      });
      prevBtn.addEventListener('click', () => { setPlaying(false); go(-1); });
      nextBtn.addEventListener('click', () => { setPlaying(false); go(1); });
      playBtn.addEventListener('click', () => setPlaying(!playing));

      if (RM.state.step >= STEPS.length) RM.state.step = STEPS.length - 1;

      RM.on((changed) => {
        if (['rot', 'mirror', 'pose', 'a', 'm'].some((k) => changed.includes(k))) {
          const titles = STEPS.map((x) => x.title).join('|');
          buildSteps();
          if (titles !== STEPS.map((x) => x.title).join('|')) buildDots();
          if (RM.state.step >= STEPS.length) { RM.set({ step: STEPS.length - 1 }); }
        }
        if (changed.includes('step')) {
          if (RM.state.step >= STEPS.length) { RM.set({ step: STEPS.length - 1 }); return; }
          animateTo(RM.state.step, duration());
          renderSide();
          return;
        }
        if (['rot', 'mirror', 'pose'].some((k) => changed.includes(k))) {
          animateTo(RM.state.step, RM.state.view === 'sem' ? 700 / (RM.state.speed || 1) : 0);
          renderSide();
          return;
        }
        if (changed.includes('a') || changed.includes('m')) {
          if (anim) anim.cancel();
          anim = null;
          cur = targetStates(RM.state.step);
        }
        render();
        renderSide();
      });

      animateTo(RM.state.step, 0);
      renderSide();
    },
    render() { if (cur) render(); },
    next() { setPlaying(false); go(1); },
    prev() { setPlaying(false); go(-1); },
    first() { setPlaying(false); RM.set({ step: 0 }); },
    stop() { setPlaying(false); },
  };
})();
