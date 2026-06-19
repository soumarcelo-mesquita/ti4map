import { DraftCategory, DraftPlayer, DraftState, DraftSettings } from '@/types/draft';
import { factionPool } from '@/data/factions';
import { getLayout, seatsClockwiseFrom } from '@/data/seats';

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
  /** number of factions in the draft pool (defaults to playerCount + 2) */
  factionPoolSize?: number;
}

export function createDraftState(config: CreateDraftConfig): DraftState {
  const { playerNames, playerCount, mapString, includePoK } = config;
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
    isSpeaker: false,
  }));

  const factions = shuffle(factionPool(includePoK).map((f) => f.id)).slice(0, factionPoolSize);
  const seats = layout.seats.map((s) => s.id);

  const settings: DraftSettings = { playerCount, includePoK, factionPoolSize, mapString };

  return {
    status: 'drafting',
    mapString,
    settings,
    players,
    pools: { factions, seats, speakerAvailable: true },
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
  return player.isSpeaker;
}

/** The single Speaker token is still up for grabs (single source of truth = isSpeaker). */
function speakerOpen(state: DraftState): boolean {
  return !state.players.some((p) => p.isSpeaker);
}

/** Whether a player still has any legal pick left (otherwise their turn is skipped). */
function canPick(player: DraftPlayer, state: DraftState): boolean {
  return (
    (state.pools.factions.length > 0 && player.faction === null) ||
    (state.pools.seats.length > 0 && player.seatId === null) ||
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
    const v = String(value);
    if (!pools.seats.includes(v)) return { ok: false, state, error: 'Position unavailable.' };
    pools.seats = pools.seats.filter((s) => s !== v);
    target.seatId = v;
  } else {
    if (players.some((p) => p.isSpeaker)) return { ok: false, state, error: 'O speaker já foi escolhido.' };
    pools.speakerAvailable = false;
    target.isSpeaker = true;
  }

  let next: DraftState = { ...state, players, pools };

  if (isComplete(next)) {
    next = { ...next, status: 'complete', gameOrder: computeGameOrder(players, state.settings.playerCount) };
  } else {
    const { currentTurnIndex, isSnakeDescending } = advanceTurn(next);
    next = { ...next, currentTurnIndex, isSnakeDescending };
  }

  return { ok: true, state: next };
}
