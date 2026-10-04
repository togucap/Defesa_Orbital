// Níveis de ameaça (prestígio): inimigos mais fortes e numerosos em troca
// de mais núcleos. Alcançar a onda configurada no nível mais alto libera o próximo.
(() => {
  const OD = (window.OD = window.OD || {});
  const C = () => OD.CONFIG.threat;

  const Threat = {
    selected() {
      return Math.min(OD.meta.data.threat || 0, OD.meta.data.threatMax || 0);
    },

    set(level) {
      OD.meta.data.threat = OD.math.clamp(level, 0, OD.meta.data.threatMax || 0);
      OD.meta.save();
    },

    mods(level) {
      const p = C().perLevel;
      return { hp: 1 + p.hp * level, damage: 1 + p.damage * level, reward: 1 + p.reward * level, count: 1 + p.count * level };
    },

    coreBonus(level) {
      return C().perLevel.cores * level;
    },

    describe(level) {
      if (!level) return 'Normal';
      const p = C().perLevel;
      const pc = (v) => Math.round(v * level * 100) + '%';
      return `+${pc(p.hp)} vida · +${pc(p.damage)} dano · +${pc(p.count)} inimigos · núcleos ×${(1 + p.cores * level).toFixed(2).replace('.', ',')}`;
    },

    // fim da partida: devolve o nível liberado (ou 0)
    onGameOver(m) {
      const meta = OD.meta.data;
      if (m.threat === (meta.threatMax || 0) && m.wave >= C().unlockWave && (meta.threatMax || 0) < C().max) {
        meta.threatMax = (meta.threatMax || 0) + 1;
        OD.meta.save();
        return meta.threatMax;
      }
      return 0;
    },
  };

  OD.Threat = Threat;
})();
