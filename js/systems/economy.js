// Economia da partida: moedas, custos, construir, melhorar, sobrecarregar,
// especializar, vender, desbloquear, módulos, anéis, planeta e mercado.
// Toda mudança nas defesas recalcula os bônus.
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG;

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
      m.stats.coinsSpent = (m.stats.coinsSpent || 0) + cost;
      return true;
    },

    // ---------- slots e defesas ----------
    unlockCost(m, slot) {
      const ring = C().rings[slot.ring];
      const base = ring.unlockCost * Math.pow(ring.unlockGrowth, m.unlocks[slot.ring]);
      return Math.round(base * Math.max(0.2, 1 + m.mods.unlockCost));
    },

    // anel liberado para desbloquear? (tecnologia e onda mínima)
    ringAvailable(m, ringIndex) {
      const ring = C().rings[ringIndex];
      if (ring.tech && !OD.meta.hasTech(ring.tech)) return false;
      return true;
    },

    ringWaveOk(m, ringIndex) {
      const ring = C().rings[ringIndex];
      return !ring.minWave || m.wave >= ring.minWave;
    },

    buildCost(type) {
      return C().defenses[type].cost;
    },

    // tipo pode ser construído nesta partida?
    canBuild(m, type) {
      const d = C().defenses[type];
      if (d.locked && !OD.meta.hasWeapon(type)) return false;
      if (d.unique && m.slots.some((s) => s.defense && s.defense.type === type)) return false;
      return true;
    },

    // custo do próximo nível; depois do máximo vira sobrecarga (infinita)
    upgradeCost(defense) {
      const c = defense.cfg;
      if (defense.level < c.maxLevel) return Math.round(c.upgradeCost * Math.pow(c.upgradeGrowth, defense.level - 1));
      const last = c.upgradeCost * Math.pow(c.upgradeGrowth, c.maxLevel - 2);
      return Math.round(last * Math.pow(C().overclock.growth, defense.oc + 1));
    },

    sellValue(defense) {
      return Math.floor(defense.invested * C().economy.sellRefund);
    },

    unlock(m, slot) {
      if (slot.unlocked || !this.ringAvailable(m, slot.ring) || !this.ringWaveOk(m, slot.ring)) return false;
      if (!this.spend(m, this.unlockCost(m, slot))) return false;
      slot.unlocked = true;
      m.unlocks[slot.ring]++;
      OD.fx.ring(m, slot.x, slot.y, 34, '#5fd4ff', 0.4);
      OD.events.emit('slot:unlock', slot);
      return true;
    },

    build(m, slot, type) {
      if (!slot.unlocked || slot.defense || !this.canBuild(m, type) || !this.spend(m, this.buildCost(type))) return false;
      slot.defense = OD.createDefense(type, slot);
      OD.Bonuses.refresh(m);
      OD.fx.ring(m, slot.x, slot.y, 36, OD.Sprites.color('def_' + type), 0.45);
      OD.events.emit('defense:build', slot.defense);
      return true;
    },

    upgrade(m, slot) {
      const d = slot.defense;
      if (!d || d.needsBranch() || d.mutationOffer) return false;
      const cost = this.upgradeCost(d);
      if (!this.spend(m, cost)) return false;
      d.invested += cost;
      if (d.level < d.cfg.maxLevel) {
        this.levelUp(m, d);
        OD.events.emit('defense:upgrade', d);
      } else {
        d.oc++;
        OD.Bonuses.refresh(m);
        d.onLevelUp();
        OD.fx.ring(m, d.x, d.y, 44, '#ffd34d', 0.5);
        OD.fx.text(m, '★' + d.oc, d.x, d.y - 30, '#ffd34d', 18);
        OD.events.emit('defense:overclock', d);
      }
      return true;
    },

    // escolhe a especialização (custa o mesmo que o upgrade e sobe um nível)
    specialize(m, slot, key) {
      const d = slot.defense;
      if (!d || !d.needsBranch() || !d.cfg.branches[key]) return false;
      const cost = this.upgradeCost(d);
      if (!this.spend(m, cost)) return false;
      d.invested += cost;
      d.setBranch(key);
      this.levelUp(m, d);
      OD.fx.ring(m, d.x, d.y, 50, '#d68bff', 0.6);
      OD.fx.text(m, d.branchCfg.name, d.x, d.y - 34, '#e3b3ff', 18);
      OD.events.emit('defense:branch', d);
      return true;
    },

    levelUp(m, d) {
      d.level++;
      d.onLevelUp();
      OD.Bonuses.refresh(m);
      OD.fx.ring(m, d.x, d.y, 40, '#ffffff', 0.4);
      OD.fx.text(m, 'Nv ' + d.level, d.x, d.y - 30, '#9fe8ff', 18);
      OD.events.emit('defense:level', d);
    },

    sell(m, slot) {
      const d = slot.defense;
      if (!d) return false;
      const value = this.sellValue(d);
      d.onRemove(m);
      slot.defense = null;
      m.coins += value;
      OD.Bonuses.refresh(m);
      OD.fx.text(m, '+' + value, slot.x, slot.y - 20, '#ffd34d', 18);
      OD.events.emit('defense:sell', d);
      return true;
    },

    // ---------- módulos ----------
    chipCost(level) {
      const c = C().chips;
      return Math.round(c.cost * Math.pow(c.growth, level));
    },

    buyChip(m, d, socket, id) {
      if (socket >= d.socketsOpen() || d.chips[socket] || d.chips.some((ch) => ch && ch.id === id)) return false;
      const cost = this.chipCost(0);
      if (!this.spend(m, cost)) return false;
      d.invested += cost;
      d.chips[socket] = { id, level: 1 };
      OD.Bonuses.refresh(m);
      OD.fx.ring(m, d.x, d.y, 34, C().chips.list[id].color, 0.4);
      OD.events.emit('chip:buy', d);
      return true;
    },

    upgradeChip(m, d, socket) {
      const chip = d.chips[socket];
      if (!chip || chip.level >= C().chips.maxLevel) return false;
      const cost = this.chipCost(chip.level);
      if (!this.spend(m, cost)) return false;
      d.invested += cost;
      chip.level++;
      OD.Bonuses.refresh(m);
      OD.events.emit('chip:upgrade', d);
      return true;
    },

    removeChip(m, d, socket) {
      d.chips[socket] = null;
      OD.Bonuses.refresh(m);
    },

    // ---------- anéis ----------
    ringUpgradeCost(m, ring) {
      const c = C().ringUpgrade;
      return Math.round(c.cost * Math.pow(c.growth, m.ringLevels[ring]));
    },

    upgradeRing(m, ring) {
      if (!this.spend(m, this.ringUpgradeCost(m, ring))) return false;
      m.ringLevels[ring]++;
      OD.Bonuses.refresh(m);
      OD.fx.ring(m, 0, 0, C().rings[ring].radius, '#9fe8ff', 0.6);
      OD.events.emit('ring:upgrade', ring);
      return true;
    },

    // ---------- planeta ----------
    planetUpgradeCost(m, id) {
      const u = C().planetUpgrades.find((x) => x.id === id);
      const lv = m.planetLevels[id] || 0;
      if (u.max && lv >= u.max) return null;
      return Math.round(u.cost * Math.pow(u.growth, lv));
    },

    upgradePlanet(m, id) {
      const u = C().planetUpgrades.find((x) => x.id === id);
      if (!this.spend(m, this.planetUpgradeCost(m, id))) return false;
      m.planetLevels[id] = (m.planetLevels[id] || 0) + 1;
      if (u.effect.hpPct) {
        const p = m.planet;
        const add = Math.round(m.planetBaseHp * u.effect.hpPct);
        p.maxHp += add;
        p.hp += add;
      }
      OD.fx.ring(m, 0, 0, m.planet.radius + 20, '#7ee8ff', 0.5);
      OD.events.emit('planet:upgrade', id);
      return true;
    },

    // soma dos efeitos comprados no núcleo planetário
    planetEffect(m) {
      const e = {};
      for (const u of C().planetUpgrades) {
        const lv = m.planetLevels[u.id] || 0;
        if (!lv) continue;
        for (const k in u.effect) e[k] = (e[k] || 0) + u.effect[k] * lv;
      }
      return e;
    },

    abilityUpgradeCost(m, id) {
      const c = C().abilityUpgrade;
      const lv = m.abilityLevels[id] || 0;
      if (lv >= c.max) return null;
      return Math.round(c.cost * Math.pow(c.growth, lv));
    },

    upgradeAbility(m, id) {
      if (!this.spend(m, this.abilityUpgradeCost(m, id))) return false;
      m.abilityLevels[id] = (m.abilityLevels[id] || 0) + 1;
      OD.events.emit('ability:upgrade', id);
      return true;
    },

    // ---------- auras de anel ----------
    auraCost(m) {
      return Math.round(OD.statAt(C().auras.cost, Math.max(1, m.wave)));
    },

    setAura(m, ring, id) {
      if (!C().auras.list[id] || !this.spend(m, this.auraCost(m))) return false;
      m.auras[ring] = id;
      OD.Bonuses.refresh(m);
      OD.fx.ring(m, 0, 0, C().rings[ring].radius, C().auras.list[id].color, 0.7);
      OD.events.emit('ring:aura', ring);
      return true;
    },

    // ---------- mercado ----------
    marketCost(m) {
      const c = C().market;
      return Math.round(OD.statAt(c.cardCost, Math.max(1, m.wave)) * Math.pow(c.growth, m.marketBuys));
    },

    buyCard(m) {
      if (m.offer || !this.spend(m, this.marketCost(m))) return false;
      m.marketBuys++;
      OD.Cards.offer(m, 'market');
      return true;
    },
  };

  OD.Economy = Economy;
})();
