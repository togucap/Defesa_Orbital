// ============================================================
// Manifesto de assets — o ÚNICO lugar para trocar a arte.
//
// Cada entrada é um desenho provisório (draw) ou uma imagem (image):
//   planet: { draw: 'planet', size: 116 }                 // provisório (código)
//   planet: { image: 'assets/planet.png', size: 116 }     // sprite
//
// Campos:
//   size   tamanho em unidades do mundo (maior dimensão da imagem)
//   angle  rotação extra em graus (use 90 se a imagem "aponta" para cima;
//          o jogo considera que sprites rotacionáveis apontam para a direita)
//   spin   giro contínuo só visual (rad/s), ex.: o planeta
//   color  cor base; também usada por efeitos (laser, escudo, partículas)
// Se a imagem falhar ao carregar e houver "draw", o desenho provisório é usado.
// ============================================================
(() => {
  const OD = (window.OD = window.OD || {});

  OD.ASSETS = {
    // Fundos (preenchem a tela; imagens usam ajuste "cover")
    background: { draw: 'background', color: '#070b1f' },
    pageBackground: { draw: 'pageBackground', color: '#03040b' },

    // Planeta e slots
    planet: { draw: 'planet', size: 116, color: '#2f8fff', spin: 0.04 },
    slot_locked: { draw: 'slotLocked', size: 38, color: '#5a6488' },
    slot_empty: { draw: 'slotEmpty', size: 38, color: '#5fd4ff' },

    // Defesas
    def_cannon: { draw: 'cannon', size: 42, color: '#ffd166' },
    def_laser: { draw: 'laser', size: 42, color: '#ff5c8a' },
    def_missile: { draw: 'missile', size: 42, color: '#ff9f43' },
    def_shield: { draw: 'shield', size: 42, color: '#4de1ff' },
    def_emp: { draw: 'emp', size: 42, color: '#b47cff', spin: 1.2 },
    def_repair: { draw: 'repair', size: 42, color: '#4ade80' },

    // Inimigos
    enemy_asteroidSmall: { draw: 'asteroid', size: 28, color: '#a8998a', seed: 3 },
    enemy_asteroidBig: { draw: 'asteroid', size: 64, color: '#8c7a68', seed: 11 },
    enemy_fighter: { draw: 'fighter', size: 34, color: '#ff4d4d' },
    enemy_bomber: { draw: 'bomber', size: 48, color: '#d946ef' },
    enemy_kamikaze: { draw: 'kamikaze', size: 26, color: '#ffb020' },
    enemy_boss: { draw: 'boss', size: 120, color: '#ff2e55' },

    // Projéteis
    proj_bullet: { draw: 'bullet', size: 14, color: '#ffe08a' },
    proj_missile: { draw: 'missileShot', size: 20, color: '#ff9f43' },
    proj_enemyShot: { draw: 'enemyShot', size: 14, color: '#ff4fd8' },
    proj_bossShot: { draw: 'enemyShot', size: 20, color: '#ff3355' },
  };
})();
