// Utilitários compartilhados pela interface (painéis e telas)
(() => {
  const OD = (window.OD = window.OD || {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = (n) => Math.round(n).toLocaleString('pt-BR');

  function label(key) {
    const L = OD.CONFIG.statLabels[key];
    return L ? L.label : key;
  }

  // formata o valor de um atributo conforme CONFIG.statLabels
  function fmt(key, value) {
    const L = OD.CONFIG.statLabels[key] || {};
    if (L.percent) return Math.round(value * 100) + '%';
    if (L.floor) value = Math.floor(value);
    const text = value.toFixed(L.decimals || 0).replace('.', ',');
    return (L.prefix || '') + text + (L.unit || '');
  }

  const pct = (v) => Math.round(v * 100) + '%';
  const coin = (cost) => `<span class="cost"><i class="coin"></i>${num(cost)}</span>`;
  const core = (cost) => `<span class="cost core-cost"><i class="core"></i>${num(cost)}</span>`;

  // desenha o sprite do manifesto num canvas pequeno (ícones)
  function drawIcon(canvas, key, frame = 0, rot = -Math.PI / 4) {
    const s = OD.Sprites.entries[key];
    if (!s) return;
    const img = s.frames[Math.min(frame, s.frames.length - 1)];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = canvas.clientWidth || 32;
    canvas.width = canvas.height = Math.round(css * dpr);
    const ctx = canvas.getContext('2d');
    const k = canvas.width / (s.w * 0.7);
    ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2);
    ctx.rotate(rot + s.angle);
    ctx.drawImage(img, -s.w / 2, -s.h / 2, s.w, s.h);
  }

  // desenha todos os <canvas data-icon> dentro de um elemento
  function drawIcons(root) {
    root.querySelectorAll('canvas[data-icon]').forEach((c) => drawIcon(c, c.dataset.icon, Number(c.dataset.frame || 0)));
  }

  // linha de melhoria: nome, nível, texto e botão de compra
  function upRow({ name, level, text, cost, action, id, extra = '', max = false, currency = 'coin', disabled = false }) {
    const lv = level != null ? ` <small>Nv ${level}</small>` : '';
    const price = currency === 'core' ? core(cost) : coin(cost);
    const btn = max
      ? '<button class="btn small" disabled>MÁX</button>'
      : `<button class="btn small primary" data-action="${action}" data-id="${id}" ${currency === 'coin' ? `data-cost="${cost}"` : ''} ${disabled ? 'disabled' : ''}>${price}</button>`;
    return `<div class="up-row"><div class="up-info"><b>${esc(name)}${lv}</b><span>${text}</span>${extra}</div>${btn}</div>`;
  }

  OD.ui = { esc, num, label, fmt, pct, coin, core, drawIcon, drawIcons, upRow };
  OD.drawIcon = drawIcon;
})();
