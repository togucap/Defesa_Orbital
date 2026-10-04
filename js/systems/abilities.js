// Habilidades do planeta: Onda de Choque, Ataque Orbital (com mira) e
// Congelar o Tempo. Cada uma recarrega sozinha e pode ser melhorada com
// moedas no núcleo planetário (mais dano/duração e recarga menor).
(() => {
  const OD = (window.OD = window.OD || {});
  let seq = 0;

  const Abilities = {
    // habilidades disponíveis (as com tecnologia exigem o Laboratório)
    list() {
      const A = OD.CONFIG.abilities;
      return Object.keys(A).filter((id) => !A[id].tech || OD.meta.hasTech(A[id].tech));
    },

    initial() {
      const out = {};
      for (const id of this.list()) out[id] = { charge: OD.CONFIG.abilities[id].startCharge };
      return out;
    },

    level(m, id) {
      return m.abilityLevels[id] || 0;
    },

    // multiplicador de força (dano/duração) pelas melhorias
    power(m, id) {
      return 1 + this.level(m, id) * OD.CONFIG.abilityUpgrade.power;
    },

    cooldown(m, id) {
      const k = 1 + m.mods.abilityCd + this.level(m, id) * OD.CONFIG.abilityUpgrade.cooldown;
      return OD.CONFIG.abilities[id].cooldown * Math.max(0.2, k);
    },

    ready(m, id) {
      const a = m.abilities[id];
      return !!a && a.charge >= 1 && !m.dying;
    },

    // dano base escalado pela onda atual
    scaled(m, base) {
      return base * OD.Waves.hpMult(Math.max(1, m.wave));
    },

    update(m, dt) {
      for (const id in m.abilities) {
        const a = m.abilities[id];
        if (a.charge < 1) {
          a.charge = Math.min(1, a.charge + dt / this.cooldown(m, id));
          if (a.charge >= 1) OD.events.emit('ability:ready', id);
        }
      }
      if (m.timeFrozen > 0) m.timeFrozen -= dt;
      this.updateShock(m, dt);
      this.updateStrikes(m, dt);
    },

    // botão pressionado: mira (orbital) ou dispara na hora
    use(m, id) {
      if (!this.ready(m, id)) return false;
      if (id === 'orbital') {
        m.aiming = m.aiming === id ? null : id; // toque de novo cancela
        return true;
      }
      m.abilities[id].charge = 0;
      if (id === 'shockwave') this.startShock(m);
      else if (id === 'timefreeze') this.freezeTime(m);
      OD.events.emit('ability:used', id);
      return true;
    },

    // toque no campo durante a mira
    aimAt(m, x, y) {
      const id = m.aiming;
      m.aiming = null;
      if (id !== 'orbital' || !this.ready(m, id)) return;
      m.abilities[id].charge = 0;
      m.strikes.push({ x, y, t: OD.CONFIG.abilities.orbital.delay });
      OD.events.emit('ability:used', id);
    },

    // ---------- Onda de Choque ----------
    startShock(m) {
      m.shock = { r: m.planet.radius, id: ++seq };
      m.shake = Math.min(1, m.shake + 0.6);
      OD.fx.ring(m, 0, 0, m.planet.radius + 30, '#ffffff', 0.25);
      OD.events.emit('sfx', 'ability');
    },

    updateShock(m, dt) {
      const w = m.shock;
      if (!w) return;
      const c = OD.CONFIG.abilities.shockwave;
      w.r += c.speed * dt;
      const dmg = this.scaled(m, c.damage) * this.power(m, 'shockwave');
      let kills = 0;
      for (const e of m.enemies) {
        if (!e.alive || e.shockId === w.id) continue;
        if (Math.hypot(e.x, e.y) - e.radius > w.r) continue;
        e.shockId = w.id;
        OD.Damage.deal(m, null, e, dmg, 'energy', true, 'ability');
        if (!e.alive) {
          kills++;
          continue;
        }
        const d = Math.hypot(e.x, e.y) || 1;
        const push = c.knockback * (e.boss ? 0.2 : 1);
        e.x += (e.x / d) * push;
        e.y += (e.y / d) * push;
        e.applySlow(c.slow, c.slowTime);
      }
      if (kills) {
        w.kills = (w.kills || 0) + kills;
        OD.events.emit('ability:kills', w.kills);
      }
      for (const p of m.projectiles.active) {
        if (p.hostile && p.x * p.x + p.y * p.y < w.r * w.r) {
          p.alive = false;
          OD.fx.sparks(m, p.x, p.y, '#9fe8ff', 2);
        }
      }
      if (w.r >= c.radius) m.shock = null;
    },

    // ---------- Ataque Orbital ----------
    updateStrikes(m, dt) {
      const c = OD.CONFIG.abilities.orbital;
      for (let i = m.strikes.length - 1; i >= 0; i--) {
        const s = m.strikes[i];
        s.t -= dt;
        if (s.t > 0) continue;
        m.strikes.splice(i, 1);
        const v = OD.view;
        OD.fx.beam(m, s.x, v.top - 40, s.x, s.y, '#ff6bd5', 26, 0.45);
        OD.fx.explosion(m, s.x, s.y, 40, '#ff6bd5');
        OD.fx.ring(m, s.x, s.y, c.radius, '#ffc2f0', 0.4);
        m.shake = Math.min(1, m.shake + 0.5);
        OD.Damage.area(m, null, s.x, s.y, c.radius, this.scaled(m, c.damage) * this.power(m, 'orbital'), 'energy', 'ability');
        OD.events.emit('sfx', 'orbital');
      }
    },

    // ---------- Congelar o Tempo ----------
    freezeTime(m) {
      const dur = OD.CONFIG.abilities.timefreeze.duration * this.power(m, 'timefreeze');
      m.timeFrozen = dur;
      for (const e of m.enemies) if (e.alive) e.freeze(dur);
      OD.fx.ring(m, 0, 0, 600, '#bfefff', 0.6);
      OD.events.emit('sfx', 'freeze');
    },

    // desenho (chamado pelo renderizador)
    draw(r, m) {
      const w = m.shock;
      if (w) {
        const t = w.r / OD.CONFIG.abilities.shockwave.radius;
        r.ring(0, 0, w.r, '#9fe8ff', 14 * (1 - t) + 2, 0.25 * (1 - t));
        r.ring(0, 0, w.r, '#ffffff', 3, 0.8 * (1 - t));
      }
      const rad = OD.CONFIG.abilities.orbital.radius;
      for (const s of m.strikes) {
        const k = 1 - s.t / OD.CONFIG.abilities.orbital.delay;
        r.ring(s.x, s.y, rad * (1.4 - 0.4 * k), '#ff6bd5', 2.5, 0.4 + 0.5 * k);
        r.disc(s.x, s.y, rad * k, '#ff6bd5', 0.12);
      }
    },
  };

  OD.Abilities = Abilities;
})();
