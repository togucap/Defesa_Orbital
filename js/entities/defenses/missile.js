// Lançador de mísseis: míssil teleguiado com dano em área, recarga lenta.
// Especializações: Enxame (vários mísseis) e Ogiva (um míssil enorme).
(() => {
  const OD = (window.OD = window.OD || {});

  class MissileDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0.5;
      this.side = 1;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const t = this.keepTarget(m, this.stat('range'));
      if (!t) return;
      this.aimAt(t.x, t.y, dt, 6);
      if (this.cooldown > 0) return;

      this.cooldown = this.stat('reload');
      const br = this.branchCfg;
      const count = br && br.count ? br.count : 1;
      for (let i = 0; i < count; i++) {
        const off = count > 1 ? (i - (count - 1) / 2) * 0.4 : 0;
        this.launch(m, t, this.angle + off);
      }
      OD.events.emit('sfx', 'missile');
    }

    launch(m, target, angle) {
      this.side = -this.side;
      const ca = Math.cos(this.angle);
      const sa = Math.sin(this.angle);
      const ox = this.x + ca * 12 - sa * this.side * 5;
      const oy = this.y + sa * 12 + ca * this.side * 5;
      const p = m.projectiles.get();
      p.init('missile', ox, oy, angle, this.stat('missileSpeed'), this.stat('damage'), 'proj_missile');
      p.target = target;
      p.turnRate = this.stat('turnRate');
      p.blast = this.stat('blastRadius');
      p.radius = 6;
      p.life = 4;
      p.dmgType = this.cfg.damageType;
      p.source = this.type;
      p.scale = this.branch === 'warhead' ? 1.4 : this.branch === 'swarm' ? 0.75 : 1;
    }
  }

  OD.registerDefense('missile', MissileDefense);
})();
