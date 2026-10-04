// Classe base das defesas + registro de tipos.
// Nova defesa: entrada em CONFIG.defenses + classe que estende Defense e
// chama OD.registerDefense('tipo', Classe) + linha <script> no index.html.
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2, turnTowards, angleDiff } = OD.math;

  class Defense {
    constructor(slot, type) {
      this.slot = slot;
      this.type = type;
      this.cfg = OD.CONFIG.defenses[type];
      this.spriteKey = this.cfg.sprite || 'def_' + type;
      this.level = 1;
      this.invested = this.cfg.cost;
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

    // atributo no nível atual (ou no nível informado, para prévia do upgrade)
    stat(name, level = this.level) {
      return OD.statAt(name === 'hp' ? this.cfg.hp : this.cfg.stats[name], level);
    }

    range() {
      return this.cfg.stats.range ? this.stat('range') : 0;
    }

    onLevelUp() {
      this.maxHp = this.stat('hp');
      if (this.active) this.hp = this.maxHp;
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
      if (this.disabled > 0) {
        this.disabled -= dt;
        if (this.disabled <= 0) {
          this.disabled = 0;
          this.hp = this.maxHp * OD.CONFIG.defenseRules.reviveHp;
        }
        return;
      }
      this.act(m, dt);
    }

    // comportamento de cada tipo (sobrescrever)
    act() {}

    // inimigo mais perigoso (mais perto do planeta) dentro do alcance
    findTarget(m, range) {
      let best = null;
      let bestD = Infinity;
      const enemies = m.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || !e.visible) continue;
        const reach = range + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) > reach * reach) continue;
        const d = e.x * e.x + e.y * e.y;
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
      const alpha = this.active ? 1 : 0.35 + 0.15 * Math.sin(r.time * 20);
      r.sprite(this.spriteKey, this.x, this.y, this.angle, 1, alpha);
      if (this.flash > 0) r.ring(this.x, this.y, 21, '#ff6b6b', 3, this.flash / 0.2);
      if (this.hp < this.maxHp) r.bar(this.x, this.y + 25, 30, this.hp / this.maxHp, this.active ? '#4ade80' : '#ff4d6d');
      this.drawLevel(r);
    }

    drawLevel(r) {
      const ctx = r.ctx;
      const bx = this.x + 16;
      const by = this.y + 13;
      r.disc(bx, by, 8.5, '#0b1026', 0.92);
      r.setFont('800 11px system-ui, sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.level >= this.cfg.maxLevel ? '#ffd34d' : '#ffffff';
      ctx.fillText(this.level, bx, by + 0.5);
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
