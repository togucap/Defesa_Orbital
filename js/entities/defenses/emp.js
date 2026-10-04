// Torre de pulso (EMP): deixa lentos os inimigos dentro do raio e revela
// os furtivos. Especializações: Congelamento e Choque.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class EmpDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.pulseTimer = 0;
      this.reveals = true; // usado pelo combate para mostrar inimigos furtivos
    }

    act(m, dt) {
      const range = this.stat('range');
      const slow = Math.min(0.9, this.stat('slow'));
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

      this.pulseTimer -= dt;
      if (this.pulseTimer > 0) return;
      this.pulseTimer = this.stat('pulseInterval');
      const br = this.branchCfg;
      let color = any ? '#c9a4ff' : '#6b4fa0';
      if (br && any) {
        const shock = br.stats && br.stats.shockDamage ? this.stat('shockDamage') : 0;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.alive) continue;
          const reach = range + e.radius;
          if (dist2(this.x, this.y, e.x, e.y) > reach * reach) continue;
          if (br.freeze) e.freeze(br.freeze);
          if (shock) this.hit(m, e, shock);
        }
        color = br.freeze ? '#bfefff' : '#ffe066';
      }
      OD.fx.ring(m, this.x, this.y, range, color, 0.7);
    }

    drawBack(r) {
      if (!this.active) return;
      r.disc(this.x, this.y, this.stat('range'), OD.Sprites.color(this.spriteKey), 0.045);
    }
  }

  OD.registerDefense('emp', EmpDefense);
})();
