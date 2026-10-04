// Combate: move inimigos e projéteis e resolve colisões com o planeta,
// escudos e defesas. Remove o que morreu.
(() => {
  const OD = (window.OD = window.OD || {});

  const Combat = {
    update(m, dt) {
      const v = OD.view;

      // escudos ativos neste passo (usados por inimigos e tiros inimigos)
      const shields = m.shields;
      shields.length = 0;
      for (let i = 0; i < m.slots.length; i++) {
        const d = m.slots[i].defense;
        if (d && d.blocks && d.up) shields.push(d);
      }

      const R = m.planet.radius;
      const enemies = m.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        e.update(m, dt);
        if (!e.alive) continue;
        e.visible = e.x > v.left && e.x < v.right && e.y > v.top && e.y < v.bottom;

        const reach = R + e.radius;
        if (e.x * e.x + e.y * e.y < reach * reach) {
          e.hitPlanet(m);
          continue;
        }
        for (let j = 0; j < shields.length; j++) {
          if (shields[j].blocks(e.x, e.y, e.radius, e.vx, e.vy)) {
            e.hitShield(m, shields[j]);
            break;
          }
        }
      }

      const proj = m.projectiles.active;
      for (let i = 0; i < proj.length; i++) proj[i].update(m, dt);
      m.projectiles.sweep();

      // compacta a lista de inimigos
      let w = 0;
      for (let r = 0; r < enemies.length; r++) if (enemies[r].alive) enemies[w++] = enemies[r];
      enemies.length = w;
    },

    nearestEnemy(m, x, y, maxDist) {
      let best = null;
      let bestD = maxDist * maxDist;
      for (const e of m.enemies) {
        if (!e.alive || !e.visible) continue;
        const d = OD.math.dist2(x, y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best;
    },

    // defesa ativa aleatória (alvo de bombardeiros e kamikazes)
    randomDefense(m) {
      const list = [];
      for (const s of m.slots) if (s.defense && s.defense.active) list.push(s.defense);
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    },
  };

  OD.Combat = Combat;
})();
