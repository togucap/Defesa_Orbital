# Defesa Orbital

Jogo idle de defesa espacial para navegador (celular e computador). Um planeta no centro é atacado por ondas infinitas de asteroides e naves. Você constrói e melhora defesas nos slots orbitais e elas atacam sozinhas. O objetivo é bater o recorde de ondas.

JavaScript puro + Canvas 2D, sem dependências e sem build.

## Como rodar

- **No computador:** dê dois cliques em `index.html`.
- **Online (GitHub Pages):** https://togucap.github.io/Defesa_Orbital/
- **No celular, pela rede local:** na pasta do jogo, rode um servidor simples e abra `http://IP-DO-PC:8000` no celular (mesmo Wi-Fi):
  ```bash
  npx serve -l 8000 .
  ```

As fontes (Orbitron e Exo 2) vêm do Google Fonts; sem internet o jogo usa a fonte do sistema.

## Como jogar

- Toque em um **slot** ao redor do planeta para desbloquear, construir, melhorar ou vender (vender pede um segundo toque).
- **Anéis:** cada anel dá um bônus (interno: dano e reparo; meio: cadência e carga; externo: alcance e área).
- **Vizinhos:** algumas defesas lado a lado se fortalecem (EMP + laser, canhão + canhão, escudo e reparador ajudam quem está ao lado).
- **Especialização:** no nível 5 cada defesa escolhe um de dois ramos (ex.: Canhão → Metralhadora ou Perfurante).
- **Cartas:** a cada 5 ondas você escolhe 1 entre 3 melhorias para a partida.
- **Onda de Choque:** botão ⚡ (recarrega com o tempo) empurra, fere e deixa lentos os inimigos.
- **Chamar onda:** durante o intervalo, chame a próxima onda antes e ganhe moedas.
- **Inimigos especiais:** blindado (resiste a canhão), com escudo (mísseis quebram), regenerativo, furtivo (aparece perto do planeta ou no raio do EMP) e elite.
- **Laboratório:** ao fim de cada partida você ganha núcleos para melhorias permanentes.
- Teclado: `P`/`Esc` pausa · `Espaço` velocidade · `Q`/`E` Onda de Choque · `N` chamar onda · `M` som · `F` FPS.
- O jogo pausa sozinho quando a aba perde o foco.

## Balanceamento — `js/config.js`

Todos os números do jogo ficam neste arquivo, comentados:

| Seção | O que ajusta |
| --- | --- |
| `planet` | vida, tamanho e blindagem máxima do planeta |
| `rings` | anéis, slots, slots liberados no início, custo de desbloqueio e bônus do anel |
| `synergies` | bônus entre defesas vizinhas |
| `defenseRules` | tempo desativada e nível da especialização |
| `economy` | moedas iniciais e devolução ao vender |
| `defenses` | custo, upgrades, atributos e especializações (`branches`) de cada defesa |
| `enemies` | vida, velocidade, dano, recompensa, peso e onda de estreia de cada inimigo |
| `modifiers` | inimigos especiais: chance, onda de estreia e efeitos |
| `waves` | quantidade, crescimento de vida/velocidade/recompensa, intervalo, chefe, setores |
| `ability` | Onda de Choque: recarga, dano, alcance, empurrão |
| `cards` | frequência, raridades e lista de cartas |
| `meta` | núcleos por partida e melhorias do Laboratório |

Atributos por nível (ou por onda) usam `{ base, perLevel, min, max }` (ou `perWave`): valor = `base + perLevel × (nível − 1)`, limitado por `min`/`max`.

## Trocar a arte — `js/assets.js`

A arte atual é provisória, desenhada por código no estilo vetor neon. Para usar sprites, troque a entrada no manifesto:

```js
planet: { draw: 'planet', size: 116 },                // provisório
planet: { image: 'assets/planet.png', size: 116 },    // sprite
```

- `size` é o tamanho em unidades do mundo. Sprites que giram devem apontar para a direita (ou use `angle: 90`).
- Defesas têm 4 estágios visuais por nível; use uma lista de imagens: `image: ['assets/canhao1.png', ..., 'assets/canhao4.png']`.
- Especializações usam a entrada `def_tipo_ramo` (ex.: `def_cannon_gatling`).
- Os fundos dos setores ficam em `OD.SECTORS` (ou `background: { image: [...] }`, uma imagem por setor).

Nada na lógica precisa mudar.

## Adicionar conteúdo

- **Defesa ou inimigo:** entrada na config + classe em `js/entities/defenses/` (ou `enemies/`) que estende `OD.Defense` (ou `OD.Enemy`) e se registra com `OD.registerDefense` (ou `OD.registerEnemy`) + linha `<script>` no `index.html` + visual no manifesto. Para variações sem código, use `class` na config para reaproveitar uma classe existente.
- **Carta:** só uma entrada em `CONFIG.cards.list` (bônus, efeito global ou imediato).
- **Melhoria do Laboratório:** só uma entrada em `CONFIG.meta.upgrades`.

## Estrutura

```
index.html          telas e ordem dos scripts
style.css           interface (HUD, painel, telas)
js/config.js        balanceamento
js/assets.js        manifesto de arte e setores
js/core/            loop, pool de objetos, eventos, estado, recorde e laboratório
js/entities/        planeta, slots, projéteis, partículas, defesas/, inimigos/
js/systems/         ondas, combate, economia, bônus, cartas, habilidade
js/render/          renderizador, cache de sprites, desenhos provisórios
js/ui/              HUD, painel do slot, cartas, laboratório, telas
js/input.js         toque/mouse/teclado e bloqueio de gestos
js/audio.js         sons WebAudio e vibração
js/main.js          inicialização e fases do jogo
```

## Testes

- Abra com `?debug` no endereço para ver o FPS.
- No console do navegador: `OD.debug.coins(1000)`, `OD.debug.wave(10)`, `OD.debug.damage(200)`, `OD.debug.cores(100)`.
- Dados salvos no localStorage: recorde (`defesaOrbital.recordeOnda`) e laboratório (`defesaOrbital.laboratorio`).
