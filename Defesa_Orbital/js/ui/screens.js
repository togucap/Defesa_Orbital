// Telas: menu inicial, pausa e game over
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);

  const Screens = {
    init(app) {
      this.screens = { menu: $('screen-menu'), paused: $('screen-pause'), over: $('screen-over') };
      $('btn-play').addEventListener('click', () => app.newGame());
      $('btn-resume').addEventListener('click', () => app.resume());
      $('btn-restart').addEventListener('click', () => app.newGame());
      $('btn-menu').addEventListener('click', () => app.toMenu());
      $('btn-again').addEventListener('click', () => app.newGame());
      $('btn-over-menu').addEventListener('click', () => app.toMenu());
    },

    // mostra a tela da fase atual (nenhuma durante o jogo)
    show(phase, data) {
      for (const key in this.screens) this.screens[key].classList.toggle('hidden', key !== phase);

      if (phase === 'menu') {
        $('menu-record').textContent = OD.record.get();
      } else if (phase === 'over' && data) {
        $('over-wave').textContent = data.wave;
        $('over-record').textContent = data.record;
        $('over-new').classList.toggle('hidden', !data.isNew);
        const s = data.stats;
        $('over-stats').textContent =
          `${s.kills.toLocaleString('pt-BR')} inimigos destruídos · ` +
          `${Math.floor(s.coinsEarned).toLocaleString('pt-BR')} moedas ganhas`;
      }
    },
  };

  OD.Screens = Screens;
})();
