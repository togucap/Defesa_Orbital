// Mutações das defesas: ao atingir o nível configurado, a defesa recebe
// uma oferta de 1 entre N mutações sorteadas. O Catalisador (moedas) sorteia
// novas opções ou troca a mutação atual.
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG.mutations;

  const Mutations = {
    init() {
      OD.events.on('defense:level', (d) => {
        if (d.level >= C().level && !d.mutation && !d.mutationOffer) this.offer(d);
      });
    },

    eligible(d, id) {
      const mu = C().list[id];
      return mu.for === 'any' || mu.for === d.cfg.role;
    },

    // sorteia opções (sem repetir e sem a mutação atual)
    roll(d) {
      const pool = Object.keys(C().list).filter((id) => id !== d.mutation && this.eligible(d, id));
      const out = [];
      while (out.length < C().choices && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      return out;
    },

    offer(d) {
      d.mutationOffer = this.roll(d);
      OD.events.emit('mutation:offer', d);
    },

    choose(m, d, id) {
      if (!d.mutationOffer || d.mutationOffer.indexOf(id) < 0) return false;
      d.mutation = id;
      d.mutationOffer = null;
      OD.Bonuses.refresh(m);
      const mu = C().list[id];
      OD.fx.ring(m, d.x, d.y, 46, mu.color, 0.6);
      OD.fx.text(m, mu.name, d.x, d.y - 34, mu.color, 18);
      OD.meta.add('mutations');
      OD.events.emit('mutation:choose', d);
      return true;
    },

    rerollCost(m) {
      return Math.round(OD.statAt(C().rerollCost, Math.max(1, m.wave)) * Math.pow(C().rerollGrowth, m.catalysts || 0));
    },

    // Catalisador: novas opções (ou trocar a mutação já escolhida)
    reroll(m, d) {
      if (!OD.Economy.spend(m, this.rerollCost(m))) return false;
      m.catalysts = (m.catalysts || 0) + 1;
      d.mutationOffer = this.roll(d);
      return true;
    },
  };

  OD.Mutations = Mutations;
})();
