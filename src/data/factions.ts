import factionsJson from './factions-list.json';

export interface Faction {
  id: string;
  name: string;
  /** home system tile id */
  homeTileId: number;
  set: 'base' | 'pok';
}

interface RawFaction {
  id: string;
  tileId: number;
  name: string;
}

export const FACTIONS: Faction[] = (factionsJson.factions as RawFaction[]).map((f) => ({
  id: f.id,
  name: f.name,
  homeTileId: f.tileId,
  // PoK faction home tiles are 52-58; base game are 1-17.
  set: f.tileId >= 52 ? 'pok' : 'base',
}));

const FACTION_BY_ID = new Map<string, Faction>(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id: string): Faction | undefined {
  return FACTION_BY_ID.get(id);
}

/** Public path to a faction icon. */
export function factionImage(id: string): string {
  return `/img/factions/ti_${id}.png`;
}

/** Factions available for a draft, optionally excluding Prophecy of Kings. */
export function factionPool(includePoK: boolean): Faction[] {
  return FACTIONS.filter((f) => includePoK || f.set === 'base');
}
