/* Exercícios: gerador com foco nas relações escolhidas e solucionador passo a passo. */
(function () {
  'use strict';
  const RM = window.RM;
  const D = RM.draw;

  const W = 1000;
  const VARS = ['a', 'b', 'c', 'h', 'm', 'n'];
  const SEG = { a: 'BC', b: 'AC', c: 'AB', h: 'AH', m: 'BH', n: 'HC' };
  const DESC = {
    a: 'da hipotenusa BC', b: 'do cateto AC', c: 'do cateto AB',
    h: 'da altura AH', m: 'da projeção BH', n: 'da projeção HC',
  };
  const PTS = { a: ['B', 'C'], b: ['A', 'C'], c: ['A', 'B'], h: ['A', 'H'], m: ['B', 'H'], n: ['H', 'C'] };

  /* Relações usadas pelo solucionador. */
  const RELS = {
    c2: { vars: ['c', 'a', 'm'], kind: 'sim' },
    b2: { vars: ['b', 'a', 'n'], kind: 'sim' },
    h2: { vars: ['h', 'm', 'n'], kind: 'sim' },
    ah: { vars: ['a', 'h', 'b', 'c'], kind: 'sim' },
    mn: { vars: ['a', 'm', 'n'], kind: 'sum' },
    pit: { vars: ['a', 'b', 'c'], kind: 'pit', hyp: 'a', legs: ['b', 'c'], tri: 'big' },
    p1: { vars: ['c', 'h', 'm'], kind: 'pit', hyp: 'c', legs: ['h', 'm'], tri: 'p1' },
    p2: { vars: ['b', 'h', 'n'], kind: 'pit', hyp: 'b', legs: ['h', 'n'], tri: 'p2' },
  };
  const FOCUS = [
    { id: 'c2', html: '<i>c</i>² = <i>a</i>·<i>m</i>', rels: ['c2'] },
    { id: 'b2', html: '<i>b</i>² = <i>a</i>·<i>n</i>', rels: ['b2'] },
    { id: 'h2', html: '<i>h</i>² = <i>m</i>·<i>n</i>', rels: ['h2'] },
    { id: 'ah', html: '<i>a</i>·<i>h</i> = <i>b</i>·<i>c</i>', rels: ['ah'] },
    { id: 'mn', html: '<i>a</i> = <i>m</i> + <i>n</i>', rels: ['mn'] },
    { id: 'pit', html: 'Pitágoras', rels: ['pit', 'p1', 'p2'] },
  ];
  const SIM_ORDER = ['c2', 'b2', 'h2', 'ah', 'mn', 'pit', 'p1', 'p2'];
  const TRI_NAME = { big: '△ABC', p1: '△HBA', p2: '△HAC' };
  const TRI_CLASS = { big: '', p1: 'c-p1', p2: 'c-p2' };
  const TRI_COLOR = { big: 'grande', p1: 'amarelo', p2: 'verde' };
  /* Forma "fórmula" de cada relação: L[0]·L[1] = R[0]·R[1] */
  const FORMF = {
    c2: { L: ['c', 'c'], R: ['a', 'm'] },
    b2: { L: ['b', 'b'], R: ['a', 'n'] },
    h2: { L: ['h', 'h'], R: ['m', 'n'] },
    ah: { L: ['a', 'h'], R: ['b', 'c'] },
  };
  const COLNAME = { hip: 'hipotenusa', ob: 'lado oposto a β', og: 'lado oposto a γ' };

  /* ---------- Estado ---------- */
  const cfg = { focus: new Set(), steps: 1, nums: 'int', randPos: false, method: 'both', scene: 'none' };
  const sceneOf = (e) => (e && e.scene && e.scene !== 'none' ? RM.scenes.SCENES[e.scene] : null);
  let mini = null;
  let ex = null;             // { t, givens, target, path, sol: [...], cur }
  const layers = { names: false, angles: false, fill: false };
  const custom = {};         // var -> 'given' | 'target'
  let useT = null;           // triângulo trazido do Laboratório para o modo "Montar o meu"
  let els = {};

  /* ---------- Solucionador: menor caminho de relações até a incógnita ---------- */
  function solvePath(givens, target, order) {
    const bit = (v) => 1 << VARS.indexOf(v);
    let start = 0;
    givens.forEach((v) => { start |= bit(v); });
    if (start & bit(target)) return [];
    const prev = new Map([[start, null]]);
    let queue = [start];
    while (queue.length) {
      const next = [];
      for (const mask of queue) {
        for (const id of order) {
          const unk = RELS[id].vars.filter((v) => !(mask & bit(v)));
          if (unk.length !== 1) continue;
          const nm = mask | bit(unk[0]);
          if (prev.has(nm)) continue;
          prev.set(nm, { from: mask, rel: id, x: unk[0] });
          if (nm & bit(target)) {
            const path = [];
            let c = nm;
            while (prev.get(c)) { const p = prev.get(c); path.unshift({ rel: p.rel, x: p.x }); c = p.from; }
            return path;
          }
          next.push(nm);
        }
      }
      queue = next;
    }
    return null;
  }

  /* ---------- Gerador ---------- */
  // m = d·p², n = d·q², h = d·p·q, a = d·(p² + q²); pares com proporção m : n até 1 : 4
  const PQ = [[3, 4], [3, 4], [3, 4], [1, 2], [2, 3], [3, 5], [4, 5]];
  const D_INT = [1, 2, 3, 4, 5];
  const D_DEC = [0.2, 0.4, 0.5, 0.6, 0.8, 1.2, 1.5];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function nice(x, mode) {
    if (mode === 'int') return Math.abs(x - Math.round(x)) < 1e-9;
    return Math.abs(x * 10 - Math.round(x * 10)) < 1e-7;
  }
  function triFrom(a, m) {
    const n = a - m;
    return { a, m, n, h: Math.sqrt(m * n), b: Math.sqrt(a * n), c: Math.sqrt(a * m) };
  }
  function focusRels() {
    const out = [];
    FOCUS.forEach((f) => { if (cfg.focus.has(f.id)) out.push(...f.rels); });
    return out;
  }

  function generate(numsOverride) {
    const nums = numsOverride || cfg.nums;
    const sc = cfg.scene !== 'none' ? RM.scenes.SCENES[cfg.scene] : null;
    const maxA = sc && sc.maxA ? sc.maxA : 110;
    const fr = focusRels();
    for (let tries = 0; tries < 8000; tries++) {
      const strict = tries < 5000;
      let [p, q] = pick(PQ);
      if (Math.random() < 0.5) [p, q] = [q, p];
      const d = pick(nums === 'int' ? D_INT : D_DEC);
      const t = triFrom(d * (p * p + q * q), d * p * p);
      if (t.a > maxA) continue;
      const g = (cfg.steps === 1 && fr.includes('ah') && Math.random() < 0.5) || Math.random() < 0.12 ? 3 : 2;
      const sh = shuffle(VARS);
      const givens = sh.slice(0, g);
      const target = sh[g];
      let allowed = fr.length && strict ? fr.concat(['mn']) : SIM_ORDER;
      const order = fr.concat(SIM_ORDER.filter((id) => !fr.includes(id))).filter((id) => allowed.includes(id));
      const path = solvePath(givens, target, order);
      if (!path || path.length !== cfg.steps) continue;
      if (fr.length && !path.some((s) => fr.includes(s.rel))) continue;
      const used = new Set();
      path.forEach((s) => RELS[s.rel].vars.forEach((v) => used.add(v)));
      if (!givens.every((v) => used.has(v))) continue;
      if (!givens.concat(path.map((s) => s.x)).every((v) => nice(t[v], nums))) continue;
      return { t, givens, target, path };
    }
    return null;
  }

  /* ---------- Formatação ---------- */
  const F = (x) => RM.fmt(x, 2);
  const i = (v) => '<i>' + v + '</i>';
  const fr = (a, b) => '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>';
  const ml = (html) => '<div class="mathline">' + html + '</div>';
  const unit = (txt) => {
    const sc = sceneOf(ex);
    return sc && !RM.state.unit ? txt + '\u00a0' + sc.unit : RM.withUnit(txt);
  };

  function listAnd(items) {
    return items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
  }

  function statement(e) {
    const sc = sceneOf(e);
    if (sc) {
      const u = (v) => F(e.t[v]) + '\u00a0' + (RM.state.unit || sc.unit);
      const giv = e.givens.map((v) => sc.nouns[v][0] + ' mede ' + u(v));
      return sc.intro + ' Sabendo que ' + listAnd(giv) + ', determine a medida <b>x</b> ' + sc.nouns[e.target][1] + '.';
    }
    const giv = e.givens.map((v) => SEG[v] + ' = ' + unit(F(e.t[v])));
    return 'No triângulo ABC, retângulo em A, AH é a altura relativa à hipotenusa BC. Sabendo que ' +
      listAnd(giv) + ', determine a medida <b>x</b> ' + DESC[e.target] + '.';
  }

  /* ---------- Passos da resolução ---------- */
  function buildSolution(e) {
    const t = e.t;
    const known = new Set(e.givens);
    const found = [];
    const sym = (v) => (v === e.target ? '<b>x</b>' : i(v));
    const val = (v) => (known.has(v) ? F(t[v]) : sym(v));
    const steps = [];

    const giv = e.givens.map((v) => i(v) + ' = ' + SEG[v] + ' = ' + F(t[v]));
    steps.push({
      title: sceneOf(e) ? 'Encontrando o triângulo' : 'Organizando os dados',
      html: (sceneOf(e)
        ? '<p>Primeiro, encontramos o <b>triângulo retângulo escondido na cena</b>: ABC, com ângulo reto em A e a altura AH.</p>' +
          '<p>' + ['a', 'b', 'c', 'h', 'm', 'n'].map((v) => i(v) + ' = ' + sceneOf(e).nouns[v][0]).join('; ') + '.</p>'
        : '<p>Nomeamos os elementos: hipotenusa ' + i('a') + ', catetos ' + i('b') + ' e ' + i('c') +
        ', altura ' + i('h') + ' e projeções ' + i('m') + ' e ' + i('n') + '.</p>') +
        ml('Dados: ' + listAnd(giv)) + ml('Queremos: <b>x</b> = ' + i(e.target) + ' = ' + SEG[e.target]) +
        (e.path.length > 1 ? '<p>Vamos precisar de ' + e.path.length + ' relações, uma de cada vez.</p>' : ''),
      fig: { names: true, hl: e.givens.map((v) => [v, 'hl2']).concat([[e.target, 'hl1']]) },
      found: [],
    });

    e.path.forEach((s, idx) => {
      const R = RELS[s.rel];
      const x = s.x;
      const pre = e.path.length > 1 ? 'Relação ' + (idx + 1) + ': ' : '';
      if (R.kind === 'sim') {
        const rel = RM.sim.REL[s.rel];
        const r1 = RM.sim.ROWS.find((r) => r.name === rel.rows[0]);
        const r2 = RM.sim.ROWS.find((r) => r.name === rel.rows[1]);
        const [c1, c2] = rel.cols;
        const keys = [r1.key, r2.key];
        const common = keys.includes('big') ? (keys.includes('p1') ? 'o ângulo <span class="c-beta">β</span>' : 'o ângulo <span class="c-gamma">γ</span>')
          : 'os ângulos <span class="c-beta">β</span> e <span class="c-gamma">γ</span>';
        const formula = FOCUS.find((f) => f.id === s.rel).html;
        const hl = {};
        hl[r1.key] = { [r1[c1]]: 'hl1', [r1[c2]]: 'hl2' };
        hl[r2.key] = { [r2[c1]]: 'hl1', [r2[c2]]: 'hl2' };
        const names = keys.map((k) => '<b class="' + TRI_CLASS[k] + '">' + TRI_NAME[k] + '</b>').join(' e ');
        const before = new Set(known);
        const after = new Set(known); after.add(x);
        const labeler = (kn) => (key, side) => {
          if (side === x && kn.has(x)) return { txt: (x === e.target ? 'x = ' : side + ' = ') + F(t[side]), color: 'var(--ok)' };
          if (side === e.target) return { txt: 'x', color: 'var(--hl1)' };
          if (kn.has(side)) return { txt: F(t[side]) };
          return { txt: side, color: 'var(--muted)' };
        };
        // Conta a partir de fatores: L[0]·L[1] = R[0]·R[1]
        const calcFrom = (L, Rr) => {
          const side = L.includes(x) ? L : Rr;
          const other = side === L ? Rr : L;
          const prod = t[other[0]] * t[other[1]];
          const otherTxt = other[0] === other[1] ? val(other[0]) + '²' : val(other[0]) + ' · ' + val(other[1]);
          if (side[0] === x && side[1] === x) {
            return ml(sym(x) + '² = ' + otherTxt + ' = ' + F(prod)) +
              ml(sym(x) + ' = √' + F(prod) + ' = <span class="result">' + F(t[x]) + '</span>');
          }
          const k = side[0] === x ? side[1] : side[0];
          return ml(val(k) + ' · ' + sym(x) + ' = ' + otherTxt) +
            ml(val(k) + ' · ' + sym(x) + ' = ' + F(prod)) +
            ml(sym(x) + ' = ' + fr(F(prod), val(k)) + ' = <span class="result">' + F(t[x]) + '</span>');
        };
        const FF = FORMF[s.rel];
        const calcSim = calcFrom([r1[c1], r2[c2]], [r2[c1], r1[c2]]);
        const calcForm = calcFrom(FF.L, FF.R);
        const fillFig = { fill: keys, hl: R.vars.map((v) => [v, v === x ? 'hl1' : 'hl2']) };

        if (cfg.method !== 'formula') {
          const inplace = {}, aligned = {};
          keys.forEach((k) => { inplace[k] = 'inplace'; aligned[k] = 'rot'; });
          const seq = mini.seq(t, keys);
          steps.push({
            title: pre + 'Quais triângulos vamos comparar?',
            html: '<p>As medidas ' + listAnd(R.vars.map((v) => sym(v))) + ' aparecem juntas nos triângulos ' + names + '.</p>' +
              '<p>Vamos compará-los: primeiro separamos os dois, depois colocamos na mesma posição, <b>um movimento por clique</b>.</p>',
            mini: { keys, phases: inplace, ghost: true, label: labeler(before) },
            found: found.slice(),
          });
          steps.push({
            title: pre + 'Separando os triângulos',
            move: true,
            html: '<p>Tiramos os dois de dentro de △ABC e colocamos lado a lado, ainda na posição em que estavam.</p>',
            mini: { keys, phases: seq[0].phases, label: labeler(before) },
            found: found.slice(),
          });
          seq.slice(1, -1).forEach((it) => {
            const dsc = RM.sim.describeMove(it.move);
            steps.push({
              title: pre + dsc.title,
              move: true,
              html: dsc.html,
              mini: { keys, phases: it.phases, mirrorKey: it.move.type === 'flip' ? it.move.key : null, label: labeler(before) },
              found: found.slice(),
            });
          });
          const letters = fr(i(r1[c1]), i(r2[c1])) + ' = ' + fr(i(r1[c2]), i(r2[c2]));
          const nums = fr('<span class="c-hl1">' + val(r1[c1]) + '</span>', '<span class="c-hl1">' + val(r2[c1]) + '</span>') + ' = ' +
            fr('<span class="c-hl2">' + val(r1[c2]) + '</span>', '<span class="c-hl2">' + val(r2[c2]) + '</span>');
          steps.push({
            title: pre + 'Montando a proporção',
            html: '<p>Na mesma posição, os dois têm um ângulo reto e ' + common + ' nos mesmos lugares: são <b>semelhantes</b> (caso AA).</p>' +
              '<p>Comparamos os lados correspondentes: <span class="c-hl1">' + COLNAME[c1] + '</span> com ' + COLNAME[c1] +
              ' e <span class="c-hl2">' + COLNAME[c2] + '</span> com ' + COLNAME[c2] + '.</p>' + ml(letters) + ml(nums),
            mini: { keys, phases: aligned, hl, label: labeler(before) },
            found: found.slice(),
          });
          steps.push({
            title: pre + 'Calculando ' + (x === e.target ? 'x' : x),
            html: '<p>Multiplicamos cruzado (como na regra de três) e isolamos ' + sym(x) + ':</p>' + calcSim,
            mini: { keys, phases: aligned, hl, label: labeler(after) },
            found: found.concat([x]),
          });
        }
        if (cfg.method !== 'sim') {
          const both = cfg.method === 'both';
          steps.push({
            title: pre + (both ? 'Conferindo pela fórmula' : 'Usando a fórmula'),
            html: (both
              ? '<p>A relação ' + formula + ' é o resumo desta semelhança. Aplicando direto:</p>'
              : '<p>As medidas ' + listAnd(R.vars.map((v) => sym(v))) + ' estão ligadas pela relação ' + formula + '. Substituímos os valores:</p>') +
              ml(formula) + calcForm + (both ? '<p>O mesmo resultado, por um caminho mais curto.</p>' : ''),
            fig: both ? { hl: [[x, 'ok']] } : fillFig,
            found: found.concat([x]),
          });
        }
        known.add(x); found.push(x);
      } else if (R.kind === 'sum') {
        let calc;
        if (x === 'a') calc = ml(sym('a') + ' = ' + i('m') + ' + ' + i('n') + ' = ' + F(t.m) + ' + ' + F(t.n) + ' = <span class="result">' + F(t.a) + '</span>');
        else {
          const o = x === 'm' ? 'n' : 'm';
          calc = ml(i('a') + ' = ' + i('m') + ' + ' + i('n')) +
            ml(F(t.a) + ' = ' + (x === 'm' ? sym('m') + ' + ' + F(t.n) : F(t.m) + ' + ' + sym('n'))) +
            ml(sym(x) + ' = ' + F(t.a) + ' − ' + F(t[o]) + ' = <span class="result">' + F(t[x]) + '</span>');
        }
        known.add(x); found.push(x);
        steps.push({
          title: pre + 'A hipotenusa é a soma das projeções',
          html: '<p>A altura divide a hipotenusa em duas partes, ' + i('m') + ' e ' + i('n') + ':</p>' + calc,
          fig: { hl: [['m', 'hl2'], ['n', 'hl2'], ['a', 'hl1'], [x, 'ok']] },
          found: found.slice(),
        });
      } else {
        const H = R.hyp, [l1, l2] = R.legs;
        let calc;
        if (x === H) {
          const s2 = t[l1] * t[l1] + t[l2] * t[l2];
          calc = ml(sym(H) + '² = ' + i(l1) + '² + ' + i(l2) + '²') +
            ml(sym(H) + '² = ' + F(t[l1]) + '² + ' + F(t[l2]) + '² = ' + F(t[l1] * t[l1]) + ' + ' + F(t[l2] * t[l2]) + ' = ' + F(s2)) +
            ml(sym(H) + ' = √' + F(s2) + ' = <span class="result">' + F(t[H]) + '</span>');
        } else {
          const o = x === l1 ? l2 : l1;
          const s2 = t[H] * t[H] - t[o] * t[o];
          calc = ml(i(H) + '² = ' + i(l1) + '² + ' + i(l2) + '²') +
            ml(F(t[H]) + '² = ' + sym(x) + '² + ' + F(t[o]) + '²') +
            ml(sym(x) + '² = ' + F(t[H] * t[H]) + ' − ' + F(t[o] * t[o]) + ' = ' + F(s2)) +
            ml(sym(x) + ' = √' + F(s2) + ' = <span class="result">' + F(t[x]) + '</span>');
        }
        known.add(x); found.push(x);
        steps.push({
          title: pre + 'Pitágoras no ' + TRI_NAME[R.tri],
          html: '<p>No triângulo retângulo <b class="' + TRI_CLASS[R.tri] + '">' + TRI_NAME[R.tri] + '</b> (o ' + TRI_COLOR[R.tri] +
            '), a hipotenusa é ' + i(H) + ' e os catetos são ' + i(l1) + ' e ' + i(l2) + ':</p>' + calc,
          fig: { fill: [R.tri], hl: [[l1, 'hl2'], [l2, 'hl2'], [H, 'hl1'], [x, 'ok']] },
          found: found.slice(),
        });
      }
    });

    steps.push({
      title: 'Resposta',
      html: ml('<span class="result">x = ' + SEG[e.target] + ' = ' + unit(F(t[e.target])) + '</span>') +
        '<p>Caminho: ' + e.path.map((s) => {
          const f = FOCUS.find((g) => g.rels.includes(s.rel));
          if (s.rel === 'p1') return 'Pitágoras em △HBA';
          if (s.rel === 'p2') return 'Pitágoras em △HAC';
          if (RELS[s.rel].kind !== 'sim') return f.html;
          const rel = RM.sim.REL[s.rel];
          const sim = '△' + rel.rows[0] + ' ~ △' + rel.rows[1];
          return cfg.method === 'formula' ? f.html : cfg.method === 'sim' ? sim : sim + ' (' + f.html + ')';
        }).join(' → ') + '.</p>',
      fig: { hl: [[e.target, 'ok']] },
      found: found.slice(),
    });
    return steps;
  }

  function cap(html) {
    return html.replace(/^(<[^>]+>)*([a-zà-ú])/, (mm) => mm.slice(0, -1) + mm.slice(-1).toUpperCase());
  }

  /* ---------- Figura ---------- */
  function figTransform(t) {
    const th = (RM.state.rot * Math.PI) / 180;
    const sgn = RM.state.mirror ? -1 : 1;
    const turn = (p) => {
      const x = p[0] * sgn, y = p[1];
      return [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
    };
    const raw = { B: turn([0, 0]), C: turn([t.a, 0]), A: turn([t.m, t.h]), H: turn([t.m, 0]) };
    const sc = sceneOf(ex);
    const extra = sc ? sc.extent(RM.scenes.geo(t)).map(turn) : [];
    const all = [raw.A, raw.B, raw.C].concat(extra);
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((sc ? 820 : 740) / Math.max(x1 - x0, 1e-9), (sc ? 480 : 400) / Math.max(y1 - y0, 1e-9));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const S = (p) => { const r = turn(p); return [W / 2 + k * (r[0] - cx), 300 - k * (r[1] - cy)]; };
    const P = {};
    Object.keys(raw).forEach((n) => { P[n] = [W / 2 + k * (raw[n][0] - cx), 300 - k * (raw[n][1] - cy)]; });
    P.S = S;
    return P;
  }

  /* Passos de semelhança usam a mini-animação; os outros, a figura do exercício. */
  function render() { showStep(0); }
  function showStep(dir) {
    if (!ex || !ex.sol) { if (mini) mini.stop(); els.fig.innerHTML = ''; els.miniG.innerHTML = ''; return; }
    const st = ex.sol[ex.cur];
    if (!st || !st.mini) {
      // Volta para a figura (com a cena): dissolve a animação e mostra a figura
      if (mini) mini.stop();
      renderFig({ animIn: dir === 1 && ex.cur === 1 && !!sceneOf(ex) });
      els.fig.style.opacity = 1;
      els.miniG.style.opacity = 0;
      return;
    }
    const m = st.mini;
    // Os triângulos "no lugar" ficam exatamente onde estavam na figura do exercício
    const FP = figTransform(ex.t);
    const anchor = { k: Math.hypot(FP.C[0] - FP.B[0], FP.C[1] - FP.B[1]) / ex.t.a, B: FP.B, C: FP.C };
    const o = { t: ex.t, hl: m.hl, label: m.label, ghost: m.ghost, mirrorKey: m.mirrorKey, anchor };
    els.fig.style.opacity = 0;
    els.miniG.style.opacity = 1;
    // Anima só entre passos vizinhos com os mesmos triângulos; senão, vai direto
    const prev = ex.sol[ex.cur - dir];
    const same = prev && prev.mini && prev.mini.keys.join() === m.keys.join();
    const dur = Math.abs(dir) === 1 && same ? 900 / (RM.state.speed || 1) : 0;
    mini.show(o, m.keys, m.phases, dur);
  }

  /* Refaz a solução (a quantidade de movimentos depende da posição da figura). */
  function rebuild() {
    if (!ex || !ex.sol) return;
    const cur = ex.cur;
    const sol = buildSolution(ex);
    sol.unshift({ title: 'Enunciado', fig: {}, found: [] });
    ex.sol = sol;
    ex.cur = RM.clamp(cur, 0, sol.length - 1);
  }

  function renderFig(opt) {
    const animIn = opt && opt.animIn;
    if (!ex || !ex.sol) { els.fig.innerHTML = ''; return; }
    const t = ex.t;
    const P = figTransform(t);
    const step = ex.sol[ex.cur] || { fig: {}, found: [] };
    const fig = step.fig || {};
    const found = new Set(step.found || []);
    const fill = new Set((fig.fill || []).concat(layers.fill ? ['p1', 'p2'] : []));
    const involved = ex.givens.concat([ex.target], ex.path.map((s) => s.x));
    const pathVars = new Set();
    ex.path.forEach((s) => RELS[s.rel].vars.forEach((v) => pathVars.add(v)));
    const showAlt = involved.concat([...pathVars]).some((v) => 'hmn'.includes(v)) || fill.has('p1') || fill.has('p2');
    const showNames = layers.names || fig.names || ex.cur > 0;
    const fs = D.fs(28);
    let out = '';
    const sc = sceneOf(ex);
    // Depois de encontrado o triângulo, a cena fica mais clara para ele se destacar
    if (sc) out += '<g class="scene' + (animIn ? ' scene-dim-in' : '') + '" style="opacity:' + (ex.cur >= 1 ? 0.55 : 1) + '">' + sc.draw(RM.scenes.geo(t), P.S) + '</g>';
    const drawIn = animIn ? ' pathLength="1" class="draw-in"' : '';
    // Na cena, o triângulo aparece discreto até ser "encontrado" (passo 1)
    const hidden = sc && ex.cur === 0;

    // Preenchimentos
    out += D.poly([P.B, P.C, P.A], 'style="fill:' + (fill.has('big') ? 'var(--big-fill)' : 'transparent') + ';stroke:none"');
    if (fill.has('p1')) out += D.poly([P.B, P.H, P.A], 'style="fill:var(--p1-fill);stroke:none"');
    if (fill.has('p2')) out += D.poly([P.H, P.C, P.A], 'style="fill:var(--p2-fill);stroke:none"');

    // Ângulos
    if (layers.angles || fig.fill) {
      const afs = D.fs(24);
      out += D.angleArc(P.B, P.C, P.A, 42, 'var(--beta)', 'β', afs);
      out += D.angleArc(P.C, P.A, P.B, 42, 'var(--gamma)', 'γ', afs);
      if (showAlt) {
        out += D.angleArc(P.A, P.B, P.H, 32, 'var(--gamma)', null, afs);
        out += D.angleArc(P.A, P.H, P.C, 40, 'var(--beta)', null, afs);
      }
    }
    out += D.rightMark(P.A, P.B, P.C, 15, 'var(--ink)');
    if (showAlt) out += D.rightMark(P.H, P.C, P.A, 12, 'var(--ink)');

    // Contornos
    const bigStroke = fill.has('big') ? 4.5 : 3;
    if (!hidden) {
      out += D.poly([P.B, P.C, P.A], 'style="fill:none;stroke:var(--big);stroke-width:' + bigStroke + ';stroke-linejoin:round"' + drawIn);
      if (showAlt) out += D.line(P.A, P.H, 'style="stroke:var(--ink);stroke-width:2.2;' + (animIn ? '' : 'stroke-dasharray:8 6') + '"' + drawIn);
    }

    // Destaques
    (fig.hl || []).forEach(([v, color]) => {
      if (!showAlt && 'hmn'.includes(v)) return;
      let [p, q] = [P[PTS[v][0]], P[PTS[v][1]]];
      if (v === 'a' && showAlt) [p, q] = D.offsetSeg(P.B, P.C, P.A, 58);
      out += D.line(p, q, 'style="stroke:var(--' + color + ');stroke-width:8;stroke-linecap:round;opacity:.8"');
    });

    // Rótulos
    const lbl = (v) => {
      const isGiven = ex.givens.includes(v);
      const isTarget = v === ex.target;
      const isFound = found.has(v);
      let txt = null, color = null;
      if (isTarget) {
        txt = isFound ? 'x = ' + F(t[v]) : 'x';
        color = isFound ? 'var(--ok)' : 'var(--hl1)';
      } else if (isGiven) {
        txt = (showNames ? v + ' = ' : '') + unit(F(t[v]));
      } else if (isFound) {
        txt = v + ' = ' + F(t[v]);
        color = 'var(--ok)';
      } else if (showNames) {
        txt = v;
        color = 'var(--muted)';
      }
      return { txt, color };
    };
    const put = (v, pos) => {
      const l = lbl(v);
      if (!l.txt) return '';
      return D.text(pos, D.esc(l.txt), 'class="slabel" font-size="' + fs + '"' + (l.color ? ' style="fill:' + l.color + '"' : ''));
    };
    const off = D.fs(26);
    out += put('c', D.sideLabelPos(P.A, P.B, P.C, off));
    out += put('b', D.sideLabelPos(P.A, P.C, P.B, off));
    if (showAlt) {
      out += put('h', D.sideLabelPos(P.A, P.H, P.B, off * 1.1));
      out += put('m', D.sideLabelPos(P.B, P.H, P.A, D.fs(24)));
      out += put('n', D.sideLabelPos(P.H, P.C, P.A, D.fs(24)));
      if (lbl('a').txt) out += D.dimension(P.B, P.C, P.A, 58, (pos) => put('a', pos), 'var(--muted)', fs);
    } else {
      out += put('a', D.sideLabelPos(P.B, P.C, P.A, off));
    }

    // Vértices
    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    const vfs = D.fs(30);
    out += D.text(D.vertexLabelPos(P.A, G, 30), 'A', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.B, G, 28), 'B', 'class="vlabel" font-size="' + vfs + '"');
    out += D.text(D.vertexLabelPos(P.C, G, 28), 'C', 'class="vlabel" font-size="' + vfs + '"');
    if (showAlt) out += D.text(D.footLabelPos(P.H, P.A, P.B, D.fs(14)), 'H', 'class="vlabel" font-size="' + D.fs(22) + '" style="fill:var(--muted)"');

    els.fig.innerHTML = animIn ? out.replace(/class="(slabel|vlabel)"/g, 'class="$1 fade-in"') : out;
  }

  /* ---------- Painel ---------- */
  function renderSide() {
    els.focus.querySelectorAll('[data-focus]').forEach((b) => b.setAttribute('aria-pressed', cfg.focus.has(b.dataset.focus)));
    els.steps.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(cfg.steps) === b.dataset.v));
    els.nums.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', cfg.nums === b.dataset.v));
    els.randPos.checked = cfg.randPos;
    document.querySelectorAll('#ex-method button').forEach((b) => b.setAttribute('aria-pressed', cfg.method === b.dataset.v));
    document.querySelectorAll('#ex-scene [data-scene]').forEach((b) => b.setAttribute('aria-pressed', cfg.scene === b.dataset.scene));
    document.querySelectorAll('[data-exlayer]').forEach((b) => b.setAttribute('aria-pressed', layers[b.dataset.exlayer]));
    els.custom.querySelectorAll('[data-cv]').forEach((b) => {
      const v = b.dataset.cv, role = b.dataset.role;
      b.setAttribute('aria-pressed', (custom[v] || 'none') === role);
    });

    if (!ex || !ex.sol) {
      els.statement.innerHTML = '<p class="note">Escolha o foco e toque em <b>Gerar exercício</b>.</p>';
      els.stepBody.innerHTML = '';
      els.stepTitle.textContent = '';
      els.stepCount.textContent = '';
      return;
    }
    els.statement.innerHTML = '<p>' + statement(ex) + '</p>';
    const st = ex.sol[ex.cur];
    els.stepCount.textContent = ex.cur === 0 ? 'Enunciado' : 'Passo ' + ex.cur + ' de ' + (ex.sol.length - 1);
    els.stepTitle.textContent = ex.cur === 0 ? 'Figura do exercício' : st.title;
    els.stepBody.innerHTML = ex.cur === 0
      ? '<p>' + statement(ex) + '</p><p class="note">Toque em <b>Próximo passo</b> para resolver com a turma.</p>'
      : st.html;
    document.getElementById('ex-replay').hidden = !(st && st.move);
    els.prev.disabled = ex.cur === 0;
    els.next.disabled = ex.cur >= ex.sol.length - 1;
    els.dots.innerHTML = ex.sol.map((s, idx) =>
      '<button class="dot' + (idx < ex.cur ? ' done' : '') + (idx === ex.cur ? ' current' : '') + '" data-exstep="' + idx +
      '" aria-label="' + (idx === 0 ? 'Enunciado' : 'Passo ' + idx + ': ' + s.title) + '" title="' + (idx === 0 ? 'Enunciado' : idx + '. ' + s.title) + '"></button>').join('');
  }

  function load(e) {
    if (e.scene === undefined) e.scene = cfg.scene;
    ex = Object.assign({}, ex || {}, { scene: e.scene });
    const sc = sceneOf(e);
    if (sc) {
      const o = sc.orient(e.t);
      if (Math.abs(RM.normDeg(o.rot - RM.state.rot)) > 0.5 || RM.state.mirror !== o.mirror) RM.set({ rot: o.rot, mirror: o.mirror });
    }
    const sol = buildSolution(e);
    // Passo 0 = só o enunciado; os passos da resolução vêm depois
    sol.unshift({ title: 'Enunciado', fig: {}, found: [] });
    ex = Object.assign({}, e, { sol, cur: 0 });
    render();
    renderSide();
  }

  function onGenerate() {
    let e = generate();
    let note = '';
    if (!e && cfg.nums === 'int' && cfg.scene !== 'none') {
      e = generate('dec');
      if (e) note = 'Usei números decimais para as medidas ficarem realistas nesta situação.';
    }
    if (!e) {
      els.msg.textContent = 'Não encontrei um exercício com essas escolhas. Tente outro número de passos ou mais relações no foco.';
      return;
    }
    els.msg.textContent = note;
    if (cfg.randPos && cfg.scene === 'none') {
      let r;
      do { r = Math.round(Math.random() * 360) - 180; } while (Math.abs(r) < 25);
      RM.set({ rot: r, mirror: Math.random() < 0.5 });
    }
    VARS.forEach((v) => { delete custom[v]; });
    e.givens.forEach((v) => { custom[v] = 'given'; });
    custom[e.target] = 'target';
    load(e);
  }

  function onCustom() {
    const givens = VARS.filter((v) => custom[v] === 'given');
    const target = VARS.find((v) => custom[v] === 'target');
    if (!target || givens.length < 2) {
      els.cmsg.textContent = 'Marque pelo menos dois dados e uma medida pedida.';
      return;
    }
    const t = useT || (ex ? ex.t : triFrom(RM.state.a, RM.state.m));
    useT = null;
    const path = solvePath(givens, target, SIM_ORDER);
    if (!path) {
      els.cmsg.textContent = 'Com esses dados não dá para chegar em ' + target + ' usando uma relação de cada vez. Escolha outros dados.';
      return;
    }
    els.cmsg.textContent = '';
    load({ t, givens, target, path, scene: cfg.scene });
  }

  function go(delta) {
    if (!ex) return;
    const before = ex.cur;
    ex.cur = RM.clamp(ex.cur + delta, 0, ex.sol.length - 1);
    renderSide();
    showStep(ex.cur - before);
  }

  RM.exe = {
    init() {
      els = {
        svg: document.getElementById('exe-svg'),
        focus: document.getElementById('ex-focus'),
        steps: document.getElementById('ex-steps'),
        nums: document.getElementById('ex-nums'),
        randPos: document.getElementById('ex-randpos'),
        msg: document.getElementById('ex-msg'),
        cmsg: document.getElementById('ex-cmsg'),
        custom: document.getElementById('ex-custom'),
        statement: document.getElementById('ex-statement'),
        stepTitle: document.getElementById('ex-step-title'),
        stepCount: document.getElementById('ex-step-count'),
        stepBody: document.getElementById('ex-step-body'),
        dots: document.getElementById('ex-dots'),
        prev: document.getElementById('ex-prev'),
        next: document.getElementById('ex-next'),
      };
      els.fig = document.getElementById('exe-fig');
      els.miniG = document.getElementById('exe-mini');
      mini = RM.sim.createMini(els.miniG);
      document.getElementById('ex-method').addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        cfg.method = b.dataset.v;
        if (ex) load({ t: ex.t, givens: ex.givens, target: ex.target, path: ex.path, scene: ex.scene });
        else renderSide();
      });
      document.getElementById('ex-scene').innerHTML = [['none', 'Sem contexto']].concat(Object.keys(RM.scenes.SCENES).map((k) => [k, RM.scenes.SCENES[k].name]))
        .map(([k, n]) => '<button class="chip" data-scene="' + k + '">' + n + '</button>').join('');
      document.getElementById('ex-scene').addEventListener('click', (e) => {
        const b = e.target.closest('[data-scene]');
        if (!b) return;
        cfg.scene = b.dataset.scene;
        if (ex) load({ t: ex.t, givens: ex.givens, target: ex.target, path: ex.path, scene: cfg.scene });
        else renderSide();
      });
      els.focus.innerHTML = FOCUS.map((f) => '<button class="chip chip-math" data-focus="' + f.id + '">' + f.html + '</button>').join('');
      els.focus.addEventListener('click', (e) => {
        const b = e.target.closest('[data-focus]');
        if (!b) return;
        const id = b.dataset.focus;
        if (cfg.focus.has(id)) cfg.focus.delete(id); else cfg.focus.add(id);
        renderSide();
      });
      els.steps.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { cfg.steps = Number(b.dataset.v); renderSide(); } });
      els.nums.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { cfg.nums = b.dataset.v; renderSide(); } });
      els.randPos.addEventListener('change', () => { cfg.randPos = els.randPos.checked; });
      document.getElementById('ex-generate').addEventListener('click', onGenerate);
      document.getElementById('ex-apply').addEventListener('click', onCustom);
      document.getElementById('ex-use-lab').addEventListener('click', () => {
        useT = triFrom(RM.state.a, RM.state.m);
        els.cmsg.textContent = 'Triângulo do Laboratório carregado (a = ' + F(useT.a) + ', m = ' + F(useT.m) + '). Marque os dados e o que se pede e toque em Resolver este.';
      });
      els.custom.innerHTML = VARS.map((v) =>
        '<div class="cv-row"><span class="cv-name"><i>' + v + '</i> <small>' + SEG[v] + '</small></span>' +
        '<div class="seg seg-sm">' +
        '<button data-cv="' + v + '" data-role="none">—</button>' +
        '<button data-cv="' + v + '" data-role="given">Dado</button>' +
        '<button data-cv="' + v + '" data-role="target">Pedido</button></div></div>').join('');
      els.custom.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cv]');
        if (!b) return;
        const v = b.dataset.cv, role = b.dataset.role;
        if (role === 'target') VARS.forEach((w) => { if (custom[w] === 'target') delete custom[w]; });
        if (role === 'none') delete custom[v]; else custom[v] = role;
        renderSide();
      });
      document.querySelectorAll('[data-exlayer]').forEach((b) => b.addEventListener('click', () => {
        layers[b.dataset.exlayer] = !layers[b.dataset.exlayer];
        render(); renderSide();
      }));
      els.prev.addEventListener('click', () => go(-1));
      document.getElementById('ex-replay').addEventListener('click', () => {
        if (!ex || ex.cur === 0) return;
        ex.cur -= 1; showStep(0);   // estado anterior, sem animar
        ex.cur += 1; showStep(1);   // refaz só este movimento
      });
      els.next.addEventListener('click', () => go(1));
      document.getElementById('ex-all').addEventListener('click', () => { if (ex) go(ex.sol.length); });
      document.getElementById('ex-restart').addEventListener('click', () => { if (ex) go(-ex.sol.length); });
      els.dots.addEventListener('click', (e) => {
        const d = e.target.closest('[data-exstep]');
        if (d && ex) { const n = Number(d.dataset.exstep); go(n - ex.cur); }
      });
      document.getElementById('ex-copy').addEventListener('click', () => {
        if (!ex) return;
        const txt = statement(ex).replace(/<[^>]+>/g, '');
        const msg = document.getElementById('ex-copy-msg');
        try {
          navigator.clipboard.writeText(txt).then(() => { msg.textContent = 'Enunciado copiado.'; }, () => { msg.textContent = 'Selecione o texto e copie.'; });
        } catch (err) { msg.textContent = 'Selecione o texto e copie.'; }
      });

      RM.on((changed) => {
        if (['rot', 'mirror', 'pose'].some((k) => changed.includes(k))) rebuild();
        if (['rot', 'mirror', 'pose', 'font', 'unit', 'dec'].some((k) => changed.includes(k))) { render(); renderSide(); }
      });

      // Começa com um exemplo pronto: h² = m·n, um passo
      cfg.focus.add('h2');
      onGenerate();
    },
    render() { render(); },
    /* Exercício atual em forma de texto para o link: Xcena_a_m_dados_pedido_método_passo */
    token() {
      if (!ex || !ex.sol) return null;
      const r = (v) => String(Math.round(v * 1e6) / 1e6);
      return 'X' + (ex.scene || 'none') + '_' + r(ex.t.a) + '_' + r(ex.t.m) + '_' + ex.givens.join('') + '_' + ex.target + '_' + cfg.method + '_' + ex.cur;
    },
    loadToken(tok) {
      const mt = /^X([a-z]+)_([\d.]+)_([\d.]+)_([abchmn]+)_([abchmn])_(sim|formula|both)_(\d+)$/.exec(tok || '');
      if (!mt) return false;
      const scene = mt[1] === 'none' || RM.scenes.SCENES[mt[1]] ? mt[1] : 'none';
      const a = parseFloat(mt[2]), m = parseFloat(mt[3]);
      if (!(a > 0 && m > 0 && m < a)) return false;
      const givens = mt[4].split('').filter((v, k, arr) => arr.indexOf(v) === k);
      const target = mt[5];
      if (givens.includes(target)) return false;
      const path = solvePath(givens, target, SIM_ORDER);
      if (!path) return false;
      cfg.scene = scene;
      cfg.method = mt[6];
      VARS.forEach((v) => { delete custom[v]; });
      givens.forEach((v) => { custom[v] = 'given'; });
      custom[target] = 'target';
      load({ t: triFrom(a, m), givens, target, path, scene });
      ex.cur = RM.clamp(parseInt(mt[7], 10), 0, ex.sol.length - 1);
      renderSide();
      showStep(0);
      return true;
    },
    next() { go(1); },
    prev() { go(-1); },
  };
})();
