import type { MapVariant } from '@/data/seats';

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
  /** host-chosen factions that never enter the pool, kept around so the veto phase can finalize on top of them */
  excludedFactionIds?: string[];
  /** how many factions each player secretly vetoes before the draft starts; 0/absent skips the veto phase */
  vetoCount?: number;
  /** surplus fatias beyond playerCount in slice-draft mode (0/absent = exactly one per player) */
  extraSlices?: number;
  /** factions forced into the pool (cheat) unless excluded/vetoed */
  pinnedFactionIds?: string[];
  /** alternative board (e.g. 5p hyperlanes); absent = standard layout for playerCount */
  mapVariant?: MapVariant;
  /** factions are chosen simultaneously and in secret (blind pick) before the turn-based draft */
  blindFactionPick?: boolean;
}

/** One resolved blind-pick round: which factions were contested and by whom. */
export interface BlindRoundLog {
  round: number;
  /** factionId -> player ids that picked it (only factions picked by 2+ players) */
  collisions: Record<string, string[]>;
  /** player ids that got a faction assigned at random because they ran out of options */
  autoAssigned?: string[];
}

/** Progress of the blind faction pick (only while/after `status === 'blind'`). */
export interface BlindPickState {
  /** current round, starting at 1 */
  round: number;
  /** players that still have to pick in this round (round 1: everyone; later: only those who collided) */
  pendingPlayerIds: string[];
  /** playerId -> factions that player already tried and lost to a collision (no longer offered to them) */
  tried: Record<string, string[]>;
  log: BlindRoundLog[];
}

export interface DraftState {
  status: 'veto' | 'blind' | 'drafting' | 'complete';
  mapString: string;
  settings: DraftSettings;
  players: DraftPlayer[];
  pools: DraftPools;
  turnOrder: string[]; // player ids, snake draft
  currentTurnIndex: number;
  isSnakeDescending: boolean;
  /** final game order (player ids by speaker slot), set when complete */
  gameOrder: string[] | null;
  /** blind faction pick progress; absent in rooms without blind pick */
  blind?: BlindPickState;
}

/** One player's secret faction vetoes, as stored in the `room_vetoes` table. */
export interface VetoSubmission {
  playerId: string;
  factionIds: string[];
}

/** One player's secret blind faction pick for a given round (stored in `room_vetoes` under a `blind:` key). */
export interface BlindPickSubmission {
  round: number;
  playerId: string;
  factionId: string;
}
