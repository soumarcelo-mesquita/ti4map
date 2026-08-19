/**
 * Slice draft data, per player count. Each entry doubles as two things:
 *
 * 1. A drafted "fatia" identity (`id`) — an abstract content bucket that gets
 *    N real system tiles assigned by `lib/sliceBalance.ts` (`generateBalancedAssignment`),
 *    independent of any seat.
 * 2. A physical seat template (`seatId` + `tiles`) — the N board positions
 *    (map-string positions, 1-36) belonging to that seat, in a fixed role
 *    order (A..) that's the same shape across all seats (congruent by
 *    rotation — 180° for 4p, 60° for 6p). `lib/sliceBalance.ts`
 *    (`placeSliceAtSeat`) uses this to transpose a drafted fatia's content
 *    onto whichever seat a player picks — fatia and seat are independent
 *    picks (see `lib/draftEngine.ts`), so a fatia's tiles don't have to land
 *    on "its own" template's seatId.
 *
 * Tile count per slice varies by player count (7 for 4p, 5 for 6p) since it's
 * derived from the fixed 36-position/3-ring board split evenly minus homes —
 * `lib/sliceBalance.ts` reads it off `tiles.length` rather than assuming 7.
 *
 * Positions were validated by hand (4p) / against `seats.ts`'s rotational
 * symmetry (6p) using `hex.ts`/`mapString.ts` geometry: each slice's non-home
 * tiles touch its seat's home directly, and slices for the same player count
 * never overlap or touch a wormhole/other home tile.
 */

import { MAP_POSITIONS } from '@/lib/mapString';
import { getLayout } from '@/data/seats';
import type { Axial } from '@/lib/hex';

export interface SliceLayout {
  id: string; // 'slice-1'..'slice-N'
  seatId: string; // SeatLayout.id in seats.ts — the seat this tile template belongs to
  tiles: number[]; // 7 map-string positions (1-36), fixed role order (A..G) for this seat
}

export const SLICE_LAYOUTS: Record<number, SliceLayout[]> = {
  4: [
    { id: 'slice-1', seatId: 'p1', tiles: [1, 7, 18, 19, 35, 17, 34] },
    { id: 'slice-2', seatId: 'p4', tiles: [2, 10, 9, 24, 22, 8, 21] },
    { id: 'slice-3', seatId: 'p3', tiles: [4, 13, 12, 28, 26, 11, 25] },
    { id: 'slice-4', seatId: 'p2', tiles: [5, 16, 15, 33, 31, 14, 30] },
  ],
  // Each seat's 5 slice tiles from seats.ts (6p), converted to map-string
  // positions (1-36) via MAP_POSITIONS, in the role order (A..E) that seats.ts
  // already carries consistently — verified to rotate 60° seat-to-seat.
  6: [
    { id: 'slice-1', seatId: 'p1', tiles: [1, 7, 18, 36, 20] },
    { id: 'slice-2', seatId: 'p2', tiles: [2, 9, 8, 21, 23] },
    { id: 'slice-3', seatId: 'p3', tiles: [3, 11, 10, 24, 26] },
    { id: 'slice-4', seatId: 'p4', tiles: [4, 13, 12, 27, 29] },
    { id: 'slice-5', seatId: 'p5', tiles: [5, 15, 14, 30, 32] },
    { id: 'slice-6', seatId: 'p6', tiles: [6, 17, 16, 33, 35] },
  ],
};

export function getSliceLayouts(playerCount: number): SliceLayout[] | undefined {
  return SLICE_LAYOUTS[playerCount];
}

/**
 * Canonical mini-map shape of a fatia: axial offsets of the 7 content
 * positions relative to the seat's home, taken from the first template.
 * Templates are congruent across seats, so every fatia card renders with the
 * same shape/orientation regardless of which seat it ends up on. Offsets are
 * index-matched to `sliceAssignment` content order.
 */
export function sliceShapeOffsets(playerCount: number): Axial[] | undefined {
  const template = SLICE_LAYOUTS[playerCount]?.[0];
  const home = template && getLayout(playerCount)?.seats.find((s) => s.id === template.seatId)?.home;
  if (!template || !home) return undefined;
  return template.tiles.map((pos) => {
    const p = MAP_POSITIONS[pos - 1];
    return { q: p.q - home[0], r: p.r - home[1] };
  });
}

/**
 * All 36 positions as "0" (empty placeholder). Used as the map string for
 * slice-draft rooms, whose map is built from fixed slice positions instead of
 * a pasted map string.
 */
export function buildSliceModeMapString(): string {
  return Array(36).fill('0').join(' ');
}
