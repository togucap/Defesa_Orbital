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
      } else if (!m.enemies.some((e) => !e.event)) {
        this.finishWave(m);
      } else {
        // onda arrastada (inimigos parados longe): os restantes avançam
        ws.idle += dt;
        if (!ws.enraged && ws.idle >= OD.CONFIG.waves.enrageAfter) {
          ws.enraged = true;
          for (const e of m.enemies) if (!e.event) e.enraged = true;
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
      ws.risk = !!ws.riskNext; // onda de desafio aceita no intervalo
      ws.riskNext = false;
      ws.queue = this.compose(n, ws.risk);
      ws.interval = OD.statAt(W.spawnInterval, n);
      ws.spawnTimer = 0.3;
      ws.idle = 0;
      ws.enraged = false;
      const sector = this.sectorOf(n);
      if (sector !== m.sector) {
        m.sector = sector;
        m.rules = this.rulesFor(sector);
        const R = OD.CONFIG.sectorRules;
        OD.events.emit('sector:change', { sector, wave: n, rule: sector < R.length ? R[sector] : null });
      }
      if (this.isBossWave(n)) OD.events.emit('boss:incoming', { wave: n, name: OD.CONFIG.enemies[this.bossType(n)].name });
      else OD.events.emit('wave:start', n);
    },

    finishWave(m) {
      const ws = m.waveState;
      const R = OD.CONFIG.risk;
      let bonus = Math.round(OD.statAt(OD.CONFIG.waves.clearBonus, m.wave));
      if (ws.risk) bonus *= R.coinMult;
      OD.Economy.earn(m, bonus);
      OD.fx.text(m, `${ws.risk ? 'Desafio vencido! ' : 'Bônus '}+${bonus}`, 0, -m.planet.radius - 34, '#ffd34d', 24);
      // carta Juros Orbitais
      if (m.mods.interest) {
        const gain = Math.min(OD.CONFIG.cards.interestMax, Math.floor(m.coins * m.mods.interest));
        if (gain > 0) {
          OD.Economy.earn(m, gain);
          OD.fx.text(m, `Juros +${gain}`, 0, -m.planet.radius - 60, '#ffe9a8', 20);
        }
      }
      // defesas com efeito no fim da onda (ex.: Satélite Minerador)
      for (const s of m.slots) if (s.defense && s.defense.active && s.defense.onWaveEnd) s.defense.onWaveEnd(m);
      ws.phase = 'break';
      ws.timer = OD.CONFIG.waves.breakTime;
      OD.events.emit('wave:clear', m.wave);
      const cardWave = m.wave % OD.CONFIG.cards.every === 0;
      if (ws.risk) {
        OD.meta.add('risks');
        OD.events.emit('risk:complete', m.wave);
        m.stats.bonusCores = (m.stats.bonusCores || 0) + R.cores;
        OD.fx.text(m, `+${R.cores} núcleo`, 0, -m.planet.radius - 60, '#e3c2ff', 20);
      }
      if (cardWave) OD.Cards.offer(m);
    },

    // multiplicador de vida dos inimigos na onda w
    hpMult(w) {
      const W = OD.CONFIG.waves;
      const late = W.hpGrowthLate;
      if (!late || w <= late.after) return Math.pow(W.hpGrowth, w - 1);
      return Math.pow(W.hpGrowth, late.after - 1) * Math.pow(late.growth, w - late.after);
    },

    // regras acumuladas até o setor informado
    rulesFor(sector) {
      const R = OD.CONFIG.sectorRules;
      const out = { speedMult: 1, splitCount: 0, shieldChance: 0, shieldRegen: 0, eliteMult: 1, stealthMult: 1, list: [] };
      for (let i = 1; i <= sector && i < R.length; i++) {
        const r = R[i];
        if (!r) continue;
        out.list.push(r);
        if (r.speedMult) out.speedMult *= r.speedMult;
        if (r.splitCount) out.splitCount += r.splitCount;
        if (r.shieldChance) out.shieldChance += r.shieldChance;
        if (r.shieldRegen) out.shieldRegen += r.shieldRegen;
        if (r.eliteMult) out.eliteMult *= r.eliteMult;
        if (r.stealthMult) out.stealthMult *= r.stealthMult;
      }
      return out;
    },

    // chefe da onda n (alterna conforme waves.bossRotation)
    bossType(n) {
      const rot = OD.CONFIG.waves.bossRotation;
      return rot[(Math.floor(n / OD.CONFIG.waves.bossEvery) - 1) % rot.length];
    },

    // desafio disponível para a próxima onda?
    riskAvailable(m) {
      const ws = m.waveState;
      const n = m.wave + 1;
      return !!ws && ws.phase === 'break' && !ws.riskNext && m.wave >= 1 && n % OD.CONFIG.risk.every === 0 && !this.isBossWave(n);
    },

    acceptRisk(m) {
      if (!this.riskAvailable(m)) return false;
      m.waveState.riskNext = true;
      OD.HUD.toast('Desafio aceito: mais inimigos, recompensa tripla e +1 núcleo', '#ff9b5c');
      OD.events.emit('risk:accept', m.wave + 1);
      return true;
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
    compose(n, risk) {
      const W = OD.CONFIG.waves;
      const enemies = OD.CONFIG.enemies;
      const pool = Object.keys(enemies).filter((k) => enemies[k].weight > 0 && n >= enemies[k].unlockWave);
      const boss = this.isBossWave(n);
      let count = Math.round(OD.statAt(W.count, n));
      if (boss) count = Math.round(count * W.bossEscort);
      if (risk) count = Math.round(count * OD.CONFIG.risk.countMult);
      if (OD.currentThreat) count = Math.round(count * OD.currentThreat.count);
      const list = [];
      for (let i = 0; i < count; i++) list.push(OD.math.pickWeighted(pool, (k) => enemies[k].weight));
      if (boss) list.splice(Math.floor(list.length / 3), 0, this.bossType(n));
      return list;
    },

    // sorteia modificadores: no máximo um comum + elite independente
    rollMods(wave, rules, risk) {
      const M = OD.CONFIG.modifiers;
      const mult = { elite: rules ? rules.eliteMult : 1, stealth: rules ? rules.stealthMult : 1 };
      const extra = { shielded: rules ? rules.shieldChance : 0, elite: risk ? OD.CONFIG.risk.eliteBonus : 0 };
      const mods = [];
      const options = [];
      let total = 0;
      for (const id in M) {
        const md = M[id];
        if (wave < md.unlockWave) continue;
        const chance = OD.statAt(md.chance, wave - md.unlockWave + 1) * (mult[id] || 1) + (extra[id] || 0);
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
      const risk = m.waveState.risk;
      OD.spawnEnemy(m, type, m.wave, p.x, p.y, {
        mods: cfg.boss ? [] : this.rollMods(m.wave, m.rules, risk),
        speedMult: m.rules.speedMult,
        hpMult: risk ? OD.CONFIG.risk.hpMult : 1,
      });
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
      const n = ws.queue.length + m.enemies.filter((e) => !e.event).length;
      const left = `${ws.risk ? 'DESAFIO · ' : ''}Inimigos restantes: ${n}`;
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
