// Torre de pulso (EMP): deixa lentos os inimigos dentro do raio
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class EmpDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.pulseTimer = 0;
    }

    act(m, dt) {
      const range = this.stat('range');
      const slow = this.stat('slow');
      const enemies = m.enemies;
      let any = false;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const reach = range + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) <= reach * reach) {
          e.applySlow(slow);
          any = true;
        }
      }
      // pulso visual periódico (mais visível quando há inimigos no raio)
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        this.pulseTimer = this.stat('pulseInterval');
        OD.fx.ring(m, this.x, this.y, range, any ? '#c9a4ff' : '#6b4fa0', 0.7);
      }
    }

    drawBack(r) {
      if (!this.active) return;
      const range = this.stat('range');
      r.disc(this.x, this.y, range, OD.Sprites.color(this.spriteKey), 0.045);
    }
  }

  OD.registerDefense('emp', EmpDefense);
})();
