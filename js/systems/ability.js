// Habilidade do planeta: Onda de Choque. Recarrega com o tempo; ao usar,
// uma onda se expande do planeta ferindo, empurrando e deixando lentos os
// inimigos, e destrói tiros inimigos no caminho.
(() => {
  const OD = (window.OD = window.OD || {});
  let seq = 0;

  const Ability = {
    cooldown(m) {
      return OD.CONFIG.ability.cooldown * Math.max(0.2, 1 + m.mods.abilityCd);
    },

    ready(m) {
      return m.ability.charge >= 1 && !m.dying;
    },

    update(m, dt) {
      const a = m.ability;
      const c = OD.CONFIG.ability;
      if (a.charge < 1) {
        a.charge = Math.min(1, a.charge + dt / this.cooldown(m));
        if (a.charge >= 1) OD.events.emit('ability:ready');
      }
      const w = a.wave;
      if (!w) return;
      w.r += c.speed * dt;
      for (const e of m.enemies) {
        if (!e.alive || e.shockId === w.id) continue;
        if (Math.hypot(e.x, e.y) - e.radius <= w.r) {
          e.shockId = w.id;
          this.hit(m, e, c);
        }
      }
      for (const p of m.projectiles.active) {
        if (p.hostile && p.x * p.x + p.y * p.y < w.r * w.r) {
          p.alive = false;
          OD.fx.sparks(m, p.x, p.y, '#9fe8ff', 2);
        }
      }
      if (w.r >= c.radius) a.wave = null;
    },

    hit(m, e, c) {
      const dmg = c.damage * Math.pow(OD.CONFIG.waves.hpGrowth, Math.max(0, m.wave - 1));
      e.takeDamage(m, dmg, 'energy', 'ability');
      if (!e.alive) return;
      const d = Math.hypot(e.x, e.y) || 1;
      const push = c.knockback * (e.boss ? 0.2 : 1);
      e.x += (e.x / d) * push;
      e.y += (e.y / d) * push;
      e.applySlow(c.slow, c.slowTime);
    },

    trigger(m) {
      if (!this.ready(m)) return false;
      m.ability.charge = 0;
      m.ability.wave = { r: m.planet.radius, id: ++seq };
      m.shake = Math.min(1, m.shake + 0.6);
      OD.fx.ring(m, 0, 0, m.planet.radius + 30, '#ffffff', 0.25);
      OD.events.emit('sfx', 'ability');
      OD.events.emit('ability:used');
      return true;
    },

    // desenho da onda (chamado pelo renderizador)
    draw(r, m) {
      const w = m.ability.wave;
      if (!w) return;
      const c = OD.CONFIG.ability;
      const t = w.r / c.radius;
      r.ring(0, 0, w.r, '#9fe8ff', 14 * (1 - t) + 2, 0.25 * (1 - t));
      r.ring(0, 0, w.r, '#ffffff', 3, 0.8 * (1 - t));
    },
  };

  OD.Ability = Ability;
})();
