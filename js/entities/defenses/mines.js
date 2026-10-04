// Lançador de Minas: espalha minas no caminho dos inimigos (lado de fora
// da órbita); elas explodem ao contato. Criogênicas congelam.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;

  class MinesDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.cooldown = 0.5;
      this.mines = []; // { x, y, t }
    }

    act(m, dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      const max = Math.floor(this.stat('maxMines'));
      if (this.mines.length > max) this.mines.length = max;
      if (this.mines.length < max && this.cooldown <= 0) {
        this.cooldown = this.stat('reload');
        this.place(m);
      }
      // gatilho
      const br = this.branchCfg;
      for (let i = this.mines.length - 1; i >= 0; i--) {
        const mine = this.mines[i];
        mine.t += dt;
        if (mine.t < 0.4) continue; // armando
        let hit = false;
        for (const e of m.enemies) {
          if (!e.alive || e.boss && !e.visible) continue;
          const reach = 24 + e.radius; // sensor de proximidade
          if (dist2(e.x, e.y, mine.x, mine.y) < reach * reach) {
            hit = true;
            break;
          }
        }
        if (!hit) continue;
        const blast = this.stat('blastRadius');
        if (br && br.freeze) {
          for (const e of m.enemies) {
            const reach = blast + e.radius;
            if (e.alive && dist2(e.x, e.y, mine.x, mine.y) < reach * reach) e.freeze(br.freeze);
          }
        }
        OD.Damage.area(m, this, mine.x, mine.y, blast, this.stat('mineDamage'), 'explosive');
        OD.fx.explosion(m, mine.x, mine.y, 18, br && br.freeze ? '#bfefff' : '#ff6b4a');
        OD.fx.ring(m, mine.x, mine.y, blast, br && br.freeze ? '#bfefff' : '#ffb38a', 0.3);
        OD.events.emit('sfx', 'boom');
        this.mines.splice(i, 1);
      }
    }

    // na rota prevista de um inimigo próximo; sem inimigos, posição aleatória
    // no alcance, do lado de fora da órbita da defesa
    place(m) {
      const range = this.stat('range');
      const v = OD.view;
      for (const e of m.enemies) {
        if (!e.alive || !e.visible) continue;
        const x = e.x + e.vx * 1.2;
        const y = e.y + e.vy * 1.2;
        if (dist2(x, y, this.x, this.y) > range * range || this.mines.some((mn) => dist2(mn.x, mn.y, x, y) < 40 * 40)) continue;
        this.mines.push({ x, y, t: 0 });
        OD.fx.ring(m, x, y, 16, OD.Sprites.color(this.spriteKey), 0.25);
        return;
      }
      for (let tries = 0; tries < 6; tries++) {
        const a = this.slot.angle + (Math.random() - 0.5) * 1.8;
        const d = 40 + Math.random() * (range - 40);
        const x = this.x + Math.cos(a) * d;
        const y = this.y + Math.sin(a) * d;
        if (Math.hypot(x, y) < this.slot.radius + 20) continue;
        if (x < v.left + 10 || x > v.right - 10 || y < v.top + 10 || y > v.bottom - 10) continue;
        this.mines.push({ x, y, t: 0 });
        OD.fx.ring(m, x, y, 16, OD.Sprites.color(this.spriteKey), 0.25);
        return;
      }
    }

    onRemove() {
      this.mines.length = 0;
    }

    drawBack(r) {
      const frost = this.branch === 'cryo';
      for (const mine of this.mines) {
        const armed = mine.t >= 0.4;
        r.sprite(frost ? 'mine_cryo' : 'mine', mine.x, mine.y, mine.t * 0.6, 1, armed ? 1 : 0.5);
        if (armed && Math.sin(r.time * 6 + mine.x) > 0.6) r.disc(mine.x, mine.y, 2.5, frost ? '#bfefff' : '#ff3b30', 0.9);
      }
    }
  }

  OD.registerDefense('mines', MinesDefense);
})();
