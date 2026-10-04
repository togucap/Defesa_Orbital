// Bônus das defesas: soma anel + vizinhos + cartas + laboratório e guarda
// em cada defesa (d.bonus). Também calcula efeitos de suporte a cada passo.
(() => {
  const OD = (window.OD = window.OD || {});

  const LABELS = {
    damage: 'dano', range: 'alcance', rate: 'cadência', area: 'área', capacity: 'carga',
    heal: 'reparo', slow: 'lentidão', hp: 'vida',
  };

  const Bonuses = {
    // texto curto de um conjunto de bônus: "+20% dano, +10% cadência"
    describe(bonus) {
      const parts = [];
      for (const k in bonus) {
        if (!LABELS[k] || !bonus[k]) continue;
        parts.push(`+${Math.round(bonus[k] * 100)}% ${LABELS[k]}`);
      }
      return parts.join(', ');
    },

    neighbors(m, s) {
      const n = OD.CONFIG.rings[s.ring].slots;
      const a = (s.index + 1) % n;
      const b = (s.index - 1 + n) % n;
      return m.slots.filter((o) => o.ring === s.ring && o !== s && (o.index === a || o.index === b));
    },

    // recalcula tudo; chamar ao construir, vender, melhorar ou escolher carta
    refresh(m) {
      const cfg = OD.CONFIG;
      for (const s of m.slots) {
        const d = s.defense;
        if (!d) continue;
        const total = {};
        const notes = [];
        const add = (bonus) => {
          for (const k in bonus) total[k] = (total[k] || 0) + bonus[k];
        };

        const ring = cfg.rings[s.ring];
        if (ring.bonus) {
          add(ring.bonus);
          notes.push(`${ring.name}: ${ring.bonusText}`);
        }

        const near = this.neighbors(m, s);
        for (const rule of cfg.synergies) {
          if (rule.to !== '*' && rule.to !== d.type) continue;
          if (near.some((n) => n.defense && n.defense.type === rule.from)) {
            add(rule.bonus);
            notes.push(rule.text);
          }
        }

        const fromCards = {};
        for (const cb of m.cardBonus) {
          if (cb.target !== 'all' && cb.target !== d.type) continue;
          for (const k in cb.bonus) fromCards[k] = (fromCards[k] || 0) + cb.bonus[k];
        }
        const cardText = this.describe(fromCards);
        if (cardText) {
          add(fromCards);
          notes.push(`Cartas: ${cardText}`);
        }

        const labText = this.describe(m.metaBonus);
        if (labText) {
          add(m.metaBonus);
          notes.push(`Laboratório: ${labText}`);
        }

        d.bonus = total;
        d.notes = notes;
        d.onBonusChange();
      }
    },

    // a cada passo: listas de escudos/revelação e suportes globais
    step(m) {
      const shields = m.shields;
      const revealers = m.revealers;
      shields.length = 0;
      revealers.length = 0;
      let heal = 0;
      let revive = 1;
      let fortify = 0;
      for (let i = 0; i < m.slots.length; i++) {
        const d = m.slots[i].defense;
        if (!d || !d.active) continue;
        if (d.blocks && d.up) shields.push(d);
        if (d.reveals) revealers.push(d);
        const br = d.branchCfg;
        if (br) {
          if (br.defenseHeal) heal += br.defenseHeal;
          if (br.reviveSpeed) revive = Math.max(revive, br.reviveSpeed);
          if (br.planetArmor) fortify += br.planetArmor;
        }
      }
      m.defenseHeal = heal;
      m.reviveMult = revive;
      m.planet.armor = Math.min(OD.CONFIG.planet.maxArmor, m.mods.planetArmor + fortify);
    },
  };

  OD.Bonuses = Bonuses;
})();
