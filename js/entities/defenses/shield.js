// Escudo de energia: arco logo além do slot que bloqueia inimigos e tiros
// vindos de fora. Regenera após um tempo sem dano; se quebrar, volta depois.
(() => {
  const OD = (window.OD = window.OD || {});
  const { angleDiff, deg } = OD.math;

  class ShieldDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.charge = this.stat('capacity');
      this.broken = 0;
      this.sinceHit = 99;
      this.hitFlash = 0;
    }

    get up() {
      return this.active && this.broken <= 0;
    }

    arcRadius() {
      return this.slot.radius + 28;
    }

    act(m, dt) {
      this.angle = this.slot.angle;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.broken > 0) {
        this.broken -= dt;
        if (this.broken <= 0) {
          this.broken = 0;
          this.charge = this.stat('capacity') * this.stat('restore');
          OD.fx.ring(m, this.x, this.y, 30, OD.Sprites.color(this.spriteKey), 0.4);
        }
        return;
      }
      this.sinceHit += dt;
      if (this.sinceHit >= this.stat('regenDelay')) {
        this.charge = Math.min(this.stat('capacity'), this.charge + this.stat('regen') * dt);
      }
    }

    // o círculo (x,y,r) está cruzando o arco vindo de fora?
    blocks(x, y, r, vx, vy) {
      if (!this.up) return false;
      if (x * vx + y * vy >= 0) return false; // indo para longe do planeta
      const R = this.arcRadius();
      const d = Math.sqrt(x * x + y * y);
      if (Math.abs(d - R) > r + 5) return false;
      const half = deg(this.stat('arcWidth')) / 2 + r / R;
      return Math.abs(angleDiff(this.slot.angle, Math.atan2(y, x))) <= half;
    }

    absorb(m, amount, x, y) {
      this.charge -= amount;
      this.sinceHit = 0;
      this.hitFlash = 0.15;
      OD.fx.sparks(m, x, y, OD.Sprites.color(this.spriteKey), 5);
      if (this.charge <= 0) {
        this.charge = 0;
        this.broken = this.stat('breakTime');
        OD.fx.ring(m, this.x, this.y, this.arcRadius() - this.slot.radius + 20, '#9fefff', 0.5);
        OD.events.emit('sfx', 'shieldBreak');
      }
    }

    onLevelUp() {
      super.onLevelUp();
      if (this.broken <= 0) this.charge = this.stat('capacity');
    }

    drawFront(r) {
      if (!this.up) return;
      const ctx = r.ctx;
      const R = this.arcRadius();
      const half = deg(this.stat('arcWidth')) / 2;
      const a = this.slot.angle;
      const frac = this.charge / this.stat('capacity');
      const color = this.hitFlash > 0 ? '#ffffff' : OD.Sprites.color(this.spriteKey);
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.14 + 0.1 * frac;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, R, a - half, a + half);
      ctx.stroke();
      ctx.globalAlpha = 0.35 + 0.6 * frac;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  OD.registerDefense('shield', ShieldDefense);
  OD.ShieldDefense = ShieldDefense;
})();
