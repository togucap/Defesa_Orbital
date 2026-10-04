// Planeta no centro (origem do mundo). Se a vida zerar, é game over
// (a menos que a carta Último Recurso esteja ativa).
(() => {
  const OD = (window.OD = window.OD || {});

  class Planet {
    constructor() {
      const c = OD.CONFIG.planet;
      this.x = 0;
      this.y = 0;
      this.radius = c.radius;
      this.maxHp = c.maxHp;
      this.hp = c.maxHp;
      this.armor = 0;       // redução de dano (0–1)
      this.secondLife = 0;  // fração de vida ao reviver (Último Recurso)
      this.flash = 0;
      this.cracks = Planet.makeCracks(this.radius);
    }

    // rachaduras fixas (aparecem conforme a vida cai)
    static makeCracks(R) {
      const rnd = OD.math.seeded(9);
      const list = [];
      for (let i = 0; i < 7; i++) {
        let a = rnd() * Math.PI * 2;
        let d = R * 0.95;
        const pts = [Math.cos(a) * d, Math.sin(a) * d];
        for (let j = 0; j < 4; j++) {
          a += (rnd() - 0.5) * 0.9;
          d -= R * (0.12 + rnd() * 0.12);
          pts.push(Math.cos(a) * d, Math.sin(a) * d);
        }
        list.push(pts);
      }
      return list;
    }

    get alive() {
      return this.hp > 0;
    }

    // aplica dano já reduzido pela blindagem e devolve o valor final
    damage(amount) {
      if (this.hp <= 0 || amount <= 0) return 0;
      const dealt = amount * (1 - this.armor);
      this.hp -= dealt;
      this.flash = 0.3;
      if (this.hp <= 0) {
        if (this.secondLife > 0) {
          this.hp = this.maxHp * this.secondLife;
          this.secondLife = 0;
          OD.events.emit('planet:revive', this);
        } else {
          this.hp = 0;
        }
      }
      OD.events.emit('planet:damage', dealt);
      return dealt;
    }

    heal(amount) {
      if (this.hp <= 0) return 0;
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + amount);
      return this.hp - before;
    }

    update(dt) {
      if (this.flash > 0) this.flash -= dt;
    }

    // camadas: atmosfera pulsando, superfície (gira), sombra/luzes, rachaduras, escudo
    draw(r) {
      if (this.hp <= 0) return; // destruído: só as explosões aparecem
      const pulse = Math.sin(r.time * 1.6);
      r.sprite('planet_atmo', 0, 0, 0, 1 + 0.025 * pulse, 0.8 + 0.2 * pulse);
      r.sprite('planet', 0, 0);
      r.sprite('planet_shade', 0, 0);
      const damage = 1 - this.hp / this.maxHp;
      if (damage > 0.45) this.drawCracks(r, Math.min(1, (damage - 0.45) / 0.45));
      if (this.flash > 0) r.sprite('planet_shield', 0, 0, 0, 1, this.flash / 0.3);
    }

    drawCracks(r, k) {
      const ctx = r.ctx;
      const n = Math.ceil(this.cracks.length * k);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#ffe2a8' : '#ff6a3d';
        ctx.globalAlpha = pass ? 0.6 * k : (0.35 + 0.15 * Math.sin(r.time * 4)) * k;
        ctx.lineWidth = pass ? 1.2 : 4.5;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const p = this.cracks[i];
          ctx.moveTo(p[0], p[1]);
          for (let j = 2; j < p.length; j += 2) ctx.lineTo(p[j], p[j + 1]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  OD.Planet = Planet;
})();
