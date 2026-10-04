// Satélite Minerador: rende moedas ao fim de cada onda (escala com a onda).
// Juros: também rende uma parte das moedas guardadas.
(() => {
  const OD = (window.OD = window.OD || {});

  class MinerDefense extends OD.Defense {
    constructor(slot, type) {
      super(slot, type);
      this.sparkle = 0;
    }

    income(m) {
      return this.stat('income') * (1 + this.stat('incomePerWave') * Math.max(0, m.wave - 1));
    }

    onWaveEnd(m) {
      let gain = this.income(m);
      const br = this.branchCfg;
      if (br && br.interest) gain += Math.min(br.interestMax, m.coins * br.interest);
      OD.Economy.earn(m, gain, this.x, this.y - 22);
      OD.fx.ring(m, this.x, this.y, 30, '#ffd34d', 0.5);
      this.sparkle = 1;
    }

    act(m, dt) {
      if (this.sparkle > 0) this.sparkle -= dt;
      if (Math.random() < dt * 1.5) {
        const p = m.particles.get();
        if (p) p.init('dot', this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, 0, -20, 0.6, 2.5, '#ffd34d');
      }
    }
  }

  OD.registerDefense('miner', MinerDefense);
})();
