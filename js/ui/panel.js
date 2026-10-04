// Painel inferior contextual. Alvo = slot (construir, melhorar, módulos,
// mutação, especialização, vender) ou o planeta (ui/planetPanel.js).
(() => {
  const OD = (window.OD = window.OD || {});
  const { esc, num, label, fmt, pct, coin, drawIcons } = OD.ui;

  const TARGETING = [
    ['closest', 'Mais perto do planeta'],
    ['strongest', 'Mais forte'],
    ['farthest', 'Mais longe'],
  ];

  const Panel = {
    init(app) {
      this.app = app;
      this.el = document.getElementById('panel');
      this.target = null;  // slot ou planeta
      this.choice = null;  // tipo escolhido para construir
      this.view = 'main';  // main | chips (slot) · aba (planeta)
      this.socket = 0;
      this.notesOpen = false;
      this.sellArmedUntil = 0;
      this.timer = 0;
      this.el.addEventListener('click', (e) => this.onClick(e));
      OD.events.on('defense:disabled', (d) => {
        if (this.target && this.target.defense === d) this.render(this.app.match);
      });
      // altura do painel em CSS (posiciona os botões de habilidade acima dele)
      const stage = document.getElementById('stage');
      const setH = () => stage.style.setProperty('--panel-h', this.el.offsetHeight + 'px');
      if (window.ResizeObserver) new ResizeObserver(setH).observe(this.el);
      this.setH = setH;
    },

    get slot() {
      return this.target && this.target.ring != null ? this.target : null;
    },

    select(m, target) {
      if (target && target === this.target) target = null; // tocar de novo fecha
      this.target = target;
      this.choice = null;
      this.view = target && target === (m && m.planet) ? 'planet' : 'main';
      this.sellArmedUntil = 0;
      if (m) m.selected = target;
      this.render(m, true);
    },

    render(m, animate = false) {
      const t = this.target;
      if (!m || !t) {
        this.el.innerHTML = `<div class="panel-hint">${m && OD.Missions ? OD.Missions.trackerHtml(m) : ''}<span>Toque em um slot para construir · no planeta para melhorias</span></div>`;
        if (m) m.missionsChanged = false;
        this.setH();
        return;
      }
      let html;
      if (t === m.planet) html = OD.PlanetPanel.html(m, this);
      else if (!t.unlocked) html = this.lockedHtml(m, t);
      else if (!t.defense) html = this.buildHtml(m, t);
      else if (this.view === 'chips') html = this.chipsHtml(m, t.defense);
      else html = this.defenseHtml(m, t.defense, t);

      this.el.innerHTML = `<div class="panel-card scroll${animate ? '' : ' static'}">${html}</div>`;
      drawIcons(this.el);
      this.timer = 0;
      this.update(m, 0);
      this.setH();
    },

    head(title, sub, icon, frame = 0, back = false) {
      return (
        '<div class="panel-head">' +
        (back ? '<button class="panel-back" data-action="back" aria-label="Voltar">‹</button>' : '') +
        (icon ? `<canvas class="panel-icon" data-icon="${icon}" data-frame="${frame}"></canvas>` : '') +
        `<div class="panel-titles"><div class="panel-title">${esc(title)}</div><div class="panel-sub">${sub}</div></div>` +
        '<button class="panel-close" data-action="close" aria-label="Fechar">✕</button></div>'
      );
    },

    slotTag(s) {
      if (!s.special || !OD.CONFIG.specialSlots) return '';
      const sp = OD.CONFIG.specialSlots.types[s.special];
      return ` · <b class="tag" style="color:${sp.color}">${esc(sp.name)}</b>`;
    },

    lockedHtml(m, s) {
      const ring = OD.CONFIG.rings[s.ring];
      const E = OD.Economy;
      const cost = E.unlockCost(m, s);
      let btn = `<button class="btn primary" data-action="unlock" data-cost="${cost}">DESBLOQUEAR ${coin(cost)}</button>`;
      if (!E.ringWaveOk(m, s.ring)) btn = `<button class="btn" disabled>LIBERADO NA ONDA ${ring.minWave}</button>`;
      return (
        this.head('Slot bloqueado', esc(ring.name) + this.slotTag(s), 'slot_locked') +
        `<p class="panel-desc">Desbloqueie este slot para construir uma defesa nele.<br><b class="ring-bonus">Bônus do anel: ${esc(ring.bonusText)}</b>` +
        (s.special ? `<br><b class="ring-bonus">${esc(OD.CONFIG.specialSlots.types[s.special].text)}</b>` : '') +
        `</p>${btn}`
      );
    },

    buildHtml(m, s) {
      const ring = OD.CONFIG.rings[s.ring];
      const defs = OD.CONFIG.defenses;
      let grid = '<div class="build-grid">';
      for (const type in defs) {
        const d = defs[type];
        if (d.locked && !OD.meta.hasWeapon(type)) continue;
        const blocked = !OD.Economy.canBuild(m, type);
        grid +=
          `<button class="build-opt${type === this.choice ? ' selected' : ''}${blocked ? ' blocked' : ''}" data-action="choose" data-type="${type}" data-cost="${d.cost}">` +
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
        const canBuild = OD.Economy.canBuild(m, this.choice);
        detail =
          `<div class="detail"><div class="detail-name">${esc(d.name)}</div>` +
          `<div class="detail-desc">${esc(d.description)}</div>` +
          `<div class="stats">${stats}<div class="stat"><span>Vida</span><b>${num(OD.statAt(d.hp, 1))}</b></div></div>` +
          (canBuild
            ? `<button class="btn primary" data-action="build" data-cost="${d.cost}">CONSTRUIR ${coin(d.cost)}</button></div>`
            : '<button class="btn" disabled>ÚNICA: JÁ CONSTRUÍDA</button></div>');
      } else {
        detail = '<div class="detail"><div class="detail-desc">Escolha uma defesa para ver os detalhes.</div></div>';
      }
      return this.head('Construir defesa', `${esc(ring.name)} · ${esc(ring.bonusText)}${this.slotTag(s)}`) + grid + detail;
    },

    defenseHtml(m, d, s) {
      const c = d.cfg;
      const E = OD.Economy;
      const maxed = d.level >= c.maxLevel;
      const branching = d.needsBranch();
      const offer = d.mutationOffer;
      const stats = d
        .displayStats()
        .map((k) => {
          const now = fmt(k, d.stat(k));
          const next = maxed || branching ? '' : fmt(k, d.stat(k, d.level + 1));
          const show = next && next !== now ? ` <span class="up">→ ${next}</span>` : '';
          return `<div class="stat"><span>${esc(label(k))}</span><b>${now}${show}</b></div>`;
        })
        .join('');
      const hpRow = `<div class="stat"><span>Vida</span><b id="panel-hp">${num(d.hp)} / ${num(d.maxHp)}</b></div>`;

      // modo de mira (defesas que escolhem alvo)
      let extras = '';
      if (c.role === 'attack' && !c.noTargeting) {
        const t = TARGETING.find((x) => x[0] === d.targeting) || TARGETING[0];
        extras += `<button class="pill" data-action="targeting">Mira: <b>${t[1]}</b> ⟳</button>`;
      }
      // módulos
      if (c.role === 'attack') {
        const open = d.socketsOpen();
        const socks = OD.CONFIG.chips.sockets
          .map((lv, i) => {
            const chip = d.chips[i];
            if (chip) {
              const ch = OD.CONFIG.chips.list[chip.id];
              return `<button class="sock filled" style="--cc:${ch.color}" data-action="socket" data-i="${i}">${esc(ch.name)} <small>${chip.level}</small></button>`;
            }
            if (i < open) return `<button class="sock" data-action="socket" data-i="${i}">+ Módulo</button>`;
            return `<button class="sock locked" disabled>Nível ${lv}</button>`;
          })
          .join('');
        extras += `<div class="socks"><span class="mini-title">MÓDULOS</span>${socks}</div>`;
      }
      // mutação
      if (OD.CONFIG.mutations) extras += this.mutationHtml(m, d);

      // bônus ativos (recolhidos)
      let notes = '';
      if (d.notes.length) {
        notes = `<button class="pill notes-toggle" data-action="notes">${d.notes.length} bônus ativos ${this.notesOpen ? '▴' : '▾'}</button>`;
        if (this.notesOpen) notes += `<div class="notes">${d.notes.map((n) => `<span class="note">${esc(n)}</span>`).join('')}</div>`;
      }

      const cost = E.upgradeCost(d);
      const armed = this.sellArmedUntil > performance.now();
      const sellBtn = `<button class="btn danger" data-action="sell">${armed ? 'CONFIRMAR' : 'VENDER'} <span class="cost">+${num(E.sellValue(d))}</span></button>`;

      let actions;
      if (branching) {
        let list = '';
        for (const key in c.branches) {
          const b = c.branches[key];
          const icon = OD.ASSETS['def_' + d.type + '_' + key] ? 'def_' + d.type + '_' + key : d.spriteKey;
          list +=
            `<button class="branch" data-action="branch" data-branch="${key}" data-cost="${cost}">` +
            `<canvas data-icon="${icon}" data-frame="1"></canvas>` +
            `<span class="branch-name">${esc(b.name)}</span><span class="branch-desc">${esc(b.description)}</span>${coin(cost)}</button>`;
        }
        actions = `<div class="branch-title">ESCOLHA A ESPECIALIZAÇÃO</div><div class="branches">${list}</div><div class="actions">${sellBtn}</div>`;
      } else {
        const upLabel = maxed ? `SOBRECARGA ★${d.oc + 1}` : 'MELHORAR';
        const upBtn = offer
          ? '<button class="btn" disabled>ESCOLHA A MUTAÇÃO</button>'
          : `<button class="btn primary${maxed ? ' gold' : ''}" data-action="upgrade" data-cost="${cost}">${upLabel} ${coin(cost)}</button>`;
        actions = `<div class="actions">${upBtn}${sellBtn}</div>`;
      }

      const lvl = maxed && d.oc ? `Nível ${d.level} ★${d.oc}` : `Nível ${d.level}/${c.maxLevel}`;
      const sub = [lvl, d.branchCfg && d.branchCfg.name, OD.CONFIG.rings[s.ring].name].filter(Boolean).map(esc).join(' · ') + this.slotTag(s);
      return (
        this.head(c.name, sub, d.spriteKey, d.tier()) +
        '<div id="panel-status" class="status hidden"></div>' +
        `<div class="stats">${stats}${hpRow}</div>` +
        `<div class="extras">${extras}</div>` +
        notes +
        actions
      );
    },

    mutationHtml(m, d) {
      const M = OD.CONFIG.mutations;
      const cat = OD.Mutations.rerollCost(m);
      if (d.mutationOffer) {
        const opts = d.mutationOffer
          .map((id) => {
            const mu = M.list[id];
            return `<button class="mut-opt" data-action="mutate" data-id="${id}" style="--mc:${mu.color}"><b>${esc(mu.name)}</b><span>${esc(mu.text)}</span></button>`;
          })
          .join('');
        return (
          `<div class="mut-box"><span class="mini-title mut">MUTAÇÃO DISPONÍVEL · ESCOLHA 1</span><div class="mut-opts">${opts}</div>` +
          `<button class="pill" data-action="reroll-mut" data-cost="${cat}">Catalisador: novas opções ${coin(cat)}</button></div>`
        );
      }
      if (d.mutation) {
        const mu = M.list[d.mutation];
        return `<div class="mut-line"><span class="mini-title mut">MUTAÇÃO</span><b style="color:${mu.color}">${esc(mu.name)}</b><button class="pill" data-action="reroll-mut" data-cost="${cat}">Trocar ${coin(cat)}</button></div>`;
      }
      if (d.level < M.level) return `<div class="mut-line dim"><span class="mini-title mut">MUTAÇÃO</span><span>no nível ${M.level}</span></div>`;
      return '';
    },

    chipsHtml(m, d) {
      const C = OD.CONFIG.chips;
      const E = OD.Economy;
      const i = this.socket;
      const chip = d.chips[i];
      let body;
      if (chip) {
        const ch = C.list[chip.id];
        const now = OD.statAt(ch.value, chip.level);
        const max = chip.level >= C.maxLevel;
        const next = max ? '' : ` <span class="up">→ ${pct(OD.statAt(ch.value, chip.level + 1))}</span>`;
        const cost = E.chipCost(chip.level);
        body =
          `<div class="chip-card" style="--cc:${ch.color}"><b>${esc(ch.name)}</b> <small>Nv ${chip.level}/${C.maxLevel}</small>` +
          `<p>${esc(ch.text)}</p><div class="stat"><span>Efeito</span><b>${pct(now)}${next}</b></div></div>` +
          '<div class="actions">' +
          (max ? '<button class="btn" disabled>MÁXIMO</button>' : `<button class="btn primary" data-action="chip-up" data-cost="${cost}">MELHORAR ${coin(cost)}</button>`) +
          '<button class="btn danger" data-action="chip-remove">TROCAR</button></div>';
      } else {
        const cost = E.chipCost(0);
        const list = Object.keys(C.list)
          .map((id) => {
            const ch = C.list[id];
            const used = d.chips.some((x) => x && x.id === id);
            return (
              `<button class="chip-opt" style="--cc:${ch.color}" data-action="chip-buy" data-id="${id}" data-cost="${cost}" ${used ? 'disabled' : ''}>` +
              `<b>${esc(ch.name)}</b><span>${esc(ch.text)}</span><small>${pct(OD.statAt(ch.value, 1))} · ${coin(cost)}</small></button>`
            );
          })
          .join('');
        body = `<div class="chip-grid">${list}</div>`;
      }
      return this.head(`Módulo · encaixe ${i + 1}`, esc(d.cfg.name), d.spriteKey, d.tier(), true) + body;
    },

    // atualizações leves (sem recriar o HTML): custos, vida, status
    update(m, dt) {
      if (m && !this.target && m.missionsChanged) this.render(m);
      if (!m || !this.target) return;
      this.timer -= dt;
      if (this.timer > 0) return;
      this.timer = 0.15;

      const coins = m.coins;
      this.el.querySelectorAll('[data-cost]').forEach((b) => {
        const poor = coins < Number(b.dataset.cost);
        if (b.classList.contains('build-opt')) b.classList.toggle('poor', poor);
        else if (!b.dataset.lock) b.disabled = poor;
      });

      if (this.target === m.planet) {
        OD.PlanetPanel.update(m);
        return;
      }
      const d = this.target.defense;
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
      if (!t || !m || !this.target || this.app.phase !== 'playing') return;
      const action = t.dataset.action;
      if (action === 'close') return this.select(m, null);
      if (this.target === m.planet) {
        if (OD.PlanetPanel.onAction(m, this, action, t)) this.render(m);
        return;
      }
      const s = this.target;
      const d = s.defense;
      const E = OD.Economy;
      let changed = true;
      switch (action) {
        case 'back':
          this.view = 'main';
          break;
        case 'choose':
          this.choice = t.dataset.type;
          break;
        case 'build':
          if (E.build(m, s, this.choice)) this.choice = null;
          break;
        case 'unlock':
          changed = E.unlock(m, s);
          break;
        case 'upgrade':
          changed = E.upgrade(m, s);
          break;
        case 'branch':
          changed = E.specialize(m, s, t.dataset.branch);
          break;
        case 'targeting': {
          const i = TARGETING.findIndex((x) => x[0] === d.targeting);
          d.targeting = TARGETING[(i + 1) % TARGETING.length][0];
          d.target = null;
          break;
        }
        case 'notes':
          this.notesOpen = !this.notesOpen;
          break;
        case 'socket':
          this.socket = Number(t.dataset.i);
          this.view = 'chips';
          break;
        case 'chip-buy':
          changed = E.buyChip(m, d, this.socket, t.dataset.id);
          break;
        case 'chip-up':
          changed = E.upgradeChip(m, d, this.socket);
          break;
        case 'chip-remove':
          E.removeChip(m, d, this.socket);
          break;
        case 'mutate':
          OD.Mutations.choose(m, d, t.dataset.id);
          break;
        case 'reroll-mut':
          changed = OD.Mutations.reroll(m, d);
          break;
        case 'sell':
          // venda pede confirmação com um segundo toque
          if (this.sellArmedUntil > performance.now()) {
            E.sell(m, s);
            this.sellArmedUntil = 0;
            this.view = 'main';
          } else {
            this.sellArmedUntil = performance.now() + 2500;
          }
          break;
        default:
          changed = false;
      }
      if (changed) this.render(m);
    },
  };

  OD.Panel = Panel;
})();
