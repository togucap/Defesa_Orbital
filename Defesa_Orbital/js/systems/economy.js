// Economia da partida: moedas, custos, construir, melhorar, vender, desbloquear
(() => {
  const OD = (window.OD = window.OD || {});

  const Economy = {
    earn(m, amount, x, y) {
      amount = Math.max(1, Math.round(amount));
      m.coins += amount;
      m.stats.coinsEarned += amount;
      OD.events.emit('coins:gain', amount);
      if (x !== undefined) OD.fx.text(m, '+' + amount, x, y, '#ffd34d', 17);
    },

    spend(m, cost) {
      if (cost == null || m.coins < cost) return false;
      m.coins -= cost;
      return true;
    },

    unlockCost(m, slot) {
      const ring = OD.CONFIG.rings[slot.ring];
      return Math.round(ring.unlockCost * Math.pow(ring.unlockGrowth, m.unlocks[slot.ring]));
    },

    buildCost(type) {
      return OD.CONFIG.defenses[type].cost;
    },

    // custo para subir ao próximo nível (null no nível máximo)
    upgradeCost(defense) {
      const c = defense.cfg;
      if (defense.level >= c.maxLevel) return null;
      return Math.round(c.upgradeCost * Math.pow(c.upgradeGrowth, defense.level - 1));
    },

    sellValue(defense) {
      return Math.floor(defense.invested * OD.CONFIG.economy.sellRefund);
    },

    unlock(m, slot) {
      if (slot.unlocked || !this.spend(m, this.unlockCost(m, slot))) return false;
      slot.unlocked = true;
      m.unlocks[slot.ring]++;
      OD.fx.ring(m, slot.x, slot.y, 34, '#5fd4ff', 0.4);
      OD.events.emit('slot:unlock', slot);
      return true;
    },

    build(m, slot, type) {
      if (!slot.unlocked || slot.defense || !this.spend(m, this.buildCost(type))) return false;
      slot.defense = OD.createDefense(type, slot);
      OD.fx.ring(m, slot.x, slot.y, 36, OD.Sprites.color('def_' + type), 0.45);
      OD.events.emit('defense:build', slot.defense);
      return true;
    },

    upgrade(m, slot) {
      const d = slot.defense;
      if (!d) return false;
      const cost = this.upgradeCost(d);
      if (!this.spend(m, cost)) return false;
      d.level++;
      d.invested += cost;
      d.onLevelUp();
      OD.fx.ring(m, slot.x, slot.y, 40, '#ffffff', 0.4);
      OD.fx.text(m, 'Nv ' + d.level, slot.x, slot.y - 30, '#9fe8ff', 18);
      OD.events.emit('defense:upgrade', d);
      return true;
    },

    sell(m, slot) {
      const d = slot.defense;
      if (!d) return false;
      const value = this.sellValue(d);
      d.onRemove(m);
      slot.defense = null;
      m.coins += value;
      OD.fx.text(m, '+' + value, slot.x, slot.y - 20, '#ffd34d', 18);
      OD.events.emit('defense:sell', d);
      return true;
    },
  };

  OD.Economy = Economy;
})();
