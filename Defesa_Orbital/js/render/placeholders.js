// Desenhos provisórios feitos por código. Cada função desenha centrada em
// (0,0), em unidades do mundo; sprites rotacionáveis apontam para a direita.
// São usados apenas pelo manifesto (assets.js) e podem ser trocados por imagens.
(() => {
  const OD = (window.OD = window.OD || {});
  const TAU = Math.PI * 2;

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
    return `rgb(${Math.round(c[0] + (t - c[0]) * p)},${Math.round(c[1] + (t - c[1]) * p)},${Math.round(c[2] + (t - c[2]) * p)})`;
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
  function hexagon(ctx, r, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * TAU) / 6;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }
  // plataforma comum das defesas
  function platform(ctx, r, color) {
    circle(ctx, 0, 0, r * 0.95);
    ctx.fillStyle = '#161c38';
    ctx.fill();
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = shade(color, -0.35);
    ctx.stroke();
    circle(ctx, 0, 0, r * 0.72);
    ctx.lineWidth = r * 0.05;
    ctx.strokeStyle = rgba(color, 0.35);
    ctx.stroke();
  }

  function starfield(ctx, w, h, color, seed, density, nebulae) {
    const rnd = OD.math.seeded(seed);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(color, -0.35));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.45));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // nebulosas suaves
    const tints = ['#4b1f8a', '#0f4f8a', '#7a1a50', '#135a6e'];
    for (let i = 0; i < nebulae; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.25 + rnd() * 0.35) * Math.max(w, h);
      const ng = ctx.createRadialGradient(x, y, 0, x, y, r);
      ng.addColorStop(0, rgba(tints[i % tints.length], 0.22));
      ng.addColorStop(1, rgba(tints[i % tints.length], 0));
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, w, h);
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

    // algumas estrelas brilhantes
    for (let i = 0; i < count / 60; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      ctx.save();
      ctx.translate(x, y);
      glow(ctx, 5, '#cfe0ff', 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-0.9, -0.9, 1.8, 1.8);
      ctx.restore();
    }
  }

  const P = {};

  // ---------- fundos (w, h em unidades do mundo / px da página) ----------
  P.background = (ctx, w, h, a) => starfield(ctx, w, h, a.color, 7, 2200, 4);
  P.pageBackground = (ctx, w, h, a) => starfield(ctx, w, h, a.color, 21, 2600, 3);

  // ---------- planeta ----------
  P.planet = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.5, a.color, 0.45, r * 0.8);

    ctx.save();
    circle(ctx, 0, 0, r);
    ctx.clip();
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    body.addColorStop(0, shade(a.color, 0.25));
    body.addColorStop(1, shade(a.color, -0.45));
    ctx.fillStyle = body;
    ctx.fillRect(-r, -r, size, size);

    // continentes
    const rnd = OD.math.seeded(42);
    ctx.fillStyle = 'rgba(62, 207, 142, 0.85)';
    for (let i = 0; i < 7; i++) {
      const cx = (rnd() - 0.5) * size;
      const cy = (rnd() - 0.5) * size;
      for (let j = 0; j < 4; j++) {
        circle(ctx, cx + (rnd() - 0.5) * r * 0.5, cy + (rnd() - 0.5) * r * 0.5, r * (0.12 + rnd() * 0.18));
        ctx.fill();
      }
    }
    // nuvens
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.lineWidth = r * (0.05 + rnd() * 0.06);
      const y = (rnd() - 0.5) * size;
      const x = (rnd() - 0.5) * size;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y);
      ctx.quadraticCurveTo(x, y - r * 0.08, x + r * 0.4, y);
      ctx.stroke();
    }
    // escurecimento da borda
    const rim = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
    rim.addColorStop(0, 'rgba(0,0,20,0)');
    rim.addColorStop(1, 'rgba(0,0,25,0.6)');
    ctx.fillStyle = rim;
    ctx.fillRect(-r, -r, size, size);
    ctx.restore();

    circle(ctx, 0, 0, r);
    ctx.lineWidth = r * 0.04;
    ctx.strokeStyle = 'rgba(160, 220, 255, 0.7)';
    ctx.stroke();
  };

  // ---------- slots ----------
  P.slotLocked = (ctx, size, a) => {
    const r = size / 2;
    circle(ctx, 0, 0, r);
    ctx.fillStyle = 'rgba(10, 14, 32, 0.75)';
    ctx.fill();
    ctx.setLineDash([r * 0.3, r * 0.22]);
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = a.color;
    ctx.stroke();
    ctx.setLineDash([]);
    // cadeado
    ctx.fillStyle = a.color;
    ctx.fillRect(-r * 0.32, -r * 0.05, r * 0.64, r * 0.5);
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 0.22, Math.PI, 0);
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = a.color;
    ctx.stroke();
  };

  P.slotEmpty = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.25, a.color, 0.18);
    circle(ctx, 0, 0, r * 0.92);
    ctx.fillStyle = rgba(a.color, 0.1);
    ctx.fill();
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = rgba(a.color, 0.85);
    ctx.stroke();
    ctx.fillStyle = a.color;
    ctx.fillRect(-r * 0.35, -r * 0.07, r * 0.7, r * 0.14);
    ctx.fillRect(-r * 0.07, -r * 0.35, r * 0.14, r * 0.7);
  };

  // ---------- defesas ----------
  P.cannon = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    // canos duplos
    ctx.fillStyle = '#d9deea';
    ctx.strokeStyle = '#3a4060';
    ctx.lineWidth = r * 0.05;
    for (const s of [-1, 1]) {
      ctx.fillRect(r * 0.1, s * r * 0.2 - r * 0.08, r * 0.85, r * 0.16);
      ctx.strokeRect(r * 0.1, s * r * 0.2 - r * 0.08, r * 0.85, r * 0.16);
      ctx.fillStyle = a.color;
      ctx.fillRect(r * 0.8, s * r * 0.2 - r * 0.08, r * 0.15, r * 0.16);
      ctx.fillStyle = '#d9deea';
    }
    circle(ctx, 0, 0, r * 0.45);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.lineWidth = r * 0.07;
    ctx.strokeStyle = shade(a.color, -0.45);
    ctx.stroke();
    circle(ctx, -r * 0.08, -r * 0.08, r * 0.15);
    ctx.fillStyle = shade(a.color, 0.5);
    ctx.fill();
  };

  P.laser = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    ctx.fillStyle = '#c9cfe0';
    ctx.fillRect(0, -r * 0.07, r * 0.95, r * 0.14);
    poly(ctx, [r * 0.5, 0, 0, r * 0.42, -r * 0.42, 0, 0, -r * 0.42]);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = shade(a.color, -0.5);
    ctx.stroke();
    ctx.save();
    ctx.translate(r * 0.92, 0);
    glow(ctx, r * 0.35, a.color, 0.9);
    circle(ctx, 0, 0, r * 0.1);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  };

  P.missile = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    ctx.fillStyle = shade(a.color, -0.3);
    ctx.fillRect(-r * 0.5, -r * 0.5, r * 0.95, r);
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = shade(a.color, -0.6);
    ctx.strokeRect(-r * 0.5, -r * 0.5, r * 0.95, r);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#1b1f33';
      ctx.fillRect(-r * 0.35, s * r * 0.24 - r * 0.15, r * 0.95, r * 0.3);
      ctx.fillStyle = '#f2f4fa';
      poly(ctx, [r * 0.45, s * r * 0.24 - r * 0.12, r * 0.72, s * r * 0.24, r * 0.45, s * r * 0.24 + r * 0.12]);
      ctx.fill();
      ctx.fillStyle = a.color;
      ctx.fillRect(r * 0.05, s * r * 0.24 - r * 0.12, r * 0.4, r * 0.24);
    }
  };

  P.shield = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    glow(ctx, r * 0.9, a.color, 0.45);
    hexagon(ctx, r * 0.55, Math.PI / 6);
    ctx.fillStyle = rgba(a.color, 0.35);
    ctx.fill();
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = a.color;
    ctx.stroke();
    hexagon(ctx, r * 0.28, Math.PI / 6);
    ctx.fillStyle = shade(a.color, 0.6);
    ctx.fill();
  };

  P.emp = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    ctx.strokeStyle = a.color;
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ang = (i * TAU) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.25, Math.sin(ang) * r * 0.25);
      ctx.lineTo(Math.cos(ang) * r * 0.65, Math.sin(ang) * r * 0.65);
      ctx.stroke();
      circle(ctx, Math.cos(ang) * r * 0.66, Math.sin(ang) * r * 0.66, r * 0.12);
      ctx.fillStyle = shade(a.color, 0.4);
      ctx.fill();
    }
    glow(ctx, r * 0.5, a.color, 0.8);
    circle(ctx, 0, 0, r * 0.2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  P.repair = (ctx, size, a) => {
    const r = size / 2;
    platform(ctx, r, a.color);
    glow(ctx, r * 0.8, a.color, 0.4);
    circle(ctx, 0, 0, r * 0.5);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = shade(a.color, -0.5);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.3, -r * 0.1, r * 0.6, r * 0.2);
    ctx.fillRect(-r * 0.1, -r * 0.3, r * 0.2, r * 0.6);
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
    g.addColorStop(0, shade(a.color, 0.25));
    g.addColorStop(1, shade(a.color, -0.5));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = shade(a.color, -0.6);
    ctx.stroke();
    // crateras
    for (let i = 0; i < 4; i++) {
      const cx = (rnd() - 0.5) * r;
      const cy = (rnd() - 0.5) * r;
      const cr = r * (0.1 + rnd() * 0.14);
      circle(ctx, cx, cy, cr);
      ctx.fillStyle = shade(a.color, -0.35);
      ctx.fill();
      circle(ctx, cx - cr * 0.25, cy - cr * 0.25, cr * 0.6);
      ctx.fillStyle = shade(a.color, -0.15);
      ctx.fill();
    }
  };

  P.fighter = (ctx, size, a) => {
    const r = size / 2;
    ctx.save();
    ctx.translate(-r * 0.75, 0);
    glow(ctx, r * 0.45, '#ffb347', 0.8);
    ctx.restore();
    poly(ctx, [r, 0, -r * 0.7, r * 0.85, -r * 0.35, 0, -r * 0.7, -r * 0.85]);
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, shade(a.color, -0.5));
    g.addColorStop(1, shade(a.color, 0.15));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.07;
    ctx.strokeStyle = shade(a.color, -0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.2, 0, r * 0.28, r * 0.13, 0, 0, TAU);
    ctx.fillStyle = '#9fe8ff';
    ctx.fill();
  };

  P.bomber = (ctx, size, a) => {
    const r = size / 2;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(-r * 0.7, s * r * 0.35);
      glow(ctx, r * 0.3, '#ff9de6', 0.8);
      ctx.restore();
    }
    poly(ctx, [r * 0.3, 0, -r * 0.35, r, -r * 0.65, r * 0.9, -r * 0.4, 0, -r * 0.65, -r * 0.9, -r * 0.35, -r]);
    ctx.fillStyle = shade(a.color, -0.4);
    ctx.fill();
    ctx.lineWidth = r * 0.05;
    ctx.strokeStyle = shade(a.color, -0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.32, 0, 0, TAU);
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, shade(a.color, -0.3));
    g.addColorStop(1, shade(a.color, 0.2));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.4, 0, r * 0.22, r * 0.14, 0, 0, TAU);
    ctx.fillStyle = '#ffe1fb';
    ctx.fill();
  };

  P.kamikaze = (ctx, size, a) => {
    const r = size / 2;
    ctx.save();
    ctx.translate(-r * 0.4, 0);
    glow(ctx, r * 0.9, a.color, 0.55);
    ctx.restore();
    poly(ctx, [r, 0, -r * 0.8, r * 0.5, -r * 0.45, 0, -r * 0.8, -r * 0.5]);
    ctx.fillStyle = a.color;
    ctx.fill();
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = shade(a.color, -0.55);
    ctx.stroke();
    circle(ctx, r * 0.15, 0, r * 0.16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  P.boss = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r * 1.1, a.color, 0.35, r * 0.5);
    // espinhos
    ctx.fillStyle = shade(a.color, -0.55);
    for (let i = 0; i < 6; i++) {
      const ang = (i * TAU) / 6;
      ctx.save();
      ctx.rotate(ang);
      poly(ctx, [r * 0.7, -r * 0.12, r * 0.98, 0, r * 0.7, r * 0.12]);
      ctx.fill();
      ctx.restore();
    }
    hexagon(ctx, r * 0.78);
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.8);
    g.addColorStop(0, shade(a.color, -0.2));
    g.addColorStop(1, shade(a.color, -0.7));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.04;
    ctx.strokeStyle = a.color;
    ctx.stroke();
    hexagon(ctx, r * 0.52, Math.PI / 6);
    ctx.strokeStyle = rgba(a.color, 0.6);
    ctx.stroke();
    // canhões frontais
    ctx.fillStyle = '#c8cde0';
    for (const s of [-1, 1]) ctx.fillRect(r * 0.45, s * r * 0.3 - r * 0.06, r * 0.45, r * 0.12);
    // núcleo
    glow(ctx, r * 0.42, a.color, 0.95);
    circle(ctx, 0, 0, r * 0.16);
    ctx.fillStyle = '#fff2f4';
    ctx.fill();
  };

  // ---------- projéteis ----------
  P.bullet = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r, a.color, 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.25, 0, 0, TAU);
    ctx.fill();
  };

  P.missileShot = (ctx, size, a) => {
    const r = size / 2;
    ctx.save();
    ctx.translate(-r * 0.75, 0);
    glow(ctx, r * 0.55, '#ffd27a', 0.9);
    ctx.restore();
    ctx.fillStyle = shade(a.color, -0.3);
    poly(ctx, [-r * 0.6, 0, -r * 0.85, r * 0.35, -r * 0.35, 0, -r * 0.85, -r * 0.35]);
    ctx.fill();
    ctx.fillStyle = '#eef1f8';
    ctx.fillRect(-r * 0.6, -r * 0.16, r * 1.1, r * 0.32);
    ctx.fillStyle = a.color;
    poly(ctx, [r * 0.5, -r * 0.16, r * 0.9, 0, r * 0.5, r * 0.16]);
    ctx.fill();
  };

  P.enemyShot = (ctx, size, a) => {
    const r = size / 2;
    glow(ctx, r, a.color, 0.85);
    circle(ctx, 0, 0, r * 0.32);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  OD.Placeholders = P;
  OD.colorUtil = { rgba, shade };
})();
