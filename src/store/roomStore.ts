import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { DraftState } from '@/types/draft';

interface RoomStore {
  roomId: string | null;
  roomName: string | null;
  state: DraftState | null;
  isLoading: boolean;
  error: string | null;

  loadRoom: (id: string) => Promise<void>;
  saveState: (state: DraftState) => Promise<void>;
  createRoom: (name: string, state: DraftState) => Promise<string | null>;
  leaveRoom: () => void;
}

let channel: RealtimeChannel | null = null;

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomId: null,
  roomName: null,
  state: null,
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

    set({
      roomId: data.id,
      roomName: data.name,
      state: data.state as DraftState,
      isLoading: false,
    });

    // Clean up any previous subscription before opening a new one.
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
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

  leaveRoom: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    set({ roomId: null, roomName: null, state: null, error: null });
  },
}));
