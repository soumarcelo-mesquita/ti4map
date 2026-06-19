export type DraftCategory = 'faction' | 'position' | 'speaker';

export interface DraftPlayer {
  id: string; // 'player-0'..'player-N'
  name: string;
  faction: string | null; // faction id
  seatId: string | null; // seat id ('p1'..)
  isSpeaker: boolean; // true for the single drafted speaker
}

export interface DraftPools {
  factions: string[]; // available faction ids
  seats: string[]; // available seat ids
  /** the single Speaker token is still up for grabs */
  speakerAvailable: boolean;
}

export interface DraftSettings {
  playerCount: number;
  includePoK: boolean;
  factionPoolSize: number;
  mapString: string;
}

export interface DraftState {
  status: 'drafting' | 'complete';
  mapString: string;
  settings: DraftSettings;
  players: DraftPlayer[];
  pools: DraftPools;
  turnOrder: string[]; // player ids, snake draft
  currentTurnIndex: number;
  isSnakeDescending: boolean;
  /** final game order (player ids by speaker slot), set when complete */
  gameOrder: string[] | null;
}
