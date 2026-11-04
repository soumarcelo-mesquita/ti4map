import type { Coord } from '@/data/seats';

/**
 * Fixed hyperlane tiles of the PoK 5-player board (tiles 83A–88A), filling
 * the South wedge left by the missing 6th seat. Tokens use the standard map
 * string notation `<tile><side><rotation>`, rotation in 60° clockwise steps;
 * with the wedge in the South every tile sits at its printed orientation.
 *
 * Lanes: ring 1 (86A) and ring 3 (84A → 85A → 83A) link the neighbouring
 * seats around the gap; the two fans (87A, 88A) connect each side's three
 * edge systems to the shared system at (0, 2).
 */
export const HYPERLANE_TILES: Record<number, { coord: Coord; token: string }[]> = {
  5: [
    { coord: [0, 1], token: '86A0' },
    { coord: [1, 1], token: '88A0' },
    { coord: [-1, 2], token: '87A0' },
    { coord: [1, 2], token: '83A0' },
    { coord: [-1, 3], token: '84A0' },
    { coord: [0, 3], token: '85A0' },
  ],
};
