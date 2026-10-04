// Ondas infinitas: monta a lista de inimigos de cada onda (escala pela
// config), solta um por vez de fora da tela e controla o intervalo.
(() => {
  const OD = (window.OD = window.OD || {});

  const Waves = {
    reset(m) {
      m.wave = 0;
      m.waveState = {
        phase: 'break', // 'break' (intervalo) | 'active'
        timer: OD.CONFIG.waves.firstDelay,
        queue: [],
        interval: 1,
        spawnTimer: 0,
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
      }
    },

    isBossWave(n) {
      return n % OD.CONFIG.waves.bossEvery === 0;
    },

    startWave(m, n) {
      const W = OD.CONFIG.waves;
      const ws = m.waveState;
      m.wave = n;
      ws.phase = 'active';
      ws.queue = this.compose(n);
      ws.interval = OD.statAt(W.spawnInterval, n);
      ws.spawnTimer = 0.3;
      if (this.isBossWave(n)) OD.events.emit('boss:incoming', n);
      else OD.events.emit('wave:start', n);
    },

    finishWave(m) {
      const ws = m.waveState;
      const bonus = Math.round(OD.statAt(OD.CONFIG.waves.clearBonus, m.wave));
      OD.Economy.earn(m, bonus);
      OD.fx.text(m, `Bônus +${bonus}`, 0, -m.planet.radius - 34, '#ffd34d', 24);
      ws.phase = 'break';
      ws.timer = OD.CONFIG.waves.breakTime;
      OD.events.emit('wave:clear', m.wave);
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

    spawn(m, type) {
      const p = this.spawnPoint(OD.CONFIG.enemies[type].radius);
      OD.spawnEnemy(m, type, m.wave, p.x, p.y);
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
      return `Inimigos restantes: ${ws.queue.length + m.enemies.length}`;
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
