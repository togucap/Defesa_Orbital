// Desenhos provisórios no estilo "vetor neon", feitos por código. Cada função
// desenha centrada em (0,0), em unidades do mundo; sprites rotacionáveis
// apontam para a direita. São pré-renderizados uma vez (o brilho não custa
// nada durante o jogo) e podem ser trocados por imagens no manifesto.
// Assinatura: (ctx, size, entradaDoManifesto, quadro)
(() => {
  const OD = (window.OD = window.OD || {});
  const TAU = Math.PI * 2;
  const GOLD = '#ffd34d';

  // --- utilidades de cor ---
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    const c = rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  // f > 0 clareia, f < 0 escurece (de 0 a 1)
  function shade(hex, f) {
    const c = rgb(hex);
    const t = f < 0 ? 0 : 255;
    const p = Math.abs(f);
    const h = (v) => Math.round(v + (t - v) * p).toString(16).padStart(2, '0');
    return '#' + h(c[0]) + h(c[1]) + h(c[2]);
  }

  const P = { scale: 1 }; // px do canvas por unidade (definido por sprites.js)

  // --- utilidades de desenho ---
  function glowOn(ctx, color, units) {
    ctx.shadowColor = color;
    ctx.shadowBlur = units * P.scale;
  }
  function glowOff(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
  }
  // traço neon: cor com brilho + núcleo claro
  function neon(ctx, color, width, blur) {
    glowOn(ctx, color, blur == null ? width * 3 : blur);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    glowOff(ctx);
    ctx.strokeStyle = shade(color, 0.6);
    ctx.lineWidth = width * 0.4;
    ctx.stroke();
  }
  function fillGlow(ctx, color, blur) {
    glowOn(ctx, color, blur);
    ctx.fillStyle = color;
    ctx.fill();
    glowOff(ctx);
  }
  function dark(ctx, color, f = -0.82) {
    ctx.fillStyle = shade(color, f);
    ctx.fill();
  }
  function glow(ctx, r, color, alpha, inner = 0) {
    const g = ctx.createRadialGradient(0, 0, inner, 0, 0, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }
  function glowAt(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    glow(ctx, r, color, alpha);
    ctx.restore();
  }
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }
  function ngon(ctx, n, r, rot = 0, x = 0, y = 0) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  function rect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }

  // plataforma das defesas; os estágios adicionam detalhes
  function platform(ctx, r, color, tier) {
    circle(ctx, 0, 0, r * 0.92);
    ctx.fillStyle = '#0a0f22';
    ctx.fill();
    circle(ctx, 0, 0, r * 0.92);
    neon(ctx, shade(color, -0.25), r * 0.06, r * 0.25);
    if (tier >= 1) {
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + TAU / 12;
        line(ctx, Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
        neon(ctx, color, r * 0.05, r * 0.15);
      }
    }
    if (tier >= 2) {
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.02, a + 0.08, a + TAU / 12 - 0.08);
        neon(ctx, color, r * 0.035, r * 0.15);
      }
    }
    if (tier >= 3) {
      circle(ctx, 0, 0, r * 1.1);
      neon(ctx, GOLD, r * 0.05, r * 0.35);
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(TAU / 8 + (i * TAU) / 4);
        poly(ctx, [r * 1.1, -r * 0.08, r * 1.28, 0, r * 1.1, r * 0.08]);
        fillGlow(ctx, GOLD, r * 0.3);
        ctx.restore();
      }
    }
  }
  // núcleo brilhante (dourado no estágio máximo)
  function core(ctx, x, y, r, color, tier) {
    const c = tier >= 3 ? GOLD : color;
    glowAt(ctx, x, y, r * 2.4, c, 0.7);
    circle(ctx, x, y, r);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function starfield(ctx, w, h, sec, seed, density, nebulae, grid) {
    const rnd = OD.math.seeded(seed);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(sec.color, -0.4));
    g.addColorStop(0.45, sec.color);
    g.addColorStop(1, shade(sec.color, -0.5));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // nebulosas suaves
    for (let i = 0; i < nebulae; i++) {
      const tint = sec.tints[i % sec.tints.length];
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.25 + rnd() * 0.35) * Math.max(w, h);
      const ng = ctx.createRadialGradient(x, y, 0, x, y, r);
      ng.addColorStop(0, rgba(tint, 0.26));
      ng.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, w, h);
    }

    // grade neon bem discreta
    if (grid) {
      ctx.strokeStyle = rgba(sec.grid, 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = (w / 2) % grid; x < w; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = (h * 0.42) % grid; y < h; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    // estrelas
    const count = Math.floor((w * h) / density);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const s = Math.pow(rnd(), 3) * 1.8 + 0.35;
      ctx.globalAlpha = 0.35 + rnd() * 0.65;
      ctx.fillStyle = rnd() < 0.2 ? '#bcd4ff' : rnd() < 0.1 ? '#ffe2b8' : '#ffffff';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < count / 60; i++) glowAt(ctx, rnd() * w, rnd() * h, 5, '#cfe0ff', 0.6);

    // vinheta
    const v = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h * 0.42, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  // ---------- fundos (w, h em unidades do mundo / px da página) ----------
  P.background = (ctx, w, h, a, frame) => starfield(ctx, w, h, OD.sectorInfo(frame || 0), 7 + (frame || 0) * 13, 2200, 4, 48);
  P.pageBackground = (ctx, w, h) => starfield(ctx, w, h, { color: '#03040b', tints: ['#1a1f5a', '#0f2f5a', '#2a1240'] }, 21, 2600, 3, 0);

  // ---------- planeta ----------
  P.planet = (ctx, size, a) => {
    const r = size / 2;
    ctx.save();
    circle(ctx, 0, 0, r);
    ctx.clip();
    const body = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    body.addColorStop(0, shade(a.color, 0.15));
    body.addColorStop(1, shade(a.color, -0.35));
    ctx.fillStyle = body;
    ctx.fillRect(-r, -r, size, size);

    const rnd = OD.math.seeded(42);
    ctx.fillStyle = '#3ecf8e';
    for (let i = 0; i < 8; i++) {
      const cx = (rnd() - 0.5) * size;
      const cy = (rnd() - 0.5) * size;
      for (let j = 0; j < 4; j++) {
        circle(ctx, cx + (rnd() - 0.5) * r * 0.5, cy + (rnd() - 0.5) * r * 0.5, r * (0.12 + rnd() * 0.18));
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = r * (0.05 + rnd() * 0.06);
      const y = (rnd() - 0.5) * size;
      const x = (rnd() - 0.5) * size;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y);
      ctx.quadraticCurveTo(x, y - r * 0.08, x + r * 0.4, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // sombra fixa (luz vindo de cima/esquerda) + luzes de cidades no lado escuro
  P.planetShade = (ctx, size) => {
    const r = size / 2;
    ctx.save();
    circle(ctx, 0, 0, r);
    ctx.clip();
    const g = ctx.createLinearGradient(-r * 0.6, -r * 0.6, r * 0.8, r * 0.8);
    g.addColorStop(0, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.45, 'rgba(0,0,20,0)');
    g.addColorStop(1, 'rgba(0,0,18,0.78)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, size, size);
    const rnd = OD.math.seeded(77);
    for (let i = 0; i < 40; i++) {
      const x = (rnd() - 0.3) * size * 0.9;
      const y = (rnd() - 0.3) * size * 0.9;
      if (x + y < r * 0.35 || x * x + y * y > r * r * 0.85) continue;
      glowAt(ctx, x, y, r * 0.06, '#ffd27a', 0.9);
      circle(ctx, x, y, r * 0.012);
      ctx.fillStyle = '#fff3c4';
      ctx.fill();
    }
    ctx.restore();
  };

  P.planetAtmo = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.5, a.color, 0.5, r * 0.85);
    circle(ctx, 0, 0, r * 1.01);
    neon(ctx, a.color, r * 0.035, r * 0.25);
  };

  // malha hexagonal que aparece quando o planeta leva dano
  P.planetShield = (ctx, size, a) => {
    const r = size / 2;
    const R = r * 1.14;
    ctx.save();
    circle(ctx, 0, 0, R);
    ctx.clip();
    glow(ctx, R, a.color, 0.35, r * 0.6);
    const s = r * 0.22;
    const h = s * Math.sqrt(3);
    ctx.strokeStyle = rgba(a.color, 0.7);
    ctx.lineWidth = r * 0.025;
    for (let row = -6; row <= 6; row++) {
      for (let col = -6; col <= 6; col++) {
        const x = col * s * 1.5;
        const y = row * h + (col % 2 ? h / 2 : 0);
        ngon(ctx, 6, s * 0.92, 0, x, y);
        ctx.stroke();
      }
    }
    ctx.restore();
    circle(ctx, 0, 0, R);
    neon(ctx, a.color, r * 0.04, r * 0.3);
  };

  // ---------- slots ----------
  P.slotLocked = (ctx, size, a) => {
    const r = size / 2;
    circle(ctx, 0, 0, r * 0.9);
    ctx.fillStyle = 'rgba(8, 11, 26, 0.85)';
    ctx.fill();
    ctx.setLineDash([r * 0.28, r * 0.22]);
    circle(ctx, 0, 0, r * 0.9);
    ctx.strokeStyle = a.color;
    ctx.lineWidth = r * 0.07;
    ctx.stroke();
    ctx.setLineDash([]);
    rect(ctx, -r * 0.3, -r * 0.02, r * 0.6, r * 0.46);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 0.04, r * 0.2, Math.PI, 0);
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = a.color;
    ctx.stroke();
  };

  P.slotEmpty = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.25, a.color, 0.16);
    circle(ctx, 0, 0, r * 0.9);
    ctx.fillStyle = rgba(a.color, 0.08);
    ctx.fill();
    circle(ctx, 0, 0, r * 0.9);
    neon(ctx, a.color, r * 0.07, r * 0.35);
    line(ctx, -r * 0.34, 0, r * 0.34, 0);
    neon(ctx, a.color, r * 0.11, r * 0.3);
    line(ctx, 0, -r * 0.34, 0, r * 0.34);
    neon(ctx, a.color, r * 0.11, r * 0.3);
  };

  // ---------- defesas (quadro = estágio 0–3) ----------
  P.cannon = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    platform(ctx, r, c, tier);
    if (a.variant === 'gatling') {
      for (let i = 0; i < 4; i++) {
        const y = (i - 1.5) * r * 0.11;
        rect(ctx, r * 0.15, y - r * 0.035, r * 0.82, r * 0.07);
        ctx.fillStyle = '#d6dcef';
        ctx.fill();
      }
      rect(ctx, r * 0.82, -r * 0.24, r * 0.1, r * 0.48);
      fillGlow(ctx, c, r * 0.3);
      circle(ctx, r * 0.2, 0, r * 0.3);
      dark(ctx, c);
      circle(ctx, r * 0.2, 0, r * 0.3);
      neon(ctx, c, r * 0.06);
    } else if (a.variant === 'pierce') {
      for (const s of [-1, 1]) {
        rect(ctx, 0, s * r * 0.14 - r * 0.04, r * 1.05, r * 0.08);
        fillGlow(ctx, a.accent, r * 0.25);
      }
      for (let i = 0; i < 3; i++) {
        rect(ctx, r * (0.35 + i * 0.22), -r * 0.2, r * 0.06, r * 0.4);
        ctx.fillStyle = '#d6dcef';
        ctx.fill();
      }
      glowAt(ctx, r * 1.02, 0, r * 0.3, a.accent, 0.8);
    } else {
      const n = tier >= 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const y = (i - (n - 1) / 2) * r * 0.26;
        rect(ctx, r * 0.1, y - r * 0.07, r * 0.86, r * 0.14);
        ctx.fillStyle = '#d6dcef';
        ctx.fill();
        rect(ctx, r * 0.8, y - r * 0.07, r * 0.16, r * 0.14);
        fillGlow(ctx, c, r * 0.25);
      }
    }
    if (tier >= 1) {
      for (const s of [-1, 1]) {
        poly(ctx, [-r * 0.35, s * r * 0.3, r * 0.15, s * r * 0.3, r * 0.05, s * r * 0.48, -r * 0.3, s * r * 0.48]);
        dark(ctx, c, -0.6);
        poly(ctx, [-r * 0.35, s * r * 0.3, r * 0.15, s * r * 0.3, r * 0.05, s * r * 0.48, -r * 0.3, s * r * 0.48]);
        neon(ctx, c, r * 0.03, r * 0.1);
      }
    }
    ngon(ctx, 8, r * 0.42, TAU / 16);
    dark(ctx, c);
    ngon(ctx, 8, r * 0.42, TAU / 16);
    neon(ctx, c, r * 0.07);
    core(ctx, 0, 0, r * 0.11, c, tier);
  };

  P.laser = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    platform(ctx, r, c, tier);
    if (a.variant === 'chain') {
      for (const ang of [-0.4, 0, 0.4]) {
        const x = Math.cos(ang) * r * 0.85;
        const y = Math.sin(ang) * r * 0.85;
        line(ctx, 0, 0, x, y);
        neon(ctx, a.accent, r * 0.06);
        core(ctx, x, y, r * 0.08, a.accent, tier);
      }
      for (let i = 1; i <= 3; i++) {
        circle(ctx, 0, 0, r * 0.12 * i);
        neon(ctx, c, r * 0.03, r * 0.1);
      }
    } else if (a.variant === 'heavy') {
      for (const s of [-1, 1]) {
        rect(ctx, 0, s * r * 0.16 - r * 0.05, r * 0.95, r * 0.1);
        ctx.fillStyle = '#d6dcef';
        ctx.fill();
      }
      rect(ctx, -r * 0.35, -r * 0.3, r * 0.6, r * 0.6);
      dark(ctx, c);
      rect(ctx, -r * 0.35, -r * 0.3, r * 0.6, r * 0.6);
      neon(ctx, c, r * 0.06);
      glowAt(ctx, r * 0.95, 0, r * 0.45, a.accent, 0.9);
      core(ctx, r * 0.95, 0, r * 0.12, a.accent, tier);
    } else {
      rect(ctx, 0, -r * 0.06, r * 0.95, r * 0.12);
      ctx.fillStyle = '#d6dcef';
      ctx.fill();
      poly(ctx, [r * 0.5, 0, 0, r * 0.42, -r * 0.42, 0, 0, -r * 0.42]);
      dark(ctx, c);
      poly(ctx, [r * 0.5, 0, 0, r * 0.42, -r * 0.42, 0, 0, -r * 0.42]);
      neon(ctx, c, r * 0.07);
      if (tier >= 2) {
        circle(ctx, r * 0.6, 0, r * 0.12);
        neon(ctx, c, r * 0.04);
      }
      core(ctx, r * 0.95, 0, r * 0.1, c, tier);
    }
    if (tier >= 1) {
      circle(ctx, 0, 0, r * 0.58);
      ctx.setLineDash([r * 0.12, r * 0.1]);
      neon(ctx, c, r * 0.03, r * 0.1);
      ctx.setLineDash([]);
    }
  };

  P.missile = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    platform(ctx, r, c, tier);
    if (a.variant === 'warhead') {
      rect(ctx, -r * 0.55, -r * 0.24, r * 1.0, r * 0.48);
      dark(ctx, c);
      rect(ctx, -r * 0.55, -r * 0.24, r * 1.0, r * 0.48);
      neon(ctx, c, r * 0.05);
      rect(ctx, -r * 0.45, -r * 0.13, r * 0.8, r * 0.26);
      ctx.fillStyle = '#eef1f8';
      ctx.fill();
      poly(ctx, [r * 0.35, -r * 0.13, r * 0.75, 0, r * 0.35, r * 0.13]);
      fillGlow(ctx, a.accent, r * 0.3);
      poly(ctx, [-r * 0.45, -r * 0.13, -r * 0.62, -r * 0.3, -r * 0.3, -r * 0.13]);
      ctx.fillStyle = c;
      ctx.fill();
      poly(ctx, [-r * 0.45, r * 0.13, -r * 0.62, r * 0.3, -r * 0.3, r * 0.13]);
      ctx.fill();
    } else {
      rect(ctx, -r * 0.5, -r * 0.5, r * 0.95, r);
      dark(ctx, c);
      rect(ctx, -r * 0.5, -r * 0.5, r * 0.95, r);
      neon(ctx, c, r * 0.06);
      const rows = a.variant === 'swarm' ? 3 : 2;
      const cols = a.variant === 'swarm' ? 2 : 1;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const y = (i - (rows - 1) / 2) * r * (rows === 3 ? 0.3 : 0.46);
          const x0 = -r * 0.3 + j * r * 0.32;
          const len = cols === 1 ? r * 0.75 : r * 0.28;
          rect(ctx, x0, y - r * 0.1, len, r * 0.2);
          ctx.fillStyle = '#141a33';
          ctx.fill();
          circle(ctx, x0 + len - r * 0.06, y, r * 0.07);
          fillGlow(ctx, c, r * 0.25);
        }
      }
    }
    if (tier >= 1) {
      circle(ctx, -r * 0.6, 0, r * 0.13);
      dark(ctx, c, -0.5);
      circle(ctx, -r * 0.6, 0, r * 0.13);
      neon(ctx, c, r * 0.03, r * 0.1);
    }
    if (tier >= 2) {
      line(ctx, -r * 0.6, 0, -r * 0.82, -r * 0.3);
      neon(ctx, c, r * 0.03, r * 0.1);
    }
    if (tier >= 3) core(ctx, -r * 0.82, -r * 0.3, r * 0.06, c, tier);
  };

  P.shield = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    const acc = a.accent || c;
    platform(ctx, r, c, tier);
    glow(ctx, r * 0.9, c, 0.4);
    ngon(ctx, 6, r * 0.56, TAU / 12);
    ctx.fillStyle = rgba(c, 0.18);
    ctx.fill();
    ngon(ctx, 6, r * 0.56, TAU / 12);
    neon(ctx, c, r * (a.variant === 'wall' ? 0.12 : 0.07));
    if (a.variant === 'wall') {
      for (let i = 0; i < 6; i++) {
        const ang = TAU / 12 + (i * TAU) / 6;
        circle(ctx, Math.cos(ang) * r * 0.56, Math.sin(ang) * r * 0.56, r * 0.07);
        fillGlow(ctx, '#ffffff', r * 0.2);
      }
    }
    if (a.variant === 'regen') {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, (i * TAU) / 3, (i * TAU) / 3 + 1.4);
        neon(ctx, acc, r * 0.06);
      }
    }
    if (tier >= 1) {
      ngon(ctx, 6, r * 0.36, TAU / 12);
      neon(ctx, c, r * 0.04, r * 0.12);
    }
    core(ctx, 0, 0, r * 0.13, acc, tier);
  };

  P.emp = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    const acc = a.accent || c;
    platform(ctx, r, c, tier);
    if (a.variant === 'freeze') {
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * TAU) / 6);
        line(ctx, 0, 0, r * 0.68, 0);
        neon(ctx, acc, r * 0.06);
        line(ctx, r * 0.4, 0, r * 0.55, -r * 0.14);
        neon(ctx, acc, r * 0.04, r * 0.1);
        line(ctx, r * 0.4, 0, r * 0.55, r * 0.14);
        neon(ctx, acc, r * 0.04, r * 0.1);
        ctx.restore();
      }
    } else {
      const n = tier >= 2 ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const ang = (i * TAU) / n;
        line(ctx, Math.cos(ang) * r * 0.25, Math.sin(ang) * r * 0.25, Math.cos(ang) * r * 0.62, Math.sin(ang) * r * 0.62);
        neon(ctx, c, r * 0.08);
        circle(ctx, Math.cos(ang) * r * 0.66, Math.sin(ang) * r * 0.66, r * 0.1);
        fillGlow(ctx, shade(c, 0.4), r * 0.25);
      }
      if (a.variant === 'shock') {
        poly(ctx, [r * 0.08, -r * 0.42, -r * 0.16, r * 0.04, 0, r * 0.04, -r * 0.08, r * 0.42, r * 0.18, -r * 0.06, r * 0.02, -r * 0.06]);
        fillGlow(ctx, acc, r * 0.4);
      }
    }
    if (tier >= 1) {
      circle(ctx, 0, 0, r * 0.78);
      ctx.setLineDash([r * 0.08, r * 0.14]);
      neon(ctx, c, r * 0.03, r * 0.1);
      ctx.setLineDash([]);
    }
    if (a.variant !== 'shock') core(ctx, 0, 0, r * 0.16, acc, tier);
  };

  P.repair = (ctx, size, a, tier) => {
    const r = size / 2;
    const c = a.color;
    const acc = a.accent || c;
    platform(ctx, r, c, tier);
    glow(ctx, r * 0.8, c, 0.35);
    if (a.variant === 'fortify') {
      poly(ctx, [0, -r * 0.58, r * 0.5, -r * 0.35, r * 0.4, r * 0.3, 0, r * 0.6, -r * 0.4, r * 0.3, -r * 0.5, -r * 0.35]);
      dark(ctx, c);
      poly(ctx, [0, -r * 0.58, r * 0.5, -r * 0.35, r * 0.4, r * 0.3, 0, r * 0.6, -r * 0.4, r * 0.3, -r * 0.5, -r * 0.35]);
      neon(ctx, acc, r * 0.07);
    } else {
      circle(ctx, 0, 0, r * 0.5);
      dark(ctx, c);
      circle(ctx, 0, 0, r * 0.5);
      neon(ctx, c, r * 0.07);
    }
    rect(ctx, -r * 0.28, -r * 0.09, r * 0.56, r * 0.18);
    fillGlow(ctx, '#ffffff', r * 0.25);
    rect(ctx, -r * 0.09, -r * 0.28, r * 0.18, r * 0.56);
    fillGlow(ctx, '#ffffff', r * 0.25);
    if (a.variant === 'nano') {
      for (let i = 0; i < 4; i++) {
        const ang = TAU / 8 + (i * TAU) / 4;
        circle(ctx, Math.cos(ang) * r * 0.72, Math.sin(ang) * r * 0.72, r * 0.08);
        fillGlow(ctx, acc, r * 0.3);
      }
    }
    if (tier >= 1) {
      circle(ctx, 0, 0, r * 0.64);
      neon(ctx, c, r * 0.03, r * 0.1);
    }
    if (tier >= 3) core(ctx, 0, 0, r * 0.06, c, tier);
  };

  // ---------- inimigos ----------
  P.asteroid = (ctx, size, a) => {
    const r = size / 2;
    const rnd = OD.math.seeded(a.seed || 1);
    const n = 11;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU;
      const d = r * (0.72 + rnd() * 0.28);
      pts.push(Math.cos(ang) * d, Math.sin(ang) * d);
    }
    poly(ctx, pts);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, shade(a.color, 0.15));
    g.addColorStop(1, shade(a.color, -0.6));
    glowOn(ctx, '#ff9a5c', r * 0.35);
    ctx.fillStyle = g;
    ctx.fill();
    glowOff(ctx);
    poly(ctx, pts);
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.strokeStyle = rgba('#ffb37a', 0.55);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const cx = (rnd() - 0.5) * r;
      const cy = (rnd() - 0.5) * r;
      const cr = r * (0.1 + rnd() * 0.14);
      circle(ctx, cx, cy, cr);
      ctx.fillStyle = shade(a.color, -0.45);
      ctx.fill();
      circle(ctx, cx - cr * 0.25, cy - cr * 0.25, cr * 0.6);
      ctx.fillStyle = shade(a.color, -0.2);
      ctx.fill();
    }
  };

  P.fighter = (ctx, size, a) => {
    const r = size / 2;
    glowAt(ctx, -r * 0.7, 0, r * 0.5, '#ffb347', 0.9);
    const pts = [r, 0, -r * 0.7, r * 0.85, -r * 0.35, 0, -r * 0.7, -r * 0.85];
    poly(ctx, pts);
    dark(ctx, a.color, -0.75);
    poly(ctx, pts);
    neon(ctx, a.color, r * 0.09);
    ctx.beginPath();
    ctx.ellipse(r * 0.18, 0, r * 0.26, r * 0.12, 0, 0, TAU);
    fillGlow(ctx, '#9fe8ff', r * 0.3);
  };

  P.bomber = (ctx, size, a) => {
    const r = size / 2;
    for (const s of [-1, 1]) glowAt(ctx, -r * 0.7, s * r * 0.35, r * 0.32, '#ff9de6', 0.9);
    const wing = [r * 0.3, 0, -r * 0.35, r, -r * 0.65, r * 0.9, -r * 0.4, 0, -r * 0.65, -r * 0.9, -r * 0.35, -r];
    poly(ctx, wing);
    dark(ctx, a.color, -0.8);
    poly(ctx, wing);
    neon(ctx, a.color, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.3, 0, 0, TAU);
    dark(ctx, a.color, -0.65);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.3, 0, 0, TAU);
    neon(ctx, a.color, r * 0.07);
    ctx.beginPath();
    ctx.ellipse(r * 0.4, 0, r * 0.2, r * 0.12, 0, 0, TAU);
    fillGlow(ctx, '#ffe1fb', r * 0.25);
  };

  P.kamikaze = (ctx, size, a) => {
    const r = size / 2;
    glowAt(ctx, -r * 0.5, 0, r, a.color, 0.6);
    const pts = [r, 0, -r * 0.8, r * 0.5, -r * 0.45, 0, -r * 0.8, -r * 0.5];
    poly(ctx, pts);
    dark(ctx, a.color, -0.6);
    poly(ctx, pts);
    neon(ctx, a.color, r * 0.1);
    circle(ctx, r * 0.12, 0, r * 0.16);
    fillGlow(ctx, '#ffffff', r * 0.4);
  };

  P.boss = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.1, a.color, 0.35, r * 0.5);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 6);
      poly(ctx, [r * 0.7, -r * 0.12, r * 0.98, 0, r * 0.7, r * 0.12]);
      dark(ctx, a.color, -0.5);
      poly(ctx, [r * 0.7, -r * 0.12, r * 0.98, 0, r * 0.7, r * 0.12]);
      neon(ctx, a.color, r * 0.025);
      ctx.restore();
    }
    ngon(ctx, 6, r * 0.78);
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.8);
    g.addColorStop(0, shade(a.color, -0.5));
    g.addColorStop(1, shade(a.color, -0.85));
    ctx.fillStyle = g;
    ctx.fill();
    ngon(ctx, 6, r * 0.78);
    neon(ctx, a.color, r * 0.04);
    ngon(ctx, 6, r * 0.52, TAU / 12);
    neon(ctx, shade(a.color, 0.2), r * 0.02, r * 0.1);
    for (let i = 0; i < 6; i++) {
      const ang = (i * TAU) / 6;
      line(ctx, Math.cos(ang) * r * 0.52, Math.sin(ang) * r * 0.52, Math.cos(ang) * r * 0.78, Math.sin(ang) * r * 0.78);
      neon(ctx, a.color, r * 0.015, r * 0.05);
    }
    for (const s of [-1, 1]) {
      rect(ctx, r * 0.45, s * r * 0.3 - r * 0.06, r * 0.45, r * 0.12);
      ctx.fillStyle = '#c8cde0';
      ctx.fill();
      circle(ctx, r * 0.9, s * r * 0.3, r * 0.05);
      fillGlow(ctx, a.color, r * 0.2);
    }
    glow(ctx, r * 0.45, a.color, 0.95);
    circle(ctx, 0, 0, r * 0.16);
    ctx.fillStyle = '#fff2f4';
    ctx.fill();
  };

  // ---------- projéteis ----------
  P.bullet = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r, a.color, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.22, 0, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  P.missileShot = (ctx, size, a) => {
    const r = size / 2;
    glowAt(ctx, -r * 0.75, 0, r * 0.6, '#ffd27a', 0.95);
    poly(ctx, [-r * 0.6, 0, -r * 0.85, r * 0.35, -r * 0.35, 0, -r * 0.85, -r * 0.35]);
    ctx.fillStyle = shade(a.color, -0.3);
    ctx.fill();
    rect(ctx, -r * 0.6, -r * 0.16, r * 1.1, r * 0.32);
    ctx.fillStyle = '#eef1f8';
    ctx.fill();
    poly(ctx, [r * 0.5, -r * 0.16, r * 0.9, 0, r * 0.5, r * 0.16]);
    fillGlow(ctx, a.color, r * 0.3);
  };

  P.enemyShot = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r, a.color, 0.9);
    circle(ctx, 0, 0, r * 0.45);
    neon(ctx, a.color, r * 0.12, r * 0.3);
    circle(ctx, 0, 0, r * 0.28);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  OD.Placeholders = P;
  OD.colorUtil = { rgba, shade };
})();
