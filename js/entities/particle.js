// Partículas e números flutuantes (sempre via pool) + atalhos de efeitos
(() => {
  const OD = (window.OD = window.OD || {});

  // tipos: 'dot' (faísca), 'ring' (onda de choque), 'flash' (clarão),
  // 'zap' (raio de (x,y) até (vx,vy)), 'beam' (linha reta larga de (x,y) até (vx,vy))
  class Particle {
    constructor() {
      this.alive = false;
    }
    init(kind, x, y, vx, vy, life, size, color) {
      this.kind = kind;
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.life = life;
      this.maxLife = life;
      this.size = size;
      this.color = color;
      return this;
    }
    update(dt) {
      this.life -= dt;
      if (this.life <= 0) {
        this.alive = false;
        return;
      }
      if (this.kind === 'zap' || this.kind === 'beam') return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.96;
      this.vy *= 0.96;
    }
    draw(r) {
      const t = this.life / this.maxLife;
      const ctx = r.ctx;
      ctx.globalAlpha = t;
      if (this.kind === 'dot') {
        const s = this.size * (0.4 + 0.6 * t);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
      } else if (this.kind === 'ring') {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3 * t + 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (1 - t * t), 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.kind === 'zap') {
        // raio em zigue-zague
        const dx = this.vx - this.x;
        const dy = this.vy - this.y;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 1; i < 5; i++) {
          const k = i / 5;
          ctx.lineTo(this.x + dx * k + (Math.random() - 0.5) * 14, this.y + dy * k + (Math.random() - 0.5) * 14);
        }
        ctx.lineTo(this.vx, this.vy);
        ctx.stroke();
      } else if (this.kind === 'beam') {
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = this.size * t;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.vx, this.vy);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = this.size * t * 0.3;
        ctx.stroke();
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.5 + 0.5 * t), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // número de dano / moedas que sobe e some
  class FloatText {
    constructor() {
      this.alive = false;
    }
    init(text, x, y, color, size) {
      this.text = text;
      this.x = x;
      this.y = y;
      this.color = color;
      this.font = FONTS[size] || (FONTS[size] = `800 ${size}px system-ui, sans-serif`);
      this.life = 0.8;
      this.maxLife = 0.8;
      return this;
    }
    update(dt) {
      this.life -= dt;
      this.y -= 38 * dt;
      if (this.life <= 0) this.alive = false;
    }
    draw(r) {
      const ctx = r.ctx;
      const t = this.life / this.maxLife;
      ctx.globalAlpha = Math.min(1, t * 2);
      r.setFont(this.font);
      // sombra deslocada: bem mais barata que strokeText
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(this.text, this.x + 1.5, this.y + 1.5);
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
    }
  }
  const FONTS = {};

  // atalhos de efeitos visuais usados pela lógica
  OD.fx = {
    explosion(m, x, y, size, color) {
      const n = Math.min(20, 5 + Math.floor(size / 2));
      for (let i = 0; i < n; i++) {
        const p = m.particles.get();
        if (!p) break;
        const a = Math.random() * Math.PI * 2;
        const sp = (0.4 + Math.random()) * size * 5;
        p.init('dot', x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35 + Math.random() * 0.4, 2 + Math.random() * 3, color);
      }
      const f = m.particles.get();
      if (f) f.init('flash', x, y, 0, 0, 0.18, size * 0.9, '#fff3d6');
      const ring = m.particles.get();
      if (ring) ring.init('ring', x, y, 0, 0, 0.35, size * 1.6, color);
    },
    sparks(m, x, y, color, n = 4) {
      for (let i = 0; i < n; i++) {
        const p = m.particles.get();
        if (!p) break;
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 140;
        p.init('dot', x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.2 + Math.random() * 0.2, 2.5, color);
      }
    },
    zap(m, x1, y1, x2, y2, color, life = 0.15, width = 2.5) {
      const p = m.particles.get();
      if (p) p.init('zap', x1, y1, x2, y2, life, width, color);
    },
    beam(m, x1, y1, x2, y2, color, width = 10, life = 0.35) {
      const p = m.particles.get();
      if (p) p.init('beam', x1, y1, x2, y2, life, width, color);
    },
    ring(m, x, y, radius, color, life = 0.5) {
      const p = m.particles.get();
      if (p) p.init('ring', x, y, 0, 0, life, radius, color);
    },
    text(m, text, x, y, color = '#ffffff', size = 20) {
      const t = m.texts.get();
      if (t) t.init(text, x + (Math.random() - 0.5) * 10, y, color, size);
    },
    damageNumber(m, amount, x, y) {
      if (!OD.CONFIG.fx.damageNumbers || amount < 1) return;
      this.text(m, String(Math.round(amount)), x, y - 10, '#ffffff', 18);
    },
  };

  OD.Particle = Particle;
  OD.FloatText = FloatText;
})();
