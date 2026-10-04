// Classe base dos inimigos + registro de tipos.
// Novo inimigo: entrada em CONFIG.enemies + classe que estende Enemy e
// chama OD.registerEnemy('tipo', Classe) + linha <script> no index.html.
// Modificadores (blindado, escudo, regenerativo, furtivo, elite) vêm em opts.mods.
(() => {
  const OD = (window.OD = window.OD || {});
  const NO_MODS = [];
  const NO_THREAT = { hp: 1, damage: 1, reward: 1, count: 1 };
  const NO_OPTS = { show: true, shred: 0, crit: false };
  const DOT = { show: false, shred: 0, crit: false }; // dano contínuo sem números

  class Enemy {
    // opts: { hpMult, rewardMult, mods: ['armored', ...] }
    constructor(type, wave, x, y, opts = {}) {
      const c = OD.CONFIG.enemies[type];
      const W = OD.CONFIG.waves;
      const MODS = OD.CONFIG.modifiers;
      this.type = type;
      this.cfg = c;
      this.wave = wave;
      this.spriteKey = c.sprite || 'enemy_' + type;
      this.boss = !!c.boss;

      // modificadores
      this.mods = opts.mods || NO_MODS;
      let hpMult = opts.hpMult || 1;
      let rewardMult = opts.rewardMult == null ? 1 : opts.rewardMult;
      let dmgMult = 1;
      let size = 1;
      for (const id of this.mods) {
        const md = MODS[id];
        hpMult *= md.hpMult || 1;
        rewardMult *= md.rewardMult || 1;
        dmgMult *= md.damageMult || 1;
        size *= md.sizeMult || 1;
      }
      const has = (id) => this.mods.indexOf(id) >= 0;
      this.resist = has('armored') ? MODS.armored.resist : null;
      this.regen = has('regen') ? MODS.regen.regen : 0;
      this.sinceHit = 99;  // s desde o último dano (regeneração)
      this.revealT = 0;    // s revelado (furtivo que atacou)
      this.enraged = false; // onda arrastada: avança sem parar
      this.stealth = has('stealth');
      this.elite = has('elite');

      const T = OD.currentThreat || NO_THREAT;
      this.maxHp = this.hp = c.hp * OD.Waves.hpMult(wave) * hpMult * T.hp;
      this.eshieldMax = has('shielded') ? this.maxHp * MODS.shielded.shield : 0;
      this.eshield = this.eshieldMax;
      this.speed = c.speed * Math.min(W.speedMax, 1 + W.speedPerWave * (wave - 1)) * (opts.speedMult || 1);
      this.fragment = !!opts.fragment; // fragmentos não se dividem de novo
      this.damage = c.damage * (1 + W.damagePerWave * (wave - 1)) * dmgMult * T.damage;
      this.reward = c.reward * (1 + W.rewardPerWave * (wave - 1)) * rewardMult * T.reward;
      this.radius = c.radius * size;
      this.scale = size;

      this.x = x;
      this.y = y;
      this.angle = Math.atan2(-y, -x); // rumo ao planeta
      this.vx = 0;
      this.vy = 0;
      this.alive = true;
      this.visible = false;
      this.revealed = !this.stealth;
      this.slow = 0;
      this.slowTimer = 0;
      this.frozen = 0;
      this.flash = 0;
      this.age = 0;
      this.shockId = 0;
      this.greed = 0;       // bônus de moedas ao morrer (módulo Ganância)
      this.burnPool = 0;    // dano de queimadura pendente
      this.burnT = 0;
      this.burnSource = null;
      this.corrode = 0;     // s de corrosão (nanitas): recebe mais dano
      this.corrodeAmp = 0;
      this.corrodeDps = 0;
      this.corrodeSource = null;
    }

    // queimadura: o dano acumulado é aplicado ao longo de 3 s
    ignite(amount, source) {
      this.burnPool += amount;
      this.burnT = 3;
      this.burnSource = source;
    }

    // corrosão: dano contínuo e mais dano recebido de tudo
    infect(dps, amp, seconds, source, spread) {
      this.corrodeDps = Math.max(this.corrodeDps, dps);
      this.corrodeAmp = Math.max(this.corrodeAmp, amp);
      this.corrode = Math.max(this.corrode, seconds);
      this.corrodeSource = source;
      this.corrodeSpread = Math.max(this.corrodeSpread || 0, spread || 0);
    }

    // velocidade atual considerando EMP e congelamento
    currentSpeed() {
      return this.frozen > 0 ? 0 : this.speed * (1 - this.slow);
    }

    applySlow(amount, duration = 0.25) {
      const eff = amount * (1 - (this.cfg.slowResist || 0));
      if (eff > this.slow) this.slow = eff;
      if (duration > this.slowTimer) this.slowTimer = duration;
    }

    freeze(seconds) {
      const t = seconds * (1 - (this.cfg.slowResist || 0));
      if (t > this.frozen) this.frozen = t;
    }

    update(m, dt) {
      this.age += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.frozen > 0) this.frozen -= dt;
      if (this.slowTimer > 0) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.slow = 0;
      }
      this.sinceHit += dt;
      if (this.revealT > 0) this.revealT -= dt;
      if (this.regen && this.hp < this.maxHp && this.sinceHit >= OD.CONFIG.modifiers.regen.regenDelay) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.regen * dt);
      }
      // escudo inimigo regenera (regra de setor)
      if (this.eshieldMax && m.rules.shieldRegen && this.sinceHit > 1.5 && this.eshield < this.eshieldMax) {
        this.eshield = Math.min(this.eshieldMax, this.eshield + this.eshieldMax * m.rules.shieldRegen * dt);
      }
      // dano ao longo do tempo
      if (this.burnT > 0) {
        const tick = this.burnPool * Math.min(1, dt / this.burnT);
        this.burnPool -= tick;
        this.burnT -= dt;
        if (tick > 0) this.takeDamage(m, tick, 'fire', this.burnSource, DOT);
        if (!this.alive) return;
      }
      if (this.corrode > 0) {
        this.corrode -= dt;
        this.takeDamage(m, this.corrodeDps * dt, 'fire', this.corrodeSource, DOT);
        if (this.corrode <= 0) this.corrodeAmp = 0;
        if (!this.alive) return;
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

    // dmgType: kinetic | energy | explosive | fire; source: origem (estatísticas)
    // o: { show, shred (ignora blindagem/escudo), crit, fromX, fromY }
    takeDamage(m, amount, dmgType, source, o = NO_OPTS) {
      if (!this.alive || amount <= 0) return;
      let a = amount * this.damageTakenMult(o);
      if (this.corrode > 0) a *= 1 + this.corrodeAmp;
      const shred = o.shred || 0;
      let color = o.crit ? '#ffe066' : '#ffffff';
      if (this.resist && this.resist[dmgType] != null) {
        const r = this.resist[dmgType];
        a *= r + (1 - r) * shred;
        if (r < 1 && !o.crit) color = '#9aa4b8';
      }
      let dealt = 0;
      if (this.eshield > 0) {
        const eff = (OD.CONFIG.modifiers.shielded.shieldVs[dmgType] || 1) * (1 + shred);
        const sd = a * eff;
        color = '#7ee8ff';
        if (sd >= this.eshield) {
          dealt += this.eshield;
          a -= this.eshield / eff;
          this.eshield = 0;
          OD.fx.ring(m, this.x, this.y, this.radius + 10, '#7ee8ff', 0.3);
        } else {
          this.eshield -= sd;
          dealt += sd;
          a = 0;
        }
      }
      if (a > 0) {
        dealt += Math.min(a, Math.max(0, this.hp));
        this.hp -= a;
      }
      if (dmgType !== 'fire' && o.show) this.flash = 0.1; // dano contínuo não pisca
      this.sinceHit = 0;
      if (source) m.stats.damageBy[source] = (m.stats.damageBy[source] || 0) + dealt;
      this.lastSource = source;
      if (o.show && OD.CONFIG.fx.damageNumbers && a >= 1) {
        OD.fx.text(m, Math.round(a) + (o.crit ? '!' : ''), this.x, this.y - this.radius - 10, color, o.crit ? 22 : 18);
      }
      if (this.hp <= 0) this.kill(m);
    }

    // multiplicador de dano recebido (chefes com couraça sobrescrevem)
    damageTakenMult() {
      return 1;
    }

    // destruído por defesas: dá moedas
    kill(m) {
      if (!this.alive) return;
      this.alive = false;
      m.stats.kills++;
      if (this.boss) m.stats.bossKills++;
      OD.Economy.earn(m, this.reward * (1 + m.mods.reward + this.greed), this.x, this.y - 6);
      OD.fx.explosion(m, this.x, this.y, this.radius, OD.Sprites.color(this.spriteKey));
      // nanitas se espalham para os vizinhos
      if (this.corrode > 0 && this.corrodeSpread) {
        let n = this.corrodeSpread;
        for (const e of m.enemies) {
          if (n <= 0) break;
          if (e === this || !e.alive || OD.math.dist2(e.x, e.y, this.x, this.y) > 120 * 120) continue;
          e.infect(this.corrodeDps, this.corrodeAmp, 4, this.corrodeSource, this.corrodeSpread);
          OD.fx.zap(m, this.x, this.y, e.x, e.y, '#7dff9b');
          n--;
        }
      }
      // regra de setor: solta fragmentos
      if (m.rules.splitCount && !this.boss && !this.fragment) {
        for (let i = 0; i < m.rules.splitCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const f = OD.spawnEnemy(m, 'asteroidSmall', this.wave, this.x + Math.cos(a) * 12, this.y + Math.sin(a) * 12, { hpMult: 0.35, rewardMult: 0.25, fragment: true, speedMult: m.rules.speedMult });
          f.visible = this.visible;
        }
      }
      this.onDeath(m);
      OD.events.emit('enemy:killed', this);
    }

    onDeath() {}

    // colidiu com o planeta
    hitPlanet(m) {
      this.alive = false;
      const dealt = m.planet.damage(this.damage);
      m.shake = Math.min(1, m.shake + (this.boss ? 1 : 0.25));
      OD.fx.explosion(m, this.x, this.y, this.radius, '#ff6b6b');
      OD.fx.text(m, '-' + Math.round(dealt), this.x, this.y, '#ff6b81', 20);
      OD.events.emit('sfx', 'hit');
    }

    // bateu num escudo: o escudo absorve o dano e o inimigo é destruído
    hitShield(m, shield) {
      shield.absorb(m, this.damage, this.x, this.y);
      m.stats.damageBy.shield = (m.stats.damageBy.shield || 0) + Math.max(0, this.hp);
      this.kill(m);
    }

    // ângulo do sprite (asteroides giram em vez de apontar)
    spriteAngle() {
      return this.angle;
    }

    draw(r) {
      const hidden = this.stealth && !this.revealed;
      const alpha = hidden ? 0.18 : 1;
      const s = this.scale * (this.flash > 0 ? 1.12 : 1);
      r.sprite(this.spriteKey, this.x, this.y, this.spriteAngle(), s, alpha);
      if (this.flash > 0 && !hidden) r.flashSprite(this.spriteKey, this.x, this.y, this.spriteAngle(), s, this.flash * 6);
      if (hidden) return;

      const R = this.radius;
      if (this.elite) r.ring(this.x, this.y, R + 6, '#ffd34d', 2.5, 0.75 + 0.25 * Math.sin(r.time * 6));
      if (this.resist) r.ring(this.x, this.y, R + 2, '#aab4c8', 4, 0.85);
      if (this.eshield > 0) {
        const f = this.eshield / this.eshieldMax;
        r.disc(this.x, this.y, R + 7, '#4de1ff', 0.1 + 0.08 * f);
        r.ring(this.x, this.y, R + 7, '#7ee8ff', 2, 0.35 + 0.5 * f);
      }
      if (this.regen) r.ring(this.x, this.y, R + 4 + 2 * Math.sin(r.time * 5), '#4ade80', 1.5, 0.6);
      if (this.stealth) r.ring(this.x, this.y, R + 3, '#c4b5fd', 1.5, 0.6);
      if (this.frozen > 0) r.disc(this.x, this.y, R + 3, '#bfefff', 0.35);
      else if (this.slow > 0) r.ring(this.x, this.y, R + 4, '#b47cff', 2, 0.55);
      if (this.burnT > 0) r.disc(this.x, this.y - R * 0.3, R * 0.55, '#ff7a3d', 0.25 + 0.15 * Math.sin(r.time * 20));
      if (this.corrode > 0) r.ring(this.x, this.y, R + 2, '#7dff9b', 2, 0.6);

      if ((this.hp < this.maxHp || this.eshield < this.eshieldMax) && !this.boss) {
        const w = Math.max(22, R * 1.6);
        r.bar(this.x, this.y - R - 9, w, this.hp / this.maxHp, this.elite ? '#ffd34d' : '#ff4d6d');
        if (this.eshieldMax) r.bar(this.x, this.y - R - 15, w, this.eshield / this.eshieldMax, '#7ee8ff');
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
