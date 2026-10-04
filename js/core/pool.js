// Pool de objetos: reaproveita instâncias para evitar coleta de lixo.
// Objetos precisam ter a propriedade "alive"; chame sweep() após atualizar.
(() => {
  const OD = (window.OD = window.OD || {});

  class Pool {
    constructor(factory, initial = 0, max = Infinity) {
      this.factory = factory;
      this.max = max;
      this.free = [];
      this.active = [];
      for (let i = 0; i < initial; i++) this.free.push(factory());
    }

    // retorna um objeto livre (ou null se o limite foi atingido)
    get() {
      if (this.active.length >= this.max) return null;
      const obj = this.free.length ? this.free.pop() : this.factory();
      obj.alive = true;
      this.active.push(obj);
      return obj;
    }

    // move os objetos mortos de volta para a lista livre
    sweep() {
      const a = this.active;
      let w = 0;
      for (let r = 0; r < a.length; r++) {
        const o = a[r];
        if (o.alive) a[w++] = o;
        else this.free.push(o);
      }
      a.length = w;
    }

    clear() {
      for (const o of this.active) {
        o.alive = false;
        this.free.push(o);
      }
      this.active.length = 0;
    }
  }

  OD.Pool = Pool;
})();
