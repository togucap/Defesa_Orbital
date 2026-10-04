// Artilharia: projéteis lentos de alcance enorme que caem num ponto
// (com mira antecipada). Barragem: 4 projéteis; Perfura-escudo: ignora defesas.
(() => {
  const OD = (window.OD = window.OD || {});

  class ArtilleryDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 1;
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const t = this.keepTarget(m, this.stat('range'));
      if (!t) return;
      const aimed = this.aimAt(t.x, t.y, dt, 3);
      if (!aimed || this.cooldown > 0) return;
      this.cooldown = this.stat('reload');

      const speed = this.stat('shellSpeed');
      const flight = Math.hypot(t.x - this.x, t.y - this.y) / speed;
      const px = t.x + t.vx * flight;
      const py = t.y + t.vy * flight;
      const br = this.branchCfg;
      const count = br && br.count ? br.count : 1;
      for (let i = 0; i < count; i++) {
        const ox = count > 1 ? (Math.random() - 0.5) * 90 : 0;
        const oy = count > 1 ? (Math.random() - 0.5) * 90 : 0;
        this.launch(m, px + ox, py + oy, speed);
      }
      OD.fx.ring(m, this.x + Math.cos(this.angle) * 18, this.y + Math.sin(this.angle) * 18, 14, '#ffe2a8', 0.2);
      OD.events.emit('sfx', 'missile');
    }

    launch(m, tx, ty, speed) {
      const sx = this.x + Math.cos(this.angle) * 18;
      const sy = this.y + Math.sin(this.angle) * 18;
      const p = m.projectiles.get();
      p.init('shell', sx, sy, Math.atan2(ty - sy, tx - sx), speed, this.stat('damage'), 'proj_shell');
      p.tx = tx;
      p.ty = ty;
      p.dist = Math.hypot(tx - sx, ty - sy);
      p.blast = this.stat('blastRadius');
      p.life = 10;
      p.dmgType = this.cfg.damageType;
      p.owner = this;
    }
  }

  OD.registerDefense('artillery', ArtilleryDefense);
})();
