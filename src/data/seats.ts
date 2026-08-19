/**
 * Seat (home-system) layouts per player count, in this project's flat-top axial
 * convention: pixel = (1.5*q, sqrt3*(r + q/2)), Mecatol at (0,0).
 *
 * Each seat has a `home` coordinate and a `slice` (the surrounding system coords
 * that belong to that player). Coordinates index directly into a parsed map
 * (see lib/mapString.ts), which uses the same convention.
 *
 * Ported from the legacy map.json (4/5/6). 7/8-player layouts are not yet
 * supported — see SUPPORTED_PLAYER_COUNTS.
 *
 * The 6-player layout is a single shape rotated 60° per seat (verified against
 * `p1`'s offsets); `p3`'s last slice tile was `[3, 1]` in the legacy data,
 * which falls outside the 3-ring board (ring distance 4) and left `[2, 1]`
 * unused — corrected here to `[2, 1]` per that rotation.
 */

export type Coord = [number, number];

export interface SeatLayout {
  id: string; // 'p1'..'pN'
  /** speaker-order label of the seat's physical position */
  label: string;
  home: Coord;
  slice: Coord[];
}

export interface PlayerLayout {
  seats: SeatLayout[];
  /** coords that are filled by the map string but not part of any slice (anomalies) */
  empty: Coord[];
}

export const SUPPORTED_PLAYER_COUNTS = [4, 5, 6] as const;

const LAYOUTS: Record<number, PlayerLayout> = {
  4: {
    empty: [[-1, 0], [1, 0], [1, -3], [-1, 3]],
    seats: [
      { id: 'p1', label: 'Speaker', home: [-1, -2], slice: [[-3, 0], [-2, 0], [-2, -1], [-1, -1], [0, -1], [0, -2], [0, -3]] },
      { id: 'p2', label: '2º', home: [-3, 2], slice: [[1, -1], [2, -1], [3, -1], [1, -2], [2, -2], [2, -3], [3, -3]] },
      { id: 'p3', label: '3º', home: [1, 2], slice: [[2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2], [0, 3]] },
      { id: 'p4', label: '4º', home: [3, -2], slice: [[-3, 1], [-2, 1], [-1, 1], [-2, 2], [-1, 2], [-3, 3], [-2, 3]] },
    ],
  },
  5: {
    empty: [[1, 0], [2, 0], [3, 0], [-1, 2], [-2, 1], [-3, 3]],
    seats: [
      { id: 'p1', label: 'Speaker', home: [0, -3], slice: [[0, -1], [0, -2], [-1, -1], [-1, -2], [1, -3]] },
      { id: 'p2', label: '2º', home: [3, -2], slice: [[1, -1], [2, -1], [2, -2], [3, -1], [3, -3]] },
      { id: 'p3', label: '3º', home: [2, 1], slice: [[1, 1], [1, 2], [2, 0], [3, 0], [2, 2]] },
      { id: 'p4', label: '4º', home: [-1, 3], slice: [[0, 1], [0, 2], [-1, 2], [-2, 3], [0, 3]] },
      { id: 'p5', label: '5º', home: [-3, 0], slice: [[-1, 0], [-2, 0], [-2, 1], [-3, 1], [-2, -1]] },
    ],
  },
  6: {
    empty: [],
    seats: [
      { id: 'p1', label: 'Speaker', home: [0, -3], slice: [[0, -1], [0, -2], [-1, -1], [-1, -2], [1, -3]] },
      { id: 'p2', label: '2º', home: [3, -3], slice: [[1, -1], [2, -2], [1, -2], [2, -3], [3, -2]] },
      { id: 'p3', label: '3º', home: [3, 0], slice: [[1, 0], [2, 0], [2, -1], [3, -1], [2, 1]] },
      { id: 'p4', label: '4º', home: [0, 3], slice: [[0, 1], [0, 2], [1, 1], [1, 2], [-1, 3]] },
      { id: 'p5', label: '5º', home: [-3, 3], slice: [[-1, 1], [-2, 2], [-1, 2], [-2, 3], [-3, 2]] },
      { id: 'p6', label: '6º', home: [-3, 0], slice: [[-1, 0], [-2, 0], [-2, 1], [-3, 1], [-2, -1]] },
    ],
  },
};

export function getLayout(playerCount: number): PlayerLayout | undefined {
  return LAYOUTS[playerCount];
}

/**
 * Physical seats ordered clockwise around the galaxy, starting at `startSeatId`.
 * Game/turn order derives from this: the Speaker is first (index 0), then play
 * proceeds clockwise. Angle is measured from North (top of the map), increasing
 * clockwise. Falls back to the natural seat order if `startSeatId` is unknown.
 */
export function seatsClockwiseFrom(seats: SeatLayout[], startSeatId: string): string[] {
  // pixel angle (flat-top axial), measured from North and growing clockwise
  const angle = (s: SeatLayout) => {
    const [q, r] = s.home;
    const x = 1.5 * q;
    const y = (Math.sqrt(3) / 2) * q + Math.sqrt(3) * r;
    return Math.atan2(x, -y);
  };
  const sorted = [...seats].sort((a, b) => angle(a) - angle(b));
  const start = sorted.findIndex((s) => s.id === startSeatId);
  if (start < 0) return sorted.map((s) => s.id);
  return [...sorted.slice(start), ...sorted.slice(0, start)].map((s) => s.id);
}
