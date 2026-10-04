// Slot orbital: posição fixa num anel (que gira devagar), pode estar
// bloqueado, vazio ou com uma defesa.
(() => {
  const OD = (window.OD = window.OD || {});
  const { deg } = OD.math;

  class Slot {
    constructor(ringIndex, index, ring) {
      this.ring = ringIndex;
      this.index = index;
      this.radius = ring.radius;
      this.spin = ring.spin || 0;
      this.baseAngle = deg(ring.angleOffset + (index * 360) / ring.slots);
      this.angle = this.baseAngle;
      this.x = Math.cos(this.angle) * this.radius;
      this.y = Math.sin(this.angle) * this.radius;
      this.unlocked = false;
      this.defense = null;
    }

    // cria os slots de todos os anéis; os liberados no início ficam espaçados
    static createAll() {
      const slots = [];
      OD.CONFIG.rings.forEach((ring, ri) => {
        const open = new Set();
        for (let i = 0; i < ring.startUnlocked; i++) open.add(Math.round((i * ring.slots) / ring.startUnlocked));
        // anéis que exigem tecnologia ficam ocultos até o desbloqueio no Laboratório
        const hidden = !!ring.tech && !OD.meta.hasTech(ring.tech);
        for (let i = 0; i < ring.slots; i++) {
          const s = new Slot(ri, i, ring);
          s.unlocked = open.has(i) && !hidden;
          s.hidden = hidden;
          s.moon = !!ring.moon;
          slots.push(s);
        }
      });
      return slots;
    }

    // slot mais próximo do ponto, dentro da área de toque
    static hitTest(m, x, y) {
      const max = OD.CONFIG.slot.hitRadius;
      let best = null;
      let bestD = max * max;
      for (const s of m.slots) {
        if (s.hidden) continue;
        const d = OD.math.dist2(x, y, s.x, s.y);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      return best;
    }

    update(m, dt) {
      this.angle = this.baseAngle + this.spin * m.time;
      this.x = Math.cos(this.angle) * this.radius;
      this.y = Math.sin(this.angle) * this.radius;
      if (this.defense) this.defense.update(m, dt);
    }

    drawBack(r, m) {
      if (this.defense) this.defense.drawBack(r, m);
    }

    draw(r, m) {
      if (this.hidden) return;
      if (this.moon) r.sprite('moon', this.x, this.y, this.angle);
      if (this.special) {
        const sp = OD.CONFIG.specialSlots.types[this.special];
        r.ring(this.x, this.y, 24, sp.color, 2.5, 0.55 + 0.25 * Math.sin(r.time * 3 + this.index));
      }
      if (this.defense) this.defense.draw(r, m);
      else r.sprite(this.unlocked ? 'slot_empty' : 'slot_locked', this.x, this.y, 0, 1, this.unlocked ? 1 : 0.8);
    }

    drawFront(r, m) {
      if (this.defense) this.defense.drawFront(r, m);
    }

    // destaque do slot selecionado (e alcance da defesa, se houver)
    drawSelection(r) {
      const pulse = 0.5 + 0.5 * Math.sin(r.time * 6);
      if (this.defense) {
        const range = this.defense.range();
        if (range > 0) {
          r.disc(this.x, this.y, range, '#5fd4ff', 0.06);
          r.ring(this.x, this.y, range, '#5fd4ff', 1.5, 0.45);
        }
      }
      r.ring(this.x, this.y, 27 + pulse * 3, '#ffffff', 2.5, 0.6 + 0.4 * pulse);
    }
  }

  OD.Slot = Slot;
})();
