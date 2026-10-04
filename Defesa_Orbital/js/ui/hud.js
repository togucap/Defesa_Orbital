// HUD superior: onda, moedas, vida do planeta, velocidade e avisos.
// Só toca no DOM quando um valor muda.
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);

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
        banner: $('banner'),
        fps: $('fps'),
        bossBar: $('boss-bar'),
        bossFill: $('boss-fill'),
      };
      this.last = {};
      this.lastPulse = 0;
      OD.events.on('coins:gain', () => this.pulseCoins());
      OD.events.on('wave:start', (wave) => this.showBanner(`ONDA ${wave}`, '', false));
      OD.events.on('boss:incoming', (wave) => this.showBanner('CHEFE A CAMINHO', `Onda ${wave}`, true));
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
      this.set('hp', hp, () => {
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
      this.set('info', OD.Waves.info(m), (v) => (el.info.textContent = v));

      // barra de vida do chefe (quando visível)
      const b = m.boss && m.boss.alive && m.boss.visible ? m.boss : null;
      this.set('boss', b ? Math.ceil((b.hp / b.maxHp) * 200) : -1, (v) => {
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

    showBanner(text, sub, boss) {
      const b = this.el.banner;
      b.className = 'banner';
      b.innerHTML = '';
      b.textContent = text;
      if (sub) {
        const s = document.createElement('small');
        s.textContent = sub;
        b.appendChild(s);
      }
      void b.offsetWidth;
      b.className = 'banner show' + (boss ? ' boss' : '');
    },

    reset() {
      this.last = {};
      this.el.banner.className = 'banner';
    },
  };

  OD.HUD = HUD;
})();
