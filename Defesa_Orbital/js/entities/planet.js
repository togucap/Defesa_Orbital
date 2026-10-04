// Planeta no centro (origem do mundo). Se a vida zerar, é game over.
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
      this.flash = 0;
    }

    get alive() {
      return this.hp > 0;
    }

    damage(amount) {
      if (this.hp <= 0 || amount <= 0) return;
      this.hp = Math.max(0, this.hp - amount);
      this.flash = 0.3;
      OD.events.emit('planet:damage', amount);
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

    draw(r) {
      if (this.hp <= 0) return; // destruído: só as explosões aparecem
      r.sprite('planet', 0, 0);
      if (this.flash > 0) r.ring(0, 0, this.radius + 5, '#ff4d6d', 7, (this.flash / 0.3) * 0.7);
    }
  }

  OD.Planet = Planet;
})();
