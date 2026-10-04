// Entrada: toque e mouse via Pointer Events, teclado e bloqueio de
// gestos do navegador (zoom, scroll, seleção, menu de contexto).
(() => {
  const OD = (window.OD = window.OD || {});

  const Input = {
    init(canvas, renderer) {
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return; // só botão principal / toque
        const p = renderer.toWorld(e.clientX, e.clientY);
        OD.events.emit('tap', p);
      });

      const block = (e) => e.preventDefault();
      const opts = { passive: false };
      // Safari: pinça e duplo toque
      document.addEventListener('gesturestart', block, opts);
      document.addEventListener('gesturechange', block, opts);
      document.addEventListener('gestureend', block, opts);
      document.addEventListener('dblclick', block, opts);
      // scroll por arrasto e zoom por trackpad (ctrl + roda)
      document.addEventListener('touchmove', block, opts);
      document.addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), opts);
      document.addEventListener('contextmenu', block);
      document.addEventListener('selectstart', block);

      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        OD.events.emit('key', e);
      });
    },
  };

  OD.Input = Input;
})();
