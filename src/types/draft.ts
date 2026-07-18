export type DraftCategory = 'faction' | 'position' | 'slice' | 'speaker';

export interface DraftPlayer {
  id: string; // 'player-0'..'player-N'
  name: string;
  faction: string | null; // faction id
  seatId: string | null; // seat id ('p1'..)
  sliceId: string | null; // slice id ('slice-1'..), when drafted via the slice pool
  isSpeaker: boolean; // true for the single drafted speaker
}

export interface DraftPools {
  factions: string[]; // available faction ids
  seats: string[]; // available seat ids (free-position mode)
  slices: string[]; // available slice ids (slice-draft mode)
  /** the single Speaker token is still up for grabs */
  speakerAvailable: boolean;
}

export interface DraftSettings {
  playerCount: number;
  includePoK: boolean;
  /** Thunder's Edge; absent in rooms created before the expansion was supported */
  includeTE?: boolean;
  factionPoolSize: number;
  mapString: string;
  /** seed used by the slice-balance sorteio, for reproducing/debugging a room */
  sliceSeed?: number;
  /** sliceId -> 7 drafted tileIds (slice-draft mode only) */
  sliceAssignment?: Record<string, number[]>;
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
