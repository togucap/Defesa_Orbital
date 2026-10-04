// Projetor de Nanitas: dispara nuvens que infectam (corrosão contínua,
// mais dano recebido) e se espalham para os vizinhos quando o alvo morre.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class NanitesDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0.5;
    }

    // prefere inimigos ainda não infectados
    pick(m, range) {
      const t = this.keepTarget(m, range);
      if (!t || t.corrode < 1) return t;
      let best = null;
      let bestD = Infinity;
      for (const e of m.enemies) {
        if (!e.alive || !e.visible || e.corrode > 1) continue;
        const reach = range + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) > reach * reach) continue;
        const d = e.x * e.x + e.y * e.y;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best || t;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const t = this.pick(m, this.stat('range'));
      if (!t) return;
      const aimed = this.aimAt(t.x, t.y, dt, 8);
      if (!aimed || this.cooldown > 0) return;
      this.cooldown = 1 / this.stat('fireRate');
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const p = m.projectiles.get();
      p.init('bullet', this.x + ca * 16, this.y + sa * 16, this.angle, 300, this.stat('corrodeDps') * 0.3, 'proj_nanite');
      p.target = t;
      p.turnRate = 6;
      p.trailColor = '#7dff9b';
      p.life = 2;
      p.radius = 6;
      p.dmgType = this.cfg.damageType;
      p.owner = this;
      p.infect = {
        dps: this.stat('corrodeDps'),
        vuln: this.stat('vuln'),
        duration: this.stat('duration'),
        spread: Math.round(this.stat('spread')),
      };
      OD.events.emit('sfx', 'enemyShot');
    }
  }

  OD.registerDefense('nanites', NanitesDefense);
})();
