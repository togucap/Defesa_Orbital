// Torreta de canhão: tiros rápidos com mira antecipada, canos alternados.
// Especializações: Metralhadora (dispersão) e Perfurante (atravessa alvos).
(() => {
  const OD = (window.OD = window.OD || {});

  class CannonDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0;
      this.side = 1;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const range = this.stat('range');
      const t = this.keepTarget(m, range);
      if (!t) return;

      // mira onde o alvo vai estar quando o tiro chegar
      const speed = this.stat('bulletSpeed');
      const dist = Math.hypot(t.x - this.x, t.y - this.y);
      const lead = dist / speed;
      const aimed = this.aimAt(t.x + t.vx * lead, t.y + t.vy * lead, dt, 12);
      if (!aimed || this.cooldown > 0) return;

      const br = this.branchCfg;
      this.cooldown = 1 / this.stat('fireRate');
      this.side = -this.side;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const ox = this.x + ca * 18 - sa * this.side * 4.5;
      const oy = this.y + sa * 18 + ca * this.side * 4.5;
      const spread = br && br.spread ? (Math.random() - 0.5) * 2 * br.spread : 0;
      const p = m.projectiles.get();
      p.init('bullet', ox, oy, this.angle + spread, speed, this.stat('damage'), 'proj_bullet');
      p.life = (range * 1.25) / speed;
      p.dmgType = this.cfg.damageType;
      p.owner = this;
      p.pierce = br && br.pierce ? br.pierce - 1 : 0;
      const f = m.particles.get();
      if (f) f.init('flash', ox, oy, 0, 0, 0.06, 6, '#fff1b8');
      OD.events.emit('sfx', 'shoot');
    }
  }

  OD.registerDefense('cannon', CannonDefense);
})();
