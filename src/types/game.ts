export type PlanetTrait = 'cultural' | 'industrial' | 'hazardous';
export type Specialty = 'cybernetic' | 'propulsion' | 'biotic' | 'warfare';
export type Wormhole = 'alpha' | 'beta' | 'delta';
export type Anomaly = 'gravity-rift' | 'nebula' | 'supernova' | 'asteroid-field';
export type TileType = 'green' | 'blue' | 'red';

export interface Planet {
    name: string;
    resources: number;
    influence: number;
    trait: PlanetTrait | PlanetTrait[] | null;
    legendary: boolean | string;
    specialties: Specialty[];
}

export interface Tile {
    id: string;
    type: TileType;
    faction?: string;
    wormhole: Wormhole | null;
    planets: Planet[];
    set: string;
    anomaly?: Anomaly | null;
    nonDraftable?: boolean;
}

export interface Faction {
    id: string;
    name: string;
    homesystem: string;
    wiki: string;
    set: string;
    options?: string[];
}
