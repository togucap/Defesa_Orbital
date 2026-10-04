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
      // tech = tecnologia do Laboratório; minWave = onda mínima para desbloquear slots
      { name: 'Cinturão', radius: 322, slots: 10, startUnlocked: 0, unlockCost: 420, unlockGrowth: 1.28, spin: 0.07, angleOffset: 9,
        tech: 'ring4', minWave: 20, bonus: { damage: 0.1, range: 0.1 }, bonusText: '+10% dano e alcance' },
      { name: 'Órbita Lunar', radius: 287, slots: 1, startUnlocked: 0, unlockCost: 600, unlockGrowth: 1, spin: 0.16, angleOffset: 0,
        tech: 'moon', moon: true, bonus: { damage: 0.5, range: 0.2, rate: 0.25, capacity: 0.5, heal: 0.5, income: 0.5, amp: 0.5 }, bonusText: '+50% em tudo' },
    ],

    // Slots especiais (tecnologia "specialSlots"): sorteados a cada partida
    specialSlots: {
      count: 3,
      types: {
        overcharged: { name: 'Sobrecarregado', color: '#ffd34d', text: '+40% dano e carga, +20% cadência, +15% alcance', bonus: { damage: 0.4, rate: 0.2, range: 0.15, capacity: 0.4, heal: 0.4, income: 0.4, amp: 0.4 } },
        relay: { name: 'Relé', color: '#7ee8ff', text: 'Também é vizinho dos slots mais próximos nos anéis ao lado' },
        unstable: { name: 'Instável', color: '#ff7a3d', text: '+80% de dano, mas desliga 3 s a cada 20 s', bonus: { damage: 0.8, capacity: 0.6, heal: 0.6, income: 0.6, amp: 0.6 }, outage: { every: 20, duration: 3 } },
      },
    },

    // Auras de anel (tecnologia "auras"): um elemento para todas as defesas de ataque do anel
    auras: {
      cost: { base: 500, perWave: 30 },
      list: {
        cryo: { name: 'Criogênica', color: '#9fefff', text: 'Ataques deixam os inimigos 15% mais lentos', trait: 'cryo', value: 0.15 },
        fire: { name: 'Ígnea', color: '#ff7a3d', text: 'Ataques queimam 25% do dano', trait: 'burn', value: 0.25 },
        shock: { name: 'Elétrica', color: '#ffe066', text: '15% de chance de um arco saltar para outro inimigo', trait: 'arc', value: 0.15 },
      },
    },
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
    // Gastos de fim de jogo (todos com custo crescente)
    // ----------------------------------------------------------
    // Sobrecarga: níveis infinitos depois do nível máximo.
    // Custo = custo do último upgrade × growth^(sobrecargas feitas + 1)
    overclock: {
      growth: 1.28,
      bonus: { damage: 0.07, range: 0.02, capacity: 0.08, heal: 0.08, hp: 0.05, income: 0.08, amp: 0.04 },
    },

    // Melhoria de anel: vale para todas as defesas do anel (níveis infinitos)
    ringUpgrade: {
      cost: 400,
      growth: 1.55,
      bonus: { damage: 0.05, rate: 0.02, capacity: 0.05, heal: 0.05, income: 0.05 },
    },

    // Núcleo planetário (toque no planeta). max = nível máximo (sem max = infinito)
    planetUpgrades: [
      { id: 'hp', name: 'Crosta', text: '+10% vida máxima', cost: 150, growth: 1.35, effect: { hpPct: 0.1 } },
      { id: 'armor', name: 'Blindagem', text: '+3% redução de dano', cost: 300, growth: 1.5, max: 10, effect: { armor: 0.03 } },
      { id: 'regen', name: 'Regeneração', text: '+0,3% vida por segundo', cost: 250, growth: 1.45, max: 10, effect: { regen: 0.003 } },
    ],
    // melhoria das habilidades do planeta (cada uma tem seus níveis)
    abilityUpgrade: { cost: 200, growth: 1.4, max: 10, power: 0.25, cooldown: -0.06 },

    // Mercado orbital: compra uma escolha de carta extra
    market: { cardCost: { base: 300, perWave: 25 }, growth: 1.5 },

    // Módulos: encaixes nas defesas de ataque, liberados nos níveis indicados.
    // Custo do módulo = cost; cada melhoria = cost × growth^(nível do módulo)
    chips: {
      sockets: [3, 8],
      cost: 250,
      growth: 1.8,
      maxLevel: 5,
      list: {
        crit: { name: 'Crítico', short: 'CRT', color: '#ffd34d', text: 'Chance de causar dano ×2,5', trait: 'crit', value: { base: 0.08, perLevel: 0.04 }, percent: true },
        burn: { name: 'Incendiário', short: 'FOG', color: '#ff7a3d', text: 'Inimigos atingidos queimam (parte do dano em 3s)', trait: 'burn', value: { base: 0.3, perLevel: 0.1 }, percent: true },
        cryo: { name: 'Criogênico', short: 'CRI', color: '#9fefff', text: 'Inimigos atingidos ficam mais lentos', trait: 'cryo', value: { base: 0.15, perLevel: 0.05 }, percent: true },
        greed: { name: 'Ganância', short: 'GAN', color: '#ffe08a', text: 'Abates desta defesa dão mais moedas', trait: 'greed', value: { base: 0.15, perLevel: 0.1 }, percent: true },
        ricochet: { name: 'Ricochete', short: 'RIC', color: '#7ee8ff', text: 'Chance do dano saltar para outro inimigo (50%)', trait: 'ricochet', value: { base: 0.2, perLevel: 0.08 }, percent: true },
        shred: { name: 'Perfura-blindagem', short: 'PRF', color: '#c7d2fe', text: 'Ignora parte da blindagem e do escudo inimigo', trait: 'shred', value: { base: 0.3, perLevel: 0.12, max: 0.9 }, percent: true },
      },
    },

    // Mutações: no nível "level" a defesa escolhe 1 entre "choices".
    // for: attack | support | any. traits = efeitos de ataque; bonus = bônus %.
    // Catalisador (novas opções ou trocar) = rerollCost × rerollGrowth^(usos na partida)
    mutations: {
      level: 7,
      choices: 3,
      rerollCost: { base: 250, perWave: 20 },
      rerollGrowth: 1.4,
      list: {
        twin: { name: 'Gêmea', color: '#7ee8ff', for: 'attack', text: '+60% de dano (disparos duplos)', traits: { twin: 0.6 } },
        vampiric: { name: 'Vampírica', color: '#ff5c8a', for: 'attack', text: 'Cada abate cura 0,4% da vida do planeta', traits: { vampiric: 0.004 } },
        unstable: { name: 'Instável', color: '#ffb020', for: 'attack', text: '+90% de dano, mas 15% dos ataques falham', traits: { twin: 0.9, fail: 0.15 } },
        greedy: { name: 'Gananciosa', color: '#ffe08a', for: 'attack', text: 'Abates dão +40% de moedas', traits: { greed: 0.4 } },
        cryo: { name: 'Criogênica', color: '#9fefff', for: 'attack', text: 'Ataques deixam os inimigos 25% mais lentos', traits: { cryo: 0.25 } },
        incendiary: { name: 'Incendiária', color: '#ff7a3d', for: 'attack', text: 'Ataques queimam 40% do dano em 3 s', traits: { burn: 0.4 } },
        critical: { name: 'Crítica', color: '#ffd34d', for: 'attack', text: '15% de chance de dano ×3', traits: { crit: 0.15, critMult: 0.5 } },
        swift: { name: 'Veloz', color: '#5effc8', for: 'any', text: '+30% cadência', bonus: { rate: 0.3 } },
        farsight: { name: 'Longo Alcance', color: '#b47cff', for: 'any', text: '+25% alcance', bonus: { range: 0.25 } },
        armored: { name: 'Blindada', color: '#aab4c8', for: 'any', text: '+100% de vida da defesa', bonus: { hp: 1 } },
        potent: { name: 'Potente', color: '#4ade80', for: 'support', text: '+35% no efeito principal (carga, reparo, renda, amplificação)', bonus: { capacity: 0.35, heal: 0.35, income: 0.35, amp: 0.35, slow: 0.2 } },
      },
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
        role: 'attack',      // attack (aceita módulos) | support
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
        role: 'attack',
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
        role: 'attack',
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
        role: 'support',
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
        role: 'support',
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
        role: 'support',
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

      // ---------- Armas desbloqueadas no Laboratório (locked + unlock) ----------
      // unlock.cost = núcleos; unlock.requires = arma que precisa vir antes
      tesla: {
        name: 'Bobina Tesla',
        short: 'Tesla',
        role: 'attack',
        description: 'Arcos elétricos curtos que saltam entre vários inimigos.',
        damageType: 'energy',
        locked: true,
        unlock: { cost: 15 },
        cost: 110, upgradeCost: 80, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 110, perLevel: 22 },
        stats: {
          damage: { base: 14, perLevel: 6 },
          fireRate: { base: 1.6, perLevel: 0.12 },
          range: { base: 160, perLevel: 7 },
          chains: 3,            // saltos extras
          chainRange: 120,
          chainFalloff: 0.75,   // dano a cada salto
        },
        display: ['damage', 'fireRate', 'range', 'chains'],
        branches: {
          storm: { name: 'Tempestade', description: 'Os arcos saltam para mais 3 inimigos e alcançam mais longe.', mult: { range: 1.2, chains: 2 } },
          stun: { name: 'Atordoar', description: 'Cada arco paralisa os inimigos atingidos por 0,5 s.', mult: { damage: 1.15 }, stun: 0.5 },
        },
      },
      railgun: {
        name: 'Canhão de Trilho',
        short: 'Trilho',
        role: 'attack',
        description: 'Disparo instantâneo de longo alcance que atravessa a linha inteira. Mira no inimigo mais forte.',
        damageType: 'kinetic',
        targeting: 'strongest',
        locked: true,
        unlock: { cost: 25, requires: 'tesla' },
        cost: 160, upgradeCost: 120, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 120, perLevel: 24 },
        stats: {
          damage: { base: 90, perLevel: 38 },
          reload: { base: 3.2, perLevel: -0.12, min: 1.6 },
          range: { base: 420, perLevel: 12 },
          width: 14,            // largura do feixe
        },
        display: ['damage', 'reload', 'range'],
        branches: {
          overcharge: { name: 'Carga Máxima', description: 'Dano ×3 e feixe mais largo, recarga mais lenta.', mult: { damage: 3, reload: 1.7, width: 2 } },
          shrapnel: { name: 'Estilhaço', description: 'Cada inimigo atravessado explode em estilhaços (área).', shrapnel: 0.35, shrapnelRadius: 55 },
        },
      },
      drones: {
        name: 'Hangar de Drones',
        short: 'Drones',
        role: 'attack',
        description: 'Drones que voam pela tela caçando inimigos em qualquer lugar.',
        damageType: 'kinetic',
        locked: true,
        unlock: { cost: 35, requires: 'miner' },
        cost: 170, upgradeCost: 125, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 110, perLevel: 22 },
        stats: {
          drones: { base: 2, perLevel: 0.34 },   // quantidade (arredondada para baixo)
          droneDamage: { base: 7, perLevel: 3 },
          fireRate: { base: 2, perLevel: 0.1 },
          droneSpeed: 260,
        },
        display: ['drones', 'droneDamage', 'fireRate'],
        branches: {
          fighters: { name: 'Caças', description: '+2 drones, mais rápidos.', mult: { droneSpeed: 1.3 }, extraDrones: 2 },
          bombers: { name: 'Bombardeiros', description: 'Drones lançam bombas com dano em área.', mult: { droneDamage: 2.4, fireRate: 0.45 }, bombs: 45 },
        },
      },
      gravity: {
        name: 'Poço Gravitacional',
        short: 'Gravidade',
        role: 'attack',
        description: 'Cria um poço que puxa e agrupa os inimigos (combina com mísseis e minas).',
        damageType: 'energy',
        locked: true,
        unlock: { cost: 30, requires: 'amplifier' },
        cost: 140, upgradeCost: 100, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 120, perLevel: 24 },
        stats: {
          range: { base: 260, perLevel: 10 },
          wellRadius: { base: 90, perLevel: 4 },
          pull: { base: 70, perLevel: 6 },        // força do puxão
          pullDps: { base: 6, perLevel: 3 },
          reload: { base: 6, perLevel: -0.2, min: 3.5 },
          duration: 3,
        },
        display: ['wellRadius', 'pull', 'pullDps', 'reload'],
        branches: {
          blackhole: { name: 'Buraco Negro', description: 'Dano ×4 no poço e puxão mais forte.', mult: { pullDps: 4, pull: 1.4 } },
          repulsor: { name: 'Repulsor', description: 'Em vez de puxar, empurra os inimigos para longe do planeta.', mult: { pull: 1.6 }, repel: true },
        },
      },
      mines: {
        name: 'Lançador de Minas',
        short: 'Minas',
        role: 'attack',
        description: 'Espalha minas no caminho dos inimigos; explodem ao contato.',
        damageType: 'explosive',
        noTargeting: true,
        locked: true,
        unlock: { cost: 20 },
        cost: 120, upgradeCost: 90, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 110, perLevel: 22 },
        stats: {
          mineDamage: { base: 40, perLevel: 18 },
          maxMines: { base: 4, perLevel: 0.5 },
          reload: { base: 2.2, perLevel: -0.08, min: 1 },
          range: { base: 200, perLevel: 8 },
          blastRadius: { base: 50, perLevel: 3 },
        },
        display: ['mineDamage', 'maxMines', 'reload', 'blastRadius'],
        branches: {
          proximity: { name: 'Proximidade', description: 'Explosões maiores e mais minas.', mult: { blastRadius: 1.5, maxMines: 1.5 } },
          cryo: { name: 'Criogênicas', description: 'Minas congelam os inimigos por 1,5 s (menos dano).', mult: { mineDamage: 0.6 }, freeze: 1.5 },
        },
      },
      artillery: {
        name: 'Artilharia',
        short: 'Artilharia',
        role: 'attack',
        description: 'Alcance enorme e projétil lento. Mira nos inimigos mais distantes (ótima contra bombardeiras).',
        damageType: 'explosive',
        targeting: 'farthest',
        locked: true,
        unlock: { cost: 35, requires: 'mines' },
        cost: 170, upgradeCost: 125, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 120, perLevel: 24 },
        stats: {
          damage: { base: 55, perLevel: 22 },
          reload: { base: 3.4, perLevel: -0.12, min: 1.8 },
          range: { base: 560, perLevel: 10 },
          blastRadius: { base: 70, perLevel: 3 },
          shellSpeed: 260,
        },
        display: ['damage', 'reload', 'blastRadius', 'range'],
        branches: {
          barrage: { name: 'Barragem', description: 'Dispara 4 projéteis espalhados de uma vez.', mult: { damage: 0.45 }, count: 4 },
          breaker: { name: 'Perfura-escudo', description: 'Dano ×1,5 e ignora blindagem e escudos inimigos.', mult: { damage: 1.5 }, traits: { shred: 1 } },
        },
      },
      nanites: {
        name: 'Projetor de Nanitas',
        short: 'Nanitas',
        role: 'attack',
        description: 'Infecta inimigos: dano contínuo, recebem mais dano de tudo e a praga se espalha quando morrem.',
        damageType: 'energy',
        locked: true,
        unlock: { cost: 25, requires: 'tesla' },
        cost: 130, upgradeCost: 95, upgradeGrowth: 1.55, maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          corrodeDps: { base: 10, perLevel: 5 },
          vuln: { base: 0.2, perLevel: 0.02, max: 0.5 },   // dano extra recebido
          fireRate: { base: 0.9, perLevel: 0.05 },
          range: { base: 220, perLevel: 8 },
          spread: 2,            // inimigos contaminados ao morrer
          duration: 4,
        },
        display: ['corrodeDps', 'vuln', 'fireRate', 'range'],
        branches: {
          plague: { name: 'Praga', description: 'Espalha para 4 inimigos e dura mais.', mult: { spread: 2, duration: 1.5 } },
          acid: { name: 'Ácido', description: 'Infectados recebem muito mais dano e corroem mais rápido.', mult: { vuln: 2, corrodeDps: 1.3 } },
        },
      },
      amplifier: {
        name: 'Amplificador',
        short: 'Amplificador',
        role: 'support',
        description: 'Não ataca: fortalece as defesas vizinhas no mesmo anel.',
        damageType: 'energy',
        amplifies: true,
        locked: true,
        unlock: { cost: 15 },
        cost: 120, upgradeCost: 90, upgradeGrowth: 1.6, maxLevel: 10,
        hp: { base: 120, perLevel: 24 },
        stats: {
          ampDamage: { base: 0.15, perLevel: 0.03 },
          ampRate: { base: 0.05, perLevel: 0.01 },
        },
        display: ['ampDamage', 'ampRate'],
        branches: {
          focus: { name: 'Foco', description: 'Bônus de dano 60% maior.', mult: { ampDamage: 1.6 } },
          sync: { name: 'Sincronia', description: 'Bônus de cadência ×2,5.', mult: { ampRate: 2.5 } },
        },
      },
      miner: {
        name: 'Satélite Minerador',
        short: 'Minerador',
        role: 'support',
        description: 'Gera moedas ao fim de cada onda. Troca um slot de defesa por economia.',
        damageType: 'energy',
        locked: true,
        unlock: { cost: 15 },
        cost: 150, upgradeCost: 110, upgradeGrowth: 1.6, maxLevel: 10,
        hp: { base: 100, perLevel: 20 },
        stats: {
          income: { base: 30, perLevel: 18 },   // moedas por onda
          incomePerWave: 0.04,                  // +4% de renda a cada onda
        },
        display: ['income'],
        branches: {
          refinery: { name: 'Refinaria', description: '+60% de renda.', mult: { income: 1.6 } },
          interest: { name: 'Juros', description: 'Também rende 2% das moedas guardadas por onda (máx. 300).', interest: 0.02, interestMax: 300 },
        },
      },
      ion: {
        name: 'Canhão de Íons',
        short: 'Íons',
        role: 'attack',
        description: 'Arma suprema (uma por partida): carrega e dispara um raio que atravessa a tela inteira.',
        damageType: 'energy',
        targeting: 'strongest',
        unique: true,
        locked: true,
        unlock: { cost: 70, requires: 'railgun' },
        cost: 600, upgradeCost: 400, upgradeGrowth: 1.6, maxLevel: 10,
        hp: { base: 200, perLevel: 40 },
        stats: {
          damage: { base: 400, perLevel: 180 },
          chargeTime: { base: 25, perLevel: -1, min: 14 },
          width: 34,
        },
        display: ['damage', 'chargeTime'],
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
      chains: { label: 'Saltos' },
      drones: { label: 'Drones', floor: true },
      droneDamage: { label: 'Dano do drone' },
      wellRadius: { label: 'Raio do poço' },
      pull: { label: 'Puxão' },
      pullDps: { label: 'Dano/s' },
      mineDamage: { label: 'Dano da mina' },
      maxMines: { label: 'Minas', floor: true },
      corrodeDps: { label: 'Corrosão/s' },
      vuln: { label: 'Vulnerabilidade', percent: true },
      ampDamage: { label: 'Dano extra', percent: true },
      ampRate: { label: 'Cadência extra', percent: true },
      income: { label: 'Renda/onda' },
      chargeTime: { label: 'Carga', unit: 's', decimals: 1 },
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
      // inimigo de evento: atravessa a tela sem atacar; abatido dá recompensa
      freighter: {
        name: 'Cargueiro',
        event: true,                  // não conta para terminar a onda
        hp: 260, speed: 70, radius: 26, damage: 0, reward: 120,
        weight: 0,
        coreChance: 0.3,              // chance de soltar 1 núcleo
      },
      // chefes dos outros setores (ordem em waves.bossRotation)
      swarmMother: {
        name: 'Mãe-Enxame',
        class: 'boss',
        boss: true,
        hp: 1300, speed: 30, radius: 56, damage: 400, reward: 330,
        weight: 0,
        standoff: 310, orbitSpeed: 0.1,
        volleyInterval: 6, volleyCount: 4, volleySpread: 50, shotDamage: 14, shotSpeed: 190,
        summonInterval: 3.5, summonType: 'fighter', summonCount: 4,  // solta enxames de caças
        slowResist: 0.6,
      },
      juggernaut: {
        name: 'Couraçado',
        boss: true,
        hp: 1800, speed: 26, radius: 60, damage: 500, reward: 360,
        weight: 0,
        standoff: 280, orbitSpeed: 0.08,
        volleyInterval: 4.5, volleyCount: 5, volleySpread: 40, shotDamage: 22, shotSpeed: 180,
        summonInterval: 12, summonType: 'kamikaze', summonCount: 2,
        frontArmor: 0.2,              // dano recebido pela frente (flanqueie!)
        frontArc: 70,                 // meia-abertura da couraça (graus)
        slowResist: 0.8,
      },
      dreadnought: {
        name: 'Dreadnought',
        boss: true,
        hp: 1500, speed: 28, radius: 58, damage: 450, reward: 360,
        weight: 0,
        standoff: 320, orbitSpeed: 0.06,
        volleyInterval: 99, volleyCount: 0, volleySpread: 0, shotDamage: 0, shotSpeed: 0,
        summonInterval: 10, summonType: 'kamikaze', summonCount: 3,
        laserOn: 3.5, laserOff: 3,    // s ligado / desligado
        laserSweep: 45,               // varredura (graus para cada lado)
        laserWidth: 16,
        laserDps: 45,                 // contra defesas
        laserPlanetDps: 22,           // contra o planeta
        slowResist: 0.6,
      },
      hydra: {
        name: 'Hidra',
        boss: true,
        hp: 1400, speed: 30, radius: 52, damage: 400, reward: 300,
        weight: 0,
        standoff: 300, orbitSpeed: 0.12,
        volleyInterval: 3.6, volleyCount: 6, volleySpread: 80, shotDamage: 14, shotSpeed: 200,
        summonInterval: 9, summonType: 'kamikaze', summonCount: 2,
        splitInto: 'hydraSpawn', splitCount: 2, // ao morrer vira duas cabeças
        slowResist: 0.6,
      },
      hydraSpawn: {
        name: 'Cabeça da Hidra',
        class: 'hydra',
        boss: true,
        minion: true,
        hp: 560, speed: 40, radius: 36, damage: 200, reward: 120,
        weight: 0,
        standoff: 260, orbitSpeed: 0.2,
        volleyInterval: 3, volleyCount: 4, volleySpread: 60, shotDamage: 10, shotSpeed: 210,
        summonInterval: 99, summonType: 'kamikaze', summonCount: 0,
        slowResist: 0.5,
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

    // Regras de setor: cada setor novo adiciona sua regra (as anteriores continuam).
    // O índice é o setor (0 = primeiro, sem regra).
    sectorRules: [
      null,
      { name: 'Ventos Solares', text: 'Inimigos 15% mais rápidos', speedMult: 1.15 },
      { name: 'Fragmentação', text: 'Inimigos destruídos soltam 2 fragmentos', splitCount: 2 },
      { name: 'Campo de Força', text: 'Mais inimigos com escudo, e os escudos regeneram', shieldChance: 0.12, shieldRegen: 0.05 },
      { name: 'Elite do Vazio', text: 'Elites e furtivos com o dobro de frequência', eliteMult: 2, stealthMult: 2 },
    ],

    // ----------------------------------------------------------
    // Ondas. "nível" aqui é o número da onda.
    // ----------------------------------------------------------
    waves: {
      firstDelay: 3,                                     // s antes da 1ª onda
      breakTime: 6,                                      // s de intervalo entre ondas
      bossEvery: 10,                                     // chefe a cada N ondas
      bossRotation: ['boss', 'swarmMother', 'juggernaut', 'dreadnought', 'hydra'],
      count: { base: 6, perWave: 1.6, max: 120 },          // inimigos por onda
      hpGrowth: 1.12,                                    // vida × 1,12 por onda (exponencial)
      hpGrowthLate: { after: 50, growth: 1.16 },         // depois da onda 50 a vida cresce mais rápido
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
    // Habilidades do planeta. Dano × crescimento de vida da onda atual.
    // tech = precisa ser desbloqueada no Laboratório. key = atalho no teclado.
    // ----------------------------------------------------------
    abilities: {
      shockwave: {
        name: 'Onda de Choque', icon: 'bolt', key: 'q',
        text: 'Empurra, fere e deixa lentos todos os inimigos ao redor.',
        cooldown: 60, startCharge: 0.5,
        radius: 560, speed: 750, damage: 60, knockback: 130, slow: 0.5, slowTime: 2,
      },
      orbital: {
        name: 'Ataque Orbital', icon: 'target', key: 'w', tech: 'orbital',
        text: 'Toque num ponto: um raio do espaço atinge a área.',
        cooldown: 40, startCharge: 0.3,
        radius: 90, damage: 260, delay: 0.7,
      },
      timefreeze: {
        name: 'Congelar o Tempo', icon: 'snow', key: 'e', tech: 'timefreeze',
        text: 'Congela inimigos e tiros inimigos por alguns segundos.',
        cooldown: 75, startCharge: 0.2,
        duration: 4,
      },
    },

    // ----------------------------------------------------------
    // Eventos de toque durante a partida
    // ----------------------------------------------------------
    events: {
      firstWave: 3,                        // a partir desta onda
      interval: { min: 30, max: 55 },      // s entre eventos
      list: {
        comet: { name: 'Cometa Dourado', weight: 5, speed: 230, radius: 24, coins: { base: 40, perWave: 12 }, cardChance: 0.12 },
        crate: { name: 'Suprimentos', weight: 3, speed: 45, radius: 26, life: 14 },
        freighter: { name: 'Cargueiro', weight: 2 },
      },
    },

    // Ondas de desafio: aceitas no intervalo antes de toda onda múltipla de "every"
    risk: {
      every: 3,
      countMult: 1.5,        // inimigos a mais
      hpMult: 1.2,           // vida a mais
      eliteBonus: 0.08,      // chance extra de elite
      coinMult: 3,           // bônus da onda multiplicado
      cores: 1,              // núcleos extras ao vencer (somados no fim da partida)
    },

    // Missões: "active" ao mesmo tempo; cada uma dá moedas na hora e
    // núcleos no fim da partida. {n} = quantidade, {type} = defesa sorteada.
    missions: {
      active: 3,
      coins: { base: 80, perWave: 15 },
      cores: 2,
      list: [
        { id: 'kills', text: 'Destrua {n} inimigos', n: { base: 30, perWave: 3 }, event: 'kill' },
        { id: 'armored', text: 'Destrua {n} inimigos blindados', n: { base: 5, perWave: 0.25 }, event: 'kill', mod: 'armored', minWave: 7 },
        { id: 'elite', text: 'Destrua {n} elites', n: { base: 2, perWave: 0.1 }, event: 'kill', mod: 'elite', minWave: 6 },
        { id: 'killBy', text: 'Destrua {n} inimigos com {type}', n: { base: 20, perWave: 2 }, event: 'killBy', minWave: 2 },
        { id: 'build', text: 'Construa {n} defesas', n: 2, event: 'build' },
        { id: 'upgrade', text: 'Faça {n} melhorias', n: { base: 4, perWave: 0.25 }, event: 'upgrade' },
        { id: 'waves', text: 'Vença {n} ondas', n: 3, event: 'wave' },
        { id: 'flawless', text: 'Vença uma onda sem o planeta levar dano', n: 1, event: 'flawless', minWave: 2 },
        { id: 'ability', text: 'Use habilidades {n} vezes', n: 2, event: 'ability' },
        { id: 'collect', text: 'Pegue {n} cometas ou suprimentos', n: 2, event: 'collect', minWave: 4 },
        { id: 'risk', text: 'Vença uma onda de desafio', n: 1, event: 'risk', minWave: 2 },
        { id: 'boss', text: 'Derrote o próximo chefe', n: 1, event: 'boss', minWave: 3 },
      ],
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
        { id: 'allDamage', name: 'Força Bruta', rarity: 'rare', text: '+15% dano de todas as defesas', bonus: { target: 'all', damage: 0.15 } },
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
      // Tecnologias: desbloqueios únicos (requires = tecnologia anterior)
      tech: [
        { id: 'orbital', name: 'Ataque Orbital', text: 'Nova habilidade: toque num ponto e um raio do espaço atinge a área.', cost: 25 },
        { id: 'timefreeze', name: 'Congelar o Tempo', text: 'Nova habilidade: congela todos os inimigos por alguns segundos.', cost: 35, requires: 'orbital' },
        { id: 'specialSlots', name: 'Slots Especiais', text: 'Cada partida sorteia slots Sobrecarregados, Relés e Instáveis.', cost: 30 },
        { id: 'auras', name: 'Auras de Anel', text: 'Escolha um elemento para cada anel: Criogênico, Ígneo ou Elétrico.', cost: 35, requires: 'specialSlots' },
        { id: 'ring4', name: 'Cinturão (4º anel)', text: 'Um 4º anel com 10 slots, liberado a partir da onda 20.', cost: 40 },
        { id: 'moon', name: 'Lua Orbital', text: 'Uma lua percorre a órbita com um slot de +50% em tudo.', cost: 45, requires: 'ring4' },
      ],
    },

    // Níveis de ameaça (prestígio): escolhidos no menu. Alcançar "unlockWave"
    // no nível mais alto liberado abre o próximo.
    threat: {
      max: 10,
      unlockWave: 30,
      perLevel: { hp: 0.15, damage: 0.08, count: 0.06, reward: 0.04, cores: 0.25 },
    },

    // Conquistas: check = wave | total (meta.totals[key]) | run (máximo na partida) |
    // flag (feito numa partida) | bossTypes | weapons | threatWave
    achievements: [
      { id: 'wave10', name: 'Primeiros Passos', text: 'Alcance a onda 10', check: 'wave', n: 10, cores: 5 },
      { id: 'wave25', name: 'Veterano', text: 'Alcance a onda 25', check: 'wave', n: 25, cores: 10 },
      { id: 'wave50', name: 'Lenda Orbital', text: 'Alcance a onda 50', check: 'wave', n: 50, cores: 25, skin: 'marte' },
      { id: 'wave75', name: 'Imortal', text: 'Alcance a onda 75', check: 'wave', n: 75, cores: 50, skin: 'lava' },
      { id: 'bosses5', name: 'Caçador de Chefes', text: 'Derrote 5 chefes (somando partidas)', check: 'total', key: 'bossKills', n: 5, cores: 10, skin: 'gelo' },
      { id: 'allBosses', name: 'Matador de Titãs', text: 'Derrote todos os 5 tipos de chefe', check: 'bossTypes', n: 5, cores: 20 },
      { id: 'arsenal', name: 'Arsenal Completo', text: 'Desbloqueie todas as armas', check: 'weapons', n: 10, cores: 30 },
      { id: 'branches', name: 'Especialista', text: 'Especialize 15 defesas (somando partidas)', check: 'total', key: 'branches', n: 15, cores: 5 },
      { id: 'overclock', name: 'Sobrecarregado', text: 'Leve uma defesa à Sobrecarga ★10', check: 'run', key: 'maxOc', n: 10, cores: 15 },
      { id: 'mutations', name: 'Mutante', text: 'Aplique 10 mutações (somando partidas)', check: 'total', key: 'mutations', n: 10, cores: 10 },
      { id: 'flawlessBoss', name: 'Intocável', text: 'Derrote um chefe sem o planeta levar dano', check: 'flag', key: 'flawlessBoss', n: 1, cores: 15 },
      { id: 'tycoon', name: 'Magnata', text: 'Tenha 10.000 moedas ao mesmo tempo', check: 'run', key: 'maxCoins', n: 10000, cores: 10 },
      { id: 'collector', name: 'Colecionador', text: 'Pegue 20 eventos (somando partidas)', check: 'total', key: 'collect', n: 20, cores: 10 },
      { id: 'risks', name: 'Ousado', text: 'Vença 10 ondas de desafio (somando partidas)', check: 'total', key: 'risks', n: 10, cores: 15 },
      { id: 'missions', name: 'Missionário', text: 'Conclua 25 missões (somando partidas)', check: 'total', key: 'missions', n: 25, cores: 15 },
      { id: 'kills', name: 'Exterminador', text: 'Destrua 10.000 inimigos (somando partidas)', check: 'total', key: 'kills', n: 10000, cores: 20, skin: 'gasoso' },
      { id: 'fullRing', name: 'Anel Completo', text: 'Preencha todos os slots de um anel', check: 'flag', key: 'fullRing', n: 1, cores: 5 },
      { id: 'threat3', name: 'Ameaça Real', text: 'Alcance a onda 30 na ameaça 3', check: 'threatWave', n: 3, cores: 25 },
      { id: 'lastStand', name: 'Último Suspiro', text: 'Sobreviva graças ao Último Recurso', check: 'flag', key: 'revived', n: 1, cores: 5 },
      { id: 'storm', name: 'Tempestade Perfeita', text: 'Destrua 15 inimigos com uma Onda de Choque', check: 'flag', key: 'shock15', n: 1, cores: 10 },
    ],

    // Visuais do planeta (liberados por conquistas)
    skins: {
      terra: { name: 'Terra', body: '#2f8fff', land: '#3ecf8e', atmo: '#4dc3ff' },
      marte: { name: 'Marte', body: '#b8482a', land: '#e38b4f', atmo: '#ff9b6b' },
      gelo: { name: 'Gelo', body: '#7cc4f0', land: '#eef8ff', atmo: '#bfefff' },
      lava: { name: 'Lava', body: '#3a1410', land: '#ff6a1a', atmo: '#ff7a3d' },
      gasoso: { name: 'Gigante Gasoso', body: '#c9a36b', land: '#f0d9a8', atmo: '#ffe2a8', bands: true },
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
