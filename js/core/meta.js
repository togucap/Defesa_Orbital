// Progressão permanente (Laboratório): núcleos, melhorias, armas e
// tecnologias desbloqueadas, conquistas, totais, nível de ameaça e visual.
// Salvo no localStorage junto com o recorde.
(() => {
  const OD = (window.OD = window.OD || {});
  const KEY = 'defesaOrbital.laboratorio';

  const fresh = () => ({
    cores: 0,
    upg: {},        // melhorias: id → nível
    weapons: {},    // armas desbloqueadas: id → true
    tech: {},       // tecnologias: id → true
    ach: {},        // conquistas obtidas: id → true
    totals: {},     // contadores de todas as partidas (conquistas)
    bossTypes: {},  // tipos de chefe já derrotados
    threatMax: 0,   // maior nível de ameaça liberado
    threat: 0,      // nível de ameaça escolhido
    skin: 'terra',
    skins: { terra: true },
  });

  const Meta = {
    data: fresh(),

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY));
        if (d && typeof d === 'object') this.data = Object.assign(fresh(), d, { cores: Math.max(0, d.cores | 0) });
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

    // ---------- melhorias ----------
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

    // ---------- armas e tecnologias ----------
    hasWeapon(id) {
      return !OD.CONFIG.defenses[id].locked || !!this.data.weapons[id];
    },

    hasTech(id) {
      return !!this.data.tech[id];
    },

    // requisito cumprido? (arma ou tecnologia anterior)
    reqMet(req) {
      if (!req) return true;
      return OD.CONFIG.defenses[req] ? this.hasWeapon(req) : this.hasTech(req);
    },

    unlockWeapon(id) {
      const u = OD.CONFIG.defenses[id].unlock;
      if (this.hasWeapon(id) || !this.reqMet(u.requires) || this.data.cores < u.cost) return false;
      this.data.cores -= u.cost;
      this.data.weapons[id] = true;
      this.save();
      OD.events.emit('meta:unlock', id);
      return true;
    },

    techDef(id) {
      return OD.CONFIG.meta.tech.find((t) => t.id === id);
    },

    unlockTech(id) {
      const t = this.techDef(id);
      if (!t || this.hasTech(id) || !this.reqMet(t.requires) || this.data.cores < t.cost) return false;
      this.data.cores -= t.cost;
      this.data.tech[id] = true;
      this.save();
      OD.events.emit('meta:unlock', id);
      return true;
    },

    // ---------- totais e conquistas ----------
    add(key, n = 1) {
      this.data.totals[key] = (this.data.totals[key] || 0) + n;
    },

    total(key) {
      return this.data.totals[key] || 0;
    },

    // ---------- partida ----------
    coresFor(m) {
      const c = OD.CONFIG.meta;
      const base = m.wave * c.coresPerWave + m.stats.bossKills * c.coresPerBoss + (m.stats.bonusCores || 0);
      return Math.floor(base * (1 + (OD.Threat ? OD.Threat.coreBonus(m.threat || 0) : 0)));
    },

    // credita os núcleos da partida e devolve quantos foram ganhos
    award(m) {
      const n = this.coresFor(m);
      this.data.cores += n;
      this.save();
      return n;
    },

    reset() {
      this.data = fresh();
      this.save();
    },
  };

  Meta.load();
  OD.meta = Meta;
})();
