import { DraftCategory, DraftPlayer, DraftState, DraftSettings } from '@/types/draft';
import { factionPool } from '@/data/factions';
import { getLayout, seatsClockwiseFrom } from '@/data/seats';
import { getSliceLayouts, buildSliceModeMapString } from '@/data/slices';
import { generateBalancedAssignment, placeSliceAtSeat, placeWormholeAnomalies, SliceBalanceConfig } from '@/lib/sliceBalance';

/** Starting point for 7-tile slices; calibrate by playtest (see docs/slice-balance-draft.md). */
const DEFAULT_SLICE_BALANCE_CONFIG: SliceBalanceConfig = {
  minOptimalResources: 3.5,
  minOptimalInfluence: 5.5,
  minOptimalTotal: 12.5,
  maxOptimalTotal: 18,
  maxWormholesPerSlice: Infinity,
  minLegendaryPlanets: 0,
  maxAttempts: 1000,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CreateDraftConfig {
  playerNames: string[];
  playerCount: number;
  mapString: string;
  includePoK: boolean;
  includeTE?: boolean;
  /** number of factions in the draft pool (defaults to playerCount + 2) */
  factionPoolSize?: number;
}

export function createDraftState(config: CreateDraftConfig): DraftState {
  const { playerNames, playerCount, mapString, includePoK } = config;
  const includeTE = config.includeTE ?? false;
  const factionPoolSize = config.factionPoolSize ?? playerCount + 2;

  const layout = getLayout(playerCount);
  if (!layout) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }

  const players: DraftPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: playerNames[i]?.trim() || `Player ${i + 1}`,
    faction: null,
    seatId: null,
    sliceId: null,
    isSpeaker: false,
  }));

  const factions = shuffle(factionPool(includePoK, includeTE).map((f) => f.id)).slice(0, factionPoolSize);
  const sliceLayouts = getSliceLayouts(playerCount);
  const isSliceDraft = sliceLayouts !== undefined && mapString.trim() === buildSliceModeMapString().trim();
  const seats = layout.seats.map((s) => s.id);
  const slices = isSliceDraft && sliceLayouts ? sliceLayouts.map((s) => s.id) : [];

  const settings: DraftSettings = { playerCount, includePoK, includeTE, factionPoolSize, mapString };
  if (isSliceDraft && sliceLayouts) {
    const { assignment, seed } = generateBalancedAssignment(sliceLayouts, DEFAULT_SLICE_BALANCE_CONFIG, undefined, includePoK, includeTE);
    settings.sliceSeed = seed;
    settings.sliceAssignment = assignment;
  }

  return {
    status: 'drafting',
    mapString,
    settings,
    players,
    pools: { factions, seats, slices, speakerAvailable: true },
    turnOrder: shuffle(players.map((p) => p.id)),
    currentTurnIndex: 0,
    isSnakeDescending: true,
    gameOrder: null,
  };
}

export function currentPlayerId(state: DraftState): string | null {
  if (state.status !== 'drafting') return null;
  return state.turnOrder[state.currentTurnIndex] ?? null;
}

/**
 * Player who picks after the current one (snake order, skipping done players).
 * Computed from the current state, so it's a preview — the current player's
 * pending pick could, in rare cases, change who is actually up next.
 */
export function nextPlayerId(state: DraftState): string | null {
  if (state.status !== 'drafting') return null;
  const { currentTurnIndex } = advanceTurn(state);
  return state.turnOrder[currentTurnIndex] ?? null;
}

export function hasPicked(player: DraftPlayer, category: DraftCategory): boolean {
  if (category === 'faction') return player.faction !== null;
  if (category === 'position') return player.seatId !== null;
  if (category === 'slice') return player.sliceId !== null;
  return player.isSpeaker;
}

/** The single Speaker token is still up for grabs (single source of truth = isSpeaker). */
export function speakerOpen(state: DraftState): boolean {
  return !state.players.some((p) => p.isSpeaker);
}

/** Whether a player still has any legal pick left (otherwise their turn is skipped). */
function canPick(player: DraftPlayer, state: DraftState): boolean {
  return (
    (state.pools.factions.length > 0 && player.faction === null) ||
    (!speakerOpen(state) && state.pools.seats.length > 0 && player.seatId === null) ||
    (state.pools.slices.length > 0 && player.sliceId === null) ||
    (speakerOpen(state) && !player.isSpeaker)
  );
}

/** One snake step (count up to the end, bounce, count back down). */
function snakeStep(idx: number, descending: boolean, last: number): { idx: number; descending: boolean } {
  if (descending) {
    if (idx === last) return { idx, descending: false }; // bounce: same player again
    return { idx: idx + 1, descending };
  }
  if (idx === 0) return { idx, descending: true }; // bounce
  return { idx: idx - 1, descending };
}

/**
 * Snake-draft turn advance, skipping any player who has nothing left to pick.
 * Assumes the draft is not yet complete (so at least one player can pick).
 */
function advanceTurn(state: DraftState): { currentTurnIndex: number; isSnakeDescending: boolean } {
  const last = state.turnOrder.length - 1;
  let idx = state.currentTurnIndex;
  let descending = state.isSnakeDescending;

  for (let guard = 0; guard <= (last + 1) * 4; guard++) {
    const stepped = snakeStep(idx, descending, last);
    idx = stepped.idx;
    descending = stepped.descending;
    const player = state.players.find((p) => p.id === state.turnOrder[idx]);
    if (player && canPick(player, state)) {
      return { currentTurnIndex: idx, isSnakeDescending: descending };
    }
  }
  return { currentTurnIndex: idx, isSnakeDescending: descending };
}

export function isComplete(state: DraftState): boolean {
  return (
    !speakerOpen(state) &&
    state.players.every((p) => p.faction !== null && p.seatId !== null)
  );
}

/** Game order: clockwise around the galaxy starting at the Speaker's seat. */
function computeGameOrder(players: DraftPlayer[], playerCount: number): string[] | null {
  const speaker = players.find((p) => p.isSpeaker);
  const layout = getLayout(playerCount);
  if (!speaker?.seatId || !layout) return null;
  const bySeat = new Map(players.filter((p) => p.seatId).map((p) => [p.seatId!, p.id]));
  return seatsClockwiseFrom(layout.seats, speaker.seatId)
    .map((seatId) => bySeat.get(seatId))
    .filter((id): id is string => Boolean(id));
}

export interface PickResult {
  ok: boolean;
  state: DraftState;
  error?: string;
}

/**
 * Apply a draft pick. Returns a new state (pure). On invalid picks returns the
 * original state with ok=false and an error message.
 */
export function makePick(
  state: DraftState,
  playerId: string,
  category: DraftCategory,
  value: string | number,
): PickResult {
  if (state.status !== 'drafting') {
    return { ok: false, state, error: 'Draft is already complete.' };
  }
  if (currentPlayerId(state) !== playerId) {
    return { ok: false, state, error: 'Not your turn.' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, state, error: 'Unknown player.' };
  if (hasPicked(player, category)) {
    return { ok: false, state, error: `You already drafted a ${category}.` };
  }

  const pools = { ...state.pools };
  const players = state.players.map((p) => ({ ...p }));
  const target = players.find((p) => p.id === playerId)!;

  if (category === 'faction') {
    const v = String(value);
    if (!pools.factions.includes(v)) return { ok: false, state, error: 'Faction unavailable.' };
    pools.factions = pools.factions.filter((f) => f !== v);
    target.faction = v;
  } else if (category === 'position') {
    if (speakerOpen(state)) {
      return { ok: false, state, error: 'Escolha o speaker antes de escolher uma posição.' };
    }
    const v = String(value);
    if (!pools.seats.includes(v)) return { ok: false, state, error: 'Position unavailable.' };
    pools.seats = pools.seats.filter((s) => s !== v);
    target.seatId = v;
  } else if (category === 'slice') {
    const v = String(value);
    if (!pools.slices.includes(v)) return { ok: false, state, error: 'Fatia indisponível.' };
    if (!getSliceLayouts(state.settings.playerCount)?.some((s) => s.id === v)) {
      return { ok: false, state, error: 'Fatia inválida.' };
    }
    pools.slices = pools.slices.filter((s) => s !== v);
    target.sliceId = v;
  } else {
    if (players.some((p) => p.isSpeaker)) return { ok: false, state, error: 'O speaker já foi escolhido.' };
    pools.speakerAvailable = false;
    target.isSpeaker = true;
    // Speaker is always seated first (position 1 on the map).
    const speakerSeatId = getLayout(state.settings.playerCount)?.seats.find((s) => s.label === 'Speaker')?.id;
    if (speakerSeatId && pools.seats.includes(speakerSeatId)) {
      pools.seats = pools.seats.filter((s) => s !== speakerSeatId);
      target.seatId = speakerSeatId;
    }
  }

  let mapString = state.mapString;
  if (target.sliceId && target.seatId && state.settings.sliceAssignment) {
    const seatTemplate = getSliceLayouts(state.settings.playerCount)?.find((s) => s.seatId === target.seatId);
    const content = state.settings.sliceAssignment[target.sliceId];
    if (seatTemplate && content) {
      mapString = placeSliceAtSeat(mapString, seatTemplate, content);
    }
  }

  let next: DraftState = { ...state, players, pools, mapString };

  if (isComplete(next)) {
    // Slice-draft rooms reserve the map's anomaly slots (empty during the
    // draft) for the wormhole filler tiles; scatter them only once the draft
    // is done, so seat/slice picks can't be made based on where they land.
    const finalMapString = state.settings.sliceAssignment
      ? placeWormholeAnomalies(next.mapString, state.settings.playerCount, state.settings.includePoK)
      : next.mapString;
    next = {
      ...next,
      mapString: finalMapString,
      status: 'complete',
      gameOrder: computeGameOrder(players, state.settings.playerCount),
    };
  } else {
    const { currentTurnIndex, isSnakeDescending } = advanceTurn(next);
    next = { ...next, currentTurnIndex, isSnakeDescending };
  }

  return { ok: true, state: next };
}
