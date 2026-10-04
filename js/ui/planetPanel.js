// Painel do planeta (toque no planeta): núcleo planetário (vida, blindagem,
// regeneração, habilidades), anéis (melhoria e aura) e mercado de cartas.
(() => {
  const OD = (window.OD = window.OD || {});
  const { esc, num, pct, coin, upRow } = OD.ui;

  const TABS = [
    ['planet', 'PLANETA'],
    ['rings', 'ANÉIS'],
    ['market', 'MERCADO'],
  ];

  const PlanetPanel = {
    html(m, panel) {
      const p = m.planet;
      const tabs = TABS.map(([id, name]) => `<button class="tab${panel.view === id ? ' on' : ''}" data-action="tab" data-id="${id}">${name}</button>`).join('');
      let body = '';
      if (panel.view === 'rings') body = this.ringsHtml(m);
      else if (panel.view === 'market') body = this.marketHtml(m);
      else body = this.planetHtml(m);
      const sub = `<span id="pp-sub">Vida ${num(p.hp)} / ${num(p.maxHp)} · Blindagem ${pct(p.armor)}</span>`;
      return panel.head('Núcleo Planetário', sub, 'planet') + `<div class="tabs">${tabs}</div>` + body;
    },

    planetHtml(m) {
      const E = OD.Economy;
      let rows = '';
      for (const u of OD.CONFIG.planetUpgrades) {
        const lv = m.planetLevels[u.id] || 0;
        const cost = E.planetUpgradeCost(m, u.id);
        rows += upRow({ name: u.name, level: lv, text: esc(u.text), cost, action: 'planet', id: u.id, max: cost == null });
      }
      const AU = OD.CONFIG.abilityUpgrade;
      for (const id of Object.keys(m.abilities)) {
        const a = OD.CONFIG.abilities[id];
        const lv = m.abilityLevels[id] || 0;
        const cost = E.abilityUpgradeCost(m, id);
        const text = `+${Math.round(AU.power * 100)}% força e ${Math.round(AU.cooldown * 100)}% recarga · ${esc(a.text)}`;
        rows += upRow({ name: a.name, level: lv, text, cost, action: 'ability', id, max: cost == null });
      }
      return `<div class="up-list">${rows}</div>`;
    },

    ringsHtml(m) {
      const E = OD.Economy;
      const R = OD.CONFIG.ringUpgrade;
      const bonusText = OD.Bonuses.describe(R.bonus);
      let rows = '';
      OD.CONFIG.rings.forEach((ring, i) => {
        if (!E.ringAvailable(m, i)) return;
        const lv = m.ringLevels[i];
        const cost = E.ringUpgradeCost(m, i);
        let extra = lv ? `<span class="dim">Total: ${esc(OD.Bonuses.describe(R.bonus, lv))}</span>` : '';
        if (OD.CONFIG.auras && OD.meta.hasTech('auras')) extra += this.auraButtons(m, i);
        rows += upRow({ name: ring.name, level: lv, text: `Cada nível: ${esc(bonusText)}`, cost, action: 'ring', id: i, extra });
      });
      return `<div class="up-list">${rows}</div>`;
    },

    auraButtons(m, ring) {
      const A = OD.CONFIG.auras;
      const cur = m.auras[ring];
      const cost = OD.Economy.auraCost(m);
      const btns = Object.keys(A.list)
        .map((id) => {
          const au = A.list[id];
          if (cur === id) return `<button class="aura on" style="--ac:${au.color}" disabled data-lock="1">${esc(au.name)}</button>`;
          return `<button class="aura" style="--ac:${au.color}" data-action="aura" data-id="${ring}:${id}" data-cost="${cost}" title="${esc(au.text)}">${esc(au.name)}</button>`;
        })
        .join('');
      return `<div class="auras"><span class="dim">Aura ${coin(cost)}:</span>${btns}</div>`;
    },

    marketHtml(m) {
      const cost = OD.Economy.marketCost(m);
      return (
        '<div class="up-list">' +
        upRow({ name: 'Carta extra', text: `Escolha 1 entre ${m.cardChoices} cartas agora. O preço sobe a cada compra.`, cost, action: 'market', id: 'card' }) +
        `<p class="panel-desc">Compras nesta partida: ${m.marketBuys} · cartas escolhidas: ${m.cards.length}</p></div>`
      );
    },

    update(m) {
      const el = document.getElementById('pp-sub');
      if (el) el.textContent = `Vida ${num(m.planet.hp)} / ${num(m.planet.maxHp)} · Blindagem ${pct(m.planet.armor)}`;
    },

    // retorna true quando o painel precisa ser redesenhado
    onAction(m, panel, action, el) {
      const E = OD.Economy;
      const id = el.dataset.id;
      switch (action) {
        case 'tab':
          panel.view = id;
          return true;
        case 'planet':
          return E.upgradePlanet(m, id);
        case 'ability':
          return E.upgradeAbility(m, id);
        case 'ring':
          return E.upgradeRing(m, Number(id));
        case 'aura': {
          const [ring, aura] = id.split(':');
          return E.setAura(m, Number(ring), aura);
        }
        case 'market':
          return E.buyCard(m);
      }
      return false;
    },
  };

  OD.PlanetPanel = PlanetPanel;
})();
