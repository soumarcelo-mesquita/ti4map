import { Axial, ring } from './hex';

/**
 * Standard TI map string parsing.
 *
 * A map string is a whitespace-separated list of system (tile) numbers. Mecatol
 * Rex (the galactic center) is implicit at (0,0) and is NOT part of the string.
 * String position N (1-based) maps to MAP_POSITIONS[N-1].
 *
 * Positions are listed ring by ring (ring 1 = 6, ring 2 = 12, ring 3 = 18, ...),
 * and within each ring clockwise starting from the North cell. This ordering is
 * cross-checked against the project's seat layouts: for 6 players the home-system
 * corners land on ring-3 indices 0,3,6,9,12,15 -> string positions 19,22,25,28,31,34,
 * which matches the standard 6-player home layout.
 *
 * NOTE: clockwise winding is assumed. If an imported map renders mirrored versus
 * ti-assistant, flip RING_STEPS winding in hex.ts (single source of truth).
 */

// Rings 1..3 cover the standard 3-ring galaxy (36 positions). Extra rings can be
// appended here for hyperlane / 7-8 player maps once those layouts are added.
const MAX_RING = 3;

export const MAP_POSITIONS: Axial[] = (() => {
  const positions: Axial[] = [];
  for (let radius = 1; radius <= MAX_RING; radius++) {
    positions.push(...ring(radius));
  }
  return positions;
})();

export interface PlacedTile {
  q: number;
  r: number;
  /** parsed tile id; 0 means an empty / home-placeholder slot */
  tileId: number;
}

/**
 * Tokens in a map string can carry orientation/hyperlane suffixes (e.g. "85A2").
 * We only need the leading numeric system id for rendering; strip the rest.
 */
function parseToken(token: string): number {
  const m = token.match(/^-?\d+/);
  if (!m) return 0;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Parse a map string into placed tiles. Mecatol (id 18) is added at the center. */
export function parseMapString(mapString: string): PlacedTile[] {
  const tokens = mapString.trim().split(/\s+/).filter(Boolean);
  const placed: PlacedTile[] = [{ q: 0, r: 0, tileId: 18 }];

  tokens.forEach((token, i) => {
    const pos = MAP_POSITIONS[i];
    if (!pos) return; // ignore positions beyond the supported rings
    const tileId = parseToken(token);
    placed.push({ q: pos.q, r: pos.r, tileId });
  });

  return placed;
}

/** Quick validity check: non-empty and at least one numeric token. */
export function isValidMapString(mapString: string): boolean {
  const tokens = mapString.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.some((t) => parseToken(t) > 0);
}
