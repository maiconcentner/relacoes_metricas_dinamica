/* Copiar a figura atual como imagem PNG (fundo branco, cores do tema claro, recorte justo). */
(function () {
  'use strict';
  const RM = window.RM;

  const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset',
    'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-style', 'font-weight',
    'letter-spacing', 'paint-order', 'text-anchor', 'dominant-baseline'];
  const SVG_IDS = { lab: 'lab-svg', sem: 'sem-svg', ded: 'ded-svg', exe: 'exe-svg' };

  /* Copia os estilos calculados (com as cores já resolvidas) para atributos do clone. */
  function inlineStyles(src, dst) {
    const cs = getComputedStyle(src);
    let style = '';
    PROPS.forEach((p) => {
      const v = cs.getPropertyValue(p);
      if (v) style += p + ':' + v + ';';
    });
    dst.setAttribute('style', style);
    dst.removeAttribute('class');
    for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
  }

  /* Caixa do que está visível (ignora camadas transparentes). */
  function visibleBox(svg) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const visit = (el) => {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) return;
      if (el.hasAttribute('data-handle') || el.hasAttribute('data-noexport')) return;
      if (el.tagName === 'g') { Array.from(el.children).forEach(visit); return; }
      try {
        const b = el.getBBox();
        if (!b.width && !b.height) return;
        const sw = parseFloat(getComputedStyle(el).strokeWidth) || 0;
        x0 = Math.min(x0, b.x - sw); y0 = Math.min(y0, b.y - sw);
        x1 = Math.max(x1, b.x + b.width + sw); y1 = Math.max(y1, b.y + b.height + sw);
      } catch (e) { /* elemento sem caixa */ }
    };
    Array.from(svg.children).forEach(visit);
    if (!isFinite(x0)) return { x: 0, y: 0, w: 1000, h: 620 };
    const pad = 16;
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  }

  function svgToPngBlob() {
    const svg = document.getElementById(SVG_IDS[RM.state.view]);
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light'); // lista impressa: sempre cores claras
    let markup, box;
    try {
      box = visibleBox(svg);
      const clone = svg.cloneNode(true);
      inlineStyles(svg, clone);
      // Alças de arraste e avisos de tela não vão para a imagem
      clone.querySelectorAll('[data-handle], [data-noexport]').forEach((n) => n.remove());
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('viewBox', box.x + ' ' + box.y + ' ' + box.w + ' ' + box.h);
      clone.setAttribute('width', box.w);
      clone.setAttribute('height', box.h);
      clone.removeAttribute('style');
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', box.x); bg.setAttribute('y', box.y);
      bg.setAttribute('width', box.w); bg.setAttribute('height', box.h);
      bg.setAttribute('fill', '#ffffff');
      clone.insertBefore(bg, clone.firstChild);
      markup = new XMLSerializer().serializeToString(clone);
    } finally {
      if (prevTheme) root.setAttribute('data-theme', prevTheme); else root.removeAttribute('data-theme');
    }
    const scale = 2;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(box.w * scale); c.height = Math.round(box.h * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
      };
      img.onerror = () => reject(new Error('svg'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    });
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 3200);
  }

  /* Plano B: mostra a imagem para copiar com o botão direito ou baixar. */
  function showFallback(blob) {
    const url = URL.createObjectURL(blob);
    const dlg = document.getElementById('img-dialog');
    document.getElementById('img-preview').src = url;
    const a = document.getElementById('img-download');
    a.href = url;
    a.download = 'figura-relacoes-metricas.png';
    dlg.hidden = false;
    document.getElementById('scrim').hidden = false;
    document.getElementById('img-close').focus();
  }

  function copyFigure() {
    const pngPromise = svgToPngBlob();
    let done = false;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })]).then(() => {
          done = true;
          toast('Imagem copiada. Cole na sua lista com Ctrl+V.');
        }, () => pngPromise.then(showFallback));
        return;
      }
    } catch (e) { /* sem suporte: plano B */ }
    if (!done) pngPromise.then(showFallback, () => toast('Não foi possível gerar a imagem neste navegador.'));
  }

  RM.exportFig = {
    init() {
      document.getElementById('btn-copy-img').addEventListener('click', copyFigure);
      const close = () => {
        document.getElementById('img-dialog').hidden = true;
        document.getElementById('scrim').hidden = document.getElementById('panel').hidden;
      };
      document.getElementById('img-close').addEventListener('click', close);
      document.getElementById('scrim').addEventListener('click', close);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    },
    copyFigure,
  };
})();
