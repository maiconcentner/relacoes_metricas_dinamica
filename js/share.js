/* Compartilhar: endereço do site, cenários salvos e QR code para a turma. */
(function () {
  'use strict';
  const RM = window.RM;
  const $ = (id) => document.getElementById(id);

  const PAGES_URL = 'https://maiconcentner.github.io/relacoes_metricas_dinamica/';
  const KEY_BASE = 'relacoes-metricas:site';
  const KEY_SCEN = 'relacoes-metricas:cenarios';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
  };

  /* Endereço que os alunos vão abrir: o GitHub Pages (a prévia é privada). */
  function siteBase() {
    const saved = store.get(KEY_BASE, '');
    if (saved) return saved;
    if (/github\.io$/.test(location.hostname)) return location.href.split('#')[0];
    return PAGES_URL;
  }
  function url() { return siteBase() + '#' + RM.encodeHash(); }

  /* Aplica um link salvo (estado + exercício). */
  function applyHash(hash) {
    const h = RM.decodeHash('#' + hash);
    if (!h) return;
    const tok = h.exercise;
    delete h.exercise;
    RM.set(h);
    if (tok && RM.exe) RM.exe.loadToken(tok);
  }

  /* ---------- Cenários ---------- */
  const VIEW_NAME = { lab: 'Laboratório', sem: 'Semelhança', ded: 'Deduções', exe: 'Exercício' };
  function suggestName() {
    const s = RM.state;
    return VIEW_NAME[s.view] + ' · a = ' + RM.fmt(s.a) + ', m = ' + RM.fmt(s.m);
  }
  function renderList() {
    const list = store.get(KEY_SCEN, []);
    const el = $('sc-list');
    if (!list.length) {
      el.innerHTML = '<li class="note">Nenhum cenário salvo ainda.</li>';
      return;
    }
    el.innerHTML = list.map((c, i) =>
      '<li class="sc-item"><button class="sc-open" data-open="' + i + '"><b>' + RM.draw.esc(c.name) + '</b><span>' + c.date + '</span></button>' +
      '<button class="icon-btn sc-del" data-del="' + i + '" aria-label="Excluir ' + RM.draw.esc(c.name) + '" title="Excluir">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button></li>').join('');
  }
  function save() {
    const name = ($('sc-name').value || '').trim() || suggestName();
    const list = store.get(KEY_SCEN, []);
    const d = new Date();
    list.unshift({ name, hash: RM.encodeHash(), date: d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
    store.set(KEY_SCEN, list.slice(0, 50));
    $('sc-name').value = '';
    $('sc-msg').textContent = 'Cenário "' + name + '" salvo.';
    renderList();
  }

  /* ---------- QR code ---------- */
  function showQR() {
    const link = url();
    const box = $('qr-box');
    if (typeof window.qrcode !== 'function') {
      box.innerHTML = '<p class="note">Não foi possível gerar o QR code.</p>';
    } else {
      const qr = window.qrcode(0, 'M');
      qr.addData(link);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    }
    $('qr-url').textContent = link;
    $('qr-dialog').hidden = false;
    $('scrim').hidden = false;
    $('qr-close').focus();
  }
  function closeQR() {
    $('qr-dialog').hidden = true;
    $('scrim').hidden = $('panel').hidden && $('img-dialog').hidden;
  }

  RM.share = {
    url,
    applyHash,
    init() {
      $('site-base').value = siteBase();
      $('site-base').addEventListener('change', (e) => {
        const v = e.target.value.trim();
        store.set(KEY_BASE, v ? (v.includes('#') ? v.split('#')[0] : v) : '');
        $('site-base').value = siteBase();
        $('share-url').value = url();
      });
      $('sc-save').addEventListener('click', save);
      $('sc-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      $('sc-list').addEventListener('click', (e) => {
        const o = e.target.closest('[data-open]');
        const d = e.target.closest('[data-del]');
        const list = store.get(KEY_SCEN, []);
        if (o) {
          const c = list[Number(o.dataset.open)];
          if (c) { applyHash(c.hash); $('sc-msg').textContent = 'Cenário "' + c.name + '" aberto.'; }
        } else if (d) {
          const idx = Number(d.dataset.del);
          // Excluir pede um segundo toque (confirmação dentro da página)
          if (d.dataset.armed) {
            const [removed] = list.splice(idx, 1);
            store.set(KEY_SCEN, list);
            $('sc-msg').textContent = 'Cenário "' + removed.name + '" excluído.';
            renderList();
          } else {
            d.dataset.armed = '1';
            d.classList.add('armed');
            d.title = 'Toque de novo para excluir';
            $('sc-msg').textContent = 'Toque de novo na lixeira para excluir "' + list[idx].name + '".';
          }
        }
      });
      $('btn-qr').addEventListener('click', showQR);
      $('qr-close').addEventListener('click', closeQR);
      $('scrim').addEventListener('click', closeQR);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('qr-dialog').hidden) closeQR(); });
      renderList();
    },
    refresh() { $('share-url').value = url(); renderList(); },
  };
})();
