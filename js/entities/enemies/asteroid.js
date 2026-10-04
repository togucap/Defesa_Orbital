// Asteroides: seguem reto girando. Os grandes se dividem ao serem destruídos.
// A mesma classe serve aos dois tipos; a diferença está na config.
(() => {
  const OD = (window.OD = window.OD || {});

  class Asteroid extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * (40 / this.radius);
      // mira um ponto qualquer do planeta (trajetórias variadas)
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * OD.CONFIG.planet.radius * 0.6;
      this.aimX = Math.cos(a) * d;
      this.aimY = Math.sin(a) * d;
    }

    move(m, dt) {
      this.rot += this.rotSpeed * dt;
      this.moveTowards(this.aimX, this.aimY, dt);
    }

    spriteAngle() {
      return this.rot;
    }

    onDeath(m) {
      const c = this.cfg;
      if (!c.splitInto) return;
      for (let i = 0; i < c.splitCount; i++) {
        const a = (i / c.splitCount) * Math.PI * 2 + Math.random();
        const e = OD.spawnEnemy(m, c.splitInto, this.wave, this.x + Math.cos(a) * this.radius * 0.6, this.y + Math.sin(a) * this.radius * 0.6, {
          rewardMult: 0.5,
          fragment: true,
          speedMult: m.rules.speedMult,
        });
        e.visible = this.visible;
      }
    }
  }

  OD.registerEnemy('asteroidSmall', Asteroid);
  OD.registerEnemy('asteroidBig', Asteroid);
  OD.Asteroid = Asteroid;
})();
