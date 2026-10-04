// Ondas infinitas: monta a lista de inimigos de cada onda (escala pela
// config), sorteia modificadores, solta um por vez de fora da tela e
// controla o intervalo, a chamada antecipada, os setores e as cartas.
(() => {
  const OD = (window.OD = window.OD || {});

  const Waves = {
    reset(m) {
      m.wave = 0;
      m.sector = 0;
      m.waveState = {
        phase: 'break', // 'break' (intervalo) | 'active'
        timer: OD.CONFIG.waves.firstDelay,
        queue: [],
        interval: 1,
        spawnTimer: 0,
        idle: 0,
        enraged: false,
      };
    },

    update(m, dt) {
      const ws = m.waveState;
      if (ws.phase === 'break') {
        ws.timer -= dt;
        if (ws.timer <= 0) this.startWave(m, m.wave + 1);
        return;
      }
      if (ws.queue.length) {
        ws.spawnTimer -= dt;
        while (ws.spawnTimer <= 0 && ws.queue.length) {
          this.spawn(m, ws.queue.shift());
          ws.spawnTimer += ws.interval;
        }
      } else if (m.enemies.length === 0) {
        this.finishWave(m);
      } else {
        // onda arrastada (inimigos parados longe): os restantes avançam
        ws.idle += dt;
        if (!ws.enraged && ws.idle >= OD.CONFIG.waves.enrageAfter) {
          ws.enraged = true;
          for (const e of m.enemies) e.enraged = true;
          OD.events.emit('wave:enraged', m.wave);
        }
      }
    },

    isBossWave(n) {
      return n % OD.CONFIG.waves.bossEvery === 0;
    },

    sectorOf(n) {
      return Math.floor((Math.max(1, n) - 1) / OD.CONFIG.waves.sectorEvery);
    },

    startWave(m, n) {
      const W = OD.CONFIG.waves;
      const ws = m.waveState;
      m.wave = n;
      ws.phase = 'active';
      ws.queue = this.compose(n);
      ws.interval = OD.statAt(W.spawnInterval, n);
      ws.spawnTimer = 0.3;
      ws.idle = 0;
      ws.enraged = false;
      const sector = this.sectorOf(n);
      if (sector !== m.sector) {
        m.sector = sector;
        OD.events.emit('sector:change', { sector, wave: n });
      }
      if (this.isBossWave(n)) OD.events.emit('boss:incoming', n);
      else OD.events.emit('wave:start', n);
    },

    finishWave(m) {
      const ws = m.waveState;
      const bonus = Math.round(OD.statAt(OD.CONFIG.waves.clearBonus, m.wave));
      OD.Economy.earn(m, bonus);
      OD.fx.text(m, `Bônus +${bonus}`, 0, -m.planet.radius - 34, '#ffd34d', 24);
      // carta Juros Orbitais
      if (m.mods.interest) {
        const gain = Math.min(OD.CONFIG.cards.interestMax, Math.floor(m.coins * m.mods.interest));
        if (gain > 0) {
          OD.Economy.earn(m, gain);
          OD.fx.text(m, `Juros +${gain}`, 0, -m.planet.radius - 60, '#ffe9a8', 20);
        }
      }
      ws.phase = 'break';
      ws.timer = OD.CONFIG.waves.breakTime;
      OD.events.emit('wave:clear', m.wave);
      if (m.wave % OD.CONFIG.cards.every === 0) OD.Cards.offer(m);
    },

    // moedas por chamar a próxima onda agora (0 fora do intervalo)
    callValue(m) {
      const ws = m.waveState;
      if (!ws || ws.phase !== 'break') return 0;
      return Math.round(ws.timer * OD.statAt(OD.CONFIG.waves.callBonus, m.wave + 1));
    },

    callNext(m) {
      const value = this.callValue(m);
      if (m.waveState.phase !== 'break') return false;
      if (value > 0) OD.Economy.earn(m, value);
      m.waveState.timer = 0;
      OD.events.emit('wave:called', value);
      return true;
    },

    // lista de tipos da onda n (sorteio ponderado entre os liberados)
    compose(n) {
      const W = OD.CONFIG.waves;
      const enemies = OD.CONFIG.enemies;
      const pool = Object.keys(enemies).filter((k) => enemies[k].weight > 0 && n >= enemies[k].unlockWave);
      const boss = this.isBossWave(n);
      let count = Math.round(OD.statAt(W.count, n));
      if (boss) count = Math.round(count * W.bossEscort);
      const list = [];
      for (let i = 0; i < count; i++) list.push(OD.math.pickWeighted(pool, (k) => enemies[k].weight));
      if (boss) {
        const bossType = Object.keys(enemies).find((k) => enemies[k].boss);
        list.splice(Math.floor(list.length / 3), 0, bossType);
      }
      return list;
    },

    // sorteia modificadores: no máximo um comum + elite independente
    rollMods(wave) {
      const M = OD.CONFIG.modifiers;
      const mods = [];
      const options = [];
      let total = 0;
      for (const id in M) {
        const md = M[id];
        if (wave < md.unlockWave) continue;
        const chance = OD.statAt(md.chance, wave - md.unlockWave + 1);
        if (md.stacks) {
          if (Math.random() < chance) mods.push(id);
        } else {
          options.push([id, chance]);
          total += chance;
        }
      }
      const scale = total > OD.CONFIG.modifierMaxChance ? OD.CONFIG.modifierMaxChance / total : 1;
      let r = Math.random();
      for (const [id, chance] of options) {
        r -= chance * scale;
        if (r < 0) {
          mods.push(id);
          break;
        }
      }
      return mods;
    },

    spawn(m, type) {
      const cfg = OD.CONFIG.enemies[type];
      const p = this.spawnPoint(cfg.radius);
      OD.spawnEnemy(m, type, m.wave, p.x, p.y, { mods: cfg.boss ? [] : this.rollMods(m.wave) });
    },

    // ponto aleatório logo fora da área visível
    spawnPoint(radius) {
      const v = OD.view;
      const margin = radius + 30;
      const a = Math.random() * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const tx = dx > 0 ? (v.right + margin) / dx : dx < 0 ? (v.left - margin) / dx : Infinity;
      const ty = dy > 0 ? (v.bottom + margin) / dy : dy < 0 ? (v.top - margin) / dy : Infinity;
      const t = Math.min(tx, ty);
      return { x: dx * t, y: dy * t };
    },

    // texto curto para o HUD
    info(m) {
      const ws = m.waveState;
      if (!ws) return '';
      if (ws.phase === 'break') {
        const s = Math.ceil(ws.timer);
        if (m.wave === 0) return `Primeira onda em ${s}s`;
        const next = this.isBossWave(m.wave + 1) ? 'Chefe' : `Onda ${m.wave + 1}`;
        return `Onda ${m.wave} concluída · ${next} em ${s}s`;
      }
      const left = `Inimigos restantes: ${ws.queue.length + m.enemies.length}`;
      return ws.enraged ? left + ' · enfurecidos!' : left;
    },

    // para testes: pula direto para a onda n
    jumpTo(m, n) {
      m.enemies.length = 0;
      m.wave = n - 1;
      m.waveState.queue = [];
      m.waveState.phase = 'break';
      m.waveState.timer = 0.01;
    },
  };

  OD.Waves = Waves;
})();
