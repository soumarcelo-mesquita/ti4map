import factionsJson from './factions-list.json';

export interface Faction {
  id: string;
  name: string;
  /** home system tile id */
  homeTileId: number;
  set: 'base' | 'pok' | 'te';
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
  // Home tiles: base 1-17, PoK 52-58, Thunder's Edge 92-118.
  set: f.tileId >= 92 ? 'te' : f.tileId >= 52 ? 'pok' : 'base',
}));

const FACTION_BY_ID = new Map<string, Faction>(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id: string): Faction | undefined {
  return FACTION_BY_ID.get(id);
}

/** Public path to a faction icon. */
export function factionImage(id: string): string {
  return `/img/factions/ti_${id}.png`;
}

/** Factions available for a draft, per enabled expansions (PoK, Thunder's Edge). */
export function factionPool(includePoK: boolean, includeTE: boolean = false): Faction[] {
  return FACTIONS.filter(
    (f) => f.set === 'base' || (f.set === 'pok' && includePoK) || (f.set === 'te' && includeTE),
  );
}
