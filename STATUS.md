# Status do rebuild — TI4 Map Builder + Draft

> Plano completo em `/home/mmmarcelom/.claude/plans/greedy-knitting-avalanche.md`

## Objetivo
Reconstrução do zero (mantendo stack + assets). Primeira feature: importar uma
**map string padrão TI** (estilo ti-assistant), renderizar a galáxia completa e
rodar um **draft realtime** de Speaker / Facção / Posição (no turno, o jogador
escolhe **um** item de qualquer um dos três pools).

Decisões: manter stack (Next 16 / Supabase / Zustand / Tailwind v4); realtime via
Supabase desde já; map string padrão; 1ª entrega = só importar+renderizar (sem
edição manual); posições derivadas do player count (4/5/6).

## ✅ Feito (código completo, compila)
- **`npm install`** rodado; docs do Next 16 lidos (`params` é Promise; `useSearchParams`
  exige `<Suspense>`).
- **Camada de dados** consolidada em `src/data/`:
  - `tiles.json` (IDs 1–82, movido da raiz) + `tiles.ts` (tipos + `getTile`, `tileImage`, `optimalValues`).
  - `factions-list.json` + `factions.ts` (24 facções, `factionImage`, `factionPool`).
  - `seats.ts` — layouts de assentos 4/5/6 jogadores (portado do antigo `map.json`).
- **Geometria + parser** (peça crítica, **validada por cross-check**):
  - `src/lib/hex.ts` — axial flat-top, `ring()`, `hexToPixel`, `hexCorners`.
  - `src/lib/mapString.ts` — `MAP_POSITIONS` (espiral anel-a-anel, horário do norte, 36 pos),
    `parseMapString`, `isValidMapString`. Confirmado: homes 6p caem em 19/22/25/28/31/34.
- **Componentes de mapa**: `Hexagon.tsx`, `GalaxyMap.tsx` (render da galáxia + assentos clicáveis).
- **Motor de draft puro**: `src/types/draft.ts` + `src/lib/draftEngine.ts`
  (`createDraftState`, `makePick`, `advanceTurn` snake, `isComplete`, `gameOrder`).
- **Modelo do Speaker (revisado)**: o Speaker é um **token único** (`DraftPlayer.isSpeaker`,
  pool `speakerAvailable`), NÃO slots numerados. Cada jogador draft a facção + posição; o
  speaker é um pick global. A **ordem de jogo** é derivada das posições físicas no sentido
  **horário** a partir do assento do speaker (`seatsClockwiseFrom` em `data/seats.ts`, ângulo
  geométrico dos homes). Turnos pulam quem não tem pick legal; se só sobra o speaker, o jogador
  da vez é forçado a pegá-lo. Mapa mostra ★Speaker no home (quando tem speaker+posição) e o nº
  de ordem (2º/3º…) nos demais assentos assim que o speaker tem assento.
- **Realtime**: `src/lib/supabase.ts` (reusado) + `src/store/roomStore.ts` reescrito tipado
  (corrigido bug de cleanup de canal).
- **Páginas**: `src/app/page.tsx` (setup + textarea da map string + botão "exemplo 6p"),
  `src/app/room/[id]/page.tsx` (`<Suspense>` + map + DraftBoard + Roster).
  Componentes de draft: `src/components/draft/DraftBoard.tsx`, `Roster.tsx`.
- **Limpeza**: removidos `map.json`/`factions.json`/`tiles.json` (raiz), duplicados em
  `src/data`, `src/lib/{draft,game-logic,data,test-supabase}.ts`, `draftStore.ts`,
  `types/game.ts`, `MapEditor.tsx`, `MapGrid.tsx`, `src/components/room/`, rotas `draft/` e `matches/`.
- **Qualidade**: `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run build` ✅.

## ✅ Verificação end-to-end (2026-06-19, com rede)
O ambiente passou a ter internet. O projeto Supabase remoto estava **`INACTIVE`**
(pausado por inatividade — por isso o DNS não resolvia); restaurado via management API
→ `ACTIVE_HEALTHY`. Verificações automatizáveis feitas, **todas verdes**:
- **Migration `rooms` já aplicada**: tabela existe, REST responde com a anon key (há rooms antigas).
- **Build/dev**: `tsc --noEmit` ✅; `next dev` sobe em ~320ms; `/` e `/room/[id]` rendem
  HTTP 200 sem erro de runtime no log (os "error" do HTML são do `global-error.js` do Next).
- **Realtime** (mecanismo exato do `roomStore`): teste Node com 2 clients —
  insert → subscribe `postgres_changes` UPDATE → update → **evento recebido** → cleanup. OK.
- **Draft engine** (`draftEngine.ts` real, via `--experimental-strip-types`): draft 6p completo
  em 18 picks, snake, **sem duplicatas** de facção/assento/slot, `gameOrder` = sort por
  speakerSlot, rejeição de pick fora de turno. OK.
- **Geometria/parser**: ring sizes 6/12/18 (36 pos, únicas, centro excluído); homes 6p caem em
  `[[0,-3],[3,-3],[3,0],[0,3],[-3,3],[-3,0]]` — batem **em ordem** com `seats.ts` (índices
  18/21/24/27/30/33 = posições 19/22/25/28/31/34). Parser coloca Mecatol (id 18) no centro + 36.

## ⛔ Pendente (só requer olhos humanos / browser)
1. **Confirmação VISUAL no browser**: abrir `/`, 6 jogadores, "Usar exemplo (6p)", criar draft,
   e conferir a galáxia em `/room/[id]` contra a mesma string no **ti-assistant**. O cross-check
   de homes bate **em ordem** (não invertida), o que indica winding correto — mas a confirmação
   pixel-a-pixel ainda não foi feita por mim. Se sair espelhado, inverter `RING_STEPS` em
   `src/lib/hex.ts` (fonte única).
2. **Draft 2 abas**: abrir a sala com `?player=player-0` e `?player=player-1`, alternar picks e
   confirmar o sync na UI (o canal realtime já está provado funcionar no nível do Supabase).
3. **7/8 jogadores**: ainda não suportado (faltam layouts de assentos). Home limita a 4/5/6.

## Próximas features (depois da verificação)
- Edição manual do mapa (map-builder completo: paleta, swap de tiles, randomize, export string).
- Stats de slice por assento (resources/influence/optimal, wormholes, tech skips) usando `optimalValues`.
- Identidade do jogador (hoje via `?player=`); lobby/entrada de jogadores.
