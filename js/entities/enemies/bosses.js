// Chefes dos setores (a Mãe-Enxame usa a classe base do chefe com outra config):
// Couraçado (couraça frontal), Dreadnought (laser de varredura) e Hidra
// (divide-se em duas cabeças ao morrer).
(() => {
  const OD = (window.OD = window.OD || {});
  const { angleDiff, deg, segDist2 } = OD.math;
  const Boss = OD.enemyClasses.boss;

  // Couraçado: recebe pouco dano de quem ataca pela frente
  class Juggernaut extends Boss {
    damageTakenMult(o) {
      if (o.fromX == null) return 1;
      const toAttacker = Math.atan2(o.fromY - this.y, o.fromX - this.x);
      return Math.abs(angleDiff(this.angle, toAttacker)) < deg(this.cfg.frontArc) ? this.cfg.frontArmor : 1;
    }

    draw(r) {
      super.draw(r);
      const ctx = r.ctx;
      const half = deg(this.cfg.frontArc);
      ctx.strokeStyle = '#7ee8ff';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 14, this.angle - half, this.angle + half);
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Dreadnought: laser que varre um setor, ferindo defesas e o planeta
  class Dreadnought extends Boss {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      this.laserT = -2;      // < 0 = carregando; > 0 = ligado
      this.beam = null;
      const k = 1 + OD.CONFIG.waves.damagePerWave * (wave - 1);
      this.laserDps = this.cfg.laserDps * k;
      this.laserPlanetDps = this.cfg.laserPlanetDps * k;
    }

    move(m, dt) {
      super.move(m, dt);
      const c = this.cfg;
      this.beam = null;
      if (!this.visible) return;
      this.laserT += dt;
      if (this.laserT >= c.laserOn) this.laserT = -c.laserOff;
      if (this.laserT < 0) return;
      const base = Math.atan2(-this.y, -this.x);
      const a = base + Math.sin((this.laserT / c.laserOn) * Math.PI * 2) * deg(c.laserSweep);
      const len = Math.hypot(this.x, this.y) + 120;
      const x2 = this.x + Math.cos(a) * len;
      const y2 = this.y + Math.sin(a) * len;
      this.beam = { x2, y2 };
      const w = c.laserWidth / 2;
      for (const s of m.slots) {
        const d = s.defense;
        if (d && d.active && segDist2(d.x, d.y, this.x, this.y, x2, y2) < (w + 16) ** 2) d.damage(m, this.laserDps * dt);
      }
      if (segDist2(0, 0, this.x, this.y, x2, y2) < (m.planet.radius + w) ** 2) m.planet.damage(this.laserPlanetDps * dt);
    }

    draw(r) {
      if (this.beam) {
        const ctx = r.ctx;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#ff7a1a';
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = this.cfg.laserWidth * 1.8;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.beam.x2, this.beam.y2);
        ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#fff1d6';
        ctx.lineWidth = this.cfg.laserWidth * 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (this.visible && this.laserT > -0.8 && this.laserT < 0) {
        r.ring(this.x, this.y, this.radius + 10 + Math.random() * 6, '#ff7a1a', 3, 0.7); // aviso: vai disparar
      }
      super.draw(r);
    }
  }

  // Hidra: ao morrer, a principal se divide em duas cabeças
  class Hydra extends Boss {
    onDeath(m) {
      super.onDeath(m);
      const c = this.cfg;
      if (c.minion || !c.splitInto) return;
      for (let i = 0; i < c.splitCount; i++) {
        const a = Math.atan2(this.y, this.x) + (i ? 0.6 : -0.6);
        const e = OD.spawnEnemy(m, c.splitInto, this.wave, this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40);
        e.visible = true;
        e.orbitDir = i ? 1 : -1;
      }
      OD.events.emit('boss:split', this);
    }
  }

  OD.registerEnemy('juggernaut', Juggernaut);
  OD.registerEnemy('dreadnought', Dreadnought);
  OD.registerEnemy('hydra', Hydra);
})();
