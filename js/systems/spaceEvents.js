// Eventos de toque: cometa dourado (toque = moedas ou carta), caixa de
// suprimentos (toque = recompensa sorteada) e cargueiro (abata antes que fuja).
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG.events;

  const SpaceEvents = {
    reset(m) {
      m.happenings = [];
      m.eventTimer = this.nextDelay();
    },

    nextDelay() {
      const i = C().interval;
      return i.min + Math.random() * (i.max - i.min);
    },

    update(m, dt) {
      if (m.wave >= C().firstWave && !m.dying) {
        m.eventTimer -= dt;
        if (m.eventTimer <= 0) {
          m.eventTimer = this.nextDelay();
          this.spawn(m);
        }
      }
      const v = OD.view;
      for (let i = m.happenings.length - 1; i >= 0; i--) {
        const h = m.happenings[i];
        h.t += dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.kind === 'comet' && Math.random() < dt * 30) {
          const p = m.particles.get();
          if (p) p.init('dot', h.x, h.y, -h.vx * 0.2 + (Math.random() - 0.5) * 30, -h.vy * 0.2 + (Math.random() - 0.5) * 30, 0.5, 4, '#ffd34d');
        }
        const out = h.x < v.left - 60 || h.x > v.right + 60 || h.y < v.top - 60 || h.y > v.bottom + 60;
        if ((h.t > 1 && out) || (h.life && h.t > h.life)) m.happenings.splice(i, 1);
      }
    },

    spawn(m) {
      const L = C().list;
      const kind = OD.math.pickWeighted(Object.keys(L), (k) => L[k].weight);
      const p = OD.Waves.spawnPoint(30);
      if (kind === 'freighter') {
        OD.spawnEnemy(m, 'freighter', m.wave, p.x, p.y);
        OD.HUD.toast('Cargueiro avistado! Abata antes que fuja', '#ffd34d');
        return;
      }
      const c = L[kind];
      // cometa cruza a tela; caixa deriva devagar rumo ao centro
      const target = kind === 'comet' ? { x: -p.x * 0.6 + (Math.random() - 0.5) * 200, y: -p.y * 0.6 } : { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 };
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      m.happenings.push({ kind, x: p.x, y: p.y, vx: Math.cos(a) * c.speed, vy: Math.sin(a) * c.speed, t: 0, life: c.life || 0, r: c.radius });
      OD.HUD.toast(kind === 'comet' ? 'Cometa dourado! Toque para pegar' : 'Suprimentos à deriva! Toque para abrir', '#ffd34d');
    },

    // toque do jogador: retorna true se pegou algum evento
    tap(m, x, y) {
      for (let i = 0; i < m.happenings.length; i++) {
        const h = m.happenings[i];
        const reach = h.r + 22;
        if (OD.math.dist2(x, y, h.x, h.y) > reach * reach) continue;
        m.happenings.splice(i, 1);
        if (h.kind === 'comet') this.comet(m, h);
        else this.crate(m, h);
        OD.fx.explosion(m, h.x, h.y, 24, '#ffd34d');
        OD.fx.ring(m, h.x, h.y, 50, '#fff3b0', 0.4);
        OD.events.emit('event:collect', h);
        return true;
      }
      return false;
    },

    comet(m, h) {
      const c = C().list.comet;
      if (Math.random() < c.cardChance && !m.offer) {
        OD.fx.text(m, 'Carta!', h.x, h.y - 20, '#d68bff', 22);
        OD.Cards.offer(m, 'event');
        return;
      }
      OD.Economy.earn(m, OD.statAt(c.coins, Math.max(1, m.wave)), h.x, h.y - 10);
    },

    // recompensa sorteada: moedas, recarga das habilidades ou reparo
    crate(m, h) {
      const roll = Math.random();
      if (roll < 0.45) {
        OD.Economy.earn(m, OD.statAt(C().list.comet.coins, Math.max(1, m.wave)) * 2, h.x, h.y - 10);
      } else if (roll < 0.75) {
        for (const id in m.abilities) m.abilities[id].charge = Math.min(1, m.abilities[id].charge + 0.5);
        OD.fx.text(m, 'Habilidades +50%', h.x, h.y - 10, '#9fe8ff', 18);
      } else {
        m.planet.heal(m.planet.maxHp * 0.2);
        OD.fx.text(m, 'Planeta +20%', h.x, h.y - 10, '#4ade80', 18);
      }
    },

    draw(r, m) {
      for (const h of m.happenings) {
        if (h.kind === 'comet') {
          r.sprite('comet', h.x, h.y, Math.atan2(h.vy, h.vx));
        } else {
          const bob = Math.sin(r.time * 3 + h.x) * 3;
          r.sprite('crate', h.x, h.y + bob, Math.sin(r.time) * 0.2);
          if (h.life && h.life - h.t < 3 && Math.sin(r.time * 12) > 0) continue; // pisca antes de sumir
        }
        r.ring(h.x, h.y, h.r + 10 + 4 * Math.sin(r.time * 6), '#ffd34d', 2, 0.7);
      }
    },
  };

  OD.SpaceEvents = SpaceEvents;
})();
