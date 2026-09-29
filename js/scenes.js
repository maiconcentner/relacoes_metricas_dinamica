/* Cenas das aplicações: o triângulo retângulo escondido em situações reais.
   Cada cena é desenhada com vetores do próprio triângulo, então gira junto com ele. */
(function () {
  'use strict';
  const RM = window.RM;
  const D = RM.draw;

  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const mul = (p, k) => [p[0] * k, p[1] * k];
  const unit = (p) => { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; };
  const perp = (p) => [-p[1], p[0]];

  /* Geometria básica, em coordenadas do triângulo (B na origem, BC no eixo x). */
  function geo(t) {
    const B = [0, 0], C = [t.a, 0], A = [t.m, t.h], H = [t.m, 0];
    return { t, A, B, C, H, a: t.a, along: [1, 0], down: [0, -1] };
  }

  const poly = (S, pts, style) => D.poly(pts.map(S), 'style="' + style + '"');
  const line = (S, p, q, style) => D.line(S(p), S(q), 'style="' + style + '"');

  /* Barra "grossa" entre p e q (madeira, cabo, trilho). */
  function bar(S, p, q, w, fill, stroke) {
    const n = mul(unit(perp(sub(q, p))), w / 2);
    return poly(S, [add(p, n), add(q, n), sub(q, n), sub(p, n)], 'fill:' + fill + ';stroke:' + (stroke || 'none') + ';stroke-width:1.2');
  }

  const SCENES = {
    telhado: {
      name: 'Telhado',
      unit: 'm',
      maxA: 16,
      intro: 'O telhado de uma casa tem dois caibros, AB e AC, que formam um ângulo reto no topo A. A viga BC é horizontal e o pontalete AH liga o topo à viga, perpendicular a ela.',
      nouns: {
        a: ['a viga BC', 'da viga BC'], b: ['o caibro AC', 'do caibro AC'], c: ['o caibro AB', 'do caibro AB'],
        h: ['o pontalete AH', 'do pontalete AH'], m: ['o trecho BH da viga', 'do trecho BH da viga'], n: ['o trecho HC da viga', 'do trecho HC da viga'],
      },
      orient: () => ({ rot: 0, mirror: false }),
      extent(g) {
        const wh = g.a * 0.42;
        return [add(g.B, [-g.a * 0.12, -wh - g.a * 0.04]), add(g.C, [g.a * 0.12, -wh - g.a * 0.04])];
      },
      draw(g, S) {
        const a = g.a, wh = a * 0.42, d = g.down;
        let o = '';
        // chão
        o += poly(S, [add(g.B, [-a * 0.12, -wh]), add(g.C, [a * 0.12, -wh]), add(g.C, [a * 0.12, -wh - a * 0.04]), add(g.B, [-a * 0.12, -wh - a * 0.04])], 'fill:var(--scene-ground);stroke:none');
        // paredes
        const w0 = add(g.B, [a * 0.04, 0]), w1 = add(g.C, [-a * 0.04, 0]);
        o += poly(S, [w0, w1, add(w1, mul(d, wh)), add(w0, mul(d, wh))], 'fill:var(--scene-wall);stroke:var(--scene-line);stroke-width:1.5');
        // porta e janelas
        const door = a * 0.14;
        const dx = g.B[0] + a * 0.62;
        o += poly(S, [[dx, -wh], [dx + door, -wh], [dx + door, -wh + door * 1.6], [dx, -wh + door * 1.6]], 'fill:var(--scene-wood);stroke:var(--scene-line);stroke-width:1.2');
        const wx = g.B[0] + a * 0.18, ws = a * 0.13;
        o += poly(S, [[wx, -wh * 0.35], [wx + ws, -wh * 0.35], [wx + ws, -wh * 0.35 - ws], [wx, -wh * 0.35 - ws]], 'fill:var(--scene-sky);stroke:var(--scene-line);stroke-width:1.2');
        // telhado (área) e madeiramento
        o += poly(S, [g.A, g.B, g.C], 'fill:var(--scene-roof);stroke:none');
        const tw = a * 0.022;
        o += bar(S, add(g.B, [-a * 0.03, 0]), add(g.C, [a * 0.03, 0]), tw, 'var(--scene-wood)', 'var(--scene-line)');
        o += bar(S, g.A, g.H, tw * 0.8, 'var(--scene-wood)', 'var(--scene-line)');
        o += bar(S, g.A, g.B, tw, 'var(--scene-wood)', 'var(--scene-line)');
        o += bar(S, g.A, g.C, tw, 'var(--scene-wood)', 'var(--scene-line)');
        return o;
      },
    },

    torre: {
      name: 'Torre com cabos',
      unit: 'm',
      intro: 'Uma torre vertical AH é sustentada por dois cabos, AB e AC, presos no alto da torre e em âncoras no chão. Os dois cabos formam um ângulo reto em A.',
      nouns: {
        a: ['a distância BC entre as âncoras', 'da distância BC entre as âncoras'], b: ['o cabo AC', 'do cabo AC'], c: ['o cabo AB', 'do cabo AB'],
        h: ['a altura AH da torre', 'da altura AH da torre'], m: ['a distância BH', 'da distância BH'], n: ['a distância HC', 'da distância HC'],
      },
      orient: () => ({ rot: 0, mirror: false }),
      extent(g) { return [add(g.B, [-g.a * 0.2, -g.a * 0.08]), add(g.C, [g.a * 0.2, -g.a * 0.08]), add(g.A, [0, g.a * 0.08])]; },
      draw(g, S) {
        const a = g.a;
        let o = '';
        o += poly(S, [add(g.B, [-a * 0.2, 0]), add(g.C, [a * 0.2, 0]), add(g.C, [a * 0.2, -a * 0.07]), add(g.B, [-a * 0.2, -a * 0.07])], 'fill:var(--scene-ground);stroke:none');
        o += line(S, add(g.B, [-a * 0.2, 0]), add(g.C, [a * 0.2, 0]), 'stroke:var(--scene-line);stroke-width:2');
        // torre treliçada
        const w = a * 0.018, top = add(g.A, [0, a * 0.05]);
        const L = [g.H[0] - w, 0], R = [g.H[0] + w, 0];
        o += line(S, L, [L[0], top[1]], 'stroke:var(--scene-steel);stroke-width:3');
        o += line(S, R, [R[0], top[1]], 'stroke:var(--scene-steel);stroke-width:3');
        const nz = 10;
        for (let k = 0; k < nz; k++) {
          const y0 = (top[1] * k) / nz, y1 = (top[1] * (k + 1)) / nz;
          o += line(S, [k % 2 ? L[0] : R[0], y0], [k % 2 ? R[0] : L[0], y1], 'stroke:var(--scene-steel);stroke-width:1.4');
        }
        o += '<circle cx="' + S(top)[0] + '" cy="' + S(top)[1] + '" r="6" style="fill:#e0443a"/>';
        // cabos e âncoras
        o += line(S, g.A, g.B, 'stroke:var(--scene-line);stroke-width:2.2');
        o += line(S, g.A, g.C, 'stroke:var(--scene-line);stroke-width:2.2');
        [g.B, g.C].forEach((p) => { o += poly(S, [add(p, [-a * 0.02, 0]), add(p, [a * 0.02, 0]), add(p, [a * 0.02, -a * 0.025]), add(p, [-a * 0.02, -a * 0.025])], 'fill:var(--scene-steel);stroke:none'); });
        return o;
      },
    },

    praca: {
      name: 'Praça',
      unit: 'm',
      intro: 'Uma praça tem a forma de um triângulo retângulo ABC, com ângulo reto no canto A. O lado BC fica junto a uma avenida. Vai ser construído o caminho mais curto do canto A até a avenida: o caminho AH, perpendicular a BC.',
      nouns: {
        a: ['o lado BC, junto à avenida', 'do lado BC, junto à avenida'], b: ['o lado AC', 'do lado AC'], c: ['o lado AB', 'do lado AB'],
        h: ['o caminho AH', 'do caminho AH'], m: ['o trecho BH', 'do trecho BH'], n: ['o trecho HC', 'do trecho HC'],
      },
      orient: () => ({ rot: 0, mirror: false }),
      extent(g) { return [add(g.B, [-g.a * 0.15, -g.a * 0.16]), add(g.C, [g.a * 0.15, -g.a * 0.16])]; },
      draw(g, S) {
        const a = g.a;
        let o = '';
        // avenida
        const r0 = [-a * 0.15, -a * 0.02], r1 = [a * 1.15, -a * 0.02], rw = a * 0.12;
        o += poly(S, [r0, r1, add(r1, [0, -rw]), add(r0, [0, -rw])], 'fill:var(--scene-road);stroke:none');
        o += line(S, add(r0, [0, -rw / 2]), add(r1, [0, -rw / 2]), 'stroke:#f4f1e6;stroke-width:2.5;stroke-dasharray:14 12');
        const lab = S([a * 0.5, -a * 0.02 - rw * 0.78]);
        o += '<text x="' + lab[0] + '" y="' + lab[1] + '" text-anchor="middle" font-size="' + D.fs(18) + '" style="fill:#f4f1e6;font-weight:700;letter-spacing:.2em">AVENIDA</text>';
        // gramado
        o += poly(S, [g.A, g.B, g.C], 'fill:var(--scene-ground);stroke:none');
        // caminho
        o += bar(S, g.A, g.H, a * 0.03, 'var(--scene-path)', 'none');
        // árvores
        const tree = (p, r) => { const q = S(p); return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + r + '" style="fill:var(--scene-tree);stroke:var(--scene-line);stroke-width:1"/>'; };
        const G = [(g.A[0] + g.B[0] + g.C[0]) / 3, (g.A[1] + g.B[1] + g.C[1]) / 3];
        o += tree(add(G, [-a * 0.16, 0]), 13) + tree(add(G, [a * 0.2, -a * 0.01]), 16) + tree(add(G, [a * 0.33, a * 0.03]), 11) + tree(add(G, [-a * 0.28, -a * 0.05]), 10);
        return o;
      },
    },

    escada: {
      name: 'Escada com escora',
      unit: 'm',
      maxA: 13,
      intro: 'Uma escada BC está apoiada numa parede: o pé B fica no chão e o topo C encosta na parede. O chão e a parede formam um ângulo reto no canto A. Para reforçar, uma escora AH liga o canto A à escada, perpendicular a ela.',
      nouns: {
        a: ['a escada BC', 'da escada BC'], b: ['a altura AC do topo da escada', 'da altura AC do topo da escada'],
        c: ['a distância AB do pé da escada até a parede', 'da distância AB do pé da escada até a parede'],
        h: ['a escora AH', 'da escora AH'], m: ['o trecho BH da escada', 'do trecho BH da escada'], n: ['o trecho HC da escada', 'do trecho HC da escada'],
      },
      orient: (t) => ({ rot: RM.standingRot({ a: t.a, m: t.m, mirror: false }), mirror: false }),
      extent(g) {
        const u = unit(sub(g.C, g.A)), f = unit(sub(g.B, g.A)), a = g.a;
        return [add(g.C, mul(u, a * 0.15)), sub(g.A, mul(f, a * 0.14)), add(g.B, mul(f, a * 0.15)), sub(g.A, mul(u, a * 0.07))];
      },
      draw(g, S) {
        const a = g.a;
        const u = unit(sub(g.C, g.A)), f = unit(sub(g.B, g.A));
        const wallTop = add(g.C, mul(u, a * 0.15)), wt = a * 0.12;
        let o = '';
        // parede de tijolos
        const W0 = sub(g.A, mul(u, a * 0.06)), W1 = wallTop;
        o += poly(S, [W0, W1, sub(W1, mul(f, wt)), sub(W0, mul(f, wt))], 'fill:var(--scene-brick);stroke:var(--scene-line);stroke-width:1.2');
        const rows = 14, len = Math.hypot(...sub(W1, W0));
        for (let k = 1; k < rows; k++) {
          const p = add(W0, mul(u, (len * k) / rows));
          o += line(S, p, sub(p, mul(f, wt)), 'stroke:var(--scene-mortar);stroke-width:1');
          const off = k % 2 ? 0.5 : 0.25;
          const q = add(p, mul(u, len / rows / 2));
          o += line(S, sub(p, mul(f, wt * off)), sub(q, mul(f, wt * off)), 'stroke:var(--scene-mortar);stroke-width:1');
        }
        // chão
        const F0 = sub(g.A, mul(f, wt)), F1 = add(g.B, mul(f, a * 0.15));
        o += poly(S, [F0, F1, sub(F1, mul(u, a * 0.06)), sub(F0, mul(u, a * 0.06))], 'fill:var(--scene-ground);stroke:none');
        // escada: dois trilhos e degraus
        const along = unit(sub(g.C, g.B));
        const side = mul(unit(perp(along)), a * 0.025);
        const Bs = add(g.B, mul(along, -a * 0.01)), Cs = add(g.C, mul(along, a * 0.03));
        const nr = 12;
        for (let k = 1; k < nr; k++) {
          const p = add(Bs, mul(sub(Cs, Bs), k / nr));
          o += line(S, add(p, side), sub(p, side), 'stroke:var(--scene-wood);stroke-width:3');
        }
        o += bar(S, add(Bs, side), add(Cs, side), a * 0.012, 'var(--scene-wood)', 'var(--scene-line)');
        o += bar(S, sub(Bs, side), sub(Cs, side), a * 0.012, 'var(--scene-wood)', 'var(--scene-line)');
        // escora
        o += bar(S, g.A, g.H, a * 0.018, 'var(--scene-steel)', 'var(--scene-line)');
        return o;
      },
    },
  };

  RM.scenes = { SCENES, geo };
})();
