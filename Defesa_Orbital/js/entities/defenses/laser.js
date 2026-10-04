// Torreta laser: feixe contínuo que esquenta (mais dano) no mesmo alvo
(() => {
  const OD = (window.OD = window.OD || {});

  class LaserDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.heat = 0;          // 0..1
      this.firing = false;
      this.lastTarget = null;
      this.dmgAcc = 0;        // acumula dano para mostrar números legíveis
      this.numTimer = 0;
    }

    act(m, dt) {
      const t = this.keepTarget(m, this.stat('range'));
      if (t !== this.lastTarget) {
        this.flushNumber(m);
        this.heat = 0;
        this.lastTarget = t;
      }
      this.firing = false;
      if (!t) return;
      if (!this.aimAt(t.x, t.y, dt, 14)) return;

      this.firing = true;
      this.heat = Math.min(1, this.heat + dt / this.stat('heatTime'));
      const mult = 1 + (this.stat('heatMax') - 1) * this.heat;
      const dmg = this.stat('dps') * mult * dt;
      this.dmgAcc += dmg;
      t.takeDamage(m, dmg, false);

      this.numTimer -= dt;
      if (this.numTimer <= 0 || !t.alive) this.flushNumber(m);
      if (Math.random() < dt * 12) OD.fx.sparks(m, t.x, t.y, OD.Sprites.color(this.spriteKey), 1);
    }

    flushNumber(m) {
      const t = this.lastTarget;
      if (t && this.dmgAcc >= 1) OD.fx.damageNumber(m, this.dmgAcc, t.x, t.y - t.radius);
      this.dmgAcc = 0;
      this.numTimer = 0.35;
    }

    onDisable() {
      this.firing = false;
    }

    drawFront(r) {
      const t = this.lastTarget;
      if (!this.firing || !t || !t.alive) return;
      const ctx = r.ctx;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const sx = this.x + ca * 19;
      const sy = this.y + sa * 19;
      const color = OD.Sprites.color(this.spriteKey);
      const w = 1 + this.heat;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 7 * w;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 * w;
      ctx.stroke();
      ctx.globalAlpha = 1;
      r.disc(t.x, t.y, 5 + 3 * this.heat, color, 0.6);
    }
  }

  OD.registerDefense('laser', LaserDefense);
})();
