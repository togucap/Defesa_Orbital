// Projéteis (sempre via pool): tiros de canhão, mísseis teleguiados e
// tiros inimigos (que acertam escudos, defesas ou o planeta).
(() => {
  const OD = (window.OD = window.OD || {});
  const { dist2, turnTowards } = OD.math;

  class Projectile {
    constructor() {
      this.alive = false;
      this.hitList = [];
    }

    // kind: 'bullet' | 'missile' | 'enemy'
    init(kind, x, y, angle, speed, damage, spriteKey) {
      this.kind = kind;
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = speed;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.damage = damage;
      this.spriteKey = spriteKey;
      this.life = 2;
      this.radius = 4;
      this.scale = 1;
      this.target = null;     // inimigo perseguido (mísseis)
      this.turnRate = 0;
      this.blast = 0;
      this.hostile = kind === 'enemy';
      this.trail = 0;
      this.dmgType = 'kinetic';
      this.source = null;     // tipo de defesa que disparou (estatísticas)
      this.pierce = 0;        // inimigos extras que o tiro atravessa
      this.fragment = false;
      this.hitList.length = 0;
      return this;
    }

    update(m, dt) {
      this.life -= dt;
      if (this.life <= 0) {
        if (this.kind === 'missile') this.explode(m);
        this.alive = false;
        return;
      }

      if (this.kind === 'missile') this.steer(m, dt);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.hostile) this.hitFriendly(m);
      else this.hitEnemy(m);
    }

    // míssil: persegue o alvo (ou o inimigo mais próximo se o alvo morrer)
    steer(m, dt) {
      let t = this.target;
      if (!t || !t.alive) t = this.target = OD.Combat.nearestEnemy(m, this.x, this.y, 400);
      if (t) {
        const want = Math.atan2(t.y - this.y, t.x - this.x);
        this.angle = turnTowards(this.angle, want, this.turnRate * dt);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
      this.trail -= dt;
      if (this.trail <= 0) {
        this.trail = 0.03;
        const p = m.particles.get();
        if (p) p.init('dot', this.x - this.vx * 0.03, this.y - this.vy * 0.03, 0, 0, 0.35, 4 * this.scale, '#ffb347');
      }
    }

    hitEnemy(m) {
      const enemies = m.enemies;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || !e.visible) continue;
        const r = e.radius + this.radius;
        if (dist2(this.x, this.y, e.x, e.y) >= r * r) continue;
        if (this.kind === 'missile') {
          this.explode(m);
          this.alive = false;
          return;
        }
        if (this.hitList.indexOf(e) >= 0) continue; // já atravessou este
        e.takeDamage(m, this.damage, this.dmgType, this.source);
        OD.fx.sparks(m, this.x, this.y, '#ffe08a', 3);
        if (this.pierce > 0) {
          this.pierce--;
          this.hitList.push(e);
          continue;
        }
        this.alive = false;
        return;
      }
    }

    // dano em área do míssil
    explode(m) {
      const r = this.blast;
      const enemies = m.enemies;
      const n = enemies.length; // fragmentos criados agora não levam o mesmo dano
      for (let i = 0; i < n; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const reach = r + e.radius;
        if (dist2(this.x, this.y, e.x, e.y) < reach * reach) e.takeDamage(m, this.damage, this.dmgType, this.source);
      }
      OD.fx.explosion(m, this.x, this.y, 14 * this.scale, '#ff9f43');
      OD.fx.ring(m, this.x, this.y, r, '#ffcf8a', 0.35);
      OD.events.emit('sfx', 'boom');
      if (m.mods.missileSplit && !this.fragment) this.split(m);
    }

    // carta Ogivas de Fragmentação: 3 mini-mísseis
    split(m) {
      for (let i = 0; i < 3; i++) {
        const p = m.projectiles.get();
        const a = Math.random() * Math.PI * 2;
        p.init('missile', this.x, this.y, a, 300, this.damage * 0.35, this.spriteKey);
        p.fragment = true;
        p.turnRate = 7;
        p.blast = this.blast * 0.5;
        p.radius = 4;
        p.life = 0.8;
        p.scale = 0.6;
        p.dmgType = this.dmgType;
        p.source = this.source;
      }
    }

    // tiro inimigo: escudo bloqueia; depois qualquer defesa no caminho ou o planeta
    hitFriendly(m) {
      const shields = m.shields;
      for (let i = 0; i < shields.length; i++) {
        if (shields[i].blocks(this.x, this.y, this.radius, this.vx, this.vy)) {
          shields[i].absorb(m, this.damage, this.x, this.y);
          if (m.mods.shieldReflect) this.reflect();
          else this.alive = false;
          return;
        }
      }
      const slots = m.slots;
      for (let i = 0; i < slots.length; i++) {
        const d = slots[i].defense;
        if (d && d.active && dist2(this.x, this.y, d.x, d.y) < 20 * 20) {
          d.damage(m, this.damage);
          OD.fx.sparks(m, this.x, this.y, '#ff7aa8', 5);
          this.alive = false;
          return;
        }
      }
      const R = m.planet.radius;
      if (this.x * this.x + this.y * this.y < R * R) {
        m.planet.damage(this.damage);
        OD.fx.sparks(m, this.x, this.y, '#ff7aa8', 6);
        this.alive = false;
      }
    }

    // carta Escudo Refletor: o tiro volta como projétil aliado
    reflect() {
      this.hostile = false;
      this.kind = 'bullet';
      this.vx = -this.vx;
      this.vy = -this.vy;
      this.angle += Math.PI;
      this.damage *= 2;
      this.dmgType = 'energy';
      this.source = 'shield';
      this.life = 2;
    }

    draw(r) {
      // rastro curto (mísseis já deixam partículas)
      if (this.kind !== 'missile') {
        const k = 0.035;
        r.line(this.x - this.vx * k, this.y - this.vy * k, this.x, this.y, OD.Sprites.color(this.spriteKey), 3 * this.scale, 0.4);
      }
      r.sprite(this.spriteKey, this.x, this.y, this.angle, this.scale);
    }
  }

  OD.Projectile = Projectile;
})();
