// Missões da partida: sempre "active" objetivos sorteados. Ao concluir,
// dão moedas na hora e núcleos no fim da partida, e outra missão entra.
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG.missions;

  const Missions = {
    init() {
      const on = (ev, fn) => OD.events.on(ev, (x) => this.m && !this.m.over && fn(this.m, x));
      OD.events.on('game:start', (m) => {
        this.m = m;
        this.reset(m);
      });
      on('enemy:killed', (m, e) => {
        if (e.event) return;
        this.progress(m, 'kill', 1, (q) => !q.mod || e.mods.indexOf(q.mod) >= 0);
        this.progress(m, 'killBy', 1, (q) => q.type === e.lastSource);
        if (e.boss && !e.cfg.minion) this.progress(m, 'boss', 1);
      });
      on('defense:build', (m) => this.progress(m, 'build', 1));
      on('defense:upgrade', (m) => this.progress(m, 'upgrade', 1));
      on('defense:overclock', (m) => this.progress(m, 'upgrade', 1));
      on('defense:branch', (m) => this.progress(m, 'upgrade', 1));
      on('ability:used', (m) => this.progress(m, 'ability', 1));
      on('event:collect', (m) => this.progress(m, 'collect', 1));
      on('risk:complete', (m) => this.progress(m, 'risk', 1));
      on('wave:start', (m) => (m.flawless = true));
      on('boss:incoming', (m) => (m.flawless = true));
      on('planet:damage', (m) => (m.flawless = false));
      on('wave:clear', (m) => {
        this.progress(m, 'wave', 1);
        if (m.flawless) this.progress(m, 'flawless', 1);
      });
    },

    reset(m) {
      m.missions = [];
      m.missionsDone = 0;
      this.fill(m);
    },

    // completa a lista de missões ativas
    fill(m) {
      while (m.missions.length < C().active) {
        const q = this.create(m);
        if (!q) break;
        m.missions.push(q);
      }
    },

    create(m) {
      const used = m.missions.map((q) => q.id);
      const pool = C().list.filter((t) => used.indexOf(t.id) < 0 && (!t.minWave || m.wave >= t.minWave));
      if (!pool.length) return null;
      const t = pool[Math.floor(Math.random() * pool.length)];
      const n = Math.max(1, Math.round(OD.statAt(t.n, Math.max(1, m.wave))));
      const q = { id: t.id, event: t.event, mod: t.mod, n, done: 0, text: '' };
      if (t.event === 'killBy') {
        const types = [...new Set(m.slots.filter((s) => s.defense && s.defense.cfg.role === 'attack').map((s) => s.defense.type))];
        q.type = types.length ? types[Math.floor(Math.random() * types.length)] : 'cannon';
      }
      q.text = t.text.replace('{n}', n).replace('{type}', q.type ? OD.CONFIG.defenses[q.type].short : '');
      return q;
    },

    progress(m, event, amount, filter) {
      let changed = false;
      for (const q of m.missions) {
        if (q.event !== event || q.done >= q.n || (filter && !filter(q))) continue;
        q.done = Math.min(q.n, q.done + amount);
        changed = true;
        if (q.done >= q.n) this.complete(m, q);
      }
      if (changed) m.missionsChanged = true;
    },

    complete(m, q) {
      const coins = Math.round(OD.statAt(C().coins, Math.max(1, m.wave)));
      OD.Economy.earn(m, coins);
      m.stats.bonusCores = (m.stats.bonusCores || 0) + C().cores;
      m.missionsDone++;
      OD.meta.add('missions');
      OD.HUD.toast(`Missão concluída: ${q.text} · +${coins} moedas · +${C().cores} núcleos`, '#7dff9b');
      OD.events.emit('mission:complete', q);
      // troca a missão concluída por outra depois de um instante
      setTimeout(() => {
        const i = m.missions.indexOf(q);
        if (i < 0) return;
        m.missions.splice(i, 1);
        this.fill(m);
        m.missionsChanged = true;
      }, 1500);
    },

    // lista compacta (painel inferior quando nada está selecionado)
    trackerHtml(m) {
      if (!m.missions || !m.missions.length) return '';
      return (
        '<div class="tracker">' +
        m.missions
          .map((q) => `<div class="trk${q.done >= q.n ? ' done' : ''}"><span>${OD.ui.esc(q.text)}</span><b>${q.done}/${q.n}</b></div>`)
          .join('') +
        '</div>'
      );
    },

    // lista na tela de pausa
    html(m) {
      if (!m.missions || !m.missions.length) return '';
      return '<small>MISSÕES</small>' + this.trackerHtml(m) + `<p class="hint">Concluídas nesta partida: ${m.missionsDone}</p>`;
    },
  };

  OD.Missions = Missions;
})();
