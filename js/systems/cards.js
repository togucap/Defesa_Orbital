// Cartas da partida: sorteio ponderado por raridade e aplicação dos efeitos.
// A tela de escolha fica em ui/cardScreen.js.
(() => {
  const OD = (window.OD = window.OD || {});

  const Cards = {
    find(id) {
      return OD.CONFIG.cards.list.find((c) => c.id === id);
    },

    // carta pode aparecer agora?
    available(m, c) {
      if (c.unique && m.cards.indexOf(c.id) >= 0) return false;
      if (c.instant && c.instant.unlockSlot) return m.slots.some((s) => !s.unlocked && !s.hidden);
      return true;
    },

    // sorteia n cartas diferentes
    roll(m, n) {
      const C = OD.CONFIG.cards;
      const pool = C.list.filter((c) => this.available(m, c));
      const out = [];
      while (out.length < n && pool.length) {
        const pick = OD.math.pickWeighted(pool, (c) => C.rarities[c.rarity].weight);
        out.push(pick);
        pool.splice(pool.indexOf(pick), 1);
      }
      return out;
    },

    offer(m, reason = 'wave') {
      m.offerReason = reason;
      m.offer = this.roll(m, m.cardChoices);
      if (m.offer.length) OD.events.emit('cards:offer', m);
    },

    reroll(m) {
      if (m.rerolls <= 0 || !m.offer) return false;
      m.rerolls--;
      m.offer = this.roll(m, m.cardChoices);
      return true;
    },

    pick(m, card) {
      m.cards.push(card.id);
      if (card.bonus) {
        const bonus = Object.assign({}, card.bonus);
        const target = bonus.target;
        delete bonus.target;
        m.cardBonus.push({ target, bonus });
      }
      if (card.global) {
        for (const k in card.global) m.mods[k] = (m.mods[k] || 0) + card.global[k];
        if (card.global.secondLife) m.planet.secondLife = Math.max(m.planet.secondLife, card.global.secondLife);
      }
      if (card.instant) this.applyInstant(m, card.instant);
      m.offer = null;
      OD.Bonuses.refresh(m);
      OD.events.emit('cards:pick', card);
    },

    applyInstant(m, inst) {
      if (inst.coins) OD.Economy.earn(m, OD.statAt(inst.coins, m.wave));
      if (inst.planetHp) {
        const p = m.planet;
        p.maxHp = Math.round(p.maxHp * (1 + inst.planetHp));
        p.hp = p.maxHp;
      }
      for (let n = inst.unlockSlot || 0; n > 0; n--) {
        const s = m.slots.find((x) => !x.unlocked && !x.hidden);
        if (!s) break;
        s.unlocked = true;
        OD.fx.ring(m, s.x, s.y, 40, '#5fd4ff', 0.6);
      }
    },

    // resumo das cartas escolhidas: [{ card, count }]
    owned(m) {
      const map = new Map();
      for (const id of m.cards) map.set(id, (map.get(id) || 0) + 1);
      return Array.from(map, ([id, count]) => ({ card: this.find(id), count }));
    },
  };

  OD.Cards = Cards;
})();
