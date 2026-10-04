// Cache de sprites: lê o manifesto (assets.js) e prepara cada visual,
// seja imagem carregada ou desenho provisório pré-renderizado em canvas.
(() => {
  const OD = (window.OD = window.OD || {});
  const PAD = 1.6; // espaço extra ao redor do desenho para brilhos
  const FILL_KEYS = { background: true, pageBackground: true };

  // desenho de reserva quando falta imagem e desenho
  function missing(ctx, size) {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(-size / 2, -size / 2, size, size);
  }

  const Sprites = {
    entries: {},
    images: {},

    // carrega as imagens declaradas no manifesto (falhas usam o provisório)
    load() {
      const jobs = [];
      for (const key in OD.ASSETS) {
        const a = OD.ASSETS[key];
        if (!a.image) continue;
        jobs.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              this.images[key] = img;
              resolve();
            };
            img.onerror = () => {
              console.warn('[assets] não foi possível carregar', a.image);
              resolve();
            };
            img.src = a.image;
          })
        );
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
        const img = this.images[key];
        if (img) {
          const k = a.size / Math.max(img.naturalWidth, img.naturalHeight);
          this.entries[key] = { src: img, w: img.naturalWidth * k, h: img.naturalHeight * k, angle, spin };
          continue;
        }
        const draw = OD.Placeholders[a.draw] || missing;
        const logical = a.size * PAD;
        const px = Math.max(2, Math.ceil(logical * pxPerUnit));
        const c = document.createElement('canvas');
        c.width = c.height = px;
        const ctx = c.getContext('2d');
        ctx.setTransform(px / logical, 0, 0, px / logical, px / 2, px / 2);
        draw(ctx, a.size, a);
        this.entries[key] = { src: c, w: logical, h: logical, angle, spin };
      }
    },

    // fundo do tamanho da tela; imagens usam ajuste "cover"
    buildFill(key, w, h, pxPerUnit) {
      const a = OD.ASSETS[key];
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * pxPerUnit));
      c.height = Math.max(1, Math.ceil(h * pxPerUnit));
      const ctx = c.getContext('2d');
      const img = this.images[key];
      if (img) {
        const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
        const iw = img.naturalWidth * k;
        const ih = img.naturalHeight * k;
        ctx.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih);
      } else if (a && OD.Placeholders[a.draw]) {
        ctx.scale(pxPerUnit, pxPerUnit);
        OD.Placeholders[a.draw](ctx, w, h, a);
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
