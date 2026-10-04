# Defesa Orbital

Jogo idle de defesa espacial para navegador (celular e computador). Um planeta no centro é atacado por ondas infinitas de asteroides e naves. Você constrói e melhora defesas nos slots orbitais e elas atacam sozinhas. O objetivo é bater o recorde de ondas.

JavaScript puro + Canvas 2D, sem dependências e sem build.

## Como rodar

- **No computador:** dê dois cliques em `index.html`.
- **Online (GitHub Pages):** `https://SEU-USUARIO.github.io/NOME-DO-REPO/`
- **No celular, pela rede local:** na pasta do jogo, rode um servidor simples e abra `http://IP-DO-PC:8000` no celular (mesmo Wi-Fi):
  ```bash
  npx serve -l 8000 .
  ```

## Controles

- Toque/clique em um **slot** ao redor do planeta para abrir o painel: desbloquear, construir, melhorar ou vender (vender pede um segundo toque para confirmar).
- Tocar no mesmo slot ou em área vazia fecha o painel.
- Botões no topo: pausa, som e velocidade (1x, 2x, 3x).
- Teclado: `P`/`Esc` pausa · `Espaço` velocidade · `M` som · `F` contador de FPS.
- O jogo pausa sozinho quando a aba perde o foco.

## Balanceamento — `js/config.js`

Todos os números do jogo ficam neste arquivo, comentados:

| Seção | O que ajusta |
| --- | --- |
| `planet` | vida e tamanho do planeta |
| `rings` | anéis, slots por anel, slots liberados no início, custo de desbloqueio |
| `economy` | moedas iniciais e devolução ao vender |
| `defenseRules` | tempo desativada quando uma defesa é destruída |
| `defenses` | custo, upgrades, nível máximo e atributos de cada defesa |
| `enemies` | vida, velocidade, dano, recompensa, peso e onda de estreia de cada inimigo |
| `waves` | quantidade por onda, crescimento de vida/velocidade/recompensa, intervalo, chefe |

Atributos por nível (ou por onda) usam `{ base, perLevel, min, max }`: valor = `base + perLevel × (nível − 1)`, limitado por `min`/`max`.

## Trocar a arte — `js/assets.js`

A arte atual é provisória, desenhada por código. Para usar um sprite, troque a entrada no manifesto:

```js
planet: { draw: 'planet', size: 116 },                // provisório
planet: { image: 'assets/planet.png', size: 116 },    // sprite
```

`size` é o tamanho em unidades do mundo. Sprites que giram devem apontar para a direita (ou use `angle: 90` se apontarem para cima). Nada na lógica precisa mudar.

## Adicionar uma defesa ou um inimigo

1. Crie a entrada em `CONFIG.defenses` (ou `CONFIG.enemies`).
2. Crie a classe em `js/entities/defenses/` (ou `enemies/`) estendendo `OD.Defense` (ou `OD.Enemy`) e registre com `OD.registerDefense('tipo', Classe)` (ou `OD.registerEnemy`).
3. Adicione a linha `<script>` no `index.html`, depois da classe base.
4. Adicione o visual no manifesto (`def_tipo` ou `enemy_tipo`).

Para uma variação sem código novo, use `class` na config para reaproveitar uma classe existente (ex.: `heavyCannon: { class: 'cannon', ... }`).

## Estrutura

```
index.html          telas e ordem dos scripts
style.css           interface (HUD, painel, telas)
js/config.js        balanceamento
js/assets.js        manifesto de arte
js/core/            loop, pool de objetos, eventos, estado e recorde
js/entities/        planeta, slots, projéteis, partículas, defesas/, inimigos/
js/systems/         ondas, combate, economia
js/render/          renderizador, cache de sprites, desenhos provisórios
js/ui/              HUD, painel do slot, telas
js/input.js         toque/mouse/teclado e bloqueio de gestos
js/audio.js         sons WebAudio
js/main.js          inicialização e fases do jogo
```

## Testes

- Abra com `?debug` no endereço para ver o FPS.
- No console do navegador: `OD.debug.coins(1000)`, `OD.debug.wave(10)`, `OD.debug.damage(200)`.
- Apenas o recorde de onda é salvo (localStorage, chave `defesaOrbital.recordeOnda`).
