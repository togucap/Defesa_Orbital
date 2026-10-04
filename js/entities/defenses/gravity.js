// Poço Gravitacional: abre um poço sobre os inimigos que os puxa para o
// centro (ou empurra, no Repulsor) e causa dano contínuo.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class GravityDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 1;
      this.well = null; // { x, y, t, r }
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const w = this.well;
      if (w) {
        w.t -= dt;
        w.spin += dt * 4;
        const pull = this.stat('pull');
        const dps = this.stat('pullDps');
        const repel = this.branchCfg && this.branchCfg.repel;
        for (const e of m.enemies) {
          if (!e.alive) continue;
          const reach = w.r + e.radius;
          if (dist2(e.x, e.y, w.x, w.y) > reach * reach) continue;
          const k = (e.boss ? 0.2 : 1) * pull * dt;
          if (repel) {
            const d = Math.hypot(e.x, e.y) || 1;
            e.x += (e.x / d) * k;
            e.y += (e.y / d) * k;
          } else {
            const dx = w.x - e.x;
            const dy = w.y - e.y;
            const d = Math.hypot(dx, dy);
            if (d > 4) {
              e.x += (dx / d) * Math.min(k, d);
              e.y += (dy / d) * Math.min(k, d);
            }
          }
          this.hit(m, e, dps * dt, false);
        }
        if (w.t <= 0) this.well = null;
        return;
      }
      if (this.cooldown > 0) return;
      const t = this.keepTarget(m, this.stat('range'));
      if (!t) return;
      this.angle = Math.atan2(t.y - this.y, t.x - this.x);
      this.cooldown = this.stat('reload');
      this.well = { x: t.x, y: t.y, t: this.stat('duration'), r: this.stat('wellRadius'), spin: 0 };
      OD.fx.ring(m, t.x, t.y, this.well.r, OD.Sprites.color(this.spriteKey), 0.4);
      OD.events.emit('sfx', 'boom');
    }

    onDisable() {
      this.well = null;
    }

    drawBack(r) {
      const w = this.well;
      if (!w) return;
      const color = this.branchCfg && this.branchCfg.repel ? '#ffb347' : OD.Sprites.color(this.spriteKey);
      const fade = Math.min(1, w.t * 2);
      r.disc(w.x, w.y, w.r, '#06020f', 0.35 * fade);
      for (let i = 0; i < 3; i++) {
        const k = ((w.spin * 0.3 + i / 3) % 1);
        const rr = this.branchCfg && this.branchCfg.repel ? w.r * k : w.r * (1 - k);
        r.ring(w.x, w.y, rr, color, 2, 0.6 * fade * (1 - Math.abs(k - 0.5)));
      }
      r.ring(w.x, w.y, w.r, color, 1.5, 0.5 * fade);
      r.disc(w.x, w.y, 6, '#ffffff', 0.8 * fade);
    }
  }

  OD.registerDefense('gravity', GravityDefense);
})();
