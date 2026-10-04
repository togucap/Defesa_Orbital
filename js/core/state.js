// Estado da partida (recriado a cada jogo) e recorde salvo no localStorage
(() => {
  const OD = (window.OD = window.OD || {});
  const RECORD_KEY = 'defesaOrbital.recordeOnda';

  // único dado persistente do jogo: a maior onda alcançada
  OD.record = {
    get() {
      try {
        return parseInt(localStorage.getItem(RECORD_KEY), 10) || 0;
      } catch (e) {
        return 0;
      }
    },
    // salva se for recorde; retorna true quando é um novo recorde
    submit(wave) {
      if (wave <= this.get()) return false;
      try {
        localStorage.setItem(RECORD_KEY, String(wave));
      } catch (e) {
        /* modo privado: ignora */
      }
      return true;
    },
  };

  OD.createMatch = function () {
    const cfg = OD.CONFIG;
    return {
      time: 0,
      wave: 0,
      coins: cfg.economy.startCoins,
      planet: new OD.Planet(),
      slots: OD.Slot.createAll(),
      unlocks: cfg.rings.map(() => 0), // desbloqueios comprados por anel
      enemies: [],
      shields: [], // escudos ativos, recalculado a cada passo
      projectiles: new OD.Pool(() => new OD.Projectile(), 96),
      particles: new OD.Pool(() => new OD.Particle(), 160, cfg.fx.maxParticles),
      texts: new OD.Pool(() => new OD.FloatText(), 24, cfg.fx.maxTexts),
      selected: null,
      shake: 0,
      dying: 0,   // contagem da explosão do planeta antes do game over
      over: false,
      stats: { kills: 0, coinsEarned: 0 },
    };
  };
})();
