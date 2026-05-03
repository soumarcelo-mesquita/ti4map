import factionsData from '@/data/factions.json';
import tilesData from '@/data/tiles.json';
import { Faction, Tile } from '@/types/game';

export const getFactions = (): Record<string, Faction> => {
    return factionsData as Record<string, Faction>;
};

export const getTiles = (): Record<string, Tile> => {
    const tiles: Record<string, Tile> = {};
    Object.entries(tilesData).forEach(([id, data]) => {
        tiles[id] = {
            ...(data as any),
            id
        };
    });
    return tiles;
};

export const getFactionById = (id: string): Faction | undefined => {
    return Object.values(getFactions()).find(f => f.id === id);
};

export const getTileById = (id: string): Tile | undefined => {
    return getTiles()[id];
};
