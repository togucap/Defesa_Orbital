// Canhão de Trilho: disparo instantâneo que atravessa a linha inteira.
// Especializações: Carga Máxima (dano enorme) e Estilhaço (explosões).
(() => {
  const OD = (window.OD = window.OD || {});
  const { segDist2 } = OD.math;

  class RailgunDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 1;
      this.glow = 0;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      if (this.glow > 0) this.glow -= dt;
      const range = this.stat('range');
      const t = this.keepTarget(m, range);
      if (!t) return;
      const aimed = this.aimAt(t.x, t.y, dt, 4);
      if (!aimed || this.cooldown > 0) return;
      this.cooldown = this.stat('reload');
      this.fire(m, range * 1.15);
    }

    fire(m, len) {
      const br = this.branchCfg;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const x1 = this.x + ca * 20;
      const y1 = this.y + sa * 20;
      const x2 = this.x + ca * len;
      const y2 = this.y + sa * len;
      const w = this.stat('width');
      const dmg = this.stat('damage');
      const n = m.enemies.length;
      for (let i = 0; i < n; i++) {
        const e = m.enemies[i];
        if (!e.alive || !e.visible) continue;
        const reach = w / 2 + e.radius;
        if (segDist2(e.x, e.y, x1, y1, x2, y2) > reach * reach) continue;
        const ex = e.x;
        const ey = e.y;
        this.hit(m, e, dmg);
        if (br && br.shrapnel) {
          OD.Damage.area(m, this, ex, ey, br.shrapnelRadius, dmg * br.shrapnel, 'kinetic');
          OD.fx.explosion(m, ex, ey, 10, '#e0e6ff');
        }
      }
      OD.fx.beam(m, x1, y1, x2, y2, OD.Sprites.color(this.spriteKey), w * 1.4, 0.35);
      m.shake = Math.min(1, m.shake + 0.15);
      this.glow = 0.25;
      OD.events.emit('sfx', 'rail');
    }

    drawFront(r) {
      // brilho de recarga no fim do trilho
      if (!this.active) return;
      const k = 1 - Math.min(1, this.cooldown / this.stat('reload'));
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      r.disc(this.x + ca * 18, this.y + sa * 18, 2 + 3 * k, '#e0e6ff', 0.3 + 0.6 * k);
    }
  }

  OD.registerDefense('railgun', RailgunDefense);
})();
