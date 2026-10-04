// Renderizador: escala o mundo para a tela (com devicePixelRatio), desenha
// as camadas na ordem certa e oferece utilitários de desenho às entidades.
// O mundo usa o planeta como origem (0,0).
(() => {
  const OD = (window.OD = window.OD || {});
  const TAU = Math.PI * 2;

  class Renderer {
    constructor(canvas, pageCanvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.page = pageCanvas;
      this.time = 0;
      this.scale = 1;   // px CSS por unidade do mundo
      this.ppu = 1;     // px do dispositivo por unidade do mundo
      this.ox = 0;      // origem (planeta) em px do dispositivo
      this.oy = 0;
      // limites visíveis do mundo, relativos ao planeta
      this.view = { w: 720, h: 1280, cx: 360, cy: 540, left: -360, right: 360, top: -540, bottom: 740 };
      OD.view = this.view; // a lógica usa os limites visíveis (spawn e mira)
      this.bg = null;
    }

    resize(cssW, cssH) {
      const cfg = OD.CONFIG;
      const dpr = Math.min(window.devicePixelRatio || 1, cfg.render.maxDpr);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';

      const W = cfg.world.width;
      const H = (W * cssH) / cssW;
      this.scale = cssW / W;
      this.ppu = this.canvas.width / W;
      const v = this.view;
      v.w = W;
      v.h = H;
      v.cx = W / 2;
      v.cy = H * cfg.world.planetY;
      v.left = -v.cx;
      v.right = W - v.cx;
      v.top = -v.cy;
      v.bottom = H - v.cy;

      OD.Sprites.build(this.ppu);
      this.bg = OD.Sprites.buildFill('background', W, H, this.ppu);
      this.drawPageBackground();
    }

    // fundo da página inteira (fora da área de jogo)
    drawPageBackground() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.page.width = Math.round(w * dpr);
      this.page.height = Math.round(h * dpr);
      this.page.style.width = w + 'px';
      this.page.style.height = h + 'px';
      const img = OD.Sprites.buildFill('pageBackground', w, h, dpr);
      this.page.getContext('2d').drawImage(img, 0, 0);
    }

    // converte coordenadas do ponteiro (clientX/Y) para o mundo
    toWorld(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / this.scale - this.view.cx,
        y: (clientY - rect.top) / this.scale - this.view.cy,
      };
    }

    // troca a fonte só quando muda (atribuir ctx.font é caro)
    setFont(font) {
      if (this.font !== font) {
        this.ctx.font = font;
        this.font = font;
      }
    }

    // volta à transformação padrão do mundo
    reset() {
      this.ctx.setTransform(this.ppu, 0, 0, this.ppu, this.ox, this.oy);
    }

    // desenha uma entrada do manifesto
    sprite(key, x, y, angle = 0, scale = 1, alpha = 1) {
      const s = OD.Sprites.entries[key];
      if (!s) return;
      const ctx = this.ctx;
      const a = angle + s.angle + (s.spin ? s.spin * this.time : 0);
      const p = this.ppu * scale;
      const cos = Math.cos(a) * p;
      const sin = Math.sin(a) * p;
      ctx.setTransform(cos, sin, -sin, cos, this.ox + x * this.ppu, this.oy + y * this.ppu);
      if (alpha !== 1) ctx.globalAlpha = alpha;
      ctx.drawImage(s.src, -s.w / 2, -s.h / 2, s.w, s.h);
      if (alpha !== 1) ctx.globalAlpha = 1;
      this.reset();
    }

    // --- utilitários para efeitos procedurais ---
    ring(x, y, r, color, width = 2, alpha = 1) {
      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    disc(x, y, r, color, alpha = 1) {
      const ctx = this.ctx;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // barra de vida pequena sobre entidades
    bar(x, y, w, frac, color) {
      const ctx = this.ctx;
      const h = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), h);
    }

    render(m, dt) {
      this.time += dt;
      if (!this.bg) return; // ainda sem tamanho de tela
      const ctx = this.ctx;
      const v = this.view;

      // tremida de tela
      let sx = 0;
      let sy = 0;
      if (m && m.shake > 0 && OD.CONFIG.fx.screenShake) {
        const k = Math.min(m.shake, 1) * 9;
        sx = (Math.random() - 0.5) * k;
        sy = (Math.random() - 0.5) * k;
      }
      this.ox = (v.cx + sx) * this.ppu;
      this.oy = (v.cy + sy) * this.ppu;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.bg, 0, 0, this.canvas.width, this.canvas.height);
      if (!m) return;
      this.reset();
      this.font = null;

      this.drawOrbits();

      const slots = m.slots;
      for (let i = 0; i < slots.length; i++) slots[i].drawBack(this, m);

      m.planet.draw(this);

      for (let i = 0; i < slots.length; i++) slots[i].draw(this, m);

      // ignora o que está bem fora da tela (inimigos chegando)
      const L = v.left - 70;
      const R = v.right + 70;
      const T = v.top - 70;
      const B = v.bottom + 70;
      const enemies = m.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.x > L && e.x < R && e.y > T && e.y < B) e.draw(this);
      }

      const proj = m.projectiles.active;
      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        if (p.x > L && p.x < R && p.y > T && p.y < B) p.draw(this);
      }

      for (let i = 0; i < slots.length; i++) slots[i].drawFront(this, m);

      // partículas com brilho aditivo
      const parts = m.particles.active;
      if (parts.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < parts.length; i++) parts[i].draw(this);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      const texts = m.texts.active;
      if (texts.length) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < texts.length; i++) texts[i].draw(this);
        ctx.globalAlpha = 1;
      }

      if (m.selected) m.selected.drawSelection(this, m);
    }

    drawOrbits() {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(120, 170, 255, 0.16)';
      ctx.lineWidth = 2;
      for (const ring of OD.CONFIG.rings) {
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, 0, TAU);
        ctx.stroke();
      }
    }
  }

  OD.Renderer = Renderer;
})();
