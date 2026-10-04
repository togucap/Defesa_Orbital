// Amplificador: não ataca; fortalece as defesas vizinhas (aplicado em
// OD.Bonuses.refresh). Desenha feixes até os vizinhos que recebem o bônus.
(() => {
  const OD = (window.OD = window.OD || {});

  class AmplifierDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.amplifies = true;
    }

    drawBack(r) {
      if (!this.active || !this.near) return;
      const color = OD.Sprites.color(this.spriteKey);
      for (const n of this.near) {
        if (!n.defense) continue;
        const t = (r.time * 0.8 + n.index * 0.37) % 1;
        r.line(this.x, this.y, n.x, n.y, color, 3, 0.18);
        r.disc(this.x + (n.x - this.x) * t, this.y + (n.y - this.y) * t, 3, color, 0.8);
      }
    }
  }

  OD.registerDefense('amplifier', AmplifierDefense);
})();
