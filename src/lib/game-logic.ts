import { Tile, Planet } from '@/types/game';

export interface OptimalValues {
    resources: number;
    influence: number;
    total: number;
}

export const calculateOptimalValues = (planets: Planet[]): OptimalValues => {
    let optimalResources = 0;
    let optimalInfluence = 0;

    planets.forEach(planet => {
        if (planet.influence > planet.resources) {
            optimalInfluence += planet.influence;
        } else if (planet.resources > planet.influence) {
            optimalResources += planet.resources;
        } else if (planet.resources === planet.influence) {
            optimalInfluence += planet.influence / 2;
            optimalResources += planet.resources / 2;
        }
    });

    return {
        resources: optimalResources,
        influence: optimalInfluence,
        total: optimalResources + optimalInfluence
    };
};

export interface Slice {
    id: string;
    tiles: Tile[];
    optimalValues: OptimalValues;
    hasLegendary: boolean;
    wormholes: ('alpha' | 'beta' | 'delta')[];
}

export const createSlice = (id: string, tiles: Tile[]): Slice => {
    const allPlanets = tiles.flatMap(t => t.planets);
    const optimalValues = calculateOptimalValues(allPlanets);
    
    const wormholes = tiles
        .map(t => t.wormhole)
        .filter((w): w is ('alpha' | 'beta' | 'delta') => w !== null);

    const hasLegendary = allPlanets.some(p => p.legendary !== false);

    return {
        id,
        tiles,
        optimalValues,
        hasLegendary,
        wormholes
    };
};
