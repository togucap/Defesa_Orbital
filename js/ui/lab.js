// Tela do Laboratório: melhorias permanentes, arsenal (armas bloqueadas com
// prévia), tecnologias e conquistas. Tudo comprado com núcleos.
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);
  const { esc, num, label, fmt, core, drawIcons } = OD.ui;

  const TABS = [
    ['upgrades', 'MELHORIAS', 'Melhorias permanentes para todas as partidas.'],
    ['arsenal', 'ARSENAL', 'Desbloqueie armas novas. Toque em PRÉVIA para ver o que cada uma faz.'],
    ['tech', 'TECNOLOGIA', 'Habilidades, anéis e sistemas novos.'],
    ['achievements', 'CONQUISTAS', 'Objetivos de longo prazo que dão núcleos e visuais.'],
  ];

  const Lab = {
    init(app) {
      this.app = app;
      this.tab = 'upgrades';
      this.list = $('lab-list');
      this.preview = $('lab-preview');
      this.resetArmed = 0;
      $('lab-tabs').addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        this.tab = b.dataset.tab;
        this.render();
      });
      this.list.addEventListener('click', (e) => this.onClick(e));
      this.preview.addEventListener('click', (e) => this.onClick(e));
      $('btn-lab-back').addEventListener('click', () => app.closeLab());
      const reset = $('btn-lab-reset');
      reset.addEventListener('click', () => {
        // pede confirmação com um segundo toque
        if (this.resetArmed > performance.now()) {
          OD.meta.reset();
          this.resetArmed = 0;
          reset.textContent = 'Reiniciar progresso';
          this.render();
        } else {
          this.resetArmed = performance.now() + 3000;
          reset.textContent = 'Toque de novo para apagar tudo';
          setTimeout(() => (reset.textContent = 'Reiniciar progresso'), 3000);
        }
      });
    },

    render() {
      const meta = OD.meta;
      $('lab-cores').textContent = num(meta.data.cores);
      const tabs = TABS.filter((t) => t[0] !== 'achievements' || OD.CONFIG.achievements);
      $('lab-tabs').innerHTML = tabs.map(([id, name]) => `<button class="tab${this.tab === id ? ' on' : ''}" data-tab="${id}">${name}</button>`).join('');
      $('lab-hint').textContent = (TABS.find((t) => t[0] === this.tab) || TABS[0])[2];
      let html = '';
      if (this.tab === 'arsenal') html = this.arsenalHtml();
      else if (this.tab === 'tech') html = this.techHtml();
      else if (this.tab === 'achievements') html = OD.Achievements ? OD.Achievements.labHtml() : '';
      else html = this.upgradesHtml();
      this.list.innerHTML = html;
      drawIcons(this.list);
    },

    upgradesHtml() {
      const meta = OD.meta;
      return OD.CONFIG.meta.upgrades
        .map((u) => {
          const lv = meta.level(u.id);
          const cost = meta.cost(u.id);
          const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
          const btn =
            cost == null
              ? '<button class="btn small" disabled>MÁX</button>'
              : `<button class="btn small primary" data-buy="${u.id}" ${meta.data.cores < cost ? 'disabled' : ''}>${core(cost)}</button>`;
          return `<div class="lab-row"><div class="lab-info"><b>${esc(u.name)}</b><span>${esc(u.text)}</span><div class="pips">${pips}</div></div>${btn}</div>`;
        })
        .join('');
    },

    arsenalHtml() {
      const meta = OD.meta;
      const defs = OD.CONFIG.defenses;
      return Object.keys(defs)
        .filter((id) => defs[id].locked)
        .map((id) => {
          const d = defs[id];
          const owned = meta.hasWeapon(id);
          const req = d.unlock.requires;
          const reqOk = meta.reqMet(req);
          let status;
          if (owned) status = '<span class="ok">✓ Desbloqueada</span>';
          else if (!reqOk) status = `<span class="lock">Requer ${esc(defs[req].name)}</span>`;
          else status = `<span>${d.role === 'attack' ? 'Ataque' : 'Suporte'}${d.unique ? ' · única por partida' : ''}</span>`;
          const btn = owned || !reqOk ? '' : `<button class="btn small primary" data-unlock="${id}" ${meta.data.cores < d.unlock.cost ? 'disabled' : ''}>${core(d.unlock.cost)}</button>`;
          return (
            `<div class="lab-row${owned ? '' : ' locked-row'}"><canvas class="lab-icon" data-icon="def_${id}" data-frame="${owned ? 3 : 0}"></canvas>` +
            `<div class="lab-info"><b>${esc(d.name)}</b>${status}</div>` +
            `<button class="btn small" data-preview="${id}">PRÉVIA</button>${btn}</div>`
          );
        })
        .join('');
    },

    techHtml() {
      const meta = OD.meta;
      return OD.CONFIG.meta.tech
        .map((t) => {
          const owned = meta.hasTech(t.id);
          const reqOk = meta.reqMet(t.requires);
          let btn = '';
          if (owned) btn = '<span class="ok">✓</span>';
          else if (reqOk) btn = `<button class="btn small primary" data-tech="${t.id}" ${meta.data.cores < t.cost ? 'disabled' : ''}>${core(t.cost)}</button>`;
          const req = !owned && !reqOk ? `<span class="lock">Requer ${esc(meta.techDef(t.requires).name)}</span>` : '';
          return `<div class="lab-row${owned ? '' : ' locked-row'}"><div class="lab-info"><b>${esc(t.name)}</b><span>${esc(t.text)}</span>${req}</div>${btn}</div>`;
        })
        .join('');
    },

    // prévia de uma arma: evolução animada, descrição, atributos, especializações
    openPreview(id) {
      const d = OD.CONFIG.defenses[id];
      const meta = OD.meta;
      const owned = meta.hasWeapon(id);
      const reqOk = meta.reqMet(d.unlock.requires);
      const stats = d.display.map((k) => `<div class="stat"><span>${esc(label(k))}</span><b>${fmt(k, OD.statAt(d.stats[k], 1))}</b></div>`).join('');
      let branches = '';
      if (d.branches) {
        branches =
          '<div class="branch-title">ESPECIALIZAÇÕES (NÍVEL 5)</div><div class="branches">' +
          Object.keys(d.branches)
            .map((k) => {
              const b = d.branches[k];
              const icon = OD.ASSETS['def_' + id + '_' + k] ? 'def_' + id + '_' + k : 'def_' + id;
              return `<div class="branch"><canvas data-icon="${icon}" data-frame="2"></canvas><span class="branch-name">${esc(b.name)}</span><span class="branch-desc">${esc(b.description)}</span></div>`;
            })
            .join('') +
          '</div>';
      }
      let action = '<button class="btn" disabled>✓ DESBLOQUEADA</button>';
      if (!owned && !reqOk) action = `<button class="btn" disabled>REQUER ${esc(OD.CONFIG.defenses[d.unlock.requires].name.toUpperCase())}</button>`;
      else if (!owned) action = `<button class="btn primary" data-unlock="${id}" ${meta.data.cores < d.unlock.cost ? 'disabled' : ''}>DESBLOQUEAR ${core(d.unlock.cost)}</button>`;
      this.preview.innerHTML =
        `<div class="panel-head"><div class="panel-titles"><div class="panel-title">${esc(d.name)}</div><div class="panel-sub">${d.role === 'attack' ? 'Ataque' : 'Suporte'} · construir: ${num(d.cost)} moedas</div></div>` +
        '<button class="panel-close" data-close="1" aria-label="Fechar">✕</button></div>' +
        `<div class="preview-art"><canvas id="preview-canvas"></canvas><span id="preview-tier">Nível 1</span></div>` +
        `<p class="panel-desc">${esc(d.description)}</p>` +
        `<div class="stats">${stats}<div class="stat"><span>Vida</span><b>${num(OD.statAt(d.hp, 1))}</b></div></div>` +
        branches +
        action;
      this.preview.classList.remove('hidden');
      drawIcons(this.preview);
      this.animatePreview(id);
    },

    // gira o sprite e alterna os 4 estágios visuais
    animatePreview(id) {
      const canvas = $('preview-canvas');
      const tierEl = $('preview-tier');
      const key = 'def_' + id;
      const names = ['Nível 1–3', 'Nível 4–6', 'Nível 7–9', 'Nível 10'];
      const start = performance.now();
      cancelAnimationFrame(this.raf);
      const tick = (now) => {
        if (this.preview.classList.contains('hidden') || !canvas.isConnected) return;
        const t = (now - start) / 1000;
        const frame = Math.floor(t / 1.1) % 4;
        OD.drawIcon(canvas, key, frame, t * 0.8);
        tierEl.textContent = names[frame];
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    },

    closePreview() {
      this.preview.classList.add('hidden');
      cancelAnimationFrame(this.raf);
    },

    onClick(e) {
      const t = e.target.closest('[data-buy],[data-unlock],[data-tech],[data-preview],[data-close],[data-skin]');
      if (!t) return;
      const meta = OD.meta;
      if (t.dataset.close) return this.closePreview();
      if (t.dataset.preview) return this.openPreview(t.dataset.preview);
      if (t.dataset.buy && meta.buy(t.dataset.buy)) this.render();
      if (t.dataset.tech && meta.unlockTech(t.dataset.tech)) this.render();
      if (t.dataset.skin && OD.Achievements) {
        OD.Achievements.selectSkin(t.dataset.skin);
        this.render();
      }
      if (t.dataset.unlock && meta.unlockWeapon(t.dataset.unlock)) {
        const wasPreview = !this.preview.classList.contains('hidden');
        this.render();
        if (wasPreview) this.openPreview(t.dataset.unlock);
      }
    },
  };

  OD.Lab = Lab;
})();
