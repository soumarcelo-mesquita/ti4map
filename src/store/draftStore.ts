import { create } from 'zustand';
import { Slice } from '@/lib/game-logic';
import { Faction } from '@/types/game';

export type PickCategory = 'faction' | 'slice' | 'position';

export interface Player {
    id: string;
    name: string;
    factionId?: string;
    sliceId?: string;
    position?: number;
}

interface DraftState {
    slices: Slice[];
    factions: Faction[];
    players: Player[];
    turnOrder: string[]; // Player IDs
    currentTurnIndex: number;
    isSnakeDraftDescending: boolean;
    
    // Actions
    setInitialDraft: (slices: Slice[], factions: Faction[], playerNames: string[]) => void;
    makePick: (playerId: string, category: PickCategory, value: any) => void;
}

export const useDraftStore = create<DraftState>((set) => ({
    slices: [],
    factions: [],
    players: [],
    turnOrder: [],
    currentTurnIndex: 0,
    isSnakeDraftDescending: true,

    setInitialDraft: (slices, factions, playerNames) => {
        const players = playerNames.map((name, i) => ({
            id: `player-${i}`,
            name
        }));
        
        const turnOrder = players.map(p => p.id);
        
        set({ 
            slices, 
            factions, 
            players, 
            turnOrder, 
            currentTurnIndex: 0,
            isSnakeDraftDescending: true 
        });
    },

    makePick: (playerId, category, value) => set((state) => {
        // Ensure it's the player's turn
        if (state.turnOrder[state.currentTurnIndex] !== playerId) return state;

        const newPlayers = state.players.map(p => {
            if (p.id === playerId) {
                const key = category === 'faction' ? 'factionId' : (category === 'slice' ? 'sliceId' : 'position');
                return { ...p, [key]: value };
            }
            return p;
        });

        // Remove picked item from available pools
        let newSlices = [...state.slices];
        let newFactions = [...state.factions];

        if (category === 'slice') {
            newSlices = newSlices.filter(s => s.id !== value);
        } else if (category === 'faction') {
            newFactions = newFactions.filter(f => f.id !== value);
        }

        // Snake Draft Turn Logic
        let nextIndex = state.currentTurnIndex;
        let nextDescending = state.isSnakeDraftDescending;

        if (nextDescending) {
            if (nextIndex === state.turnOrder.length - 1) {
                // Stay at the same index for the double turn
                nextDescending = false;
            } else {
                nextIndex++;
            }
        } else {
            if (nextIndex === 0) {
                // Stay at the same index for the double turn
                nextDescending = true;
            } else {
                nextIndex--;
            }
        }

        return { 
            players: newPlayers,
            slices: newSlices,
            factions: newFactions,
            currentTurnIndex: nextIndex,
            isSnakeDraftDescending: nextDescending
        };
    })
}));
