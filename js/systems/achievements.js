// Conquistas (dão núcleos e visuais do planeta) e escolha de skin.
// Contadores somados entre partidas ficam em OD.meta.data.totals.
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG.achievements;

  const Achievements = {
    init() {
      const meta = OD.meta;
      const m = () => OD.app.match;
      const on = (ev, fn) => OD.events.on(ev, (x) => {
        const match = m();
        if (match && !match.over) fn(match, x);
      });
      OD.events.on('game:start', (match) => (match.ach = {}));
      on('enemy:killed', (match, e) => {
        if (e.event) return;
        meta.add('kills');
        if (e.boss && !e.cfg.minion) {
          meta.add('bossKills');
          meta.data.bossTypes[e.type] = true;
          if (match.bossFlawless) match.ach.flawlessBoss = 1;
          this.check(match);
        }
      });
      on('boss:incoming', (match) => (match.bossFlawless = true));
      on('planet:damage', (match) => (match.bossFlawless = false));
      on('defense:branch', () => meta.add('branches'));
      on('event:collect', () => meta.add('collect'));
      on('defense:overclock', (match, d) => {
        match.ach.maxOc = Math.max(match.ach.maxOc || 0, d.oc);
        this.check(match);
      });
      on('coins:gain', (match) => {
        if (match.coins > (match.ach.maxCoins || 0)) match.ach.maxCoins = match.coins;
      });
      on('planet:revive', (match) => {
        match.ach.revived = 1;
        this.check(match);
      });
      on('ability:kills', (match, n) => {
        if (n >= 15 && !match.ach.shock15) {
          match.ach.shock15 = 1;
          this.check(match);
        }
      });
      on('defense:build', (match) => {
        // algum anel com todos os slots ocupados?
        OD.CONFIG.rings.forEach((ring, i) => {
          if (ring.moon) return;
          const slots = match.slots.filter((s) => s.ring === i && !s.hidden);
          if (slots.length && slots.every((s) => s.defense)) match.ach.fullRing = 1;
        });
        this.check(match);
      });
      on('wave:clear', (match) => this.check(match));
      OD.events.on('meta:unlock', () => this.check(m()));
    },

    // valor atual de uma conquista (para progresso e verificação)
    value(a, match) {
      const meta = OD.meta.data;
      const best = meta.best || {};
      const run = (match && match.ach) || {};
      switch (a.check) {
        case 'wave':
          return Math.max(OD.record.get(), match ? match.wave : 0);
        case 'total':
          return OD.meta.total(a.key);
        case 'run':
          return Math.max(best[a.key] || 0, run[a.key] || 0);
        case 'flag':
          return best[a.key] || run[a.key] ? 1 : 0;
        case 'bossTypes':
          return Object.keys(meta.bossTypes).length;
        case 'weapons':
          return Object.keys(OD.CONFIG.defenses).filter((id) => OD.CONFIG.defenses[id].locked && meta.weapons[id]).length;
        case 'threatWave':
          return Math.max(best.threatWave || 0, match && match.wave >= 30 ? match.threat : 0);
      }
      return 0;
    },

    check(match) {
      const meta = OD.meta.data;
      // guarda os melhores valores de partida
      if (match && match.ach) {
        meta.best = meta.best || {};
        for (const k in match.ach) meta.best[k] = Math.max(meta.best[k] || 0, match.ach[k]);
        if (match.wave >= 30) meta.best.threatWave = Math.max(meta.best.threatWave || 0, match.threat);
      }
      let got = false;
      for (const a of C()) {
        if (meta.ach[a.id] || this.value(a, match) < a.n) continue;
        meta.ach[a.id] = true;
        meta.cores += a.cores;
        if (a.skin) meta.skins[a.skin] = true;
        got = true;
        OD.HUD.toast(`Conquista: ${a.name} · +${a.cores} núcleos${a.skin ? ' · novo visual do planeta' : ''}`, '#ffd34d');
        OD.events.emit('achievement', a);
      }
      if (got) OD.meta.save();
    },

    skin() {
      const S = OD.CONFIG.skins;
      return S[OD.meta.data.skin] || S.terra;
    },

    selectSkin(id) {
      if (!OD.meta.data.skins[id]) return;
      OD.meta.data.skin = id;
      OD.meta.save();
      if (OD.app.renderer) OD.app.renderer.rebuildSprites();
    },

    labHtml() {
      const { esc, num, core } = OD.ui;
      const meta = OD.meta.data;
      const rows = C()
        .map((a) => {
          const done = !!meta.ach[a.id];
          const v = Math.min(a.n, this.value(a, null));
          const pct = Math.round((v / a.n) * 100);
          return (
            `<div class="lab-row${done ? '' : ' locked-row'}"><div class="lab-info"><b>${done ? '✓ ' : ''}${esc(a.name)}</b><span>${esc(a.text)}</span>` +
            (done ? '' : `<div class="ach-bar"><i style="width:${pct}%"></i></div><span class="dim">${num(v)} / ${num(a.n)}</span>`) +
            `</div><span class="ach-reward">${core(a.cores)}${a.skin ? '<small>+ visual</small>' : ''}</span></div>`
          );
        })
        .join('');
      const S = OD.CONFIG.skins;
      const skins = Object.keys(S)
        .map((id) => {
          const owned = meta.skins[id];
          const on = meta.skin === id;
          return `<button class="skin${on ? ' on' : ''}" ${owned ? `data-skin="${id}"` : 'disabled'} style="--sk:${S[id].body};--sl:${S[id].land}"><i></i>${esc(S[id].name)}</button>`;
        })
        .join('');
      return `<div class="skins"><span class="mini-title">VISUAL DO PLANETA</span><div class="skin-list">${skins}</div></div>${rows}`;
    },
  };

  OD.Achievements = Achievements;
})();
