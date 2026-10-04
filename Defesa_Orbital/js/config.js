// ============================================================
// Defesa Orbital — configuração central de balanceamento
// Edite os valores aqui sem mexer na lógica do jogo.
//
// Atributos que variam por nível (ou por onda) aceitam:
//   número fixo              → 300
//   { base, perLevel }       → base + perLevel × (nível − 1)
//   com limites opcionais    → { base: 2.5, perLevel: -0.1, min: 1 }
// ============================================================
(() => {
  const OD = (window.OD = window.OD || {});

  OD.CONFIG = {
    world: {
      width: 720,          // largura lógica da área de jogo (unidades do mundo)
      minAspect: 16 / 9,   // altura/largura mínima (retrato 9:16)
      maxAspect: 20 / 9,   // altura/largura máxima (celulares altos)
      planetY: 0.42,       // posição vertical do planeta (fração da altura)
    },

    render: {
      maxDpr: 2,           // limite do devicePixelRatio (desempenho em celular)
    },

    sim: {
      maxFrameDt: 0.1,     // ignora travadas maiores que isso (s)
      maxStep: 0.02,       // passo máximo da simulação; 2x/3x usam sub-passos
      speeds: [1, 2, 3],   // opções do botão de velocidade
    },

    planet: {
      radius: 56,
      maxHp: 1000,
    },

    // Anéis orbitais, de dentro para fora.
    // unlockCost × unlockGrowth^(desbloqueios já feitos no anel)
    // spin = giro do anel (rad/s); angleOffset = ângulo do 1º slot (graus)
    rings: [
      { name: 'Anel interno', radius: 112, slots: 4, startUnlocked: 2, unlockCost: 50, unlockGrowth: 1.6, spin: 0.05, angleOffset: 45 },
      { name: 'Anel do meio', radius: 182, slots: 6, startUnlocked: 1, unlockCost: 110, unlockGrowth: 1.45, spin: -0.035, angleOffset: 0 },
      { name: 'Anel externo', radius: 252, slots: 8, startUnlocked: 0, unlockCost: 220, unlockGrowth: 1.35, spin: 0.025, angleOffset: 22.5 },
    ],
    slot: {
      hitRadius: 44,       // área de toque de cada slot (unidades do mundo)
    },

    // regras gerais das defesas
    defenseRules: {
      disableTime: 6,      // s desativada quando a vida zera (depois volta sozinha)
      reviveHp: 0.5,       // fração da vida ao voltar
    },

    economy: {
      startCoins: 200,
      sellRefund: 0.7,     // fração do total investido devolvida ao vender
    },

    // ----------------------------------------------------------
    // Defesas. A chave é o tipo; "class" (opcional) reaproveita a
    // classe de outro tipo. "display" lista os atributos mostrados no painel.
    // ----------------------------------------------------------
    defenses: {
      cannon: {
        name: 'Torreta de Canhão',
        short: 'Canhão',
        description: 'Dano médio, cadência alta, alcance médio.',
        cost: 60,            // custo para construir
        upgradeCost: 45,     // custo do 1º upgrade
        upgradeGrowth: 1.5,  // multiplicador do custo a cada nível
        maxLevel: 10,
        hp: { base: 120, perLevel: 25 },   // vida da defesa (alvo de inimigos)
        stats: {
          damage: { base: 8, perLevel: 4 },
          fireRate: { base: 3, perLevel: 0.3 },     // tiros por segundo
          range: { base: 230, perLevel: 8 },
          bulletSpeed: 720,
        },
        display: ['damage', 'fireRate', 'range'],
      },
      laser: {
        name: 'Torreta Laser',
        short: 'Laser',
        description: 'Feixe contínuo que esquenta no mesmo alvo. Ótimo contra alvos únicos.',
        cost: 90,
        upgradeCost: 70,
        upgradeGrowth: 1.55,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          dps: { base: 20, perLevel: 9 },
          range: { base: 210, perLevel: 8 },
          heatMax: { base: 2.0, perLevel: 0.15 },   // multiplicador máximo no mesmo alvo
          heatTime: 2.5,                            // s para chegar ao máximo
        },
        display: ['dps', 'heatMax', 'range'],
      },
      missile: {
        name: 'Lançador de Mísseis',
        short: 'Mísseis',
        description: 'Míssil teleguiado com dano em área. Recarga lenta.',
        cost: 130,
        upgradeCost: 95,
        upgradeGrowth: 1.55,
        maxLevel: 10,
        hp: { base: 110, perLevel: 22 },
        stats: {
          damage: { base: 38, perLevel: 15 },
          reload: { base: 2.6, perLevel: -0.12, min: 1 },   // s entre mísseis
          range: { base: 330, perLevel: 10 },
          blastRadius: { base: 58, perLevel: 4 },
          missileSpeed: 340,
          turnRate: 5.5,                                     // rad/s
        },
        display: ['damage', 'reload', 'blastRadius', 'range'],
      },
      shield: {
        name: 'Escudo de Energia',
        short: 'Escudo',
        description: 'Arco que bloqueia inimigos e tiros na região do slot. Regenera; se quebrar, volta após um tempo.',
        cost: 80,
        upgradeCost: 60,
        upgradeGrowth: 1.5,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          capacity: { base: 160, perLevel: 70 },             // dano que absorve
          regen: { base: 10, perLevel: 4 },                  // carga por segundo
          arcWidth: { base: 55, perLevel: 4, max: 95 },      // graus
          breakTime: { base: 8, perLevel: -0.4, min: 4 },    // s até voltar
          regenDelay: 1.5,                                   // s sem dano antes de regenerar
          restore: 0.5,                                      // fração da carga ao voltar
        },
        display: ['capacity', 'regen', 'arcWidth', 'breakTime'],
      },
      emp: {
        name: 'Torre de Pulso (EMP)',
        short: 'EMP',
        description: 'Reduz a velocidade dos inimigos dentro do raio.',
        cost: 70,
        upgradeCost: 55,
        upgradeGrowth: 1.5,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          slow: { base: 0.3, perLevel: 0.04, max: 0.7 },     // redução de velocidade (0–1)
          range: { base: 150, perLevel: 9 },
          pulseInterval: 1.2,                                // s entre pulsos visuais
        },
        display: ['slow', 'range'],
      },
      repair: {
        name: 'Reparador do Planeta',
        short: 'Reparador',
        description: 'Recupera a vida do planeta aos poucos.',
        cost: 100,
        upgradeCost: 80,
        upgradeGrowth: 1.6,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          heal: { base: 4, perLevel: 2 },                  // vida por segundo
        },
        display: ['heal'],
      },
    },

    // Como cada atributo aparece no painel
    statLabels: {
      damage: { label: 'Dano' },
      dps: { label: 'Dano/s' },
      fireRate: { label: 'Cadência', unit: '/s', decimals: 1 },
      range: { label: 'Alcance' },
      heatMax: { label: 'Aquecimento', prefix: '×', decimals: 2 },
      reload: { label: 'Recarga', unit: 's', decimals: 1 },
      blastRadius: { label: 'Área' },
      capacity: { label: 'Carga' },
      regen: { label: 'Regeneração', unit: '/s' },
      arcWidth: { label: 'Cobertura', unit: '°' },
      breakTime: { label: 'Retorno', unit: 's', decimals: 1 },
      slow: { label: 'Lentidão', percent: true },
      heal: { label: 'Reparo', unit: '/s', decimals: 1 },
      hp: { label: 'Vida' },
    },

    // ----------------------------------------------------------
    // Inimigos. Valores da onda 1; a escala por onda fica em "waves".
    // weight = chance relativa de aparecer; unlockWave = 1ª onda possível.
    // ----------------------------------------------------------
    enemies: {
      asteroidSmall: {
        name: 'Asteroide pequeno',
        hp: 14, speed: 90, radius: 13, damage: 25, reward: 5,
        weight: 10, unlockWave: 1,
      },
      asteroidBig: {
        name: 'Asteroide grande',
        hp: 80, speed: 40, radius: 30, damage: 70, reward: 14,
        weight: 4, unlockWave: 2,
        splitInto: 'asteroidSmall',   // em que se divide ao ser destruído
        splitCount: 3,
      },
      fighter: {
        name: 'Nave caça',
        hp: 32, speed: 115, radius: 15, damage: 40, reward: 10,
        weight: 5, unlockWave: 4,
        weaveAmount: 0.9,             // intensidade das curvas (rad)
        weaveSpeed: 2.4,              // frequência das curvas
      },
      kamikaze: {
        name: 'Kamikaze',
        hp: 9, speed: 200, radius: 11, damage: 55, reward: 8,
        weight: 4, unlockWave: 6,
        blastRadius: 50,              // raio da explosão
        targetDefenseChance: 0.6,     // chance de mirar uma defesa em vez do planeta
      },
      bomber: {
        name: 'Nave bombardeira',
        hp: 75, speed: 52, radius: 21, damage: 30, reward: 20,
        weight: 3, unlockWave: 8,
        standoff: 340,                // distância do planeta em que para e atira
        fireInterval: 2.4,
        shotDamage: 20,
        shotSpeed: 210,
        targetDefenseChance: 0.5,
      },
      boss: {
        name: 'Nau-mãe',
        boss: true,
        hp: 1000, speed: 32, radius: 54, damage: 400, reward: 300,
        weight: 0,                    // não aparece em ondas normais
        standoff: 300,
        orbitSpeed: 0.12,             // rad/s ao circular o planeta
        volleyInterval: 4,          // s entre rajadas
        volleyCount: 6,
        volleySpread: 70,             // graus
        shotDamage: 15,
        shotSpeed: 190,
        summonInterval: 8,            // s entre invocações
        summonType: 'kamikaze',
        summonCount: 3,
        slowResist: 0.6,              // resistência ao EMP (0 = normal, 1 = imune)
      },
    },

    // ----------------------------------------------------------
    // Ondas. "nível" aqui é o número da onda.
    // ----------------------------------------------------------
    waves: {
      firstDelay: 3,                                     // s antes da 1ª onda
      breakTime: 6,                                      // s de intervalo entre ondas
      bossEvery: 10,                                     // chefe a cada N ondas
      count: { base: 6, perWave: 2, max: 140 },          // inimigos por onda
      hpGrowth: 1.1,                                     // vida × 1,10 por onda (exponencial)
      speedPerWave: 0.012,                               // +1,2% de velocidade por onda
      speedMax: 1.5,                                     // teto do multiplicador de velocidade
      damagePerWave: 0.03,                               // +3% de dano de colisão/tiro por onda
      rewardPerWave: 0.06,                               // +6% de moedas por inimigo a cada onda
      spawnInterval: { base: 1.0, perWave: -0.025, min: 0.22 },  // s entre inimigos
      clearBonus: { base: 25, perWave: 8 },              // moedas ao terminar a onda
      bossEscort: 0.5,                                   // fração de inimigos normais junto ao chefe
    },

    fx: {
      maxParticles: 450,
      maxTexts: 50,
      damageNumbers: true,
      screenShake: true,
    },
  };
})();
