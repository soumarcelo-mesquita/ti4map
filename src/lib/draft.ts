import { Tile, Faction } from '@/types/game';
import { getTiles, getFactions } from '@/lib/data';
import tileSelection from '@/data/tile-selection.json';
import { Slice, createSlice } from '@/lib/game-logic';

export interface DraftSettings {
    playerCount: number;
    sliceCount: number;
    factionCount: number;
    includePoK: boolean;
}

export const generateDraft = (settings: DraftSettings) => {
    const allTiles = getTiles();
    const allFactions = getFactions();
    
    // Alinhado com o set: "base" e "pok" do JSON
    const activeSets = ['base'];
    if (settings.includePoK) activeSets.push('pok');
    
    const pools = {
        high: [] as Tile[],
        mid: [] as Tile[],
        low: [] as Tile[],
        red: [] as Tile[]
    };
    
    // Para os tiles, o tile-selection.json usa "BaseGame" e "PoK"
    const tileSets = ['BaseGame'];
    if (settings.includePoK) tileSets.push('PoK');

    tileSets.forEach(setName => {
        const setTiers = (tileSelection as any)[setName];
        if (setTiers) {
            setTiers.high.forEach((id: any) => {
                const tile = allTiles[id.toString()];
                if (tile) pools.high.push(tile);
            });
            setTiers.mid.forEach((id: any) => {
                const tile = allTiles[id.toString()];
                if (tile) pools.mid.push(tile);
            });
            setTiers.low.forEach((id: any) => {
                const tile = allTiles[id.toString()];
                if (tile) pools.low.push(tile);
            });
        }
    });
    
    Object.values(allTiles).forEach(tile => {
        if (tile.type === 'red' && tileSets.includes(tile.set === 'BaseGame' ? 'BaseGame' : tile.set)) {
            pools.red.push(tile);
        }
    });
    
    const shuffle = <T>(array: T[]) => [...array].sort(() => Math.random() - 0.5);
    pools.high = shuffle(pools.high);
    pools.mid = shuffle(pools.mid);
    pools.low = shuffle(pools.low);
    pools.red = shuffle(pools.red);
    
    const slices: Slice[] = [];
    for (let i = 0; i < settings.sliceCount; i++) {
        const sliceTiles: Tile[] = [];
        if (pools.high.length > 0) sliceTiles.push(pools.high.pop()!);
        if (pools.mid.length > 0) sliceTiles.push(pools.mid.pop()!);
        if (pools.low.length > 0) sliceTiles.push(pools.low.pop()!);
        if (pools.red.length > 0) sliceTiles.push(pools.red.pop()!);
        if (pools.red.length > 0) sliceTiles.push(pools.red.pop()!);
        
        slices.push(createSlice(`Slice ${i + 1}`, sliceTiles));
    }
    
    const factions = shuffle(Object.values(allFactions))
        .filter(f => activeSets.includes(f.set))
        .slice(0, settings.factionCount);
        
    return {
        slices,
        factions,
        playerCount: settings.playerCount
    };
};
