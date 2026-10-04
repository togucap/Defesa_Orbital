// Sons simples sintetizados com WebAudio (sem arquivos). O contexto só é
// criado após o primeiro toque, como exigem os navegadores.
(() => {
  const OD = (window.OD = window.OD || {});
  const VOLUME = 0.45;

  // cada som: intervalo mínimo entre repetições (gap) e função que toca
  const SOUNDS = {
    shoot: { gap: 0.07, play: (a, t) => a.tone('square', 900, 420, 0.05, 0.035, t) },
    missile: { gap: 0.12, play: (a, t) => { a.noise(0.25, 0.08, 1600, t); a.tone('sawtooth', 180, 480, 0.2, 0.03, t); } },
    boom: { gap: 0.08, play: (a, t) => a.noise(0.45, 0.22, 800, t) },
    pop: { gap: 0.045, play: (a, t) => { a.noise(0.12, 0.1, 2400, t); a.tone('triangle', 320, 110, 0.1, 0.06, t); } },
    coin: { gap: 0.1, play: (a, t) => a.tone('sine', 1320, 1760, 0.07, 0.04, t) },
    hit: { gap: 0.12, play: (a, t) => { a.tone('sawtooth', 150, 50, 0.3, 0.12, t); a.noise(0.3, 0.16, 500, t); } },
    enemyShot: { gap: 0.12, play: (a, t) => a.tone('square', 520, 240, 0.09, 0.03, t) },
    bossShot: { gap: 0.25, play: (a, t) => a.tone('sawtooth', 300, 110, 0.3, 0.07, t) },
    shieldBreak: { gap: 0.25, play: (a, t) => a.tone('triangle', 1400, 180, 0.4, 0.1, t) },
    build: { gap: 0.1, play: (a, t) => a.tone('triangle', 520, 1040, 0.12, 0.09, t) },
    upgrade: { gap: 0.1, play: (a, t) => [660, 880, 1320].forEach((f, i) => a.tone('triangle', f, f, 0.09, 0.07, t + i * 0.06)) },
    sell: { gap: 0.1, play: (a, t) => a.tone('sine', 900, 500, 0.15, 0.07, t) },
    unlock: { gap: 0.1, play: (a, t) => [440, 880].forEach((f, i) => a.tone('sine', f, f * 1.5, 0.12, 0.07, t + i * 0.08)) },
    wave: { gap: 1, play: (a, t) => [440, 554, 659].forEach((f, i) => a.tone('triangle', f, f, 0.14, 0.08, t + i * 0.1)) },
    alarm: { gap: 2, play: (a, t) => { for (let i = 0; i < 3; i++) { a.tone('sawtooth', 440, 660, 0.22, 0.07, t + i * 0.5); a.tone('sawtooth', 660, 440, 0.22, 0.07, t + i * 0.5 + 0.25); } } },
    bossDie: { gap: 1, play: (a, t) => { a.noise(1.2, 0.3, 600, t); a.tone('sawtooth', 220, 40, 1, 0.12, t); } },
    planetDie: { gap: 2, play: (a, t) => { a.noise(1.6, 0.35, 500, t); a.tone('sawtooth', 180, 30, 1.5, 0.15, t); } },
    gameover: { gap: 2, play: (a, t) => [392, 330, 262, 196].forEach((f, i) => a.tone('triangle', f, f * 0.98, 0.3, 0.09, t + i * 0.22)) },
  };

  const Audio = {
    ctx: null,
    master: null,
    muted: false,
    last: {},

    init() {
      // libera o áudio no primeiro gesto do usuário
      window.addEventListener('pointerdown', () => this.ensure(), true);
      window.addEventListener('keydown', () => this.ensure(), true);

      const on = (ev, name) => OD.events.on(ev, () => this.play(name));
      OD.events.on('sfx', (name) => this.play(name));
      OD.events.on('enemy:killed', (e) => this.play(e.boss ? 'bossDie' : 'pop'));
      on('coins:gain', 'coin');
      on('wave:start', 'wave');
      on('boss:incoming', 'alarm');
      on('defense:build', 'build');
      on('defense:upgrade', 'upgrade');
      on('defense:sell', 'sell');
      on('slot:unlock', 'unlock');
      on('game:over', 'gameover');
    },

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : VOLUME;
        this.master.connect(this.ctx.destination);
        // ruído branco reaproveitado em explosões
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : VOLUME;
    },

    play(name) {
      const ctx = this.ctx;
      if (this.muted || !ctx || ctx.state !== 'running') return;
      const s = SOUNDS[name];
      if (!s) return;
      const now = ctx.currentTime;
      if (now - (this.last[name] || -1) < s.gap) return;
      this.last[name] = now;
      s.play(this, now);
    },

    // tom com glissando de f0 para f1 e envelope curto
    tone(type, f0, f1, dur, vol, t) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    // rajada de ruído filtrado (explosões)
    noise(dur, vol, cutoff, t) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(60, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.02);
    },
  };

  OD.Audio = Audio;
})();
