// Barramento de eventos simples para desacoplar lógica, interface e áudio
(() => {
  const OD = (window.OD = window.OD || {});
  const listeners = {};

  OD.events = {
    on(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
    },
    emit(name, data) {
      const list = listeners[name];
      if (!list) return;
      for (let i = 0; i < list.length; i++) list[i](data);
    },
  };
})();
