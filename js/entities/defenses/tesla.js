// Bobina Tesla: arco elétrico que salta entre inimigos próximos.
// Especializações: Tempestade (mais saltos) e Atordoar (paralisa).
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class TeslaDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0.3;
      this.hits = [];
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const t = this.keepTarget(m, this.stat('range'));
      if (!t || this.cooldown > 0) return;
      this.cooldown = 1 / this.stat('fireRate');
      this.angle = Math.atan2(t.y - this.y, t.x - this.x);

      const br = this.branchCfg;
      const jumps = Math.round(this.stat('chains'));
      const r2 = this.stat('chainRange') ** 2;
      const falloff = this.stat('chainFalloff');
      const color = OD.Sprites.color(this.spriteKey);
      const hits = this.hits;
      hits.length = 0;
      let dmg = this.stat('damage');
      let fromX = this.x;
      let fromY = this.y;
      let cur = t;
      for (let k = 0; k <= jumps && cur; k++) {
        OD.fx.zap(m, fromX, fromY, cur.x, cur.y, k ? color : '#ffffff', 0.14, k ? 2 : 3);
        hits.push(cur);
        if (br && br.stun) cur.freeze(br.stun);
        this.hit(m, cur, dmg);
        fromX = cur.x;
        fromY = cur.y;
        dmg *= falloff;
        // próximo: inimigo mais perto ainda não atingido
        let next = null;
        let best = r2;
        for (const e of m.enemies) {
          if (!e.alive || !e.visible || hits.indexOf(e) >= 0) continue;
          const d = dist2(fromX, fromY, e.x, e.y);
          if (d < best) {
            best = d;
            next = e;
          }
        }
        cur = next;
      }
      OD.events.emit('sfx', 'zap');
    }
  }

  OD.registerDefense('tesla', TeslaDefense);
})();
