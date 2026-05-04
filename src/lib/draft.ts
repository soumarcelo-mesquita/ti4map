import { v4 as uuidv4 } from 'uuid';
import mapData from '@/../map.json';
import factionData from '@/../factions.json';
import tilesData from '@/../tiles.json';

const factionHomeTiles = factionData.factions.map(f => f.tileId.toString());
const allTiles = tilesData as any[];

// Blue Tiles (Planets)
const BASE_BLUE = Array.from({ length: 20 }, (_, i) => (i + 19).toString()); // 19-38
const POK_BLUE = Array.from({ length: 18 }, (_, i) => (i + 59).toString()); // 59-76
const ALL_BLUE_POOL = [...BASE_BLUE, ...POK_BLUE];

// Red Tiles (Anomalies/Empty)
const BASE_RED = Array.from({ length: 13 }, (_, i) => (i + 39).toString()); // 39-51
const POK_RED = Array.from({ length: 4 }, (_, i) => (i + 77).toString()); // 77-80
const ALL_RED_POOL = [...BASE_RED, ...POK_RED];

const BLUE_TILES = ALL_BLUE_POOL
    .filter(id => !factionHomeTiles.includes(id) && !factionHomeTiles.includes(id.padStart(2, '0')));

const RED_TILES = ALL_RED_POOL
    .filter(id => !factionHomeTiles.includes(id) && !factionHomeTiles.includes(id.padStart(2, '0')));

export interface DraftSettings {
    playerNames: string[];
    playerCount: number;
    sliceCount: number;
    factionCount: number;
    includePoK: boolean;
    matchDate?: string;
    matchTime?: string;
    matchLocation?: string;
}

export const generateDraft = (config: DraftSettings) => {
    const { playerNames, playerCount, sliceCount, includePoK } = config;

    // Filter tiles based on includePoK
    const availableBlue = BLUE_TILES.filter(id => {
        const num = parseInt(id);
        if (!includePoK && num > 51) return false;
        return true;
    });
    
    const availableRed = RED_TILES.filter(id => {
        const num = parseInt(id);
        if (!includePoK && num > 51) return false;
        return true;
    });
    
    // Get slice size from map.json
    const sliceSize = (mapData as any)[playerCount.toString()]?.p1?.slice?.length || 5;
    
    let generatedSlices: any[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const tempShuffledBlue = [...availableBlue].sort(() => Math.random() - 0.5);
        const tempShuffledRed = [...availableRed].sort(() => Math.random() - 0.5);
        const tempSlices = [];

        for (let i = 0; i < (sliceCount || playerCount + 2); i++) {
            const sliceTiles: string[] = [];
            const blueCount = Math.ceil(sliceSize * 0.6);
            const redCount = sliceSize - blueCount;

            for (let j = 0; j < blueCount; j++) {
                const t = tempShuffledBlue.pop();
                if (t) sliceTiles.push(t);
            }
            for (let j = 0; j < redCount; j++) {
                const t = tempShuffledRed.pop();
                if (t) sliceTiles.push(t);
            }

            while (sliceTiles.length < sliceSize) {
                const t = tempShuffledBlue.pop() || tempShuffledRed.pop();
                if (t) sliceTiles.push(t);
                else break;
            }

            // Calculate real values
            let totalRes = 0;
            let totalInf = 0;
            let optimalValue = 0;
            let techSkips: string[] = [];
            let wormholes: string[] = [];
            let hasLegendary = false;

            sliceTiles.forEach(tId => {
                const tile = allTiles.find(t => t.id === parseInt(tId));
                if (tile) {
                    if (tile.wormhole) wormholes.push(tile.wormhole);
                    tile.planets.forEach((p: any) => {
                        totalRes += p.resource;
                        totalInf += p.influence;
                        optimalValue += Math.max(p.resource, p.influence);
                        if (p.specialty) techSkips.push(p.specialty);
                        if (tile.id === 65 || tile.id === 66) hasLegendary = true; // Primor, Hope's End
                    });
                }
            });

            tempSlices.push({
                id: `Slice ${i + 1}`,
                tiles: sliceTiles,
                optimalValues: {
                    resources: totalRes,
                    influence: totalInf,
                    optimal: optimalValue
                },
                special: {
                    techSkips,
                    wormholes,
                    hasLegendary
                }
            });
        }

        // Check balance: Diff between max and min optimal value should be small
        const scores = tempSlices.map(s => s.optimalValues.optimal);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        // Balanced if range is <= 4.0 points (standard for Milty Draft)
        if (maxScore - minScore <= 4.0 || attempts === MAX_ATTEMPTS) {
            generatedSlices = tempSlices;
            break;
        }
    }

    const allFactions = factionData.factions
        .filter(f => {
            if (!config.includePoK && f.tileId >= 52) return false;
            return true;
        })
        .map(f => ({
            id: f.id,
            name: f.name
        }));

    const factions = allFactions
        .sort(() => Math.random() - 0.5)
        .slice(0, config.factionCount || playerCount + 3);

    const players = playerNames.map((name, index) => ({
        id: `player-${index}`,
        name: name || `Player ${index + 1}`,
        factionId: null,
        sliceId: null,
        position: null,
    }));

    const turnOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);

    // Pick random red tiles for empty spots (important for 4/5 players)
    const staticTiles: { q: number, r: number, tileId: string }[] = [];
    const emptyCoords = (mapData as any)[playerCount.toString()]?.empty || [];
    
    emptyCoords.forEach((coords: number[]) => {
        const tId = availableRed.pop();
        if (tId) {
            staticTiles.push({ q: coords[0], r: coords[1], tileId: tId });
        }
    });

    return {
        status: 'drafting',
        players,
        slices: generatedSlices,
        factions,
        turnOrder,
        staticTiles, // New field for fixed map tiles
        currentTurnIndex: 0,
        isSnakeDraftDescending: true,
        settings: config
    };
};
