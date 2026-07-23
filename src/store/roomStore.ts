import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { DraftState, VetoSubmission } from '@/types/draft';

interface RoomStore {
  roomId: string | null;
  roomName: string | null;
  state: DraftState | null;
  vetoes: VetoSubmission[];
  isLoading: boolean;
  error: string | null;

  loadRoom: (id: string) => Promise<void>;
  saveState: (state: DraftState) => Promise<void>;
  createRoom: (name: string, state: DraftState) => Promise<string | null>;
  submitVeto: (roomId: string, playerId: string, factionIds: string[]) => Promise<VetoSubmission[]>;
  leaveRoom: () => void;
}

let channel: RealtimeChannel | null = null;
let vetoChannel: RealtimeChannel | null = null;

function toVetoSubmission(row: { player_id: string; faction_ids: unknown }): VetoSubmission {
  return { playerId: row.player_id, factionIds: (row.faction_ids as string[]) ?? [] };
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomId: null,
  roomName: null,
  state: null,
  vetoes: [],
  isLoading: false,
  error: null,

  loadRoom: async (id) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      set({ isLoading: false, error: error?.message ?? 'Room not found.' });
      return;
    }

    const { data: vetoRows } = await supabase
      .from('room_vetoes')
      .select('player_id, faction_ids')
      .eq('room_id', id);

    set({
      roomId: data.id,
      roomName: data.name,
      state: data.state as DraftState,
      vetoes: (vetoRows ?? []).map(toVetoSubmission),
      isLoading: false,
    });

    // Clean up any previous subscriptions before opening new ones.
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    if (vetoChannel) {
      supabase.removeChannel(vetoChannel);
      vetoChannel = null;
    }

    channel = supabase
      .channel(`room-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
        (payload) => {
          set({ state: (payload.new as { state: DraftState }).state });
        },
      )
      .subscribe();

    vetoChannel = supabase
      .channel(`room-vetoes-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_vetoes', filter: `room_id=eq.${id}` },
        (payload) => {
          const row = payload.new as { player_id: string; faction_ids: unknown };
          set((s) => ({
            vetoes: [...s.vetoes.filter((v) => v.playerId !== row.player_id), toVetoSubmission(row)],
          }));
        },
      )
      .subscribe();
  },

  saveState: async (state) => {
    const { roomId } = get();
    if (!roomId) return;
    // Optimistic local update; realtime echo will reconcile other clients.
    set({ state });
    const { error } = await supabase.from('rooms').update({ state }).eq('id', roomId);
    if (error) set({ error: error.message });
  },

  createRoom: async (name, state) => {
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name, settings: state.settings, state }])
      .select()
      .single();

    if (error || !data) return null;
    return data.id as string;
  },

  submitVeto: async (roomId, playerId, factionIds) => {
    // Each player only ever touches their own row (unique on room_id+player_id),
    // so concurrent submissions from other players never race/clobber this write.
    const { error } = await supabase
      .from('room_vetoes')
      .upsert({ room_id: roomId, player_id: playerId, faction_ids: factionIds }, { onConflict: 'room_id,player_id' });
    if (error) {
      set({ error: error.message });
      return get().vetoes;
    }
    const next = [...get().vetoes.filter((v) => v.playerId !== playerId), { playerId, factionIds }];
    set({ vetoes: next });
    return next;
  },

  leaveRoom: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    if (vetoChannel) {
      supabase.removeChannel(vetoChannel);
      vetoChannel = null;
    }
    set({ roomId: null, roomName: null, state: null, vetoes: [], error: null });
  },
}));
