// Lançador de mísseis: míssil teleguiado com dano em área, recarga lenta
(() => {
  const OD = (window.OD = window.OD || {});

  class MissileDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0.5;
      this.side = 1;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const t = this.keepTarget(m, this.stat('range'));
      if (!t) return;
      this.aimAt(t.x, t.y, dt, 6);
      if (this.cooldown > 0) return;

      this.cooldown = this.stat('reload');
      this.side = -this.side;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const ox = this.x + ca * 12 - sa * this.side * 5;
      const oy = this.y + sa * 12 + ca * this.side * 5;
      const p = m.projectiles.get();
      p.init('missile', ox, oy, this.angle, this.stat('missileSpeed'), this.stat('damage'), 'proj_missile');
      p.target = t;
      p.turnRate = this.stat('turnRate');
      p.blast = this.stat('blastRadius');
      p.radius = 6;
      p.life = 4;
      OD.events.emit('sfx', 'missile');
    }
  }

  OD.registerDefense('missile', MissileDefense);
})();
