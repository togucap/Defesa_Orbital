// Tela do Laboratório: compra de melhorias permanentes com núcleos
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const Lab = {
    init(app) {
      this.app = app;
      this.list = $('lab-list');
      this.resetArmed = 0;
      this.list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-buy]');
        if (b && OD.meta.buy(b.dataset.buy)) this.render();
      });
      $('btn-lab-back').addEventListener('click', () => app.closeLab());
      const reset = $('btn-lab-reset');
      reset.addEventListener('click', () => {
        // pede confirmação com um segundo toque
        if (this.resetArmed > performance.now()) {
          OD.meta.reset();
          this.resetArmed = 0;
          reset.textContent = 'Reiniciar progresso';
          this.render();
        } else {
          this.resetArmed = performance.now() + 3000;
          reset.textContent = 'Toque de novo para apagar tudo';
          setTimeout(() => (reset.textContent = 'Reiniciar progresso'), 3000);
        }
      });
    },

    render() {
      const meta = OD.meta;
      $('lab-cores').textContent = meta.data.cores.toLocaleString('pt-BR');
      this.list.innerHTML = OD.CONFIG.meta.upgrades
        .map((u) => {
          const lv = meta.level(u.id);
          const cost = meta.cost(u.id);
          const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
          const btn =
            cost == null
              ? '<button class="btn small" disabled>MÁX</button>'
              : `<button class="btn small primary" data-buy="${u.id}" ${meta.data.cores < cost ? 'disabled' : ''}><i class="core"></i>${cost}</button>`;
          return (
            `<div class="lab-row"><div class="lab-info"><b>${esc(u.name)}</b><span>${esc(u.text)}</span>` +
            `<div class="pips">${pips}</div></div>${btn}</div>`
          );
        })
        .join('');
    },
  };

  OD.Lab = Lab;
})();
