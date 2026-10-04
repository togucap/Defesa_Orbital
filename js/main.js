// Ponto de entrada: monta o jogo, controla as fases (menu, jogo, pausa,
// cartas, laboratório, game over), o layout responsivo e a ordem de
// atualização dos sistemas.
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);
  const DEATH_DELAY = 1.6; // s de explosão do planeta antes da tela de game over

  const app = {
    phase: 'menu', // menu | playing | paused | choice | lab | over
    match: null,
    loop: null,
    renderer: null,
    speedIndex: 0,
    labReturn: 'menu',
    lastOver: null,
    showFps: /[?&]debug\b/.test(location.search),

    newGame() {
      this.match = OD.createMatch();
      OD.Waves.reset(this.match);
      OD.HUD.reset();
      OD.Panel.select(this.match, null);
      this.renderer.resetSector();
      this.setPhase('playing');
      OD.events.emit('game:start', this.match);
    },

    pause() {
      if (this.phase === 'playing') this.setPhase('paused');
    },

    resume() {
      if (this.phase === 'paused') this.setPhase('playing');
    },

    toMenu() {
      this.match = OD.createMatch();
      OD.HUD.reset();
      OD.Panel.select(this.match, null);
      this.renderer.resetSector();
      this.setPhase('menu');
    },

    openChoice() {
      OD.Panel.select(this.match, null);
      this.setPhase('choice');
    },

    closeChoice() {
      if (this.phase === 'choice') this.setPhase('playing');
    },

    openLab() {
      this.labReturn = this.phase === 'over' ? 'over' : 'menu';
      this.setPhase('lab');
    },

    closeLab() {
      if (this.labReturn === 'over') this.setPhase('over', this.lastOver);
      else this.setPhase('menu');
    },

    gameOver() {
      const m = this.match;
      m.over = true;
      const isNew = OD.record.submit(m.wave);
      const cores = OD.meta.award(m);
      OD.events.emit('game:over', m);
      this.lastOver = { wave: m.wave, record: OD.record.get(), isNew, cores, stats: m.stats };
      this.setPhase('over', this.lastOver);
    },

    setPhase(phase, data) {
      this.phase = phase;
      this.loop.paused = phase !== 'playing';
      document.body.dataset.phase = phase;
      OD.Screens.show(phase, data, this);
    },

    cycleSpeed() {
      const speeds = OD.CONFIG.sim.speeds;
      this.speedIndex = (this.speedIndex + 1) % speeds.length;
      this.loop.speed = speeds[this.speedIndex];
    },

    useAbility() {
      if (this.phase === 'playing') OD.Ability.trigger(this.match);
    },

    callWave() {
      if (this.phase === 'playing' && !this.match.dying) OD.Waves.callNext(this.match);
    },
  };

  // planeta destruído: explode e, após um instante, mostra o game over
  function startDeath(m) {
    m.dying = DEATH_DELAY;
    m.shake = 1;
    OD.Panel.select(m, null);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * m.planet.radius;
      OD.fx.explosion(m, Math.cos(a) * d, Math.sin(a) * d, 40, i % 2 ? '#ff8a5c' : '#5fb8ff');
    }
    OD.fx.ring(m, 0, 0, 220, '#ffd2a8', 0.9);
    OD.events.emit('sfx', 'planetDie');
  }

  // ordem de atualização da simulação (dt já multiplicado pela velocidade)
  function update(dt) {
    const m = app.match;
    m.time += dt;
    if (m.shake > 0) m.shake = Math.max(0, m.shake - dt * 2.5);

    OD.Bonuses.step(m);
    if (!m.dying) OD.Waves.update(m, dt);
    m.planet.update(dt);
    for (let i = 0; i < m.slots.length; i++) m.slots[i].update(m, dt);
    OD.Combat.update(m, dt);
    OD.Ability.update(m, dt);

    const parts = m.particles.active;
    for (let i = 0; i < parts.length; i++) parts[i].update(dt);
    m.particles.sweep();
    const texts = m.texts.active;
    for (let i = 0; i < texts.length; i++) texts[i].update(dt);
    m.texts.sweep();

    if (!m.planet.alive && !m.dying) startDeath(m);
    if (m.dying && !m.over) {
      m.dying -= dt;
      if (m.dying <= 0) app.gameOver();
    }
  }

  function render(dt) {
    app.renderer.render(app.match, dt);
    OD.HUD.update(app);
    OD.Panel.update(app.match, dt);
  }

  // área de jogo em retrato, centralizada; o resto mostra o fundo espacial
  function layout() {
    const stage = $('stage');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 2 || vh < 2) return; // janela ainda sem tamanho (aba oculta)
    const { minAspect, maxAspect } = OD.CONFIG.world;
    let w = vw;
    let h = vh;
    if (h / w < minAspect) w = h / minAspect;
    else if (h / w > maxAspect) h = w * maxAspect;
    w = Math.floor(w);
    h = Math.floor(h);
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.left = Math.floor((vw - w) / 2) + 'px';
    stage.style.top = Math.floor((vh - h) / 2) + 'px';
    stage.style.fontSize = OD.math.clamp(w / 27, 11, 19) + 'px';
    app.renderer.resize(w, h);
  }

  function boot() {
    app.renderer = new OD.Renderer($('game'), $('page-bg'));
    app.loop = new OD.Loop(update, render);

    OD.HUD.init();
    OD.Screens.init(app);
    OD.Panel.init(app);
    OD.CardScreen.init(app);
    OD.Lab.init(app);
    OD.Audio.init();
    OD.Input.init($('game'), app.renderer);

    $('btn-pause').addEventListener('click', () => app.pause());
    $('btn-speed').addEventListener('click', () => app.cycleSpeed());
    $('btn-mute').addEventListener('click', () => OD.Audio.toggle());
    $('btn-call').addEventListener('click', () => app.callWave());
    $('btn-ability').addEventListener('click', () => app.useAbility());
    $('fps').classList.toggle('hidden', !app.showFps);

    // eventos que mudam a fase
    OD.events.on('cards:offer', () => app.openChoice());
    OD.events.on('boss:killed', () => app.loop.slowmo(OD.CONFIG.sim.bossSlowmo));

    // toque na área de jogo: seleciona slot (ou fecha o painel)
    OD.events.on('tap', (p) => {
      const m = app.match;
      if (app.phase !== 'playing' || m.dying) return;
      OD.Panel.select(m, OD.Slot.hitTest(m, p.x, p.y));
    });

    // atalhos de teclado (computador)
    OD.events.on('key', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        if (app.phase === 'playing') app.pause();
        else if (app.phase === 'paused') app.resume();
      } else if (k === ' ' && app.phase === 'playing') {
        e.preventDefault();
        app.cycleSpeed();
      } else if (k === 'q' || k === 'e') {
        app.useAbility();
      } else if (k === 'n') {
        app.callWave();
      } else if (k === 'm') {
        OD.Audio.toggle();
      } else if (k === 'f') {
        app.showFps = !app.showFps;
        $('fps').classList.toggle('hidden', !app.showFps);
      }
    });

    // pausa automática ao perder o foco
    document.addEventListener('visibilitychange', () => document.hidden && app.pause());
    window.addEventListener('blur', () => app.pause());
    window.addEventListener('pagehide', () => app.pause());

    let resizeQueued = false;
    const queueLayout = () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        layout();
      });
    };
    window.addEventListener('resize', queueLayout);
    window.addEventListener('orientationchange', queueLayout);

    OD.Sprites.load().then(() => {
      layout();
      app.match = OD.createMatch();
      app.setPhase('menu');
      app.loop.start();
    });
  }

  // ajudas para testes pelo console do navegador
  OD.debug = {
    app,
    coins(n = 1000) {
      app.match.coins += n;
    },
    damage(n = 100) {
      app.match.planet.damage(n);
    },
    wave(n) {
      OD.Waves.jumpTo(app.match, n);
    },
    cores(n = 100) {
      OD.meta.data.cores += n;
      OD.meta.save();
    },
  };

  OD.app = app;
  window.addEventListener('DOMContentLoaded', boot);
})();
