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

**Na partida**
- Toque em um **slot** para desbloquear, construir, melhorar, especializar, trocar o modo de mira, instalar **módulos** ou vender.
- Toque no **planeta** para o Núcleo Planetário: vida, blindagem, regeneração, melhorias das habilidades, **melhoria de anel**, **auras** e **mercado** de cartas.
- **Nível 5:** cada defesa escolhe uma especialização. **Nível 7:** escolhe uma **mutação** (o Catalisador sorteia outras). **Depois do 10:** **Sobrecarga** infinita (★).
- **Anéis e vizinhos:** cada anel dá um bônus e defesas lado a lado se fortalecem (o Amplificador fortalece os vizinhos).
- **Cartas** a cada 5 ondas. **Habilidades** nos botões à direita (Onda de Choque; Ataque Orbital e Congelar o Tempo vêm do Laboratório).
- **Intervalo:** chame a próxima onda antes (moedas extras) ou aceite um **desafio** (mais inimigos, recompensa tripla, +1 núcleo).
- **Eventos:** toque no cometa dourado e nos suprimentos; abata o cargueiro antes que fuja.
- **Missões:** 3 objetivos sempre visíveis embaixo da tela.
- **Setores:** a cada 10 ondas o fundo muda e entra uma regra nova para os inimigos; cada setor tem seu chefe (Nau-mãe, Mãe-Enxame, Couraçado, Dreadnought, Hidra).

**Entre partidas (Laboratório)**
- **Melhorias:** bônus permanentes. **Arsenal:** 10 armas novas (toque em PRÉVIA para ver cada uma). **Tecnologia:** habilidades, 4º anel, lua, slots especiais e auras. **Conquistas:** núcleos e visuais do planeta.
- **Nível de ameaça:** depois de alcançar a onda 30, escolha no menu partidas mais difíceis que dão mais núcleos.

**Teclado:** `P`/`Esc` pausa · `Espaço` velocidade · `Q` Onda de Choque · `W` Ataque Orbital (depois clique no alvo) · `E` Congelar o Tempo · `N` chamar onda · `M` som · `F` FPS.

## Balanceamento — `js/config.js`

Todos os números do jogo ficam neste arquivo, comentados:

| Seção | O que ajusta |
| --- | --- |
| `planet`, `rings`, `synergies` | planeta, anéis (inclui Cinturão e Lua), bônus de anel e de vizinhos |
| `overclock`, `ringUpgrade`, `planetUpgrades`, `abilityUpgrade`, `market` | gastos de fim de jogo |
| `chips`, `mutations` | módulos e mutações das defesas |
| `defenseRules`, `economy` | regras gerais e moedas |
| `defenses` | as 16 defesas: custo, upgrades, atributos, especializações e desbloqueio (`unlock`) |
| `enemies`, `modifiers`, `sectorRules` | inimigos, chefes, modificadores e regras de setor |
| `waves`, `risk` | ondas (quantidade, crescimento, chefes) e desafios |
| `abilities`, `events`, `missions`, `cards` | habilidades, eventos de toque, missões e cartas |
| `meta`, `specialSlots`, `auras`, `threat`, `achievements`, `skins` | Laboratório, tecnologias, ameaça, conquistas e visuais |

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

- **Defesa ou inimigo:** entrada na config + classe em `js/entities/defenses/` (ou `enemies/`) que estende `OD.Defense` (ou `OD.Enemy`) e se registra com `OD.registerDefense` (ou `OD.registerEnemy`) + linha `<script>` no `index.html` + visual no manifesto. Para bloquear no Laboratório, use `locked: true` e `unlock: { cost, requires }`.
- **Carta, missão, mutação, módulo, conquista, melhoria do Laboratório ou tecnologia:** só uma entrada na seção correspondente da config.

## Estrutura

```
index.html          telas e ordem dos scripts
style.css           interface (HUD, painéis, telas)
js/config.js        balanceamento
js/assets.js        manifesto de arte e setores
js/core/            loop, pool, eventos, estado da partida, recorde e laboratório
js/entities/        planeta, slots, projéteis, partículas, defesas/ (16), inimigos/ (incl. chefes)
js/systems/         ondas, combate, dano, bônus, economia, cartas, mutações, habilidades,
                    eventos, missões, ameaça e conquistas
js/render/          renderizador, cache de sprites, desenhos provisórios
js/ui/              HUD, painel do slot, painel do planeta, cartas, laboratório, telas
js/input.js         toque/mouse/teclado e bloqueio de gestos
js/audio.js         sons WebAudio e vibração
js/main.js          inicialização, fases e qualidade adaptativa
```

## Testes

- Abra com `?debug` no endereço para ver o FPS.
- No console do navegador: `OD.debug.coins(1000)`, `OD.debug.wave(10)`, `OD.debug.damage(200)`, `OD.debug.cores(100)`.
- Dados salvos no localStorage: recorde (`defesaOrbital.recordeOnda`) e laboratório (`defesaOrbital.laboratorio`: núcleos, melhorias, armas, tecnologias, conquistas, ameaça e visual).
