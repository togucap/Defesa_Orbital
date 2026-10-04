// Painel inferior contextual: desbloquear slot, escolher e construir
// defesa, ver atributos e bônus, melhorar, especializar e vender.
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
    const text = value.toFixed(L.decimals || 0).replace('.', ',');
    return (L.prefix || '') + text + (L.unit || '');
  }

  const coin = (cost) => `<span class="cost"><i class="coin"></i>${num(cost)}</span>`;

  // desenha o sprite do manifesto num canvas pequeno (ícones do painel)
  function drawIcon(canvas, key, frame = 0) {
    const s = OD.Sprites.entries[key];
    if (!s) return;
    const img = s.frames[Math.min(frame, s.frames.length - 1)];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = canvas.clientWidth || 32;
    canvas.width = canvas.height = Math.round(css * dpr);
    const ctx = canvas.getContext('2d');
    const k = canvas.width / (s.w * 0.7);
    ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 4 + s.angle);
    ctx.drawImage(img, -s.w / 2, -s.h / 2, s.w, s.h);
  }
  OD.drawIcon = drawIcon;

  const Panel = {
    init(app) {
      this.app = app;
      this.el = document.getElementById('panel');
      this.slot = null;
      this.choice = null;
      this.sellArmedUntil = 0;
      this.timer = 0;
      this.el.addEventListener('click', (e) => this.onClick(e));
      OD.events.on('defense:disabled', (d) => {
        if (this.slot && this.slot.defense === d) this.render(this.app.match);
      });
      // altura do painel em CSS (posiciona o botão da habilidade acima dele)
      const stage = document.getElementById('stage');
      const setH = () => stage.style.setProperty('--panel-h', this.el.offsetHeight + 'px');
      if (window.ResizeObserver) new ResizeObserver(setH).observe(this.el);
      this.setH = setH;
    },

    select(m, slot) {
      if (slot && slot === this.slot) slot = null; // tocar no mesmo slot fecha
      this.slot = slot;
      this.choice = null;
      this.sellArmedUntil = 0;
      if (m) m.selected = slot;
      this.render(m, true);
    },

    render(m, animate = false) {
      const s = this.slot;
      if (!m || !s) {
        this.el.innerHTML = '<div class="panel-hint">Toque em um slot para construir defesas</div>';
        this.setH();
        return;
      }
      const ring = OD.CONFIG.rings[s.ring];
      let html;
      if (!s.unlocked) html = this.lockedHtml(m, s, ring);
      else if (!s.defense) html = this.buildHtml(m, ring);
      else html = this.defenseHtml(m, s.defense, ring);

      this.el.innerHTML = `<div class="panel-card${animate ? '' : ' static'}">${html}</div>`;
      this.el.querySelectorAll('canvas[data-icon]').forEach((c) => drawIcon(c, c.dataset.icon, Number(c.dataset.frame || 0)));
      this.timer = 0;
      this.update(m, 0);
      this.setH();
    },

    head(title, sub, icon, frame = 0) {
      return (
        '<div class="panel-head">' +
        (icon ? `<canvas class="panel-icon" data-icon="${icon}" data-frame="${frame}"></canvas>` : '') +
        `<div class="panel-titles"><div class="panel-title">${esc(title)}</div><div class="panel-sub">${esc(sub)}</div></div>` +
        '<button class="panel-close" data-action="close" aria-label="Fechar">✕</button></div>'
      );
    },

    lockedHtml(m, s, ring) {
      const cost = OD.Economy.unlockCost(m, s);
      return (
        this.head('Slot bloqueado', ring.name, 'slot_locked') +
        `<p class="panel-desc">Desbloqueie este slot para construir uma defesa nele.<br><b class="ring-bonus">Bônus do anel: ${esc(ring.bonusText)}</b></p>` +
        `<button class="btn primary" data-action="unlock" data-cost="${cost}">DESBLOQUEAR ${coin(cost)}</button>`
      );
    },

    buildHtml(m, ring) {
      const defs = OD.CONFIG.defenses;
      let grid = '<div class="build-grid">';
      for (const type in defs) {
        const d = defs[type];
        grid +=
          `<button class="build-opt${type === this.choice ? ' selected' : ''}" data-action="choose" data-type="${type}" data-cost="${d.cost}">` +
          `<canvas data-icon="${d.sprite || 'def_' + type}"></canvas>` +
          `<span class="opt-text"><span class="opt-name">${esc(d.short || d.name)}</span>` +
          `<span class="opt-cost"><i class="coin"></i>${num(d.cost)}</span></span></button>`;
      }
      grid += '</div>';

      let detail;
      if (this.choice) {
        const d = defs[this.choice];
        const stats = d.display
          .map((k) => `<div class="stat"><span>${esc(label(k))}</span><b>${fmt(k, OD.statAt(d.stats[k], 1))}</b></div>`)
          .join('');
        detail =
          `<div class="detail"><div class="detail-name">${esc(d.name)}</div>` +
          `<div class="detail-desc">${esc(d.description)}</div>` +
          `<div class="stats">${stats}<div class="stat"><span>Vida</span><b>${num(OD.statAt(d.hp, 1))}</b></div></div>` +
          `<button class="btn primary" data-action="build" data-cost="${d.cost}">CONSTRUIR ${coin(d.cost)}</button></div>`;
      } else {
        detail = '<div class="detail"><div class="detail-desc">Escolha uma defesa para ver os detalhes.</div></div>';
      }
      return this.head('Construir defesa', `${ring.name} · ${ring.bonusText}`) + grid + detail;
    },

    defenseHtml(m, d, ring) {
      const c = d.cfg;
      const max = d.level >= c.maxLevel;
      const branching = d.needsBranch();
      const stats = d
        .displayStats()
        .map((k) => {
          const now = fmt(k, d.stat(k));
          const next = max || branching ? '' : fmt(k, d.stat(k, d.level + 1));
          const show = next && next !== now ? ` <span class="up">→ ${next}</span>` : '';
          return `<div class="stat"><span>${esc(label(k))}</span><b>${now}${show}</b></div>`;
        })
        .join('');
      const hpRow = `<div class="stat"><span>Vida</span><b id="panel-hp">${num(d.hp)} / ${num(d.maxHp)}</b></div>`;
      const notes = d.notes.length ? `<div class="notes">${d.notes.map((n) => `<span class="note">${esc(n)}</span>`).join('')}</div>` : '';
      const cost = OD.Economy.upgradeCost(d);
      const armed = this.sellArmedUntil > performance.now();
      const sellBtn = `<button class="btn danger" data-action="sell">${armed ? 'CONFIRMAR' : 'VENDER'} <span class="cost">+${num(OD.Economy.sellValue(d))}</span></button>`;

      let actions;
      if (branching) {
        let list = '';
        for (const key in c.branches) {
          const b = c.branches[key];
          const icon = OD.ASSETS[d.cfg.sprite || 'def_' + d.type + '_' + key] ? 'def_' + d.type + '_' + key : d.spriteKey;
          list +=
            `<button class="branch" data-action="branch" data-branch="${key}" data-cost="${cost}">` +
            `<canvas data-icon="${icon}" data-frame="1"></canvas>` +
            `<span class="branch-name">${esc(b.name)}</span><span class="branch-desc">${esc(b.description)}</span>${coin(cost)}</button>`;
        }
        actions = `<div class="branch-title">ESCOLHA A ESPECIALIZAÇÃO</div><div class="branches">${list}</div><div class="actions">${sellBtn}</div>`;
      } else {
        const upBtn = max
          ? '<button class="btn" disabled>NÍVEL MÁXIMO</button>'
          : `<button class="btn primary" data-action="upgrade" data-cost="${cost}">MELHORAR ${coin(cost)}</button>`;
        actions = `<div class="actions">${upBtn}${sellBtn}</div>`;
      }

      const sub = [`Nível ${d.level}/${c.maxLevel}`, d.branchCfg && d.branchCfg.name, ring.name].filter(Boolean).join(' · ');
      return (
        this.head(c.name, sub, d.spriteKey, d.tier()) +
        '<div id="panel-status" class="status hidden"></div>' +
        `<div class="stats">${stats}${hpRow}</div>` +
        notes +
        actions
      );
    },

    // atualizações leves (sem recriar o HTML): custos, vida, status
    update(m, dt) {
      if (!m || !this.slot) return;
      this.timer -= dt;
      if (this.timer > 0) return;
      this.timer = 0.15;

      const coins = m.coins;
      this.el.querySelectorAll('[data-cost]').forEach((b) => {
        const poor = coins < Number(b.dataset.cost);
        if (b.classList.contains('build-opt')) b.classList.toggle('poor', poor);
        else b.disabled = poor;
      });

      const d = this.slot.defense;
      if (!d) return;
      const hpEl = document.getElementById('panel-hp');
      if (hpEl) hpEl.textContent = `${num(d.hp)} / ${num(d.maxHp)}`;
      const st = document.getElementById('panel-status');
      if (st) {
        if (!d.active) {
          st.className = 'status bad';
          st.textContent = `Desativada — volta em ${Math.ceil(d.disabled)}s`;
        } else {
          st.className = 'status hidden';
        }
      }
      if (this.sellArmedUntil && this.sellArmedUntil < performance.now()) {
        this.sellArmedUntil = 0;
        this.render(m);
      }
    },

    onClick(e) {
      const t = e.target.closest('[data-action]');
      const m = this.app.match;
      const s = this.slot;
      if (!t || !m || !s || this.app.phase !== 'playing') return;
      const E = OD.Economy;
      switch (t.dataset.action) {
        case 'close':
          this.select(m, null);
          break;
        case 'choose':
          this.choice = t.dataset.type;
          this.render(m);
          break;
        case 'build':
          if (E.build(m, s, this.choice)) {
            this.choice = null;
            this.render(m);
          }
          break;
        case 'unlock':
          if (E.unlock(m, s)) this.render(m);
          break;
        case 'upgrade':
          if (E.upgrade(m, s)) this.render(m);
          break;
        case 'branch':
          if (E.specialize(m, s, t.dataset.branch)) this.render(m);
          break;
        case 'sell':
          // venda pede confirmação com um segundo toque
          if (this.sellArmedUntil > performance.now()) {
            E.sell(m, s);
            this.sellArmedUntil = 0;
          } else {
            this.sellArmedUntil = performance.now() + 2500;
          }
          this.render(m);
          break;
      }
    },
  };

  OD.Panel = Panel;
})();
