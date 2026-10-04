// Torreta laser: feixe contínuo que esquenta (mais dano) no mesmo alvo.
// Especializações: Corrente (salta entre inimigos) e Raio Pesado (chefes).
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class LaserDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.heat = 0;          // 0..1
      this.firing = false;
      this.lastTarget = null;
      this.chainTargets = [];
      this.chainCount = 0;
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
      this.chainCount = 0;
      if (!t) return;
      if (!this.aimAt(t.x, t.y, dt, 14)) return;

      const br = this.branchCfg;
      this.firing = true;
      this.heat = Math.min(1, this.heat + dt / this.stat('heatTime'));
      const mult = 1 + (this.stat('heatMax') - 1) * this.heat;
      let dmg = this.stat('dps') * mult * dt;
      if (br && br.bossMult && t.boss) dmg *= br.bossMult;
      this.dmgAcc += dmg;
      this.hit(m, t, dmg, false);
      if (br && br.chain) this.chain(m, t, dmg, br);

      this.numTimer -= dt;
      if (this.numTimer <= 0 || !t.alive) this.flushNumber(m);
      if (Math.random() < dt * 12) OD.fx.sparks(m, t.x, t.y, OD.Sprites.color(this.spriteKey), 1);
    }

    // feixe salta do alvo para os inimigos mais próximos
    chain(m, first, dmg, br) {
      const list = this.chainTargets;
      let from = first;
      const r2 = br.chainRange * br.chainRange;
      for (let k = 0; k < br.chain; k++) {
        let best = null;
        let bestD = r2;
        for (const e of m.enemies) {
          if (!e.alive || !e.visible || e === first) continue;
          let used = false;
          for (let j = 0; j < k; j++) if (list[j] === e) used = true;
          if (used) continue;
          const d = dist2(from.x, from.y, e.x, e.y);
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        if (!best) break;
        list[k] = best;
        this.chainCount = k + 1;
        this.hit(m, best, dmg * Math.pow(br.chainFalloff, k + 1), false);
        from = best;
      }
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

    beam(ctx, x1, y1, x2, y2, color, w) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 7 * w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 * w;
      ctx.stroke();
    }

    drawFront(r) {
      const t = this.lastTarget;
      if (!this.firing || !t || !t.alive) return;
      const ctx = r.ctx;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const color = OD.Sprites.color(this.spriteKey);
      const w = (1 + this.heat) * (this.branch === 'heavy' ? 1.5 : 1);
      ctx.lineCap = 'round';
      this.beam(ctx, this.x + ca * 19, this.y + sa * 19, t.x, t.y, color, w);
      let from = t;
      for (let k = 0; k < this.chainCount; k++) {
        const e = this.chainTargets[k];
        if (!e.alive) break;
        this.beam(ctx, from.x, from.y, e.x, e.y, color, w * 0.6);
        from = e;
      }
      ctx.globalAlpha = 1;
      r.disc(t.x, t.y, 5 + 3 * this.heat, color, 0.6);
    }
  }

  OD.registerDefense('laser', LaserDefense);
})();
