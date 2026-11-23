import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BlindPickSubmission, DraftState, VetoSubmission } from '@/types/draft';

interface RoomStore {
  roomId: string | null;
  roomName: string | null;
  state: DraftState | null;
  vetoes: VetoSubmission[];
  blindPicks: BlindPickSubmission[];
  isLoading: boolean;
  error: string | null;

  loadRoom: (id: string) => Promise<void>;
  saveState: (state: DraftState) => Promise<void>;
  createRoom: (name: string, state: DraftState) => Promise<string | null>;
  submitVeto: (roomId: string, playerId: string, factionIds: string[]) => Promise<VetoSubmission[]>;
  submitBlindPick: (roomId: string, round: number, playerId: string, factionId: string) => Promise<void>;
  leaveRoom: () => void;
}

let channel: RealtimeChannel | null = null;
let vetoChannel: RealtimeChannel | null = null;

type VetoRow = { player_id: string; faction_ids: unknown };

function toVetoSubmission(row: VetoRow): VetoSubmission {
  return { playerId: row.player_id, factionIds: (row.faction_ids as string[]) ?? [] };
}

/**
 * Blind picks reuse the `room_vetoes` table (one row per player per round,
 * same secret-write/realtime mechanics) under a namespaced player_id, so no
 * extra table/migration is needed: `blind:<round>:<playerId>`.
 */
const BLIND_PREFIX = 'blind:';
const blindKey = (round: number, playerId: string) => `${BLIND_PREFIX}${round}:${playerId}`;

function toBlindPick(row: VetoRow): BlindPickSubmission | null {
  const m = row.player_id.match(/^blind:(\d+):(.+)$/);
  const factionId = (row.faction_ids as string[] | null)?.[0];
  if (!m || !factionId) return null;
  return { round: Number(m[1]), playerId: m[2], factionId };
}

function splitRows(rows: VetoRow[]): { vetoes: VetoSubmission[]; blindPicks: BlindPickSubmission[] } {
  const vetoes: VetoSubmission[] = [];
  const blindPicks: BlindPickSubmission[] = [];
  for (const row of rows) {
    if (row.player_id.startsWith(BLIND_PREFIX)) {
      const pick = toBlindPick(row);
      if (pick) blindPicks.push(pick);
    } else {
      vetoes.push(toVetoSubmission(row));
    }
  }
  return { vetoes, blindPicks };
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomId: null,
  roomName: null,
  state: null,
  vetoes: [],
  blindPicks: [],
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
      ...splitRows((vetoRows ?? []) as VetoRow[]),
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
          const row = payload.new as VetoRow;
          if (!row?.player_id) return;
          if (row.player_id.startsWith(BLIND_PREFIX)) {
            const pick = toBlindPick(row);
            if (!pick) return;
            set((s) => ({
              blindPicks: [
                ...s.blindPicks.filter((b) => !(b.round === pick.round && b.playerId === pick.playerId)),
                pick,
              ],
            }));
            return;
          }
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

  submitBlindPick: async (roomId, round, playerId, factionId) => {
    const { error } = await supabase
      .from('room_vetoes')
      .upsert(
        { room_id: roomId, player_id: blindKey(round, playerId), faction_ids: [factionId] },
        { onConflict: 'room_id,player_id' },
      );
    if (error) {
      set({ error: error.message });
      return;
    }
    set((s) => ({
      blindPicks: [
        ...s.blindPicks.filter((b) => !(b.round === round && b.playerId === playerId)),
        { round, playerId, factionId },
      ],
    }));
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
    set({ roomId: null, roomName: null, state: null, vetoes: [], blindPicks: [], error: null });
  },
}));
