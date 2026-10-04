// Nave caça: rápida, faz curvas em zigue-zague e colide com o planeta
(() => {
  const OD = (window.OD = window.OD || {});

  class Fighter extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      this.phase = Math.random() * Math.PI * 2;
    }

    move(m, dt) {
      const c = this.cfg;
      const d = Math.hypot(this.x, this.y);
      // curvas mais suaves perto do planeta para garantir o ataque
      const k = OD.math.clamp((d - 100) / 220, 0, 1);
      const weave = Math.sin(this.age * c.weaveSpeed + this.phase) * c.weaveAmount * k;
      this.angle = Math.atan2(-this.y, -this.x) + weave;
      this.setVelocity(this.angle, this.currentSpeed());
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  OD.registerEnemy('fighter', Fighter);
})();
