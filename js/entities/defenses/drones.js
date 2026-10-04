// Hangar de Drones: drones voam pela tela caçando inimigos em qualquer lugar.
// Especializações: Caças (mais drones e mais rápidos) e Bombardeiros (bombas).
(() => {
  const OD = (window.OD = window.OD || {});
  const { turnTowards, dist2 } = OD.math;

  class DronesDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.drones = [];
    }

    count() {
      const br = this.branchCfg;
      return Math.floor(this.stat('drones')) + (br && br.extraDrones ? br.extraDrones : 0);
    }

    act(m, dt) {
      const n = this.count();
      while (this.drones.length < n) {
        this.drones.push({ x: this.x, y: this.y, angle: this.slot.angle, cd: Math.random(), target: null, orbit: Math.random() * 6.28 });
      }
      this.drones.length = n;

      const speed = this.stat('droneSpeed');
      const rate = this.stat('fireRate');
      const br = this.branchCfg;
      for (const d of this.drones) {
        d.cd -= dt;
        d.orbit += dt * 2.2;
        let t = d.target;
        if (!t || !t.alive || !t.visible) t = d.target = this.findTarget(m, 2000);
        // circula ao redor do alvo (ou do hangar quando não há inimigos)
        const cx = t ? t.x : this.x;
        const cy = t ? t.y : this.y;
        const rad = t ? 70 : 34;
        const gx = cx + Math.cos(d.orbit) * rad;
        const gy = cy + Math.sin(d.orbit) * rad;
        d.angle = turnTowards(d.angle, Math.atan2(gy - d.y, gx - d.x), 7 * dt);
        d.x += Math.cos(d.angle) * speed * dt;
        d.y += Math.sin(d.angle) * speed * dt;
        if (t && d.cd <= 0 && dist2(d.x, d.y, t.x, t.y) < 170 * 170) {
          d.cd = 1 / rate;
          this.shoot(m, d, t, br);
        }
      }
    }

    shoot(m, d, t, br) {
      const a = Math.atan2(t.y - d.y, t.x - d.x);
      const p = m.projectiles.get();
      if (br && br.bombs) {
        p.init('missile', d.x, d.y, a, 220, this.stat('droneDamage'), 'proj_bomb');
        p.target = t;
        p.turnRate = 9;
        p.blast = br.bombs;
        p.life = 2;
        p.dmgType = 'explosive';
      } else {
        p.init('bullet', d.x, d.y, a, 620, this.stat('droneDamage'), 'proj_bullet');
        p.life = 0.5;
        p.scale = 0.7;
        p.dmgType = this.cfg.damageType;
      }
      p.owner = this;
    }

    onRemove() {
      this.drones.length = 0;
    }

    onDisable() {
      this.drones.length = 0;
    }

    drawFront(r) {
      if (!this.active) return;
      for (const d of this.drones) r.sprite('drone', d.x, d.y, d.angle, this.branch === 'bombers' ? 1.25 : 1);
    }
  }

  OD.registerDefense('drones', DronesDefense);
})();
