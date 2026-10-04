// Telas: menu inicial, pausa, escolha de cartas, laboratório e game over
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = (n) => Math.floor(n).toLocaleString('pt-BR');

  // nome amigável de cada origem de dano
  function sourceName(key) {
    if (key === 'ability') return OD.CONFIG.ability.name;
    const d = OD.CONFIG.defenses[key];
    return d ? d.short || d.name : key;
  }

  const Screens = {
    init(app) {
      this.screens = {
        menu: $('screen-menu'),
        paused: $('screen-paused'),
        choice: $('screen-choice'),
        lab: $('screen-lab'),
        over: $('screen-over'),
      };
      $('btn-play').addEventListener('click', () => app.newGame());
      $('btn-menu-lab').addEventListener('click', () => app.openLab());
      $('btn-resume').addEventListener('click', () => app.resume());
      $('btn-restart').addEventListener('click', () => app.newGame());
      $('btn-menu').addEventListener('click', () => app.toMenu());
      $('btn-again').addEventListener('click', () => app.newGame());
      $('btn-over-lab').addEventListener('click', () => app.openLab());
      $('btn-over-menu').addEventListener('click', () => app.toMenu());
    },

    // mostra a tela da fase atual (nenhuma durante o jogo)
    show(phase, data, app) {
      for (const key in this.screens) this.screens[key].classList.toggle('hidden', key !== phase);

      if (phase === 'menu') {
        $('menu-record').textContent = OD.record.get();
        $('menu-cores').textContent = num(OD.meta.data.cores);
      } else if (phase === 'paused') {
        this.renderOwned(app.match);
      } else if (phase === 'choice') {
        OD.CardScreen.render(app.match);
      } else if (phase === 'lab') {
        OD.Lab.render();
      } else if (phase === 'over' && data) {
        this.renderOver(data);
      }
    },

    renderOwned(m) {
      const owned = OD.Cards.owned(m);
      const R = OD.CONFIG.cards.rarities;
      $('pause-cards').innerHTML = owned.length
        ? '<small>CARTAS DA PARTIDA</small>' +
          owned
            .map(({ card, count }) => `<span class="owned" style="--rc:${R[card.rarity].color}" title="${esc(card.text)}">${esc(card.name)}${count > 1 ? ' ×' + count : ''}</span>`)
            .join('')
        : '';
    },

    renderOver(data) {
      $('over-wave').textContent = data.wave;
      $('over-record').textContent = data.record;
      $('over-cores').textContent = data.cores;
      $('over-new').classList.toggle('hidden', !data.isNew);
      const s = data.stats;
      $('over-stats').textContent =
        `${num(s.kills)} inimigos destruídos · ${num(s.coinsEarned)} moedas ganhas` +
        (s.bossKills ? ` · ${s.bossKills} chefe${s.bossKills > 1 ? 's' : ''}` : '');

      // dano por origem (top 5)
      const entries = Object.entries(s.damageBy).filter((e) => e[1] > 0);
      const total = entries.reduce((a, e) => a + e[1], 0);
      entries.sort((a, b) => b[1] - a[1]);
      $('over-damage').innerHTML = total
        ? '<small>DANO CAUSADO</small>' +
          entries
            .slice(0, 5)
            .map(([k, v]) => {
              const pct = Math.round((v / total) * 100);
              const color = OD.ASSETS['def_' + k] ? OD.Sprites.color('def_' + k) : '#9fe8ff';
              return (
                `<div class="dmg-row"><span>${esc(sourceName(k))}</span>` +
                `<div class="dmg-bar"><i style="width:${pct}%;background:${color}"></i></div><b>${pct}%</b></div>`
              );
            })
            .join('')
        : '';
    },
  };

  OD.Screens = Screens;
})();
