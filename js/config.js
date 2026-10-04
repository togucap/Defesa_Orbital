// ============================================================
// Defesa Orbital — configuração central de balanceamento
// Edite os valores aqui sem mexer na lógica do jogo.
//
// Atributos que variam por nível (ou por onda) aceitam:
//   número fixo              → 300
//   { base, perLevel }       → base + perLevel × (nível − 1)
//   com limites opcionais    → { base: 2.5, perLevel: -0.1, min: 1 }
//
// Bônus percentuais (anéis, vizinhos, cartas, laboratório) usam as chaves:
//   damage, range, rate (cadência/recarga), area, capacity (escudo),
//   heal, slow, hp (vida da defesa)
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
      bossSlowmo: 0.9,     // s de câmera lenta ao destruir um chefe
    },

    planet: {
      radius: 56,
      maxHp: 1000,
      maxArmor: 0.5,       // redução de dano máxima somando todas as fontes
    },

    // Anéis orbitais, de dentro para fora.
    // unlockCost × unlockGrowth^(desbloqueios já feitos no anel)
    // spin = giro do anel (rad/s); angleOffset = ângulo do 1º slot (graus)
    // bonus = vantagem para qualquer defesa construída no anel
    rings: [
      { name: 'Anel interno', radius: 112, slots: 4, startUnlocked: 2, unlockCost: 50, unlockGrowth: 1.6, spin: 0.05, angleOffset: 45,
        bonus: { damage: 0.2, heal: 0.2 }, bonusText: '+20% dano e reparo' },
      { name: 'Anel do meio', radius: 182, slots: 6, startUnlocked: 1, unlockCost: 110, unlockGrowth: 1.45, spin: -0.035, angleOffset: 0,
        bonus: { rate: 0.1, capacity: 0.15 }, bonusText: '+10% cadência e +15% carga de escudo' },
      { name: 'Anel externo', radius: 252, slots: 8, startUnlocked: 0, unlockCost: 220, unlockGrowth: 1.35, spin: 0.025, angleOffset: 22.5,
        bonus: { range: 0.15, area: 0.15 }, bonusText: '+15% alcance e área' },
    ],
    slot: {
      hitRadius: 44,       // área de toque de cada slot (unidades do mundo)
    },

    // Sinergias entre vizinhos no mesmo anel. "to: '*'" vale para qualquer tipo.
    // selfRepair = fração da vida da defesa recuperada por segundo
    synergies: [
      { from: 'emp', to: 'laser', bonus: { damage: 0.25 }, text: 'EMP vizinho: +25% dano' },
      { from: 'cannon', to: 'cannon', bonus: { rate: 0.1 }, text: 'Bateria de canhões: +10% cadência' },
      { from: 'shield', to: '*', bonus: { hp: 0.3 }, text: 'Escudo vizinho: +30% vida' },
      { from: 'repair', to: '*', bonus: { selfRepair: 0.03 }, text: 'Reparador vizinho: conserta esta defesa' },
    ],

    // regras gerais das defesas
    defenseRules: {
      disableTime: 6,      // s desativada quando a vida zera (depois volta sozinha)
      reviveHp: 0.5,       // fração da vida ao voltar
      branchLevel: 5,      // nível em que a defesa escolhe uma especialização
    },

    economy: {
      startCoins: 200,
      sellRefund: 0.7,     // fração do total investido devolvida ao vender
    },

    // ----------------------------------------------------------
    // Defesas. A chave é o tipo; "class" (opcional) reaproveita a
    // classe de outro tipo. "display" lista os atributos mostrados no painel.
    // damageType: kinetic | energy | explosive (inimigos blindados resistem)
    // branches: especializações; "mult" multiplica atributos do tipo.
    // ----------------------------------------------------------
    defenses: {
      cannon: {
        name: 'Torreta de Canhão',
        short: 'Canhão',
        description: 'Dano médio, cadência alta, alcance médio.',
        damageType: 'kinetic',
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
        branches: {
          gatling: {
            name: 'Metralhadora',
            description: 'Cadência muito alta, menos dano por tiro.',
            mult: { fireRate: 2.2, damage: 0.55 },
            spread: 0.08,                           // dispersão dos tiros (rad)
          },
          pierce: {
            name: 'Perfurante',
            description: 'Tiros atravessam até 3 inimigos e causam mais dano.',
            mult: { damage: 1.5, fireRate: 0.75, bulletSpeed: 1.3 },
            pierce: 3,
          },
        },
      },
      laser: {
        name: 'Torreta Laser',
        short: 'Laser',
        description: 'Feixe contínuo que esquenta no mesmo alvo. Ótimo contra alvos únicos.',
        damageType: 'energy',
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
        branches: {
          chain: {
            name: 'Corrente',
            description: 'O feixe salta para mais 2 inimigos próximos (60% do dano).',
            mult: { dps: 0.9 },
            chain: 2,
            chainRange: 140,
            chainFalloff: 0.6,
          },
          heavy: {
            name: 'Raio Pesado',
            description: '+60% de dano, esquenta mais rápido e causa ×2,5 em chefes.',
            mult: { dps: 1.6, heatTime: 0.6 },
            bossMult: 2.5,
          },
        },
      },
      missile: {
        name: 'Lançador de Mísseis',
        short: 'Mísseis',
        description: 'Míssil teleguiado com dano em área. Recarga lenta.',
        damageType: 'explosive',
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
        branches: {
          swarm: {
            name: 'Enxame',
            description: 'Dispara 3 mísseis menores de uma vez.',
            mult: { damage: 0.5, blastRadius: 0.65 },
            count: 3,
          },
          warhead: {
            name: 'Ogiva',
            description: 'Dano e área enormes, recarga mais lenta.',
            mult: { damage: 2, blastRadius: 1.7, reload: 1.35, missileSpeed: 0.85 },
          },
        },
      },
      shield: {
        name: 'Escudo de Energia',
        short: 'Escudo',
        description: 'Arco que bloqueia inimigos e tiros na região do slot. Regenera; se quebrar, volta após um tempo.',
        damageType: 'energy',
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
        branches: {
          wall: {
            name: 'Muralha',
            description: 'Carga muito maior e arco mais largo.',
            mult: { capacity: 1.8, arcWidth: 1.4 },
          },
          regen: {
            name: 'Regenerativo',
            description: 'Regenera muito rápido e volta logo depois de quebrar.',
            mult: { regen: 2.5, breakTime: 0.5, regenDelay: 0.2 },
          },
        },
      },
      emp: {
        name: 'Torre de Pulso (EMP)',
        short: 'EMP',
        description: 'Reduz a velocidade dos inimigos no raio e revela inimigos furtivos.',
        damageType: 'energy',
        cost: 70,
        upgradeCost: 55,
        upgradeGrowth: 1.5,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          slow: { base: 0.3, perLevel: 0.04, max: 0.7 },     // redução de velocidade (0–1)
          range: { base: 150, perLevel: 9 },
          pulseInterval: 1.2,                                // s entre pulsos
        },
        display: ['slow', 'range'],
        branches: {
          freeze: {
            name: 'Congelamento',
            description: 'Cada pulso congela os inimigos no raio por um instante.',
            mult: { pulseInterval: 1.6 },
            freeze: 0.7,                                     // s parado
          },
          shock: {
            name: 'Choque',
            description: 'Cada pulso causa dano a todos os inimigos no raio.',
            mult: { pulseInterval: 0.8 },
            stats: { shockDamage: { base: 6, perLevel: 5 } },
            display: ['shockDamage'],
          },
        },
      },
      repair: {
        name: 'Reparador do Planeta',
        short: 'Reparador',
        description: 'Recupera a vida do planeta aos poucos.',
        damageType: 'energy',
        cost: 100,
        upgradeCost: 80,
        upgradeGrowth: 1.6,
        maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          heal: { base: 4, perLevel: 2 },                  // vida por segundo
        },
        display: ['heal'],
        branches: {
          nano: {
            name: 'Nanorreparo',
            description: 'Também conserta todas as defesas e as reativa 2× mais rápido.',
            mult: { heal: 0.8 },
            defenseHeal: 0.03,                             // fração da vida das defesas por segundo
            reviveSpeed: 2,
          },
          fortify: {
            name: 'Fortificar',
            description: 'O planeta recebe 12% menos dano (acumula até o limite).',
            mult: { heal: 1.2 },
            planetArmor: 0.12,
          },
        },
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
      shockDamage: { label: 'Choque' },
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
        volleyInterval: 4,            // s entre rajadas
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
    // Modificadores: características extras sorteadas para inimigos
    // comuns (nunca no chefe). chance usa "nível" = ondas desde a estreia.
    // resist = multiplicador de dano por tipo (0,35 = recebe só 35%).
    // ----------------------------------------------------------
    modifiers: {
      armored: {
        name: 'Blindado', color: '#aab4c8', unlockWave: 6,
        chance: { base: 0.08, perLevel: 0.004, max: 0.2 },
        hpMult: 1.2, rewardMult: 1.5,
        resist: { kinetic: 0.35, explosive: 0.8 },
      },
      shielded: {
        name: 'Com escudo', color: '#4de1ff', unlockWave: 9,
        chance: { base: 0.08, perLevel: 0.004, max: 0.18 },
        rewardMult: 1.5,
        shield: 0.8,                              // escudo = 80% da vida, quebra primeiro
        shieldVs: { explosive: 2, energy: 0.6 },  // eficácia contra o escudo
      },
      regen: {
        name: 'Regenerativo', color: '#4ade80', unlockWave: 12,
        chance: { base: 0.07, perLevel: 0.003, max: 0.15 },
        rewardMult: 1.4,
        regen: 0.05,                              // fração da vida por segundo
        regenDelay: 1.5,                          // s sem levar dano antes de regenerar
      },
      stealth: {
        name: 'Furtivo', color: '#c4b5fd', unlockWave: 15,
        chance: { base: 0.06, perLevel: 0.003, max: 0.14 },
        rewardMult: 1.6,
        revealRadius: 150,                        // visível perto do planeta (e no raio do EMP)
      },
      elite: {
        name: 'Elite', color: '#ffd34d', unlockWave: 5,
        chance: { base: 0.04, perLevel: 0.002, max: 0.1 },
        stacks: true,                             // pode vir junto de outro modificador
        hpMult: 3, sizeMult: 1.35, damageMult: 1.5, rewardMult: 4,
      },
    },
    modifierMaxChance: 0.4,                       // chance máxima somada (exceto elite)

    // ----------------------------------------------------------
    // Ondas. "nível" aqui é o número da onda.
    // ----------------------------------------------------------
    waves: {
      firstDelay: 3,                                     // s antes da 1ª onda
      breakTime: 6,                                      // s de intervalo entre ondas
      bossEvery: 10,                                     // chefe a cada N ondas
      count: { base: 6, perWave: 1.6, max: 120 },          // inimigos por onda
      hpGrowth: 1.12,                                    // vida × 1,12 por onda (exponencial)
      speedPerWave: 0.012,                               // +1,2% de velocidade por onda
      speedMax: 1.5,                                     // teto do multiplicador de velocidade
      damagePerWave: 0.03,                               // +3% de dano de colisão/tiro por onda
      rewardPerWave: 0.03,                               // +3% de moedas por inimigo a cada onda
      spawnInterval: { base: 1.0, perWave: -0.025, min: 0.22 },  // s entre inimigos
      clearBonus: { base: 25, perWave: 5 },              // moedas ao terminar a onda
      bossEscort: 0.5,                                   // fração de inimigos normais junto ao chefe
      callBonus: { base: 2, perWave: 0.6 },              // moedas por segundo poupado ao chamar a onda
      sectorEvery: 10,                                   // muda o setor (visual) a cada N ondas
      enrageAfter: 75,                                   // s após o último inimigo surgir: os restantes avançam
    },

    // ----------------------------------------------------------
    // Habilidade do planeta: onda de choque que empurra e fere inimigos
    // ----------------------------------------------------------
    ability: {
      name: 'Onda de Choque',
      cooldown: 60,          // s para recarregar
      startCharge: 0.5,      // carga inicial (0–1)
      radius: 560,           // alcance da onda
      speed: 750,            // velocidade de expansão
      damage: 60,            // × crescimento de vida da onda atual
      knockback: 130,        // empurrão (chefes recebem 20%)
      slow: 0.5,
      slowTime: 2,
    },

    // ----------------------------------------------------------
    // Cartas: a cada "every" ondas o jogador escolhe 1 entre "choices".
    // bonus  → vale para um tipo de defesa (target) ou todas ('all')
    // global → efeitos da partida (reward, planetArmor, abilityCd, interest…)
    // instant → efeito imediato (coins, planetHp, unlockSlot)
    // unique → só pode ser escolhida uma vez
    // ----------------------------------------------------------
    cards: {
      every: 5,
      choices: 3,
      interestMax: 150,      // máximo de moedas por onda da carta Juros
      rarities: {
        common: { name: 'Comum', weight: 60, color: '#9fb4d9' },
        rare: { name: 'Rara', weight: 30, color: '#5fd4ff' },
        epic: { name: 'Épica', weight: 10, color: '#d68bff' },
      },
      list: [
        { id: 'cannonRate', name: 'Gatilho Rápido', rarity: 'common', text: '+20% cadência dos canhões', bonus: { target: 'cannon', rate: 0.2 } },
        { id: 'laserDmg', name: 'Lentes Focadas', rarity: 'common', text: '+25% dano dos lasers', bonus: { target: 'laser', damage: 0.25 } },
        { id: 'missileDmg', name: 'Carga Explosiva', rarity: 'common', text: '+25% dano dos mísseis', bonus: { target: 'missile', damage: 0.25 } },
        { id: 'empPower', name: 'Bobinas de Pulso', rarity: 'common', text: 'EMP: +20% lentidão e alcance', bonus: { target: 'emp', slow: 0.2, range: 0.2 } },
        { id: 'shieldCap', name: 'Placas de Grafeno', rarity: 'common', text: 'Escudos: +30% carga e regeneração', bonus: { target: 'shield', capacity: 0.3 } },
        { id: 'repairPower', name: 'Nanorrobôs', rarity: 'common', text: 'Reparadores: +40% reparo', bonus: { target: 'repair', heal: 0.4 } },
        { id: 'treasure', name: 'Tesouro Orbital', rarity: 'common', text: 'Ganhe moedas agora (aumenta com a onda)', instant: { coins: { base: 150, perLevel: 30 } } },
        { id: 'allRange', name: 'Sensores Avançados', rarity: 'rare', text: '+12% alcance de todas as defesas', bonus: { target: 'all', range: 0.12 } },
        { id: 'allDamage', name: 'Sobrecarga', rarity: 'rare', text: '+15% dano de todas as defesas', bonus: { target: 'all', damage: 0.15 } },
        { id: 'mining', name: 'Mineração Profunda', rarity: 'rare', text: '+20% moedas por inimigo', global: { reward: 0.2 } },
        { id: 'crust', name: 'Crosta Reforçada', rarity: 'rare', text: '+25% vida máxima do planeta e cura total', instant: { planetHp: 0.25 } },
        { id: 'expansion', name: 'Expansão Orbital', rarity: 'rare', text: 'Libera 1 slot bloqueado de graça', instant: { unlockSlot: 1 } },
        { id: 'capacitor', name: 'Supercapacitor', rarity: 'rare', text: 'Onda de Choque recarrega 30% mais rápido', global: { abilityCd: -0.3 } },
        { id: 'plating', name: 'Blindagem Planetária', rarity: 'rare', text: 'O planeta recebe 12% menos dano', global: { planetArmor: 0.12 } },
        { id: 'interest', name: 'Juros Orbitais', rarity: 'epic', unique: true, text: 'Ao fim de cada onda, ganhe 6% das moedas guardadas', global: { interest: 0.06 } },
        { id: 'reflect', name: 'Escudo Refletor', rarity: 'epic', unique: true, text: 'Escudos devolvem os tiros inimigos com o dobro do dano', global: { shieldReflect: 1 } },
        { id: 'cluster', name: 'Ogivas de Fragmentação', rarity: 'epic', unique: true, text: 'Mísseis soltam 3 fragmentos ao explodir', global: { missileSplit: 1 } },
        { id: 'lastStand', name: 'Último Recurso', rarity: 'epic', unique: true, text: 'Uma vez, ao zerar a vida, o planeta volta com 40%', global: { secondLife: 0.4 } },
      ],
    },

    // ----------------------------------------------------------
    // Laboratório: melhorias permanentes compradas com núcleos,
    // ganhos ao fim de cada partida. Custo = cost × costGrowth^(nível).
    // ----------------------------------------------------------
    meta: {
      coresPerWave: 1,       // núcleos por onda alcançada
      coresPerBoss: 5,       // núcleos extras por chefe destruído
      upgrades: [
        { id: 'planetHp', name: 'Crosta Densa', text: '+8% vida do planeta', max: 10, cost: 3, costGrowth: 1.3, effect: { planetHp: 0.08 } },
        { id: 'startCoins', name: 'Reserva Inicial', text: '+40 moedas iniciais', max: 10, cost: 3, costGrowth: 1.3, effect: { startCoins: 40 } },
        { id: 'damage', name: 'Armamento', text: '+4% dano de todas as defesas', max: 10, cost: 4, costGrowth: 1.32, effect: { damage: 0.04 } },
        { id: 'rate', name: 'Servomotores', text: '+3% cadência de todas as defesas', max: 10, cost: 4, costGrowth: 1.32, effect: { rate: 0.03 } },
        { id: 'range', name: 'Radares', text: '+3% alcance de todas as defesas', max: 5, cost: 5, costGrowth: 1.4, effect: { range: 0.03 } },
        { id: 'reward', name: 'Extração', text: '+5% moedas por inimigo', max: 10, cost: 4, costGrowth: 1.32, effect: { reward: 0.05 } },
        { id: 'unlockCost', name: 'Engenharia Orbital', text: '−7% custo para desbloquear slots', max: 5, cost: 5, costGrowth: 1.4, effect: { unlockCost: -0.07 } },
        { id: 'startSlots', name: 'Slot Extra', text: 'Começa com +1 slot liberado', max: 2, cost: 15, costGrowth: 2, effect: { startSlots: 1 } },
        { id: 'abilityCd', name: 'Supercondutor', text: '−7% recarga da Onda de Choque', max: 5, cost: 5, costGrowth: 1.4, effect: { abilityCd: -0.07 } },
        { id: 'rerolls', name: 'Oráculo', text: '+1 troca de cartas por partida', max: 3, cost: 8, costGrowth: 1.8, effect: { rerolls: 1 } },
        { id: 'cardChoices', name: 'Visão Ampla', text: '+1 opção ao escolher cartas', max: 1, cost: 30, costGrowth: 1, effect: { cardChoices: 1 } },
      ],
    },

    fx: {
      maxParticles: 450,
      maxTexts: 50,
      damageNumbers: true,
      screenShake: true,
      vibration: true,       // vibra o celular ao levar dano (desliga junto com o som)
    },
  };
})();
