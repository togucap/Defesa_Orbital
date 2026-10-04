// Classe base das defesas + registro de tipos.
// Nova defesa: entrada em CONFIG.defenses + classe que estende Defense e
// chama OD.registerDefense('tipo', Classe) + linha <script> no index.html.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2, turnTowards, angleDiff } = OD.math;

  // a que grupo de bônus cada atributo pertence
  const STAT_GROUP = {
    damage: 'damage', dps: 'damage', shockDamage: 'damage', mineDamage: 'damage', droneDamage: 'damage', corrodeDps: 'damage', pullDps: 'damage',
    income: 'income', ampDamage: 'amp', ampRate: 'amp', fireInterval: 'rate', chargeTime: 'rate',
    range: 'range', fireRate: 'rate', reload: 'rate', blastRadius: 'area', wellRadius: 'area',
    capacity: 'capacity', regen: 'capacity', heal: 'heal', slow: 'slow', hp: 'hp',
  };
  const INVERSE = { reload: true, chargeTime: true }; // quanto menor, melhor

  // características de ataque (módulos, mutações, auras)
  OD.emptyTraits = () => ({ crit: 0, critMult: 2.5, burn: 0, cryo: 0, greed: 0, ricochet: 0, arc: 0, shred: 0, fail: 0, vampiric: 0, twin: 0 });

  class Defense {
    constructor(slot, type) {
      this.slot = slot;
      this.type = type;
      this.cfg = OD.CONFIG.defenses[type];
      this.level = 1;
      this.invested = this.cfg.cost;
      this.branch = null;      // especialização escolhida
      this.branchCfg = null;
      this.bonus = {};         // preenchido por OD.Bonuses.refresh
      this.notes = [];
      this.traits = OD.emptyTraits();
      this.oc = 0;             // níveis de sobrecarga (além do máximo)
      this.chips = [null, null]; // módulos: { id, level }
      this.mutation = null;
      this.mutationOffer = null;
      this.targeting = this.cfg.targeting || 'closest';
      this.angle = slot.angle; // começa apontando para fora
      this.maxHp = this.stat('hp');
      this.hp = this.maxHp;
      this.disabled = 0;
      this.flash = 0;
      this.target = null;
    }

    get x() {
      return this.slot.x;
    }
    get y() {
      return this.slot.y;
    }
    get active() {
      return this.disabled <= 0;
    }

    // sprite: a especialização tem visual próprio se existir no manifesto
    get spriteKey() {
      const base = this.cfg.sprite || 'def_' + this.type;
      const alt = this.branch && base + '_' + this.branch;
      return alt && OD.ASSETS[alt] ? alt : base;
    }

    // estágio visual pelo nível: 0 (1–3), 1 (4–6), 2 (7–9), 3 (10)
    tier() {
      const l = this.level;
      return l >= 10 ? 3 : l >= 7 ? 2 : l >= 4 ? 1 : 0;
    }

    // atributo no nível atual (ou informado), com especialização e bônus
    stat(name, level = this.level) {
      const br = this.branchCfg;
      let def = name === 'hp' ? this.cfg.hp : this.cfg.stats[name];
      if (def === undefined && br && br.stats) def = br.stats[name];
      let v = OD.statAt(def, level);
      if (br && br.mult && br.mult[name] != null) v *= br.mult[name];
      const g = STAT_GROUP[name];
      const b = g ? this.bonus[g] || 0 : 0;
      if (b) v = INVERSE[name] ? v / (1 + b) : v * (1 + b);
      return v;
    }

    range() {
      return this.cfg.stats.range ? this.stat('range') : 0;
    }

    // atributos mostrados no painel (inclui os da especialização)
    displayStats() {
      const br = this.branchCfg;
      return br && br.display ? this.cfg.display.concat(br.display) : this.cfg.display;
    }

    // precisa escolher especialização antes do próximo upgrade?
    needsBranch() {
      return !this.branch && !!this.cfg.branches && this.level === OD.CONFIG.defenseRules.branchLevel;
    }

    setBranch(key) {
      this.branch = key;
      this.branchCfg = this.cfg.branches[key];
    }

    onLevelUp() {
      this.maxHp = this.stat('hp');
      if (this.active) this.hp = this.maxHp;
    }

    // bônus mudaram: ajusta a vida máxima mantendo a proporção
    onBonusChange() {
      const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
      this.maxHp = this.stat('hp');
      if (this.active) this.hp = this.maxHp * frac;
    }

    onRemove() {}

    // dano recebido de inimigos; ao zerar fica desativada por um tempo
    damage(m, amount) {
      if (!this.active || amount <= 0) return;
      this.hp -= amount;
      this.flash = 0.2;
      if (this.hp <= 0) {
        this.hp = 0;
        this.disabled = OD.CONFIG.defenseRules.disableTime;
        this.target = null;
        this.onDisable(m);
        OD.fx.explosion(m, this.x, this.y, 16, '#ff8a5c');
        OD.events.emit('defense:disabled', this);
      }
    }

    onDisable() {}

    update(m, dt) {
      if (this.flash > 0) this.flash -= dt;
      const self = this.bonus.selfRepair || 0;
      if (this.disabled > 0) {
        const speed = Math.max(m.reviveMult, self > 0 ? 1.5 : 1);
        this.disabled -= dt * speed;
        if (this.disabled <= 0) {
          this.disabled = 0;
          this.hp = this.maxHp * OD.CONFIG.defenseRules.reviveHp;
        }
        return;
      }
      // slot Instável: fica fora do ar alguns segundos a cada ciclo
      if (this.slot.special === 'unstable') {
        const o = OD.CONFIG.specialSlots.types.unstable.outage;
        this.cycle = (this.cycle || 0) + dt;
        this.offline = this.cycle % o.every > o.every - o.duration;
        if (this.offline) return;
      }
      // conserto por reparador vizinho / Nanorreparo
      const regen = self + m.defenseHeal;
      if (regen > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * regen * dt);
      this.act(m, dt);
    }

    // comportamento de cada tipo (sobrescrever)
    act() {}

    // causa dano passando pelos efeitos de módulos/mutações (OD.Damage)
    hit(m, enemy, amount, showNumber = true) {
      OD.Damage.deal(m, this, enemy, amount, this.cfg.damageType, showNumber);
    }

    // encaixes de módulo liberados (só defesas de ataque)
    socketsOpen() {
      if (this.cfg.role !== 'attack') return 0;
      return OD.CONFIG.chips.sockets.filter((lv) => this.level >= lv).length;
    }

    // nível efetivo para exibição: 10★3
    levelText() {
      return this.oc ? this.level + '★' + this.oc : String(this.level);
    }

    // escolhe o alvo no alcance conforme o modo de mira:
    // closest (mais perto do planeta), strongest (mais vida), farthest (mais longe)
    findTarget(m, range) {
      let best = null;
      let bestD = Infinity;
      const mode = this.targeting;
      const enemies = m.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || !e.visible) continue;
        const reach = range + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) > reach * reach) continue;
        const d = mode === 'strongest' ? -(e.hp + e.eshield) - (e.boss ? 1e12 : 0) : mode === 'farthest' ? -(e.x * e.x + e.y * e.y) : e.x * e.x + e.y * e.y;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best;
    }

    // mantém o alvo atual enquanto válido; senão procura outro
    keepTarget(m, range) {
      const t = this.target;
      if (t && t.alive && t.visible) {
        const reach = range + t.radius;
        if (dist2(this.x, this.y, t.x, t.y) <= reach * reach) return t;
      }
      this.target = this.findTarget(m, range);
      return this.target;
    }

    // gira em direção ao ponto; retorna true quando está mirando
    aimAt(x, y, dt, turnSpeed = 10) {
      const a = Math.atan2(y - this.y, x - this.x);
      this.angle = turnTowards(this.angle, a, turnSpeed * dt);
      return Math.abs(angleDiff(this.angle, a)) < 0.2;
    }

    drawBack() {}
    drawFront() {}

    draw(r) {
      const alpha = this.active && !this.offline ? 1 : 0.35 + 0.15 * Math.sin(r.time * 20);
      r.sprite(this.spriteKey, this.x, this.y, this.angle, 1, alpha, this.tier());
      if (this.flash > 0) r.ring(this.x, this.y, 21, '#ff6b6b', 3, this.flash / 0.2);
      if (this.hp < this.maxHp) r.bar(this.x, this.y + 25, 30, this.hp / this.maxHp, this.active ? '#4ade80' : '#ff4d6d');
      this.drawLevel(r);
    }

    drawLevel(r) {
      const ctx = r.ctx;
      const bx = this.x + 16;
      const by = this.y + 13;
      r.disc(bx, by, 8.5, '#0b1026', 0.92);
      if (this.branch) r.ring(bx, by, 8.5, '#d68bff', 1.5, 0.9);
      if (this.mutation) r.ring(bx, by, 11, '#7dff9b', 1.5, 0.8);
      // mutação esperando escolha: sinal pulsando
      if (this.mutationOffer) {
        const p = 0.5 + 0.5 * Math.sin(r.time * 8);
        r.disc(this.x - 16, this.y - 16, 6 + p * 2, '#7dff9b', 0.9);
        r.setFont('900 10px system-ui, sans-serif');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#04140a';
        ctx.fillText('!', this.x - 16, this.y - 15.5);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.level >= this.cfg.maxLevel ? '#ffd34d' : '#ffffff';
      if (this.oc) {
        r.setFont('800 9px system-ui, sans-serif');
        ctx.fillText('★' + this.oc, bx, by + 0.5);
      } else {
        r.setFont('800 11px system-ui, sans-serif');
        ctx.fillText(this.level, bx, by + 0.5);
      }
    }
  }

  OD.Defense = Defense;
  OD.defenseClasses = {};
  OD.registerDefense = (key, cls) => {
    OD.defenseClasses[key] = cls;
  };
  OD.createDefense = (type, slot) => {
    const cfg = OD.CONFIG.defenses[type];
    const Cls = OD.defenseClasses[cfg.class || type] || Defense;
    return new Cls(slot, type);
  };
})();
