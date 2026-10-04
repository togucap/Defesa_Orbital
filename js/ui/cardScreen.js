// Tela de escolha de cartas (a cada N ondas)
(() => {
  const OD = (window.OD = window.OD || {});
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const CardScreen = {
    init(app) {
      this.app = app;
      this.list = $('choice-list');
      this.reroll = $('btn-reroll');
      this.list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-card]');
        const m = app.match;
        if (!b || !m || !m.offer) return;
        OD.Cards.pick(m, m.offer[Number(b.dataset.card)]);
        app.closeChoice();
      });
      this.reroll.addEventListener('click', () => {
        if (OD.Cards.reroll(app.match)) this.render(app.match);
      });
    },

    render(m) {
      const R = OD.CONFIG.cards.rarities;
      const reasons = { market: 'Mercado orbital', risk: 'Recompensa do desafio', mission: 'Recompensa de missão', event: 'Presente do cometa' };
      $('choice-sub').textContent = reasons[m.offerReason] || `Onda ${m.wave} concluída`;
      this.list.innerHTML = m.offer
        .map((c, i) => {
          const r = R[c.rarity];
          const owned = m.cards.filter((id) => id === c.id).length;
          return (
            `<button class="choice ${c.rarity}" data-card="${i}" style="--rc:${r.color}">` +
            `<span class="choice-top"><b>${esc(c.name)}</b><small>${esc(r.name)}${owned ? ` · você tem ${owned}` : ''}</small></span>` +
            `<span class="choice-text">${esc(c.text)}</span></button>`
          );
        })
        .join('');
      this.reroll.textContent = `TROCAR OPÇÕES (${m.rerolls})`;
      this.reroll.classList.toggle('hidden', m.rerolls <= 0);
    },
  };

  OD.CardScreen = CardScreen;
})();
