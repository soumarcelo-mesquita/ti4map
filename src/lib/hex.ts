/**
 * Flat-top hexagon geometry in axial coordinates (q, r).
 *
 * Pixel convention (matches the legacy renderer):
 *   x = size * 1.5 * q
 *   y = size * (sqrt(3)/2 * q + sqrt(3) * r)
 *
 * Directions, clockwise from North:
 *   N=(0,-1) NE=(1,-1) SE=(1,0) S=(0,1) SW=(-1,1) NW=(-1,0)
 */

export type Axial = { q: number; r: number };

const SQRT3 = Math.sqrt(3);

export function hexToPixel(q: number, r: number, size: number) {
  return {
    x: size * 1.5 * q,
    y: size * ((SQRT3 / 2) * q + SQRT3 * r),
  };
}

/** Corner points of a flat-top hexagon centered at (x, y). */
export function hexCorners(x: number, y: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${x + size * Math.cos(a)},${y + size * Math.sin(a)}`);
  }
  return pts.join(' ');
}

// Step direction applied along each side of a ring, starting from the North
// corner and walking clockwise (matches seats.ts home-corner ordering).
const RING_STEPS: Axial[] = [
  { q: 1, r: 0 },  // N corner -> NE corner (move SE)
  { q: 0, r: 1 },  // NE -> SE (move S)
  { q: -1, r: 1 }, // SE -> S (move SW)
  { q: -1, r: 0 }, // S -> SW (move NW)
  { q: 0, r: -1 }, // SW -> NW (move N)
  { q: 1, r: -1 }, // NW -> N (move NE)
];

/**
 * Cells of the ring at the given radius, ordered clockwise starting from the
 * North cell (0, -radius). Radius 0 returns the center.
 */
export function ring(radius: number): Axial[] {
  if (radius === 0) return [{ q: 0, r: 0 }];
  const cells: Axial[] = [];
  let hex: Axial = { q: 0, r: -radius };
  for (const step of RING_STEPS) {
    for (let j = 0; j < radius; j++) {
      cells.push({ ...hex });
      hex = { q: hex.q + step.q, r: hex.r + step.r };
    }
  }
  return cells;
}

export const key = (q: number, r: number) => `${q},${r}`;
