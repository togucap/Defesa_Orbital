// Chefe (Nau-mãe): muita vida; para longe do planeta, circula, dispara
// rajadas em leque e invoca kamikazes.
(() => {
  const OD = (window.OD = window.OD || {});
  const { deg } = OD.math;

  class Boss extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      const c = this.cfg;
      this.orbitDir = Math.random() < 0.5 ? -1 : 1;
      this.volleyTimer = 2;
      this.summonTimer = c.summonInterval * 0.6;
      this.shotDamage = c.shotDamage * (1 + OD.CONFIG.waves.damagePerWave * (wave - 1));
    }

    move(m, dt) {
      const c = this.cfg;
      m.boss = this;
      const d = Math.hypot(this.x, this.y);
      if (d > c.standoff) {
        this.moveTowards(0, 0, dt);
      } else {
        const a = Math.atan2(this.y, this.x) + this.orbitDir * c.orbitSpeed * (1 - this.slow) * dt;
        this.x = Math.cos(a) * d;
        this.y = Math.sin(a) * d;
        this.setVelocity(a + (this.orbitDir * Math.PI) / 2, c.orbitSpeed * d * (1 - this.slow));
        this.angle = Math.atan2(-this.y, -this.x);
      }
      if (!this.visible) return;

      this.volleyTimer -= dt;
      if (this.volleyTimer <= 0) {
        this.volleyTimer = c.volleyInterval;
        this.volley(m);
      }
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = c.summonInterval;
        this.summon(m);
      }
    }

    // leque de tiros na direção do planeta
    volley(m) {
      const c = this.cfg;
      const base = Math.atan2(-this.y, -this.x);
      const spread = deg(c.volleySpread);
      for (let i = 0; i < c.volleyCount; i++) {
        const a = base - spread / 2 + (spread * i) / Math.max(1, c.volleyCount - 1);
        const p = m.projectiles.get();
        p.init('enemy', this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40, a, c.shotSpeed, this.shotDamage, 'proj_bossShot');
        p.radius = 8;
        p.life = 4;
      }
      OD.events.emit('sfx', 'bossShot');
    }

    summon(m) {
      const c = this.cfg;
      for (let i = 0; i < c.summonCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = OD.spawnEnemy(m, c.summonType, this.wave, this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50, { rewardMult: 0.5 });
        e.visible = true;
      }
      OD.fx.ring(m, this.x, this.y, 70, '#ff6b81', 0.5);
    }

    onDeath(m) {
      m.shake = 1;
      for (let i = 0; i < 5; i++) {
        OD.fx.explosion(m, this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80, 30, '#ff8a5c');
      }
      OD.events.emit('boss:killed', this);
    }

    draw(r) {
      super.draw(r);
      if (this.slow > 0) r.ring(this.x, this.y, this.radius + 8, '#b47cff', 3, 0.5);
    }
  }

  OD.registerEnemy('boss', Boss);
})();
