import { BlindPickState, DraftCategory, DraftPlayer, DraftState, DraftSettings } from '@/types/draft';
import { factionPool } from '@/data/factions';
import { getLayout, seatsClockwiseFrom, type MapVariant } from '@/data/seats';
import { getSliceLayouts, buildSliceModeMapString, type SliceLayout } from '@/data/slices';
import { HYPERLANE_TILES } from '@/data/hyperlanes';
import { MAP_POSITIONS } from '@/lib/mapString';
import { generateBalancedAssignment, placeSliceAtSeat, placeWormholeAnomalies, SliceBalanceConfig } from '@/lib/sliceBalance';

/**
 * Starting point for 7-tile slices (4p); calibrate by playtest (see
 * docs/slice-balance-draft.md). `minOptimalTotal`/`maxOptimalTotal` are
 * shifted up from the original 12.5/18 to make room for `sliceStats`'
 * tech-specialty bonus (+1/+1 per specialty planet, ~+3.3 total on an
 * average 7-tile slice) — otherwise most draws would blow past the old
 * ceiling before the bonus existed. `maxAttempts` is raised from 1000 to
 * 5000 for the same reason, plus `minRelativeToMax` (a whole-draw check, not
 * per slice) tightens the pool further when `extraSlices` pushes close to
 * the draftable pool's size; empirically (measured against tiles.json) the
 * tightest case — 4p + 2 extra slices, PoK only, 42 of 51 tiles used — still
 * finds a passing draw in ~1/250 attempts, so 5000 gives an overwhelming
 * safety margin at negligible cost (sub-millisecond per 1000 attempts).
 */
const DEFAULT_SLICE_BALANCE_CONFIG: SliceBalanceConfig = {
  minOptimalResources: 3.5,
  minOptimalInfluence: 5.5,
  minOptimalTotal: 16,
  maxOptimalTotal: 22,
  maxWormholesPerSlice: Infinity,
  minLegendaryPlanets: 0,
  minRelativeToMax: 0.5,
  maxAttempts: 5000,
};

/**
 * Starting point for 5-tile slices (6p, and 5p once it gets a layout) — a
 * 7-tile config's thresholds are unreachable with 2 fewer tiles. These reuse
 * Milty Draft's own 5-tile reference numbers (docs/slice-balance-draft.md)
 * rather than a proportional guess; still calibrate by playtest.
 *
 * maxAttempts is higher than the 4p config's: with PoK/TE on, the draftable
 * pool (70 tiles) is much bigger than what 6 slices need (30), so a passing
 * split takes ~1600 shuffles on average (measured), occasionally a few
 * thousand more — 1000 attempts left it unbalanced almost every room. 20000
 * attempts costs ~15ms (measured) and hits 100% in testing.
 *
 * `minOptimalTotal`/`maxOptimalTotal` are shifted up from Milty's original
 * 9/13 to make room for `sliceStats`' tech-specialty bonus (+1/+1 per
 * specialty planet, ~+2.5 total on an average 5-tile slice) — same reasoning
 * as `DEFAULT_SLICE_BALANCE_CONFIG` above.
 */
const FIVE_TILE_SLICE_BALANCE_CONFIG: SliceBalanceConfig = {
  minOptimalResources: 2.5,
  minOptimalInfluence: 4,
  minOptimalTotal: 11,
  maxOptimalTotal: 19,
  maxWormholesPerSlice: Infinity,
  minLegendaryPlanets: 0,
  minRelativeToMax: 0.5,
  maxAttempts: 20000,
};

/** Map-string position (1-36) of an axial coordinate. */
function positionOf([q, r]: [number, number]): number {
  return MAP_POSITIONS.findIndex((p) => p.q === q && p.r === r) + 1;
}

/**
 * Pre-rolled board for hyperlane rooms (5p): hyperlane tiles go in their
 * fixed wedge, then each seat gets a balanced 5-system set straight onto its
 * own positions — players only draft faction, seat and speaker, not slices.
 * Homes stay "0" like every other room (the seat pick fills them).
 */
export function generateHyperlaneMap(
  playerCount: number,
  includePoK: boolean,
  includeTE: boolean = false,
): { mapString: string; seed: number } {
  const layout = getLayout(playerCount, 'hyperlanes');
  const hyperlanes = HYPERLANE_TILES[playerCount];
  if (!layout || !hyperlanes) throw new Error(`No hyperlane board for ${playerCount} players`);

  const tokens = buildSliceModeMapString().split(' ');
  for (const h of hyperlanes) tokens[positionOf(h.coord) - 1] = h.token;

  const seatSlices: SliceLayout[] = layout.seats.map((seat) => ({
    id: seat.id,
    seatId: seat.id,
    tiles: seat.slice.map(positionOf),
  }));
  const { assignment, seed } = generateBalancedAssignment(
    seatSlices,
    FIVE_TILE_SLICE_BALANCE_CONFIG,
    undefined,
    includePoK,
    includeTE,
  );
  let mapString = tokens.join(' ');
  for (const slice of seatSlices) mapString = placeSliceAtSeat(mapString, slice, assignment[slice.id]);
  return { mapString, seed };
}

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
  /** faction ids to keep out of the draft pool entirely */
  excludedFactionIds?: string[];
  /** surplus fatias beyond playerCount in slice-draft mode (0/absent = exactly one per player) */
  extraSlices?: number;
  /** factions forced into the pool (cheat) unless excluded/vetoed */
  pinnedFactionIds?: string[];
  /** alternative board; its map string comes pre-rolled (see `generateHyperlaneMap`) */
  mapVariant?: MapVariant;
  /** factions are picked simultaneously and in secret before the turn-based draft */
  blindFactionPick?: boolean;
}

function buildPlayers(playerNames: string[], playerCount: number): DraftPlayer[] {
  return Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: playerNames[i]?.trim() || `Player ${i + 1}`,
    faction: null,
    seatId: null,
    sliceId: null,
    isSpeaker: false,
  }));
}

export function createDraftState(config: CreateDraftConfig): DraftState {
  const { playerNames, playerCount, mapString, includePoK } = config;
  const includeTE = config.includeTE ?? false;
  const factionPoolSize = config.factionPoolSize ?? playerCount + 2;
  const excludedFactionIds = config.excludedFactionIds ?? [];
  const mapVariant = config.mapVariant;

  const layout = getLayout(playerCount, mapVariant);
  if (!layout) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }

  const players: DraftPlayer[] = buildPlayers(playerNames, playerCount);

  const eligibleFactions = factionPool(includePoK, includeTE).filter((f) => !excludedFactionIds.includes(f.id));
  const eligibleIds = eligibleFactions.map((f) => f.id);
  const pinnedFactionIds = config.pinnedFactionIds ?? [];
  // Pinned factions always make the pool unless the host excluded them or a
  // player vetoed them (both end up in `excludedFactionIds`).
  const pinned = pinnedFactionIds.filter((id) => eligibleIds.includes(id)).slice(0, factionPoolSize);
  const rest = shuffle(eligibleIds.filter((id) => !pinned.includes(id))).slice(0, factionPoolSize - pinned.length);
  const factions = shuffle([...pinned, ...rest]);
  const extraSlices = config.extraSlices ?? 0;
  const sliceLayouts = mapVariant ? undefined : getSliceLayouts(playerCount, extraSlices);
  const isSliceDraft = sliceLayouts !== undefined && mapString.trim() === buildSliceModeMapString().trim();
  const seats = layout.seats.map((s) => s.id);
  const slices = isSliceDraft && sliceLayouts ? sliceLayouts.map((s) => s.id) : [];

  const settings: DraftSettings = {
    playerCount,
    includePoK,
    includeTE,
    factionPoolSize,
    mapString,
    excludedFactionIds,
    extraSlices,
  };
  if (mapVariant) settings.mapVariant = mapVariant;
  if (config.blindFactionPick) settings.blindFactionPick = true;
  if (isSliceDraft && sliceLayouts) {
    const balanceConfig = sliceLayouts[0].tiles.length <= 5 ? FIVE_TILE_SLICE_BALANCE_CONFIG : DEFAULT_SLICE_BALANCE_CONFIG;
    const { assignment, seed } = generateBalancedAssignment(sliceLayouts, balanceConfig, undefined, includePoK, includeTE);
    settings.sliceSeed = seed;
    settings.sliceAssignment = assignment;
  }

  const state: DraftState = {
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
  if (config.blindFactionPick) {
    state.status = 'blind';
    state.blind = { round: 1, pendingPlayerIds: players.map((p) => p.id), tried: {}, log: [] };
  }
  return state;
}

export interface CreateVetoPhaseConfig extends CreateDraftConfig {
  /** how many factions each player must secretly veto before the draft starts */
  vetoCount: number;
}

/**
 * A pre-draft room: players are seated but nothing is shuffled yet — the
 * faction pool is resolved by `finalizeVetoPhase` once every player has
 * submitted their secret vetoes.
 */
export function createVetoState(config: CreateVetoPhaseConfig): DraftState {
  const { playerNames, playerCount, mapString, includePoK } = config;
  const includeTE = config.includeTE ?? false;
  const factionPoolSize = config.factionPoolSize ?? playerCount + 2;
  const excludedFactionIds = config.excludedFactionIds ?? [];

  if (!getLayout(playerCount, config.mapVariant)) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }

  const settings: DraftSettings = {
    playerCount,
    includePoK,
    includeTE,
    factionPoolSize,
    mapString,
    excludedFactionIds,
    vetoCount: config.vetoCount,
    extraSlices: config.extraSlices ?? 0,
  };
  if (config.pinnedFactionIds?.length) settings.pinnedFactionIds = config.pinnedFactionIds;
  if (config.mapVariant) settings.mapVariant = config.mapVariant;
  if (config.blindFactionPick) settings.blindFactionPick = true;

  return {
    status: 'veto',
    mapString,
    settings,
    players: buildPlayers(playerNames, playerCount),
    pools: { factions: [], seats: [], slices: [], speakerAvailable: true },
    turnOrder: [],
    currentTurnIndex: 0,
    isSnakeDescending: true,
    gameOrder: null,
  };
}

/**
 * Resolves the veto phase into the real drafting state. `vetoedFactionIds` is
 * the union of every player's secret picks (duplicates collapse — a faction
 * vetoed by more than one player is only removed once). Caps how many are
 * actually excluded so at least `playerCount` factions remain, protecting
 * against a degenerate case where combined vetoes would empty the pool.
 */
export function finalizeVetoPhase(state: DraftState, vetoedFactionIds: string[]): DraftState {
  if (state.status !== 'veto') {
    throw new Error('Draft is not in the veto phase.');
  }
  const { settings } = state;
  const hostExcluded = settings.excludedFactionIds ?? [];
  const eligibleAfterHostExclusion = factionPool(settings.includePoK, settings.includeTE ?? false).filter(
    (f) => !hostExcluded.includes(f.id),
  );
  const uniqueVetoes = Array.from(new Set(vetoedFactionIds));
  const maxVetoable = Math.max(0, eligibleAfterHostExclusion.length - settings.playerCount);
  const cappedVetoes = uniqueVetoes.slice(0, maxVetoable);

  return createDraftState({
    playerNames: state.players.map((p) => p.name),
    playerCount: settings.playerCount,
    mapString: state.mapString,
    includePoK: settings.includePoK,
    includeTE: settings.includeTE,
    factionPoolSize: settings.factionPoolSize,
    excludedFactionIds: [...hostExcluded, ...cappedVetoes],
    extraSlices: settings.extraSlices,
    pinnedFactionIds: settings.pinnedFactionIds,
    mapVariant: settings.mapVariant,
    blindFactionPick: settings.blindFactionPick,
  });
}

/**
 * Factions a player may choose in the current blind round: the pool (which
 * already excludes factions locked by other players) minus every faction this
 * player tried in an earlier round and lost to a collision.
 */
export function blindOptions(state: DraftState, playerId: string): string[] {
  const tried = state.blind?.tried[playerId] ?? [];
  return state.pools.factions.filter((f) => !tried.includes(f));
}

/**
 * Resolves one blind-pick round. `picks` maps each pending player to the
 * faction they secretly chose. A faction chosen by exactly one player is
 * locked for them; factions chosen by 2+ players go to nobody — those players
 * play another round among themselves, with the contested faction (and any
 * they lost before) no longer offered to them.
 *
 * Degenerate case: a player who has already tried every faction still in the
 * pool gets one assigned at random (the pool always holds at least as many
 * factions as unresolved players, so a distinct one always exists).
 *
 * Deterministic except for that fallback, so every client resolving the same
 * round converges on the same state.
 */
export function resolveBlindRound(state: DraftState, picks: Record<string, string>): PickResult {
  const blind = state.blind;
  if (state.status !== 'blind' || !blind) {
    return { ok: false, state, error: 'Draft is not in the blind pick phase.' };
  }
  for (const pid of blind.pendingPlayerIds) {
    const f = picks[pid];
    if (!f) return { ok: false, state, error: `Missing blind pick for ${pid}.` };
    if (!blindOptions(state, pid).includes(f)) return { ok: false, state, error: `Invalid blind pick for ${pid}.` };
  }

  const byFaction = new Map<string, string[]>();
  for (const pid of blind.pendingPlayerIds) {
    const f = picks[pid];
    byFaction.set(f, [...(byFaction.get(f) ?? []), pid]);
  }

  const players = state.players.map((p) => ({ ...p }));
  let factions = [...state.pools.factions];
  const tried: Record<string, string[]> = { ...blind.tried };
  const collisions: Record<string, string[]> = {};
  let pending: string[] = [];

  // Iterate in pending order so the result doesn't depend on Map/obj ordering quirks.
  for (const pid of blind.pendingPlayerIds) {
    const f = picks[pid];
    const pickers = byFaction.get(f)!;
    if (pickers.length === 1) {
      players.find((p) => p.id === pid)!.faction = f;
      factions = factions.filter((x) => x !== f);
    } else {
      collisions[f] = pickers;
      tried[pid] = [...(tried[pid] ?? []), f];
      pending.push(pid);
    }
  }

  // Fallback: anyone left without options gets a random faction still in the pool.
  const autoAssigned: string[] = [];
  for (;;) {
    const stuck = pending.find((pid) => factions.every((f) => (tried[pid] ?? []).includes(f)));
    if (!stuck) break;
    const f = factions[Math.floor(Math.random() * factions.length)];
    players.find((p) => p.id === stuck)!.faction = f;
    factions = factions.filter((x) => x !== f);
    pending = pending.filter((x) => x !== stuck);
    autoAssigned.push(stuck);
  }

  const log = [
    ...blind.log,
    { round: blind.round, collisions, ...(autoAssigned.length ? { autoAssigned } : {}) },
  ];
  const nextBlind: BlindPickState = { round: blind.round + 1, pendingPlayerIds: pending, tried, log };
  const next: DraftState = {
    ...state,
    players,
    pools: { ...state.pools, factions },
    blind: nextBlind,
    status: pending.length > 0 ? 'blind' : 'drafting',
  };
  // Every player now has a faction, but the speaker is still open, so the
  // snake's first player always has a legal pick — no turn adjustment needed.
  return { ok: true, state: next };
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
function computeGameOrder(players: DraftPlayer[], playerCount: number, mapVariant?: MapVariant): string[] | null {
  const speaker = players.find((p) => p.isSpeaker);
  const layout = getLayout(playerCount, mapVariant);
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
    if (!getSliceLayouts(state.settings.playerCount, state.settings.extraSlices ?? 0)?.some((s) => s.id === v)) {
      return { ok: false, state, error: 'Fatia inválida.' };
    }
    pools.slices = pools.slices.filter((s) => s !== v);
    target.sliceId = v;
  } else {
    if (players.some((p) => p.isSpeaker)) return { ok: false, state, error: 'O speaker já foi escolhido.' };
    pools.speakerAvailable = false;
    target.isSpeaker = true;
    // Speaker is always seated first (position 1 on the map).
    const speakerSeatId = getLayout(state.settings.playerCount, state.settings.mapVariant)?.seats.find((s) => s.label === 'Speaker')?.id;
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
      ? placeWormholeAnomalies(
          next.mapString,
          state.settings.playerCount,
          state.settings.includePoK,
          state.settings.includeTE ?? false,
        )
      : next.mapString;
    next = {
      ...next,
      mapString: finalMapString,
      status: 'complete',
      gameOrder: computeGameOrder(players, state.settings.playerCount, state.settings.mapVariant),
    };
  } else {
    const { currentTurnIndex, isSnakeDescending } = advanceTurn(next);
    next = { ...next, currentTurnIndex, isSnakeDescending };
  }

  return { ok: true, state: next };
}
