// Utilidades matemáticas e leitura de atributos por nível
(() => {
  const OD = (window.OD = window.OD || {});
  const TAU = Math.PI * 2;

  OD.math = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    deg: (d) => (d * Math.PI) / 180,
    dist2: (ax, ay, bx, by) => {
      const dx = bx - ax;
      const dy = by - ay;
      return dx * dx + dy * dy;
    },
    // menor diferença entre dois ângulos, em [-PI, PI]
    angleDiff: (a, b) => {
      let d = (b - a) % TAU;
      if (d > Math.PI) d -= TAU;
      else if (d < -Math.PI) d += TAU;
      return d;
    },
    // gira o ângulo "from" em direção a "to" no máximo "maxStep"
    turnTowards: (from, to, maxStep) => {
      const d = OD.math.angleDiff(from, to);
      return from + (Math.abs(d) <= maxStep ? d : Math.sign(d) * maxStep);
    },
    // distância² do ponto (px,py) ao segmento (ax,ay)-(bx,by)
    segDist2: (px, py, ax, ay, bx, by) => {
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const qx = ax + dx * t - px;
      const qy = ay + dy * t - py;
      return qx * qx + qy * qy;
    },
    // escolhe um item pelo peso retornado por weightFn
    pickWeighted: (items, weightFn) => {
      let total = 0;
      for (const it of items) total += weightFn(it);
      let r = Math.random() * total;
      for (const it of items) {
        r -= weightFn(it);
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
    // gerador pseudoaleatório com semente (desenhos provisórios estáveis)
    seeded: (seed) => {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
  };

  // Valor de um atributo no nível (ou onda) informado.
  // Aceita número fixo ou { base, perLevel | perWave, min, max }.
  OD.statAt = (def, level) => {
    if (def == null) return 0;
    if (typeof def === 'number') return def;
    const step = def.perLevel != null ? def.perLevel : def.perWave || 0;
    let v = def.base + step * (level - 1);
    if (def.min != null && v < def.min) v = def.min;
    if (def.max != null && v > def.max) v = def.max;
    return v;
  };
})();
