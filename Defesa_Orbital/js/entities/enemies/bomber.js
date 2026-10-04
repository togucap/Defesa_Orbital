// Nave bombardeira: para a certa distância, circula devagar e atira no
// planeta ou nas defesas.
(() => {
  const OD = (window.OD = window.OD || {});

  class Bomber extends OD.Enemy {
    constructor(type, wave, x, y, opts) {
      super(type, wave, x, y, opts);
      const c = this.cfg;
      this.orbitDir = Math.random() < 0.5 ? -1 : 1;
      this.fireTimer = 0.6 + Math.random() * c.fireInterval;
      this.shotDamage = c.shotDamage * (1 + OD.CONFIG.waves.damagePerWave * (wave - 1));
      this.aim = null; // defesa na mira (ou null = planeta)
    }

    move(m, dt) {
      const c = this.cfg;
      const d = Math.hypot(this.x, this.y);
      if (d > c.standoff) {
        this.moveTowards(0, 0, dt);
        return;
      }
      // circula o planeta na distância de ataque
      const w = (this.currentSpeed() * 0.35) / d;
      const a = Math.atan2(this.y, this.x) + this.orbitDir * w * dt;
      this.x = Math.cos(a) * d;
      this.y = Math.sin(a) * d;
      this.setVelocity(a + (this.orbitDir * Math.PI) / 2, this.currentSpeed() * 0.35);

      if (this.aim && (!this.aim.active || this.aim.slot.defense !== this.aim)) this.aim = null;
      const tx = this.aim ? this.aim.x : 0;
      const ty = this.aim ? this.aim.y : 0;
      this.angle = Math.atan2(ty - this.y, tx - this.x);

      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.visible) {
        this.fireTimer = c.fireInterval;
        this.fire(m, tx, ty);
        // escolhe o próximo alvo
        this.aim = Math.random() < c.targetDefenseChance ? OD.Combat.randomDefense(m) : null;
      }
    }

    fire(m, tx, ty) {
      const c = this.cfg;
      const a = Math.atan2(ty - this.y, tx - this.x);
      const p = m.projectiles.get();
      p.init('enemy', this.x + Math.cos(a) * 18, this.y + Math.sin(a) * 18, a, c.shotSpeed, this.shotDamage, 'proj_enemyShot');
      p.radius = 6;
      p.life = Math.hypot(tx - this.x, ty - this.y) / c.shotSpeed + 1;
      OD.events.emit('sfx', 'enemyShot');
    }
  }

  OD.registerEnemy('bomber', Bomber);
})();
