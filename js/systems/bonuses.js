// Bônus das defesas: soma anel + melhoria do anel + slot especial + vizinhos
// (sinergias, amplificadores, relés) + cartas + laboratório + sobrecarga e
// guarda em cada defesa (d.bonus). Também calcula as características de
// ataque (d.traits) vindas de módulos, mutações e auras.
(() => {
  const OD = (window.OD = window.OD || {});

  const LABELS = {
    damage: 'dano', range: 'alcance', rate: 'cadência', area: 'área', capacity: 'carga',
    heal: 'reparo', slow: 'lentidão', hp: 'vida', income: 'renda', amp: 'amplificação',
  };

  const Bonuses = {
    // texto curto de um conjunto de bônus: "+20% dano, +10% cadência"
    describe(bonus, scale = 1) {
      const parts = [];
      for (const k in bonus) {
        if (!LABELS[k] || !bonus[k]) continue;
        parts.push(`+${Math.round(bonus[k] * scale * 100)}% ${LABELS[k]}`);
      }
      return parts.join(', ');
    },

    // vizinhos no mesmo anel (+ conexões de slots Relé com os anéis ao lado)
    neighbors(m, s) {
      const n = OD.CONFIG.rings[s.ring].slots;
      const a = (s.index + 1) % n;
      const b = (s.index - 1 + n) % n;
      const list = m.slots.filter((o) => o.ring === s.ring && o !== s && (o.index === a || o.index === b));
      if (s.special === 'relay') {
        for (const r of [s.ring - 1, s.ring + 1]) {
          const o = this.closestOnRing(m, s, r);
          if (o && list.indexOf(o) < 0) list.push(o);
        }
      }
      // slots Relé vizinhos também contam como vizinhos deste
      for (const o of m.slots) {
        if (o.special === 'relay' && o !== s && Math.abs(o.ring - s.ring) === 1 && this.closestOnRing(m, o, s.ring) === s && list.indexOf(o) < 0) list.push(o);
      }
      return list;
    },

    // slot do anel r com ângulo mais próximo (relés usam a posição atual)
    closestOnRing(m, s, r) {
      let best = null;
      let bestD = Infinity;
      for (const o of m.slots) {
        if (o.ring !== r || OD.CONFIG.rings[r].moon) continue;
        const d = Math.abs(OD.math.angleDiff(o.angle, s.angle));
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      return best;
    },

    // recalcula tudo; chamar ao construir, vender, melhorar ou escolher carta
    refresh(m) {
      const cfg = OD.CONFIG;
      const defs = [];
      for (const s of m.slots) {
        const d = s.defense;
        if (!d) continue;
        const total = {};
        const notes = [];
        const traits = OD.emptyTraits();
        const add = (bonus, k = 1) => {
          for (const key in bonus) total[key] = (total[key] || 0) + bonus[key] * k;
        };

        const ring = cfg.rings[s.ring];
        if (ring.bonus) {
          add(ring.bonus);
          notes.push(`${ring.name}: ${ring.bonusText}`);
        }
        const rl = m.ringLevels[s.ring];
        if (rl) {
          add(cfg.ringUpgrade.bonus, rl);
          notes.push(`Melhoria do anel Nv ${rl}`);
        }
        if (s.special && cfg.specialSlots) {
          const sp = cfg.specialSlots.types[s.special];
          if (sp.bonus) add(sp.bonus);
          notes.push(`Slot ${sp.name}: ${sp.text}`);
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

        if (d.oc) {
          add(cfg.overclock.bonus, d.oc);
          notes.push(`Sobrecarga ★${d.oc}`);
        }

        // módulos
        for (const chip of d.chips) {
          if (!chip) continue;
          const c = cfg.chips.list[chip.id];
          traits[c.trait] += OD.statAt(c.value, chip.level);
        }
        // características vindas da especialização
        if (d.branchCfg && d.branchCfg.traits) for (const k in d.branchCfg.traits) traits[k] += d.branchCfg.traits[k];
        // mutação
        if (d.mutation && cfg.mutations) {
          const mu = cfg.mutations.list[d.mutation];
          if (mu.bonus) add(mu.bonus);
          if (mu.traits) for (const k in mu.traits) traits[k] += mu.traits[k];
          notes.push(`Mutação ${mu.name}: ${mu.text}`);
        }
        // aura do anel (só para defesas de ataque)
        const aura = m.auras && m.auras[s.ring];
        if (aura && d.cfg.role === 'attack') {
          const au = cfg.auras.list[aura];
          traits[au.trait] += au.value;
          notes.push(`Aura ${au.name}: ${au.text}`);
        }

        d.bonus = total;
        d.notes = notes;
        d.traits = traits;
        d.near = near;
        defs.push(d);
      }

      // 2ª passada: amplificadores (dependem dos próprios bônus)
      for (const d of defs) {
        for (const n of d.near) {
          const amp = n.defense;
          if (!amp || !amp.amplifies || amp === d) continue;
          const bonus = { damage: amp.stat('ampDamage'), rate: amp.stat('ampRate') };
          for (const k in bonus) d.bonus[k] = (d.bonus[k] || 0) + bonus[k];
          d.notes.push(`Amplificador vizinho: ${this.describe(bonus)}`);
        }
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
      const P = OD.Economy.planetEffect(m);
      m.planet.armor = Math.min(OD.CONFIG.planet.maxArmor, m.mods.planetArmor + fortify + (P.armor || 0));
      m.planet.regen = P.regen || 0;
    },
  };

  OD.Bonuses = Bonuses;
})();
