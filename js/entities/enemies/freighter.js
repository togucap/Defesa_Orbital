// Cargueiro (evento): atravessa a tela sem atacar, longe do planeta.
// Se for abatido antes de sair, dá muitas moedas e pode soltar um núcleo.
(() => {
  const OD = (window.OD = window.OD || {});

  class Freighter extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      this.event = true;
      // rota: passa ao lado do planeta (nunca por cima) e sai do outro lado
      const side = Math.random() < 0.5 ? -1 : 1;
      const toCenter = Math.atan2(-y, -x);
      this.angle = toCenter + side * 0.45;
    }

    move(m, dt) {
      this.setVelocity(this.angle, this.currentSpeed());
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // fugiu: saiu da tela depois de ter aparecido
      const v = OD.view;
      const out = this.x < v.left - 80 || this.x > v.right + 80 || this.y < v.top - 80 || this.y > v.bottom + 80;
      if (this.age > 2 && out) {
        this.alive = false;
        OD.events.emit('event:escaped', this);
      }
    }

    onDeath(m) {
      if (Math.random() < this.cfg.coreChance) {
        m.stats.bonusCores = (m.stats.bonusCores || 0) + 1;
        OD.fx.text(m, '+1 núcleo', this.x, this.y - 30, '#e3c2ff', 20);
      }
      OD.fx.explosion(m, this.x, this.y, 40, '#ffd34d');
      OD.events.emit('event:collect', this);
    }

    hitPlanet() {} // nunca colide

    draw(r) {
      super.draw(r);
      if (this.hp < this.maxHp) r.bar(this.x, this.y - this.radius - 10, 50, this.hp / this.maxHp, '#ffd34d');
    }
  }

  OD.registerEnemy('freighter', Freighter);
})();
