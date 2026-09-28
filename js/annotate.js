/* Anotar na tela: caneta, marca-texto e apontador laser por cima da figura de cada aba. */
(function () {
  'use strict';
  const RM = window.RM;

  const PEN = { red: '#e03131', blue: '#1c7ed6', green: '#2f9e44' };
  const HL = '#ffd43b';
  const LASER_MS = 650;

  let tool = 'none';       // 'none' | 'pen' | 'hl' | 'laser'
  let color = 'red';
  let open = false;
  const layers = {};       // aba -> { canvas, strokes }
  let drawing = null;      // traço em andamento
  let laser = [];          // pontos do laser { x, y, t } (normalizados)
  let raf = 0;

  const $ = (id) => document.getElementById(id);

  function host(view) { return document.querySelector('#view-' + (view || RM.state.view) + ' .stage-wrap'); }

  function layer(view) {
    const v = view || RM.state.view;
    if (!layers[v]) {
      const h = host(v);
      if (!h) return null;
      const c = document.createElement('canvas');
      c.className = 'annot';
      c.setAttribute('aria-hidden', 'true');
      h.appendChild(c);
      layers[v] = { canvas: c, strokes: [] };
      bindCanvas(c);
      if (window.ResizeObserver) new ResizeObserver(() => size(layers[v])).observe(h);
      size(layers[v]);
    }
    return layers[v];
  }

  function size(L) {
    const r = L.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (L.canvas.width !== w || L.canvas.height !== h) { L.canvas.width = w; L.canvas.height = h; }
    redraw(L);
  }

  function drawStroke(ctx, s, W, H) {
    if (s.pts.length < 1) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const scale = W / 1000; // espessura acompanha o tamanho da figura
    if (s.tool === 'hl') { ctx.globalAlpha = 0.38; ctx.strokeStyle = HL; ctx.lineWidth = 22 * scale; }
    else { ctx.strokeStyle = PEN[s.color] || PEN.red; ctx.lineWidth = 4 * scale; }
    ctx.beginPath();
    s.pts.forEach((p, k) => { const x = p[0] * W, y = p[1] * W; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * W + 0.1, s.pts[0][1] * W);
    ctx.stroke();
    ctx.restore();
  }

  function redraw(L) {
    const ctx = L.canvas.getContext('2d');
    const W = L.canvas.width, H = L.canvas.height;
    ctx.clearRect(0, 0, W, H);
    L.strokes.forEach((s) => drawStroke(ctx, s, W, H));
    if (drawing && drawing.layer === L) drawStroke(ctx, drawing.stroke, W, H);
    if (L === layers[RM.state.view] && laser.length) drawLaser(ctx, W, H);
  }

  function drawLaser(ctx, W, H) {
    const now = performance.now();
    laser = laser.filter((p) => now - p.t < LASER_MS);
    const scale = W / 1000;
    ctx.save();
    ctx.lineCap = 'round';
    for (let k = 1; k < laser.length; k++) {
      const a = 1 - (now - laser[k].t) / LASER_MS;
      ctx.strokeStyle = 'rgba(255, 40, 40,' + (a * 0.8).toFixed(3) + ')';
      ctx.lineWidth = 7 * scale * a + 1;
      ctx.beginPath();
      ctx.moveTo(laser[k - 1].x * W, laser[k - 1].y * W);
      ctx.lineTo(laser[k].x * W, laser[k].y * W);
      ctx.stroke();
    }
    const last = laser[laser.length - 1];
    if (last && now - last.t < LASER_MS) {
      const x = last.x * W, y = last.y * W;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 16 * scale);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,40,40,1)');
      g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function laserLoop() {
    const L = layers[RM.state.view];
    if (L) redraw(L);
    if (laser.length) raf = requestAnimationFrame(laserLoop);
    else raf = 0;
  }

  function pos(canvas, evt) {
    const r = canvas.getBoundingClientRect();
    // As duas coordenadas divididas pela largura: a altura da área pode mudar sem deformar o desenho
    return [(evt.clientX - r.left) / r.width, (evt.clientY - r.top) / r.width];
  }

  function bindCanvas(c) {
    c.addEventListener('pointerdown', (evt) => {
      if (tool === 'none') return;
      evt.preventDefault();
      c.setPointerCapture(evt.pointerId);
      const L = layers[RM.state.view];
      const p = pos(c, evt);
      if (tool === 'laser') { addLaser(p); return; }
      drawing = { layer: L, stroke: { tool, color, pts: [p] } };
      redraw(L);
    });
    c.addEventListener('pointermove', (evt) => {
      if (tool === 'none') return;
      const p = pos(c, evt);
      if (tool === 'laser') {
        // Com mouse, o laser segue o ponteiro; no toque, enquanto o dedo estiver na tela
        if (evt.pointerType === 'mouse' || evt.buttons) addLaser(p);
        return;
      }
      if (!drawing) return;
      drawing.stroke.pts.push(p);
      redraw(drawing.layer);
    });
    const end = () => {
      if (!drawing) return;
      drawing.layer.strokes.push(drawing.stroke);
      const L = drawing.layer;
      drawing = null;
      redraw(L);
      sync();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  function addLaser(p) {
    laser.push({ x: p[0], y: p[1], t: performance.now() });
    if (!raf) raf = requestAnimationFrame(laserLoop);
  }

  function setTool(t) {
    tool = t;
    const L = open ? layer() : null;
    Object.keys(layers).forEach((v) => {
      layers[v].canvas.style.pointerEvents = tool !== 'none' && v === RM.state.view ? 'auto' : 'none';
      layers[v].canvas.style.cursor = tool === 'laser' ? 'none' : tool !== 'none' ? 'crosshair' : '';
    });
    if (L) size(L);
    sync();
  }

  function sync() {
    document.querySelectorAll('[data-atool]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.atool === tool));
    document.querySelectorAll('[data-acolor]').forEach((b) => b.setAttribute('aria-pressed', tool === 'pen' && b.dataset.acolor === color));
    const L = layers[RM.state.view];
    const has = !!(L && L.strokes.length);
    $('annot-undo').disabled = !has;
    $('annot-clear').disabled = !has;
    $('btn-annot').setAttribute('aria-pressed', open);
  }

  function setOpen(on) {
    open = on;
    $('annot-bar').hidden = !on;
    if (on) { layer(); setTool(tool === 'none' ? 'pen' : tool); }
    else setTool('none');
  }

  function undo() {
    const L = layers[RM.state.view];
    if (!L || !L.strokes.length) return;
    L.strokes.pop();
    redraw(L);
    sync();
  }
  function clear() {
    const L = layers[RM.state.view];
    if (!L) return;
    L.strokes = [];
    redraw(L);
    sync();
  }

  RM.annot = {
    init() {
      $('btn-annot').addEventListener('click', () => setOpen(!open));
      document.querySelectorAll('[data-atool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.atool)));
      document.querySelectorAll('[data-acolor]').forEach((b) => b.addEventListener('click', () => { color = b.dataset.acolor; setTool('pen'); }));
      $('annot-undo').addEventListener('click', undo);
      $('annot-clear').addEventListener('click', clear);
      $('annot-close').addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', (e) => {
        if (!open) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
        else if (e.key === 'Escape') setTool('none');
      });
      window.addEventListener('resize', () => { Object.keys(layers).forEach((v) => size(layers[v])); });
      RM.on((changed) => {
        if (changed.includes('view')) {
          laser = [];
          if (open) { layer(); setTool(tool); } else sync();
          const L = layers[RM.state.view];
          if (L) requestAnimationFrame(() => size(L));
        }
      });
      sync();
    },
    toggle() { setOpen(!open); },
    isOpen() { return open; },
  };
})();
