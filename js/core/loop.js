// Loop principal: delta time, multiplicador de velocidade, sub-passos
// e câmera lenta temporária
(() => {
  const OD = (window.OD = window.OD || {});
  const SLOWMO_SCALE = 0.3;

  class Loop {
    constructor(update, render) {
      this.update = update;   // update(dt) em segundos de simulação
      this.render = render;   // render(dtReal)
      this.paused = true;
      this.speed = 1;
      this.slowT = 0;         // s reais restantes de câmera lenta
      this.last = 0;
      this.fps = 60;
      this._fpsAcc = 0;
      this._fpsFrames = 0;
      this.frame = this.frame.bind(this);
    }

    start() {
      this.last = performance.now();
      requestAnimationFrame(this.frame);
    }

    slowmo(seconds) {
      this.slowT = Math.max(this.slowT, seconds);
    }

    frame(now) {
      const cfg = OD.CONFIG.sim;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt < 0) dt = 0;
      if (dt > cfg.maxFrameDt) dt = cfg.maxFrameDt;

      if (!this.paused && dt > 0) {
        let scale = this.speed;
        if (this.slowT > 0) {
          this.slowT -= dt;
          scale *= SLOWMO_SCALE;
        }
        // em 2x/3x divide em passos menores para colisões estáveis
        const sim = dt * scale;
        const steps = Math.max(1, Math.ceil(sim / cfg.maxStep));
        const h = sim / steps;
        for (let i = 0; i < steps && !this.paused; i++) this.update(h);
      }

      this.render(dt);

      // FPS médio a cada meio segundo
      this._fpsAcc += dt;
      this._fpsFrames++;
      if (this._fpsAcc >= 0.5) {
        this.fps = Math.round(this._fpsFrames / this._fpsAcc);
        this._fpsAcc = 0;
        this._fpsFrames = 0;
      }

      requestAnimationFrame(this.frame);
    }
  }

  OD.Loop = Loop;
})();
