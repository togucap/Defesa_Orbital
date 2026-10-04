// HUD: onda, moedas, vida do planeta, velocidade, chamar onda, habilidade,
// barra do chefe e avisos. Só toca no DOM quando um valor muda.
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);

  // ícones dos botões de habilidade
  const ICONS = {
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/></svg>',
    target: '<svg viewBox="0 0 24 24"><path d="M11 2h2v4h-2zM11 18h2v4h-2zM2 11h4v2H2zM18 11h4v2h-4z"/><circle cx="12" cy="12" r="5" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="1.6"/></svg>',
    snow: '<svg viewBox="0 0 24 24"><path d="M11 2h2v20h-2z"/><path d="M11 2h2v20h-2z" transform="rotate(60 12 12)"/><path d="M11 2h2v20h-2z" transform="rotate(-60 12 12)"/></svg>',
  };

  const HUD = {
    init() {
      this.el = {
        wave: $('hud-wave'),
        coins: $('hud-coins'),
        coinsVal: $('hud-coins-val'),
        hpFill: $('hud-hp-fill'),
        hpText: $('hud-hp-text'),
        speed: $('btn-speed'),
        mute: $('btn-mute'),
        info: $('wave-info'),
        call: $('btn-call'),
        callValue: $('call-value'),
        risk: $('btn-risk'),
        toast: $('toast'),
        abilities: $('abilities'),
        banner: $('banner'),
        fps: $('fps'),
        bossBar: $('boss-bar'),
        bossFill: $('boss-fill'),
        bossName: $('boss-name'),
      };
      this.last = {};
      this.lastPulse = 0;
      this.skipBanner = false;
      OD.events.on('coins:gain', () => this.pulseCoins());
      OD.events.on('sector:change', (s) => {
        const sec = OD.sectorInfo(s.sector);
        const rule = s.rule ? ` · Nova regra: ${s.rule.name}: ${s.rule.text}` : '';
        this.showBanner(`SETOR ${s.sector + 1}`, `${sec.name}${rule}`, false, sec.grid);
        this.skipBanner = true;
      });
      OD.events.on('wave:start', (wave) => {
        if (this.skipBanner) this.skipBanner = false;
        else this.showBanner(`ONDA ${wave}`, '', false);
      });
      OD.events.on('boss:incoming', (b) => this.showBanner(b.name.toUpperCase(), `Chefe a caminho · Onda ${b.wave}`, true));
      OD.events.on('planet:revive', () => this.showBanner('ÚLTIMO RECURSO', 'O planeta resistiu!', false, '#4ade80'));
    },

    set(key, value, apply) {
      if (this.last[key] === value) return;
      this.last[key] = value;
      apply(value);
    },

    update(app) {
      const m = app.match;
      const el = this.el;
      if (!m) return;
      this.set('wave', m.wave, (v) => (el.wave.textContent = v));
      this.set('coins', Math.floor(m.coins), (v) => (el.coinsVal.textContent = v.toLocaleString('pt-BR')));

      const p = m.planet;
      const hp = Math.ceil(p.hp);
      this.set('hp', hp + '/' + p.maxHp, () => {
        const frac = p.hp / p.maxHp;
        el.hpFill.style.transform = `scaleX(${frac})`;
        el.hpFill.className = 'hp-fill' + (frac < 0.3 ? ' low' : frac < 0.6 ? ' mid' : '');
        el.hpText.textContent = `${hp} / ${p.maxHp}`;
      });

      const speed = app.loop.speed;
      this.set('speed', speed, (v) => {
        el.speed.textContent = v + 'x';
        el.speed.classList.toggle('fast', v > 1);
      });
      this.set('muted', OD.Audio.muted, (v) => el.mute.classList.toggle('muted', v));
      const info = m.aiming ? 'Toque no campo para mirar o Ataque Orbital' : OD.Waves.info(m);
      this.set('info', info, (v) => {
        el.info.textContent = v;
        el.info.classList.toggle('aim', !!m.aiming);
      });

      // chamar a próxima onda (só no intervalo)
      const call = app.phase === 'playing' && !m.dying ? OD.Waves.callValue(m) : -1;
      this.set('call', call, (v) => {
        el.call.classList.toggle('hidden', v < 0 || m.waveState.phase !== 'break');
        el.callValue.textContent = Math.max(0, v);
      });

      this.set('risk', app.phase === 'playing' && !m.dying && OD.Waves.riskAvailable(m), (v) => el.risk.classList.toggle('hidden', !v));

      // habilidades: anel de carga de cada botão
      if (this.abilityMatch !== m) this.buildAbilities(m);
      for (const b of this.abilityBtns) {
        const id = b.dataset.ability;
        const charge = Math.floor(m.abilities[id].charge * 50) / 50;
        this.set('ab:' + id, charge + (m.aiming === id ? 'a' : ''), () => {
          b.style.setProperty('--charge', charge * 360 + 'deg');
          b.classList.toggle('ready', charge >= 1);
          b.classList.toggle('aiming', m.aiming === id);
        });
      }
      this.set('abilityShow', app.phase === 'playing' && !m.dying, (v) => el.abilities.classList.toggle('hidden', !v));

      // barra de vida dos chefes visíveis (somada: a Hidra vira duas cabeças)
      let bossHp = 0;
      let max = 0;
      let name = '';
      for (const e of m.enemies) {
        if (!e.boss || !e.alive || !e.visible) continue;
        bossHp += Math.max(0, e.hp);
        max += e.maxHp;
        name = name || e.cfg.name;
      }
      this.set('bossName', name, (v) => v && (el.bossName.textContent = v.toUpperCase()));
      this.set('boss', max ? Math.ceil((bossHp / max) * 200) : -1, (v) => {
        el.bossBar.classList.toggle('hidden', v < 0);
        if (v >= 0) el.bossFill.style.transform = `scaleX(${v / 200})`;
      });

      if (app.showFps) this.set('fps', app.loop.fps, (v) => (el.fps.textContent = v + ' FPS'));
    },

    // pulso visual ao ganhar moedas (limitado para não piscar demais)
    pulseCoins() {
      const now = performance.now();
      if (now - this.lastPulse < 120) return;
      this.lastPulse = now;
      const c = this.el.coins;
      c.classList.remove('pulse');
      void c.offsetWidth;
      c.classList.add('pulse');
    },

    showBanner(text, sub, boss, color) {
      const b = this.el.banner;
      b.className = 'banner';
      b.style.color = color || '';
      b.textContent = text;
      if (sub) {
        const s = document.createElement('small');
        s.textContent = sub;
        b.appendChild(s);
      }
      void b.offsetWidth;
      b.className = 'banner show' + (boss ? ' boss' : '');
    },

    // cria um botão para cada habilidade liberada na partida
    buildAbilities(m) {
      const box = this.el.abilities;
      box.innerHTML = '';
      for (const id of Object.keys(m.abilities)) {
        const a = OD.CONFIG.abilities[id];
        const b = document.createElement('button');
        b.className = 'ability-btn';
        b.dataset.ability = id;
        b.setAttribute('aria-label', a.name);
        b.title = a.name + ' (' + a.key.toUpperCase() + ')';
        b.innerHTML = '<span class="ability-ring"></span>' + (ICONS[a.icon] || ICONS.bolt);
        box.appendChild(b);
      }
      this.abilityBtns = Array.from(box.children);
      this.abilityMatch = m;
      for (const k in this.last) if (k.startsWith('ab:')) delete this.last[k];
    },

    // aviso curto abaixo da HUD
    toast(text, color) {
      const t = this.el.toast;
      t.textContent = text;
      t.style.color = color || '';
      t.classList.remove('show');
      void t.offsetWidth;
      t.classList.add('show');
    },

    reset() {
      this.last = {};
      this.skipBanner = false;
      this.el.banner.className = 'banner';
    },
  };

  OD.HUD = HUD;
})();
