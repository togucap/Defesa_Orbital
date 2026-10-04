// Canhão de Íons (único por partida): carrega e dispara um raio que
// atravessa a tela inteira, atingindo todos no caminho. Mira no mais forte.
(() => {
  const OD = (window.OD = window.OD || {});
  const { segDist2 } = OD.math;

  class IonDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.charge = 0.3;
    }

    act(m, dt) {
      if (this.charge < 1) this.charge = Math.min(1, this.charge + dt / this.stat('chargeTime'));
      const t = this.keepTarget(m, 2000);
      if (!t) return;
      const aimed = this.aimAt(t.x, t.y, dt, 6);
      if (this.charge >= 1 && aimed) this.fire(m);
    }

    fire(m) {
      this.charge = 0;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const x1 = this.x + ca * 24;
      const y1 = this.y + sa * 24;
      const x2 = this.x + ca * 1800;
      const y2 = this.y + sa * 1800;
      const w = this.stat('width');
      const dmg = this.stat('damage');
      const n = m.enemies.length;
      for (let i = 0; i < n; i++) {
        const e = m.enemies[i];
        if (!e.alive || !e.visible) continue;
        const reach = w / 2 + e.radius;
        if (segDist2(e.x, e.y, x1, y1, x2, y2) < reach * reach) this.hit(m, e, dmg);
      }
      OD.fx.beam(m, x1, y1, x2, y2, OD.Sprites.color(this.spriteKey), w * 1.6, 0.7);
      OD.fx.beam(m, x1, y1, x2, y2, '#ffffff', w * 0.5, 0.5);
      m.shake = 1;
      OD.events.emit('sfx', 'orbital');
    }

    drawFront(r, m) {
      if (!this.active) return;
      const c = OD.Sprites.color(this.spriteKey);
      r.ring(this.x, this.y, 26, c, 3, 0.25 + 0.6 * this.charge);
      if (this.charge > 0.8 && this.target && this.target.alive) {
        r.line(this.x, this.y, this.target.x, this.target.y, c, 1.2, (this.charge - 0.8) * 3);
      }
    }
  }

  OD.registerDefense('ion', IonDefense);
})();
