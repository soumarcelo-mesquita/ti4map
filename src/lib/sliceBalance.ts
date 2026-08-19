import { Tile, TILES, getTile, optimalValues } from '@/data/tiles';
import { SliceLayout } from '@/data/slices';
import { getLayout } from '@/data/seats';
import { MAP_POSITIONS } from '@/lib/mapString';

/**
 * Anomaly "filler" wormhole tiles (no real planets). Kept out of the slice
 * draft pool (`draftableTilePool`) so they can't land inside a player's
 * slice; instead they're scattered into the map's reserved anomaly slots
 * (`PlayerLayout.empty`) once the draft is complete, via
 * `placeWormholeAnomalies`.
 *
 * Base game supplies one pair (39 alpha, 40 beta). PoK adds a second alpha
 * (79) but no matching no-planet beta — tile 80 looks like it should be one
 * but its art is a supernova, not a wormhole, so it's excluded here. Thunder's
 * Edge supplies the missing second beta (113).
 */
const WORMHOLE_FILLER_IDS = [39, 40, 79, 113];

function activeWormholeFillerIds(includePoK: boolean, includeTE: boolean): number[] {
  return WORMHOLE_FILLER_IDS.filter((id) => {
    if (id === 79) return includePoK;
    if (id === 113) return includeTE;
    return true;
  });
}

export interface SliceBalanceConfig {
  minOptimalResources: number;
  minOptimalInfluence: number;
  minOptimalTotal: number;
  maxOptimalTotal: number;
  maxWormholesPerSlice: number; // Infinity = sem limite
  minLegendaryPlanets: number; // mínimo por fatia; 0 = sem exigência
  maxAttempts: number; // tentativas antes de aceitar o melhor achado
}

/**
 * Base game tiles are 19–50, PoK tiles are 59–79 (gap 51–58 is home systems),
 * Thunder's Edge tiles are 92–118. `tiles.json` has no explicit expansion
 * field; same id split factions.ts uses for faction home tiles.
 */
export function draftableTilePool(includePoK: boolean, includeTE: boolean = false): Tile[] {
  return TILES.filter((t) => {
    if (!t.draft) return false;
    if (WORMHOLE_FILLER_IDS.includes(t.id)) return false;
    if (t.id <= 50) return true;
    if (t.id < 92) return includePoK;
    return includeTE;
  });
}

export function sliceStats(tileIds: number[]): { resources: number; influence: number; total: number } {
  let resources = 0;
  let influence = 0;
  for (const id of tileIds) {
    const tile = getTile(id);
    if (!tile) continue;
    const v = optimalValues(tile.planets);
    resources += v.resources;
    influence += v.influence;
  }
  return { resources, influence, total: resources + influence };
}

/** Raw (non-optimal) resource/influence sum — the "Total: R I" badge, vs. sliceStats' "Optimal: R I". */
export function rawSliceStats(tileIds: number[]): { resources: number; influence: number; total: number } {
  let resources = 0;
  let influence = 0;
  for (const id of tileIds) {
    const tile = getTile(id);
    if (!tile) continue;
    for (const p of tile.planets) {
      resources += p.resource;
      influence += p.influence;
    }
  }
  return { resources, influence, total: resources + influence };
}

function countWormholes(tileIds: number[]): number {
  return tileIds.filter((id) => getTile(id)?.wormhole != null).length;
}

function countLegendary(tileIds: number[]): number {
  let count = 0;
  for (const id of tileIds) {
    const tile = getTile(id);
    if (!tile) continue;
    count += tile.planets.filter((p) => p.legendary).length;
  }
  return count;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function passesConfig(tileIds: number[], config: SliceBalanceConfig): boolean {
  const stats = sliceStats(tileIds);
  return (
    stats.resources >= config.minOptimalResources &&
    stats.influence >= config.minOptimalInfluence &&
    stats.total >= config.minOptimalTotal &&
    stats.total <= config.maxOptimalTotal &&
    countWormholes(tileIds) <= config.maxWormholesPerSlice &&
    countLegendary(tileIds) >= config.minLegendaryPlanets
  );
}

function totalVariance(assignment: number[][]): number {
  const totals = assignment.map((ids) => sliceStats(ids).total);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  return totals.reduce((acc, t) => acc + (t - mean) ** 2, 0) / totals.length;
}

export interface BalancedAssignmentResult {
  assignment: Record<string, number[]>;
  seed: number;
  balanced: boolean;
}

/**
 * Draws real tile ids for each slice's content slots, trying to respect
 * `config`. Physical board positions of `slices` don't matter here — only
 * `.id` and the tile count (read off `tiles.length`, e.g. 7 for 4p, 5 for
 * 6p) — placement onto a seat's positions happens later, via
 * `placeSliceAtSeat`.
 */
export function generateBalancedAssignment(
  slices: SliceLayout[],
  config: SliceBalanceConfig,
  seed?: number,
  includePoK: boolean = true,
  includeTE: boolean = false,
): BalancedAssignmentResult {
  const usedSeed = seed ?? Math.floor(Math.random() * 2 ** 32);
  const pool = draftableTilePool(includePoK, includeTE).map((t) => t.id);
  const tilesPerSlice = slices[0]?.tiles.length ?? 7;

  let best: number[][] | null = null;
  let bestVariance = Infinity;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const rng = mulberry32(usedSeed + attempt);
    const shuffled = shuffleSeeded(pool, rng);
    const groups: number[][] = slices.map((_, i) => shuffled.slice(i * tilesPerSlice, (i + 1) * tilesPerSlice));

    if (groups.every((g) => passesConfig(g, config))) {
      const assignment: Record<string, number[]> = {};
      slices.forEach((s, i) => {
        assignment[s.id] = groups[i];
      });
      return { assignment, seed: usedSeed, balanced: true };
    }

    const variance = totalVariance(groups);
    if (variance < bestVariance) {
      bestVariance = variance;
      best = groups;
    }
  }

  const assignment: Record<string, number[]> = {};
  slices.forEach((s, i) => {
    assignment[s.id] = best?.[i] ?? [];
  });
  return { assignment, seed: usedSeed, balanced: false };
}

/**
 * Transposes a drafted slice's content onto a seat's physical positions:
 * `content[i]` is placed at `seatTemplate.tiles[i]` (index-matched — the draw
 * order carries no meaning, only the set of 7 tiles matters for balance).
 */
export function placeSliceAtSeat(mapString: string, seatTemplate: SliceLayout, content: number[]): string {
  const tokens = mapString.trim().split(/\s+/);
  seatTemplate.tiles.forEach((pos, i) => {
    if (content[i] !== undefined) tokens[pos - 1] = String(content[i]);
  });
  return tokens.join(' ');
}

/**
 * Scatters the reserved wormhole filler tiles across the map's anomaly slots
 * (`PlayerLayout.empty`), in random order and random slots. Base games get 1
 * alpha + 1 beta; PoK adds a second alpha; Thunder's Edge adds the second
 * beta. No-op for player counts without reserved anomaly slots.
 */
export function placeWormholeAnomalies(
  mapString: string,
  playerCount: number,
  includePoK: boolean,
  includeTE: boolean = false,
): string {
  const layout = getLayout(playerCount);
  if (!layout || layout.empty.length === 0) return mapString;

  const tileIds = shuffleSeeded(activeWormholeFillerIds(includePoK, includeTE), Math.random);
  const slots = shuffleSeeded(layout.empty, Math.random);

  const tokens = mapString.trim().split(/\s+/);
  tileIds.slice(0, slots.length).forEach((tileId, i) => {
    const [q, r] = slots[i];
    const pos = MAP_POSITIONS.findIndex((p) => p.q === q && p.r === r);
    if (pos >= 0) tokens[pos] = String(tileId);
  });
  return tokens.join(' ');
}
