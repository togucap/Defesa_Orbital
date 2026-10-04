// Reparador do planeta: recupera a vida do planeta aos poucos.
// Especializações (efeitos aplicados em OD.Bonuses.step):
// Nanorreparo (conserta defesas) e Fortificar (blindagem do planeta).
(() => {
  const OD = (window.OD = window.OD || {});

  class RepairDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.healing = false;
      this.acc = 0;
      this.numTimer = 1;
      this.sparkTimer = 0;
    }

    act(m, dt) {
      const p = m.planet;
      this.healing = p.hp < p.maxHp;
      if (this.branch === 'nano') this.nanoSparks(m, dt);
      if (!this.healing) return;
      this.acc += p.heal(this.stat('heal') * dt);
      this.numTimer -= dt;
      if (this.numTimer <= 0) {
        this.numTimer = 1;
        if (this.acc >= 1) {
          const ang = Math.atan2(this.y, this.x);
          OD.fx.text(m, '+' + Math.round(this.acc), Math.cos(ang) * (p.radius + 12), Math.sin(ang) * (p.radius + 12), '#4ade80', 16);
        }
        this.acc = 0;
      }
    }

    // faíscas verdes nas defesas sendo consertadas
    nanoSparks(m, dt) {
      this.sparkTimer -= dt;
      if (this.sparkTimer > 0) return;
      this.sparkTimer = 0.4;
      for (const s of m.slots) {
        const d = s.defense;
        if (d && d !== this && d.hp < d.maxHp) OD.fx.sparks(m, d.x, d.y, '#4ade80', 1);
      }
    }

    onDisable() {
      this.healing = false;
    }

    drawFront(r, m) {
      if (!this.active) return;
      if (this.branch === 'fortify') r.ring(0, 0, m.planet.radius + 9, '#4ade80', 2, 0.25 + 0.1 * Math.sin(r.time * 3));
      if (!this.healing) return;
      const ctx = r.ctx;
      const R = m.planet.radius;
      const d = Math.hypot(this.x, this.y);
      const ux = -this.x / d;
      const uy = -this.y / d;
      const len = d - R - 16;
      const color = OD.Sprites.color(this.spriteKey);
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(r.time * 8);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(this.x + ux * 16, this.y + uy * 16);
      ctx.lineTo(this.x + ux * (16 + len), this.y + uy * (16 + len));
      ctx.stroke();
      ctx.globalAlpha = 1;
      // pulso que viaja até o planeta
      const t = (r.time * 1.5) % 1;
      r.disc(this.x + ux * (16 + len * t), this.y + uy * (16 + len * t), 3.5, '#d9ffe8', 0.9);
    }
  }

  OD.registerDefense('repair', RepairDefense);
})();
