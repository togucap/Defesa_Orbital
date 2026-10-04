// Cache de sprites: lê o manifesto (assets.js) e prepara cada visual,
// seja imagem carregada ou desenho provisório pré-renderizado em canvas.
// Cada entrada vira { frames: [...], flash: [...] | null, w, h, angle, spin }.
(() => {
  const OD = (window.OD = window.OD || {});
  const PAD = 1.6; // espaço extra ao redor do desenho para brilhos
  const FILL_KEYS = { background: true, pageBackground: true };

  // desenho de reserva quando falta imagem e desenho
  function missing(ctx, size) {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(-size / 2, -size / 2, size, size);
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // silhueta branca do quadro (usada no "piscar" ao levar dano)
  function silhouette(src, pw, ph) {
    const c = canvas(pw, ph);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  const Sprites = {
    entries: {},
    images: {}, // key → lista de imagens carregadas (uma por quadro)

    // carrega as imagens declaradas no manifesto (falhas usam o provisório)
    load() {
      const jobs = [];
      for (const key in OD.ASSETS) {
        const a = OD.ASSETS[key];
        if (!a.image) continue;
        const list = Array.isArray(a.image) ? a.image : [a.image];
        const loaded = (this.images[key] = []);
        list.forEach((src, i) => {
          jobs.push(
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                loaded[i] = img;
                resolve();
              };
              img.onerror = () => {
                console.warn('[assets] não foi possível carregar', src);
                resolve();
              };
              img.src = src;
            })
          );
        });
      }
      return Promise.all(jobs);
    },

    // prepara todos os sprites na resolução atual (px por unidade do mundo)
    build(pxPerUnit) {
      for (const key in OD.ASSETS) {
        if (FILL_KEYS[key]) continue;
        const a = OD.ASSETS[key];
        const angle = ((a.angle || 0) * Math.PI) / 180;
        const spin = a.spin || 0;
        const imgs = (this.images[key] || []).filter(Boolean);
        let e;
        if (imgs.length) {
          const k = a.size / Math.max(imgs[0].naturalWidth, imgs[0].naturalHeight);
          e = { frames: imgs, w: imgs[0].naturalWidth * k, h: imgs[0].naturalHeight * k, angle, spin };
        } else {
          const draw = OD.Placeholders[a.draw] || missing;
          const logical = a.size * PAD;
          const px = Math.max(2, Math.ceil(logical * pxPerUnit));
          const frames = [];
          for (let f = 0; f < (a.frames || 1); f++) {
            const c = canvas(px, px);
            const ctx = c.getContext('2d');
            ctx.setTransform(px / logical, 0, 0, px / logical, px / 2, px / 2);
            OD.Placeholders.scale = px / logical; // brilhos (shadowBlur) em px
            draw(ctx, a.size, a, f);
            frames.push(c);
          }
          e = { frames, w: logical, h: logical, angle, spin };
        }
        e.flash = a.flash ? e.frames.map((f) => silhouette(f, e.w * pxPerUnit, e.h * pxPerUnit)) : null;
        this.entries[key] = e;
      }
    },

    // fundo do tamanho da tela; imagens usam ajuste "cover"
    buildFill(key, w, h, pxPerUnit, frame = 0) {
      const a = OD.ASSETS[key];
      const c = canvas(w * pxPerUnit, h * pxPerUnit);
      const ctx = c.getContext('2d');
      const imgs = (this.images[key] || []).filter(Boolean);
      if (imgs.length) {
        const img = imgs[frame % imgs.length];
        const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
        const iw = img.naturalWidth * k;
        const ih = img.naturalHeight * k;
        ctx.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih);
      } else if (a && OD.Placeholders[a.draw]) {
        ctx.scale(pxPerUnit, pxPerUnit);
        OD.Placeholders.scale = pxPerUnit;
        OD.Placeholders[a.draw](ctx, w, h, a, frame);
      } else {
        ctx.fillStyle = '#05060f';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      return c;
    },

    // cor base de uma entrada (usada por efeitos)
    color(key) {
      const a = OD.ASSETS[key];
      return (a && a.color) || '#ffffff';
    },
  };

  OD.Sprites = Sprites;
})();
