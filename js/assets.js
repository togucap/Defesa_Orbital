// ============================================================
// Manifesto de assets — o ÚNICO lugar para trocar a arte.
//
// Cada entrada é um desenho provisório (draw) ou uma imagem (image):
//   planet: { draw: 'planet', size: 116 }                 // provisório (código)
//   planet: { image: 'assets/planet.png', size: 116 }     // sprite
//
// Campos:
//   size    tamanho em unidades do mundo (maior dimensão da imagem)
//   angle   rotação extra em graus (use 90 se a imagem "aponta" para cima;
//           o jogo considera que sprites rotacionáveis apontam para a direita)
//   spin    giro contínuo só visual (rad/s)
//   color   cor base; também usada por efeitos (laser, escudo, partículas)
//   frames  quantidade de quadros: defesas usam 4 estágios por nível
//           (1–3, 4–6, 7–9, 10). Com imagens, passe uma lista:
//           image: ['assets/canhao1.png', 'assets/canhao2.png', ...]
//   flash   gera silhueta branca para o "piscar" ao levar dano
//   variant/accent  detalhes usados só pelos desenhos provisórios
// Defesas especializadas usam a entrada "def_tipo_ramo" (se existir).
// Se a imagem falhar ao carregar e houver "draw", o provisório é usado.
// ============================================================
(() => {
  const OD = (window.OD = window.OD || {});

  // Setores: o fundo muda a cada CONFIG.waves.sectorEvery ondas.
  // Com imagens: background: { image: ['assets/setor1.png', ...] }
  OD.SECTORS = [
    { name: 'Órbita de Órion', color: '#050a1d', grid: '#3d6bff', tints: ['#2a1f8a', '#0f4f8a', '#123a6e'] },
    { name: 'Nebulosa Carmesim', color: '#12061a', grid: '#ff3d8b', tints: ['#7a1a50', '#4b1f8a', '#8a2a3a'] },
    { name: 'Campo Esmeralda', color: '#031410', grid: '#2bffb0', tints: ['#0f6e4f', '#135a6e', '#2a6e1f'] },
    { name: 'Fenda Dourada', color: '#130d04', grid: '#ffc23d', tints: ['#8a5a1a', '#6e3a13', '#7a6a1a'] },
    { name: 'Vazio Profundo', color: '#030208', grid: '#a77bff', tints: ['#2a2a5a', '#3a1a4a', '#1a3a4a'] },
  ];
  OD.sectorInfo = (i) => OD.SECTORS[i % OD.SECTORS.length];

  const D = 42; // tamanho padrão das defesas

  OD.ASSETS = {
    // Fundos (preenchem a tela; imagens usam ajuste "cover")
    background: { draw: 'background', frames: OD.SECTORS.length },
    pageBackground: { draw: 'pageBackground', color: '#03040b' },

    // Planeta em camadas: superfície (gira), sombra/luzes (fixa), atmosfera e escudo
    planet: { draw: 'planet', size: 116, color: '#2f8fff', spin: 0.04 },
    planet_shade: { draw: 'planetShade', size: 116 },
    planet_atmo: { draw: 'planetAtmo', size: 116, color: '#4dc3ff' },
    planet_shield: { draw: 'planetShield', size: 116, color: '#7ee8ff' },

    // Slots
    moon: { draw: 'moon', size: 54, color: '#c7d2fe' },
    slot_locked: { draw: 'slotLocked', size: 38, color: '#5a6488' },
    slot_empty: { draw: 'slotEmpty', size: 38, color: '#5fd4ff' },

    // Defesas (4 estágios visuais por nível)
    def_cannon: { draw: 'cannon', size: D, color: '#ffd166', frames: 4 },
    def_cannon_gatling: { draw: 'cannon', variant: 'gatling', size: D, color: '#ffd166', frames: 4 },
    def_cannon_pierce: { draw: 'cannon', variant: 'pierce', size: D, color: '#ffd166', accent: '#ff9f43', frames: 4 },
    def_laser: { draw: 'laser', size: D, color: '#ff5c8a', frames: 4 },
    def_laser_chain: { draw: 'laser', variant: 'chain', size: D, color: '#ff5c8a', accent: '#9fe8ff', frames: 4 },
    def_laser_heavy: { draw: 'laser', variant: 'heavy', size: D, color: '#ff5c8a', accent: '#ff2e55', frames: 4 },
    def_missile: { draw: 'missile', size: D, color: '#ff9f43', frames: 4 },
    def_missile_swarm: { draw: 'missile', variant: 'swarm', size: D, color: '#ff9f43', frames: 4 },
    def_missile_warhead: { draw: 'missile', variant: 'warhead', size: D, color: '#ff9f43', accent: '#ff4d4d', frames: 4 },
    def_shield: { draw: 'shield', size: D, color: '#4de1ff', frames: 4 },
    def_shield_wall: { draw: 'shield', variant: 'wall', size: D, color: '#4de1ff', frames: 4 },
    def_shield_regen: { draw: 'shield', variant: 'regen', size: D, color: '#4de1ff', accent: '#4ade80', frames: 4 },
    def_emp: { draw: 'emp', size: D, color: '#b47cff', spin: 1.2, frames: 4 },
    def_emp_freeze: { draw: 'emp', variant: 'freeze', size: D, color: '#b47cff', accent: '#bfefff', spin: 0.8, frames: 4 },
    def_emp_shock: { draw: 'emp', variant: 'shock', size: D, color: '#b47cff', accent: '#ffe066', spin: 1.6, frames: 4 },
    def_repair: { draw: 'repair', size: D, color: '#4ade80', frames: 4 },
    def_repair_nano: { draw: 'repair', variant: 'nano', size: D, color: '#4ade80', accent: '#9fffcf', spin: 0.6, frames: 4 },
    def_repair_fortify: { draw: 'repair', variant: 'fortify', size: D, color: '#4ade80', accent: '#ffd34d', frames: 4 },

    // Armas desbloqueáveis (Laboratório)
    def_tesla: { draw: 'tesla', size: D, color: '#7ab8ff', frames: 4 },
    def_tesla_storm: { draw: 'tesla', variant: 'storm', size: D, color: '#7ab8ff', accent: '#cfe6ff', frames: 4 },
    def_tesla_stun: { draw: 'tesla', variant: 'stun', size: D, color: '#7ab8ff', accent: '#ffe066', frames: 4 },
    def_railgun: { draw: 'railgun', size: D, color: '#dfe6ff', frames: 4 },
    def_railgun_overcharge: { draw: 'railgun', variant: 'overcharge', size: D, color: '#dfe6ff', accent: '#7ee8ff', frames: 4 },
    def_railgun_shrapnel: { draw: 'railgun', variant: 'shrapnel', size: D, color: '#dfe6ff', accent: '#ffb347', frames: 4 },
    def_drones: { draw: 'drones', size: D, color: '#5effc8', frames: 4 },
    def_drones_fighters: { draw: 'drones', variant: 'fighters', size: D, color: '#5effc8', frames: 4 },
    def_drones_bombers: { draw: 'drones', variant: 'bombers', size: D, color: '#5effc8', accent: '#ff9f43', frames: 4 },
    def_gravity: { draw: 'gravity', size: D, color: '#9b6bff', spin: -1, frames: 4 },
    def_gravity_blackhole: { draw: 'gravity', variant: 'blackhole', size: D, color: '#9b6bff', accent: '#ff7ad9', spin: -1.4, frames: 4 },
    def_gravity_repulsor: { draw: 'gravity', variant: 'repulsor', size: D, color: '#9b6bff', accent: '#ffb347', spin: 1, frames: 4 },
    def_mines: { draw: 'mines', size: D, color: '#ff6b4a', frames: 4 },
    def_mines_proximity: { draw: 'mines', variant: 'proximity', size: D, color: '#ff6b4a', frames: 4 },
    def_mines_cryo: { draw: 'mines', variant: 'cryo', size: D, color: '#ff6b4a', accent: '#bfefff', frames: 4 },
    def_artillery: { draw: 'artillery', size: D, color: '#d9b26b', frames: 4 },
    def_artillery_barrage: { draw: 'artillery', variant: 'barrage', size: D, color: '#d9b26b', frames: 4 },
    def_artillery_breaker: { draw: 'artillery', variant: 'breaker', size: D, color: '#d9b26b', accent: '#7ee8ff', frames: 4 },
    def_nanites: { draw: 'nanites', size: D, color: '#7dff9b', frames: 4 },
    def_nanites_plague: { draw: 'nanites', variant: 'plague', size: D, color: '#7dff9b', frames: 4 },
    def_nanites_acid: { draw: 'nanites', variant: 'acid', size: D, color: '#7dff9b', accent: '#d4ff3d', frames: 4 },
    def_amplifier: { draw: 'amplifier', size: D, color: '#ff8ce0', frames: 4 },
    def_amplifier_focus: { draw: 'amplifier', variant: 'focus', size: D, color: '#ff8ce0', frames: 4 },
    def_amplifier_sync: { draw: 'amplifier', variant: 'sync', size: D, color: '#ff8ce0', accent: '#7ee8ff', frames: 4 },
    def_miner: { draw: 'miner', size: D, color: '#ffd34d', spin: 0.3, frames: 4 },
    def_miner_refinery: { draw: 'miner', variant: 'refinery', size: D, color: '#ffd34d', spin: 0.3, frames: 4 },
    def_miner_interest: { draw: 'miner', variant: 'interest', size: D, color: '#ffd34d', spin: 0.3, frames: 4 },
    def_ion: { draw: 'ion', size: 48, color: '#00e5ff', frames: 4 },

    // Objetos das armas
    drone: { draw: 'drone', size: 16, color: '#5effc8' },
    mine: { draw: 'mine', size: 20, color: '#ff6b4a' },
    mine_cryo: { draw: 'mine', size: 20, color: '#bfefff' },
    proj_shell: { draw: 'shell', size: 18, color: '#ffd27a' },
    proj_nanite: { draw: 'nanite', size: 16, color: '#7dff9b' },
    proj_bomb: { draw: 'bomb', size: 14, color: '#ff9f43' },

    // Inimigos
    enemy_asteroidSmall: { draw: 'asteroid', size: 28, color: '#a8998a', seed: 3, flash: true },
    enemy_asteroidBig: { draw: 'asteroid', size: 64, color: '#8c7a68', seed: 11, flash: true },
    enemy_fighter: { draw: 'fighter', size: 34, color: '#ff4d4d', flash: true },
    enemy_bomber: { draw: 'bomber', size: 48, color: '#d946ef', flash: true },
    enemy_kamikaze: { draw: 'kamikaze', size: 26, color: '#ffb020', flash: true },
    enemy_boss: { draw: 'boss', size: 120, color: '#ff2e55', flash: true },
    enemy_swarmMother: { draw: 'swarmMother', size: 124, color: '#c6ff3d', spin: 0.3, flash: true },
    enemy_juggernaut: { draw: 'juggernaut', size: 130, color: '#8fb4e8', flash: true },
    enemy_dreadnought: { draw: 'dreadnought', size: 128, color: '#ff7a1a', flash: true },
    enemy_hydra: { draw: 'hydra', size: 116, color: '#d36bff', flash: true },
    enemy_hydraSpawn: { draw: 'hydra', variant: 'head', size: 78, color: '#e59bff', flash: true },

    // Eventos
    comet: { draw: 'comet', size: 34, color: '#ffd34d' },
    crate: { draw: 'crate', size: 34, color: '#ffd34d' },
    enemy_freighter: { draw: 'freighter', size: 64, color: '#ffd34d', flash: true },

    // Projéteis
    proj_bullet: { draw: 'bullet', size: 14, color: '#ffe08a' },
    proj_missile: { draw: 'missileShot', size: 20, color: '#ff9f43' },
    proj_enemyShot: { draw: 'enemyShot', size: 14, color: '#ff4fd8' },
    proj_bossShot: { draw: 'enemyShot', size: 20, color: '#ff3355' },
  };
})();
