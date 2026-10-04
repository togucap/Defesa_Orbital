// Estado da partida (recriado a cada jogo) e recorde salvo no localStorage
(() => {
  const OD = (window.OD = window.OD || {});
  const RECORD_KEY = 'defesaOrbital.recordeOnda';

  // maior onda alcançada
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
    const meta = OD.meta.effects();
    const m = {
      time: 0,
      wave: 0,
      sector: 0,
      coins: cfg.economy.startCoins + (meta.startCoins || 0),
      planet: new OD.Planet(),
      slots: OD.Slot.createAll(),
      unlocks: cfg.rings.map(() => 0), // desbloqueios comprados por anel
      enemies: [],
      shields: [],    // escudos ativos (recalculado a cada passo)
      revealers: [],  // áreas que revelam inimigos furtivos
      projectiles: new OD.Pool(() => new OD.Projectile(), 96),
      particles: new OD.Pool(() => new OD.Particle(), 160, cfg.fx.maxParticles),
      texts: new OD.Pool(() => new OD.FloatText(), 24, cfg.fx.maxTexts),
      selected: null,
      shake: 0,
      dying: 0,       // contagem da explosão do planeta antes do game over
      over: false,
      boss: null,
      // efeitos globais da partida (cartas + laboratório)
      mods: {
        reward: meta.reward || 0,
        abilityCd: meta.abilityCd || 0,
        unlockCost: meta.unlockCost || 0,
        planetArmor: 0,
        interest: 0,
        shieldReflect: 0,
        missileSplit: 0,
        secondLife: 0,
      },
      metaBonus: { damage: meta.damage || 0, rate: meta.rate || 0, range: meta.range || 0 },
      cards: [],        // ids das cartas escolhidas
      cardBonus: [],    // bônus de defesa vindos das cartas
      offer: null,      // cartas em oferta
      rerolls: meta.rerolls || 0,
      cardChoices: cfg.cards.choices + (meta.cardChoices || 0),
      ability: { charge: cfg.ability.startCharge, wave: null },
      defenseHeal: 0,   // conserto global de defesas (Nanorreparo)
      reviveMult: 1,
      stats: { kills: 0, coinsEarned: 0, bossKills: 0, damageBy: {} },
    };

    // vida extra do laboratório
    if (meta.planetHp) {
      m.planet.maxHp = Math.round(cfg.planet.maxHp * (1 + meta.planetHp));
      m.planet.hp = m.planet.maxHp;
    }
    // slots extras liberados no início (anéis internos primeiro)
    for (let n = meta.startSlots || 0; n > 0; n--) {
      const s = m.slots.find((x) => !x.unlocked);
      if (s) s.unlocked = true;
    }

    OD.Bonuses.refresh(m);
    return m;
  };
})();
