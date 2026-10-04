// Kamikaze: muito rápido e frágil; mira uma defesa ou o planeta e explode
// ao atingir algo, causando dano em área.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2, turnTowards } = OD.math;

  class Kamikaze extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      this.prey = undefined; // escolhido no 1º passo (precisa da partida)
    }

    move(m, dt) {
      if (this.prey === undefined) {
        this.prey = Math.random() < this.cfg.targetDefenseChance ? OD.Combat.randomDefense(m) : null;
      }
      if (this.prey && (!this.prey.active || this.prey.slot.defense !== this.prey)) this.prey = null;
      const tx = this.prey ? this.prey.x : 0;
      const ty = this.prey ? this.prey.y : 0;
      // curva limitada: rápido, mas não teleguiado perfeito
      const want = Math.atan2(ty - this.y, tx - this.x);
      this.angle = this.age < 0.05 ? want : turnTowards(this.angle, want, 4 * dt);
      this.setVelocity(this.angle, this.currentSpeed());
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.prey && dist2(this.x, this.y, tx, ty) < (this.radius + 16) ** 2) this.explode(m);
    }

    // dano em área nas defesas e no planeta próximos
    explode(m) {
      this.alive = false;
      const r = this.cfg.blastRadius;
      for (const s of m.slots) {
        const d = s.defense;
        if (d && d.active && dist2(this.x, this.y, d.x, d.y) < (r + 14) ** 2) d.damage(m, this.damage);
      }
      const R = m.planet.radius + r;
      if (this.x * this.x + this.y * this.y < R * R) {
        m.planet.damage(this.damage);
        OD.fx.text(m, '-' + Math.round(this.damage), this.x, this.y, '#ff6b81', 20);
      }
      m.shake = Math.min(1, m.shake + 0.3);
      OD.fx.explosion(m, this.x, this.y, 22, '#ffb020');
      OD.fx.ring(m, this.x, this.y, r, '#ffd27a', 0.3);
      OD.events.emit('sfx', 'boom');
    }

    hitPlanet(m) {
      this.explode(m);
    }
  }

  OD.registerEnemy('kamikaze', Kamikaze);
})();
