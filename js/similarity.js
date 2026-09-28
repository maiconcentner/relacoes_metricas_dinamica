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
    const cs = Math.cos(st.rot), sn = Math.sin(st.rot);
    pc.names.forEach((n) => {
      const vx = pc.local[n][0];
      const vy = pc.local[n][1] * st.flip;
      const rx = vx * cs - vy * sn;
      const ry = vx * sn + vy * cs;
      out[n] = [st.x + st.s * rx, st.y - st.s * ry];
    });
    return out;
  }
  function bbox(v) {
    const xs = Object.values(v).map((p) => p[0]);
    const ys = Object.values(v).map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  /* Rotação/reflexão que deixa a peça como ABC: hipotenusa horizontal, β à esquerda, reto em cima. */
  function orientation(pc) {
    const L = pc.local, r = pc.roles;
    for (const flip of [1, -1]) {
      const d = [L[r.gamma][0] - L[r.beta][0], (L[r.gamma][1] - L[r.beta][1]) * flip];
      const rot = -Math.atan2(d[1], d[0]);
      const st = { x: 0, y: 0, s: 1, rot, flip, op: 1 };
      const v = screenVerts(pc, st);
      if (v[r.right][1] < v[r.beta][1] - 1e-9) return { rot, flip };
    }
    return { rot: 0, flip: 1 };
  }

  function placeVertex(pc, base, vname, P) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const v = screenVerts(pc, st);
    st.x = P[0] - v[vname][0];
    st.y = P[1] - v[vname][1];
    return st;
  }
  function placeBottomCenter(pc, base, cx, bottom) {
    const st = Object.assign({ x: 0, y: 0 }, base);
    const b = bbox(screenVerts(pc, st));
    st.x = cx - (b.x0 + b.x1) / 2;
    st.y = bottom - b.y1;
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
  function layout(kind, t, P) {
    const o1 = orientation(P.p1), o2 = orientation(P.p2);
    const id = { rot: 0, flip: 1 };
    const S = {};

    if (kind === 'whole') {
      const k = Math.min(800 / t.a, 400 / t.h);
      const x0 = W / 2 - (t.a * k) / 2;
      const base = 300 + (t.h * k) / 2;
      S.big = placeVertex(P.big, Object.assign({ s: k, op: 1 }, id), 'B', [x0, base]);
      S.p1 = placeVertex(P.p1, Object.assign({ s: k, op: 1 }, id), 'B', [x0, base]);
      S.p2 = placeVertex(P.p2, Object.assign({ s: k, op: 1 }, id), 'C', [x0 + t.a * k, base]);
      return S;
    }

    if (kind === 'split' || kind === 'flip' || kind === 'rot') {
      const k = Math.min(760 / (t.b + t.c), 195 / t.h);
      const topBase = 58 + t.h * k;
      S.big = placeVertex(P.big, Object.assign({ s: k, op: 1 }, id), 'B', [W / 2 - (t.a * k) / 2, topBase]);
      const gap = 70;
      const total = (t.b + t.c) * k + gap;
      const start = (W - total) / 2;
      const c1 = start + (t.c * k) / 2;
      const c2 = start + t.c * k + gap + (t.b * k) / 2;
      const bottom = 582;
      const f1 = kind === 'split' ? id : kind === 'flip' ? { rot: 0, flip: o1.flip } : o1;
      const f2 = kind === 'split' ? id : kind === 'flip' ? { rot: 0, flip: o2.flip } : o2;
      S.p1 = placeBottomCenter(P.p1, Object.assign({ s: k, op: 1 }, f1), c1, bottom);
      S.p2 = placeBottomCenter(P.p2, Object.assign({ s: k, op: 1 }, f2), c2, bottom);
      return S;
    }

    if (kind === 'nest') {
      const k = Math.min(820 / t.a, 440 / t.h);
      const P0 = [W / 2 - (t.a * k) / 2, 520];
      S.big = placeVertex(P.big, Object.assign({ s: k, op: 1 }, id), 'B', P0);
      S.p1 = placeVertex(P.p1, Object.assign({ s: k, op: 1 }, o1), 'B', P0);
      S.p2 = placeVertex(P.p2, Object.assign({ s: k, op: 1 }, o2), 'A', P0);
      return S;
    }

    // 'row': os três lado a lado, mesma orientação
    const gap = 78;
    const k = Math.min((W - 80 - 2 * gap) / (t.a + t.b + t.c), 330 / t.h);
    const total = (t.a + t.b + t.c) * k + 2 * gap;
    let x = (W - total) / 2;
    const bottom = 300 + (t.h * k) / 2;
    S.big = placeLeftBottom(P.big, Object.assign({ s: k, op: 1 }, id), x, bottom); x += t.a * k + gap;
    S.p1 = placeLeftBottom(P.p1, Object.assign({ s: k, op: 1 }, o1), x, bottom); x += t.c * k + gap;
    S.p2 = placeLeftBottom(P.p2, Object.assign({ s: k, op: 1 }, o2), x, bottom);
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

  const REL = {
    c2: { rows: ['ABC', 'HBA'], cols: ['hip', 'og'] },
    b2: { rows: ['ABC', 'HAC'], cols: ['hip', 'ob'] },
    h2: { rows: ['HBA', 'HAC'], cols: ['ob', 'og'] },
    ah: { rows: ['ABC', 'HBA'], cols: ['hip', 'ob'] },
  };

  const STEPS = [
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
    { title: 'Separando os triângulos', layout: 'split', pieces: 1, angles: 3, labels: 'piece',
      text: (t, lv) => lv === 'em'
        ? '<p>Destacamos △ABC, △HBA e △HAC. Os três têm ângulos <span class="c-beta">β</span>, <span class="c-gamma">γ</span> e 90' + deg + ', mas estão em posições diferentes.</p>'
        : '<p>Agora temos <b>três triângulos</b>: o grande ABC e os dois menores. Vamos separá-los para comparar.</p><p>Repare nas cores dos ângulos: todos têm um <span class="c-beta">β</span>, um <span class="c-gamma">γ</span> e um ângulo reto.</p>' },
    { title: 'Refletindo (espelhando)', layout: 'flip', pieces: 1, angles: 3, labels: 'piece', mirror: true,
      text: (t, lv) => lv === 'em'
        ? '<p>Aplicamos uma <b>reflexão</b> em cada triângulo menor em relação à reta tracejada. Reflexões são isometrias: preservam comprimentos e ângulos e invertem a orientação dos vértices.</p>'
        : '<p>Para comparar, vamos deixar os menores na mesma posição do grande.</p><p>Primeiro, <b>espelhamos</b> cada um na linha tracejada, como se virássemos o triângulo do avesso. Espelhar não muda o tamanho nem os ângulos.</p>' },
    { title: 'Girando', layout: 'rot', pieces: 1, angles: 3, labels: 'piece',
      text: (t, lv) => lv === 'em'
        ? '<p>Uma <b>rotação</b> (outra isometria) leva a hipotenusa de cada triângulo à horizontal, com o vértice de <span class="c-beta">β</span> à esquerda, o de <span class="c-gamma">γ</span> à direita e o ângulo reto acima, como em △ABC.</p>'
        : '<p>Depois, <b>giramos</b> cada um até a hipotenusa ficar deitada, com <span class="c-beta">β</span> à esquerda, <span class="c-gamma">γ</span> à direita e o ângulo reto em cima, igual ao triângulo grande.</p>' },
    { title: 'Mesma forma, tamanhos diferentes', layout: 'rot', pieces: 1, angles: 3, labels: 'piece',
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
    if (step.mirror) {
      ['p1', 'p2'].forEach((key) => {
        const b = bbox(V[key]);
        const y = cur[key].y;
        out += D.line([b.x0 - 24, y], [b.x1 + 24, y], 'style="stroke:var(--muted);stroke-width:2;stroke-dasharray:10 7"');
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
    if (st.angles) out += angleMarks(step, P, V, fs);
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
    out += vtext([v.B[0] - 24, v.B[1] + 4], 'B', vfs);
    out += vtext([v.C[0] + 24, v.C[1] + 4], 'C', vfs);
    const off = D.fs(24);
    out += stext(D.sideLabelPos(v.A, v.B, v.C, off), 'c', fs);
    out += stext(D.sideLabelPos(v.A, v.C, v.B, off), 'b', fs);
    if (step.pieces) {
      const Hp = V.p1.H;
      out += D.line(v.A, Hp, 'style="stroke:var(--ink);stroke-width:2.2;stroke-dasharray:8 6"');
      out += vtext([Hp[0] - D.fs(17), Hp[1] - D.fs(17)], 'H', D.fs(22), 'var(--muted)');
      out += stext(D.sideLabelPos(v.A, Hp, v.B, off), 'h', fs);
      out += stext([(v.B[0] + Hp[0]) / 2, v.B[1] + D.fs(22)], 'm', fs);
      out += stext([(Hp[0] + v.C[0]) / 2, v.B[1] + D.fs(22)], 'n', fs);
      out += D.dimension(v.B, v.C, 56, (pos) => stext([pos[0], pos[1] + 4], 'a', fs), 'var(--muted)', fs);
    } else {
      out += stext([(v.B[0] + v.C[0]) / 2, v.B[1] + D.fs(24)], 'a', fs);
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
      flip: a.flip + (b.flip - a.flip) * e,
      op: a.op + (b.op - a.op) * e,
    };
  }

  function targetStates(stepIdx) {
    const step = STEPS[stepIdx];
    const t = RM.tri();
    const S = layout(step.layout, t, pieces(t));
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

  RM.sim = {
    STEPS,
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

      dotsEl.innerHTML = STEPS.map((s, idx) =>
        '<button class="dot" role="tab" data-step="' + idx + '" aria-label="Passo ' + (idx + 1) + ': ' + s.title + '" title="' + (idx + 1) + '. ' + s.title + '"></button>').join('');
      dotsEl.addEventListener('click', (e) => {
        const d = e.target.closest('[data-step]');
        if (d) { setPlaying(false); RM.set({ step: Number(d.getAttribute('data-step')) }); }
      });
      prevBtn.addEventListener('click', () => { setPlaying(false); go(-1); });
      nextBtn.addEventListener('click', () => { setPlaying(false); go(1); });
      playBtn.addEventListener('click', () => setPlaying(!playing));

      if (RM.state.step >= STEPS.length) RM.state.step = STEPS.length - 1;

      RM.on((changed) => {
        if (changed.includes('step')) {
          if (RM.state.step >= STEPS.length) { RM.set({ step: STEPS.length - 1 }); return; }
          animateTo(RM.state.step, duration());
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
