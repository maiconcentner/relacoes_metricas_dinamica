/* Desenho em SVG (coordenadas de tela, y para baixo). Gera strings de marcação. */
(function () {
  'use strict';
  const D = (window.RM.draw = {});

  const f = (x) => Math.round(x * 10) / 10;
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const len = (v) => Math.hypot(v[0], v[1]);
  const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  D.sub = sub; D.len = len; D.unit = unit;

  /* Tamanho de fonte no SVG: ajuste do professor x compensação para telas estreitas. */
  D.screenBoost = 1;
  D.fs = function (base) { return f(base * (window.RM.state.font || 1) * D.screenBoost); };

  D.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  D.poly = function (pts, attrs) {
    return '<polygon points="' + pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ') + '" ' + (attrs || '') + '/>';
  };
  D.line = function (p, q, attrs) {
    return '<line x1="' + f(p[0]) + '" y1="' + f(p[1]) + '" x2="' + f(q[0]) + '" y2="' + f(q[1]) + '" ' + (attrs || '') + '/>';
  };
  D.text = function (p, str, attrs) {
    return '<text x="' + f(p[0]) + '" y="' + f(p[1]) + '" text-anchor="middle" dominant-baseline="central" ' +
      (attrs || '') + '>' + str + '</text>';
  };

  /* Arco de ângulo no vértice V entre as direções de P e Q. */
  D.angleArc = function (V, P, Q, r, color, label, fontSize) {
    const u = unit(sub(P, V));
    const w = unit(sub(Q, V));
    const s = [V[0] + r * u[0], V[1] + r * u[1]];
    const e = [V[0] + r * w[0], V[1] + r * w[1]];
    const cross = u[0] * w[1] - u[1] * w[0];
    const sweep = cross > 0 ? 1 : 0;
    let out = '<path d="M' + f(V[0]) + ',' + f(V[1]) + ' L' + f(s[0]) + ',' + f(s[1]) +
      ' A' + r + ',' + r + ' 0 0 ' + sweep + ' ' + f(e[0]) + ',' + f(e[1]) + ' Z" style="fill:' + color + ';fill-opacity:0.2;stroke:' + color + ';stroke-width:2.2"/>';
    if (label) {
      const bis = unit([u[0] + w[0], u[1] + w[1]]);
      const lp = [V[0] + (r + fontSize * 0.7) * bis[0], V[1] + (r + fontSize * 0.7) * bis[1]];
      out += D.text(lp, label, 'class="alabel" font-size="' + fontSize + '" style="fill:' + color + '"');
    }
    return out;
  };

  /* Marca de ângulo reto no vértice V. */
  D.rightMark = function (V, P, Q, size, color) {
    const u = unit(sub(P, V));
    const w = unit(sub(Q, V));
    const a = [V[0] + size * u[0], V[1] + size * u[1]];
    const b = [a[0] + size * w[0], a[1] + size * w[1]];
    const c = [V[0] + size * w[0], V[1] + size * w[1]];
    return '<path d="M' + f(a[0]) + ',' + f(a[1]) + ' L' + f(b[0]) + ',' + f(b[1]) + ' L' + f(c[0]) + ',' + f(c[1]) +
      '" style="fill:none;stroke:' + color + ';stroke-width:2"/>';
  };

  /* Posição do rótulo de um lado PQ, afastado do vértice oposto R. */
  D.sideLabelPos = function (P, Q, R, offset) {
    const M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    const d = unit(sub(Q, P));
    let nrm = [-d[1], d[0]];
    const toR = sub(R, M);
    if (nrm[0] * toR[0] + nrm[1] * toR[1] > 0) nrm = [-nrm[0], -nrm[1]];
    return [M[0] + offset * nrm[0], M[1] + offset * nrm[1]];
  };

  /* Posição do rótulo de um vértice, afastado do centro do triângulo. */
  D.vertexLabelPos = function (V, G, offset) {
    const d = unit(sub(V, G));
    return [V[0] + offset * d[0], V[1] + offset * d[1]];
  };

  /* Cota (linha de medida) abaixo de um segmento horizontal. */
  D.dimension = function (P, Q, dy, label, color, fontSize) {
    const y = P[1] + dy;
    const tick = 7;
    let out = '<g style="stroke:' + color + ';stroke-width:1.6;fill:none">';
    out += D.line([P[0], y], [Q[0], y]);
    out += D.line([P[0], y - tick], [P[0], y + tick]);
    out += D.line([Q[0], y - tick], [Q[0], y + tick]);
    out += '</g>';
    if (label) out += label([(P[0] + Q[0]) / 2, y + fontSize * 0.75]);
    return out;
  };

  /* Malha quadriculada adaptativa. */
  D.grid = function (x0, y0, k, w, h) {
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    let st = steps[steps.length - 1];
    for (let i = 0; i < steps.length; i++) { if (steps[i] * k >= 22) { st = steps[i]; break; } }
    const px = st * k;
    let out = '<g style="stroke:var(--grid);stroke-width:1">';
    for (let x = x0 % px; x <= w; x += px) out += '<line x1="' + f(x) + '" y1="0" x2="' + f(x) + '" y2="' + h + '"/>';
    for (let y = y0 % px; y <= h; y += px) out += '<line x1="0" y1="' + f(y) + '" x2="' + w + '" y2="' + f(y) + '"/>';
    out += '</g>';
    return { svg: out, step: st };
  };
})();
