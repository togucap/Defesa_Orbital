// Classe base dos inimigos + registro de tipos.
// Novo inimigo: entrada em CONFIG.enemies + classe que estende Enemy e
// chama OD.registerEnemy('tipo', Classe) + linha <script> no index.html.
(() => {
  const OD = (window.OD = window.OD || {});

  class Enemy {
    // opts: { hpMult, rewardMult } para casos especiais (ex.: fragmentos)
    constructor(type, wave, x, y, opts = {}) {
      const c = OD.CONFIG.enemies[type];
      const W = OD.CONFIG.waves;
      this.type = type;
      this.cfg = c;
      this.wave = wave;
      this.spriteKey = c.sprite || 'enemy_' + type;
      this.boss = !!c.boss;

      const hpMult = Math.pow(W.hpGrowth, wave - 1) * (opts.hpMult || 1);
      this.maxHp = this.hp = c.hp * hpMult;
      this.speed = c.speed * Math.min(W.speedMax, 1 + W.speedPerWave * (wave - 1));
      this.damage = c.damage * (1 + W.damagePerWave * (wave - 1));
      this.reward = c.reward * (1 + W.rewardPerWave * (wave - 1)) * (opts.rewardMult == null ? 1 : opts.rewardMult);
      this.radius = c.radius;

      this.x = x;
      this.y = y;
      this.angle = Math.atan2(-y, -x); // rumo ao planeta
      this.vx = 0;
      this.vy = 0;
      this.alive = true;
      this.visible = false;
      this.slow = 0;
      this.slowTimer = 0;
      this.flash = 0;
      this.age = 0;
    }

    // velocidade atual considerando o EMP
    currentSpeed() {
      return this.speed * (1 - this.slow);
    }

    applySlow(amount) {
      const eff = amount * (1 - (this.cfg.slowResist || 0));
      if (eff > this.slow) this.slow = eff;
      this.slowTimer = 0.25;
    }

    update(m, dt) {
      this.age += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.slowTimer > 0) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.slow = 0;
      }
      this.move(m, dt);
    }

    // padrão: reto para o planeta (subclasses sobrescrevem)
    move(m, dt) {
      this.moveTowards(0, 0, dt);
    }

    moveTowards(tx, ty, dt) {
      this.angle = Math.atan2(ty - this.y, tx - this.x);
      this.setVelocity(this.angle, this.currentSpeed());
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    setVelocity(angle, speed) {
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }

    takeDamage(m, amount, showNumber = true) {
      if (!this.alive || amount <= 0) return;
      this.hp -= amount;
      this.flash = 0.1;
      if (showNumber) OD.fx.damageNumber(m, amount, this.x, this.y - this.radius);
      if (this.hp <= 0) this.kill(m);
    }

    // destruído por defesas: dá moedas
    kill(m) {
      if (!this.alive) return;
      this.alive = false;
      m.stats.kills++;
      OD.Economy.earn(m, this.reward, this.x, this.y - 6);
      OD.fx.explosion(m, this.x, this.y, this.radius, OD.Sprites.color(this.spriteKey));
      this.onDeath(m);
      OD.events.emit('enemy:killed', this);
    }

    onDeath() {}

    // colidiu com o planeta
    hitPlanet(m) {
      this.alive = false;
      m.planet.damage(this.damage);
      m.shake = Math.min(1, m.shake + (this.boss ? 1 : 0.25));
      OD.fx.explosion(m, this.x, this.y, this.radius, '#ff6b6b');
      OD.fx.text(m, '-' + Math.round(this.damage), this.x, this.y, '#ff6b81', 20);
      OD.events.emit('sfx', 'hit');
    }

    // bateu num escudo: o escudo absorve o dano e o inimigo é destruído
    hitShield(m, shield) {
      shield.absorb(m, this.damage, this.x, this.y);
      this.kill(m);
    }

    // ângulo do sprite (asteroides giram em vez de apontar)
    spriteAngle() {
      return this.angle;
    }

    draw(r) {
      const s = this.flash > 0 ? 1.12 : 1;
      r.sprite(this.spriteKey, this.x, this.y, this.spriteAngle(), s);
      if (this.slow > 0) r.ring(this.x, this.y, this.radius + 4, '#b47cff', 2, 0.55);
      if (this.hp < this.maxHp && !this.boss) {
        r.bar(this.x, this.y - this.radius - 9, Math.max(22, this.radius * 1.6), this.hp / this.maxHp, '#ff4d6d');
      }
    }
  }

  OD.Enemy = Enemy;
  OD.enemyClasses = {};
  OD.registerEnemy = (key, cls) => {
    OD.enemyClasses[key] = cls;
  };

  // cria e adiciona um inimigo à partida
  OD.spawnEnemy = (m, type, wave, x, y, opts) => {
    const cfg = OD.CONFIG.enemies[type];
    const Cls = OD.enemyClasses[cfg.class || type] || Enemy;
    const e = new Cls(type, wave, x, y, opts);
    m.enemies.push(e);
    return e;
  };
})();
