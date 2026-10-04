// Dano das defesas: aplica os efeitos de módulos, mutações e auras
// (d.traits, calculado em OD.Bonuses.refresh) antes de ferir o inimigo.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2 } = OD.math;
  const opts = { show: true, shred: 0, crit: false, fromX: 0, fromY: 0 }; // reaproveitado

  const Damage = {
    // d = defesa (ou null); source = origem para estatísticas quando d é null
    deal(m, d, e, amount, type, show = true, source = null, noBounce = false) {
      if (!e.alive || amount <= 0) return;
      const t = d ? d.traits : null;
      let a = amount;
      opts.crit = false;
      opts.shred = 0;
      opts.show = show;
      opts.fromX = d ? d.x : 0;
      opts.fromY = d ? d.y : 0;
      if (t) {
        if (t.fail && Math.random() < t.fail) {
          if (show) OD.fx.text(m, 'falhou', e.x, e.y - e.radius - 10, '#8a9cc8', 14);
          return;
        }
        if (t.twin) a *= 1 + t.twin;
        if (t.crit && Math.random() < t.crit) {
          a *= t.critMult;
          opts.crit = true;
        }
        opts.shred = t.shred;
        if (t.greed > (e.greed || 0)) e.greed = t.greed;
        if (t.cryo) e.applySlow(t.cryo, 1.5);
        if (t.burn) e.ignite(a * t.burn, d.type);
      }
      e.takeDamage(m, a, type, d ? d.type : source, opts);

      if (t) {
        if (t.vampiric && !e.alive) m.planet.heal(m.planet.maxHp * t.vampiric);
        // ricochete / arco elétrico: parte do dano salta para outro inimigo
        const bounce = t.ricochet + t.arc;
        if (!noBounce && bounce && Math.random() < bounce) {
          const o = this.nearestOther(m, e, 140);
          if (o) {
            this.deal(m, d, o, a * 0.5, type, show, source, true);
            OD.fx.zap(m, e.x, e.y, o.x, o.y, t.arc ? '#ffe066' : '#7ee8ff');
          }
        }
      }
    },

    // dano em área ao redor de (x, y)
    area(m, d, x, y, radius, amount, type, source) {
      const enemies = m.enemies;
      const n = enemies.length;
      for (let i = 0; i < n; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const reach = radius + e.radius;
        if (dist2(x, y, e.x, e.y) < reach * reach) this.deal(m, d, e, amount, type, true, source);
      }
    },

    nearestOther(m, from, maxDist) {
      let best = null;
      let bestD = maxDist * maxDist;
      for (const e of m.enemies) {
        if (e === from || !e.alive || !e.visible) continue;
        const dd = dist2(from.x, from.y, e.x, e.y);
        if (dd < bestD) {
          bestD = dd;
          best = e;
        }
      }
      return best;
    },
  };

  OD.Damage = Damage;
})();
