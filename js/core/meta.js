// Progressão permanente (Laboratório): núcleos e melhorias compradas.
// Salvo no localStorage junto com o recorde.
(() => {
  const OD = (window.OD = window.OD || {});
  const KEY = 'defesaOrbital.laboratorio';

  const Meta = {
    data: { cores: 0, upg: {} },

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY));
        if (d && typeof d === 'object') this.data = { cores: Math.max(0, d.cores | 0), upg: d.upg || {} };
      } catch (e) {
        /* sem armazenamento: começa do zero */
      }
    },

    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        /* modo privado: ignora */
      }
    },

    def(id) {
      return OD.CONFIG.meta.upgrades.find((u) => u.id === id);
    },

    level(id) {
      return this.data.upg[id] || 0;
    },

    // custo do próximo nível (null no máximo)
    cost(id) {
      const u = this.def(id);
      const lv = this.level(id);
      if (!u || lv >= u.max) return null;
      return Math.round(u.cost * Math.pow(u.costGrowth, lv));
    },

    buy(id) {
      const c = this.cost(id);
      if (c == null || this.data.cores < c) return false;
      this.data.cores -= c;
      this.data.upg[id] = this.level(id) + 1;
      this.save();
      OD.events.emit('meta:buy', id);
      return true;
    },

    // soma dos efeitos de todas as melhorias compradas
    effects() {
      const e = {};
      for (const u of OD.CONFIG.meta.upgrades) {
        const lv = this.level(u.id);
        if (!lv) continue;
        for (const k in u.effect) e[k] = (e[k] || 0) + u.effect[k] * lv;
      }
      return e;
    },

    coresFor(m) {
      const c = OD.CONFIG.meta;
      return Math.floor(m.wave * c.coresPerWave + m.stats.bossKills * c.coresPerBoss);
    },

    // credita os núcleos da partida e devolve quantos foram ganhos
    award(m) {
      const n = this.coresFor(m);
      this.data.cores += n;
      this.save();
      return n;
    },

    reset() {
      this.data = { cores: 0, upg: {} };
      this.save();
    },
  };

  Meta.load();
  OD.meta = Meta;
})();
