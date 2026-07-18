import tilesJson from './tiles.json';

export type TileColor = 'green' | 'blue' | 'red';
export type Wormhole = 'alpha' | 'beta' | 'gamma' | 'delta' | 'epsilon';

export interface TilePlanet {
  name: string;
  resource: number;
  influence: number;
  specialty?: string | null;
  legendary?: boolean;
}

export interface Tile {
  id: number;
  filename: string;
  color: TileColor;
  /** true for faction home systems (green) */
  home: boolean;
  /** faction id for home systems, otherwise null */
  faction: string | null;
  /** true if the tile belongs to the draftable system pool */
  draft: boolean;
  planets: TilePlanet[];
  wormhole: Wormhole | null;
}

export const TILES: Tile[] = tilesJson as Tile[];

const TILE_BY_ID = new Map<number, Tile>(TILES.map((t) => [t.id, t]));

export const MECATOL_TILE_ID = 18;

export function getTile(id: number): Tile | undefined {
  return TILE_BY_ID.get(id);
}

/** Public path to a system tile image. Falls back to ST_0 (empty) for id 0. */
export function tileImage(id: number): string {
  return `/img/tiles/ST_${id}.png`;
}

/** Optimal resource/influence value of a planet group (max(res, inf) per planet, split on ties). */
export function optimalValues(planets: TilePlanet[]) {
  let resources = 0;
  let influence = 0;
  for (const p of planets) {
    if (p.influence > p.resource) influence += p.influence;
    else if (p.resource > p.influence) resources += p.resource;
    else {
      resources += p.resource / 2;
      influence += p.influence / 2;
    }
  }
  return { resources, influence, total: resources + influence };
}
