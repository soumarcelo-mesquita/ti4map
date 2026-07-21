# Handout: sorteio balanceado de fatias (4 jogadores, sem hyperlanes)

Documento de partida para implementar o próximo passo do draft de fatias:
hoje as 4 fatias do 4p já têm posição/formato fixos e validados
(`src/data/slices.ts`), mas as 6 posições não-home de cada uma são apenas
placeholders vazios (`0` na map string). Objetivo desta etapa: preencher essas
posições com sistemas reais do pool, sorteados com equilíbrio de
recursos/influência entre as 4 fatias — o mesmo problema que o
[Milty Draft](https://milty.shenanigans.be) resolve, mas usando o **nosso**
tabuleiro (anel de 36 posições já existente), sem o layout de hyperlanes que
o Milty usa para 4 jogadores.

## O que já existe (não mexer)

- `src/data/slices.ts` — `SLICE_LAYOUTS[4]`: 4 fatias, cada uma com `seatId`
  (assento real em `seats.ts`) e `tiles` (7 posições do map string, 1-36).
  Geometria já validada: cada fatia forma o mesmo formato (congruente por
  rotação de 180° entre pares), sem sobreposição, sem tocar wormhole/home de
  outra fatia.
- `src/lib/draftEngine.ts` — categoria de pick `'slice'`: escolher uma fatia
  já define `seatId` do jogador. `pools.slices` guarda as fatias disponíveis.
- `src/components/draft/DraftBoard.tsx` — seção "Fatia" já renderiza os cards
  de fatia disponíveis (hoje só com o rótulo "Fatia N · assento X").
- `src/data/tiles.ts` — pool de sistemas (`TILES`, campo `draft: boolean`
  marca o que pode ser sorteado) e `optimalValues(planets)`, que já calcula
  `{ resources, influence, total }` de um grupo de planetas exatamente como o
  Milty mostra em "Optimal: X Y".
- Posições de wormhole (3, 6, 20, 29) e home (23, 27, 32, 36) ficam **fora**
  do sorteio — não fazem parte de `SliceLayout.tiles`.

## O que o Milty faz (referência, sessão inspecionada em 2026-07-11)

Aba CONFIG expõe os parâmetros do sorteio (para 5 tiles/fatia, 7 fatias):

```
Number of Slices: 7              Minimum Optimal Influence: 4
Number of Factions: 9            Minimum Optimal Resources: 2.5
Min. 2 alpha/beta wormholes: no  Minimum Optimal Total: 9
Max. 1 wormhole per slice: no    Maximum Optimal Total: 13
Minimum legendary planets: 0     Seed: 1032841894064741 (reprodutível)
```

Cada fatia gerada mostra `Total: 9 8` (soma bruta resources/influence) e
`Optimal: 7 4` (via a mesma lógica de `optimalValues`). O mapa de 4p do Milty
usa hyperlanes num layout compacto próprio — **isso a gente não replica**;
ficamos com o anel de 36 posições e as 4 fatias de 7 tiles já definidas.

## O que falta implementar

### 1. `src/lib/sliceBalance.ts` (novo, funções puras)

```ts
export interface SliceBalanceConfig {
  minOptimalResources: number;
  minOptimalInfluence: number;
  minOptimalTotal: number;
  maxOptimalTotal: number;
  maxWormholesPerSlice: number; // Infinity = sem limite
  minLegendaryPlanets: number;  // mínimo por fatia; 0 = sem exigência
  maxAttempts: number;          // tentativas antes de aceitar o melhor achado
}

export function draftableTilePool(includePoK: boolean): Tile[]; // TILES.filter(t => t.draft)

export function sliceStats(tileIds: number[]): { resources: number; influence: number; total: number };
// soma optimalValues(tile.planets) de cada tile da fatia

/** Sorteia tileIds reais para cada SliceLayout, tentando respeitar `config`.
 *  Retorna o melhor conjunto encontrado em `maxAttempts` tentativas (não
 *  trava se as regras forem inatingíveis) + o seed usado (reprodutibilidade). */
export function generateBalancedAssignment(
  slices: SliceLayout[],
  config: SliceBalanceConfig,
  seed?: number,
): { assignment: Record<string, number[]>; seed: number; balanced: boolean };
```

Algoritmo sugerido (mesma ideia do Milty, simplificada):
1. Embaralhar o pool draftável (com RNG seedado, para reprodutibilidade — dá
   pra usar um LCG simples ou `seedrandom`, já que `Math.random()` não aceita
   seed).
2. Distribuir 7 tiles para cada fatia (na ordem do array `SLICE_LAYOUTS`).
3. Calcular `sliceStats` de cada fatia; checar se todas ficam dentro de
   `[minOptimalTotal, maxOptimalTotal]`, com `resources >= minOptimalResources`
   e `influence >= minOptimalInfluence`, e checar contagem de wormhole/legendary
   por fatia.
4. Se não passar, repetir do passo 1 até `maxAttempts`; ao esgotar, devolver a
   tentativa com menor variância de `total` entre fatias (`balanced: false`
   avisa que foi um "melhor esforço", não uma garantia).

### 2. Ligar ao `createDraftState`

Em `src/lib/draftEngine.ts`, quando `getSliceLayouts(playerCount)` existir:
trocar a chamada a `buildSliceModeMapString()` por `generateBalancedAssignment`
e montar a map string real (posição → tileId sorteado; wormhole/home continuam
`0`). Guardar o `seed` usado em `DraftSettings` (assim dá pra reproduzir/depurar
uma sala específica).

### 3. UI: mostrar Total/Optimal na fatia (`DraftBoard.tsx`)

Card de cada fatia ganha os dois badges, iguais ao Milty:
`sliceStats(tileIdsDaFatia)` lido a partir de `state.mapString` (resolver as 7
posições da fatia via `parseMapString`/`MAP_POSITIONS`, pegar os `Tile` reais
via `getTile(id)`, somar `optimalValues`). Vale extrair um helper
`sliceTileIds(mapString, slice): number[]` (em `slices.ts` ou no novo
`sliceBalance.ts`) para não duplicar essa resolução entre componentes.

### 4. Config (v1: hardcoded; v2: ajustável)

Primeira versão pode fixar um `SliceBalanceConfig` razoável direto no código
(sem UI de configuração, ao contrário da aba CONFIG do Milty). Como nossa
fatia tem 7 tiles (não 5), os limites do Milty não são um copy-paste direto —
tratar os números abaixo como ponto de partida a calibrar por playtest, não
como valor definitivo:

| Parâmetro | Milty (5 tiles) | Sugestão inicial (7 tiles) |
|---|---|---|
| minOptimalResources | 2.5 | ~3.5 |
| minOptimalInfluence | 4 | ~5.5 |
| minOptimalTotal | 9 | ~12.5 |
| maxOptimalTotal | 13 | ~18 |

## Em aberto (decidir ao implementar)

- Aceitar "melhor esforço" após `maxAttempts` ou travar até achar uma
  combinação perfeita (Milty aparentemente aceita o que sair dentro das
  regras — não fica claro se ele também tem um teto de tentativas).
- ~~Wormhole/home (3,6,20,29 / 23,27,32,36) entram no sorteio no futuro ou
  ficam fora para sempre?~~ Resolvido: home nunca entra; wormhole (as 2 fatias
  filler sem planeta, 39/79 alpha e 40/80 beta) ficam fora de
  `draftableTilePool` e são sorteadas separadamente nas posições vazias
  (`PlayerLayout.empty`) só quando o draft termina (`placeWormholeAnomalies`
  em `sliceBalance.ts`, chamada em `draftEngine.ts` no momento em que
  `status` vira `'complete'`) — assim a posição delas não influencia a
  escolha de assento/fatia durante o draft.
- Config fixa no código vs. exposta na tela de criação de sala (como a aba
  CONFIG do Milty).
- Vale a pena guardar o `seed` visível pro usuário (tipo "Session" do Milty),
  para permitir reproduzir uma sala específica?
