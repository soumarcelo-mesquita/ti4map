import { supabase } from '@/lib/supabase';
import { create } from 'zustand';

interface RoomState {
    roomId: string | null;
    roomName: string | null;
    roomState: any;
    isLoading: boolean;
    
    setRoom: (id: string) => Promise<void>;
    updateRoomState: (newState: any) => Promise<void>;
    createRoom: (name: string, settings: any, initialState: any) => Promise<string | null>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
    roomId: null,
    roomName: null,
    roomState: null,
    isLoading: false,

    setRoom: async (id) => {
        set({ isLoading: true });
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            set({ roomId: data.id, roomName: data.name, roomState: data.state, isLoading: false });

            // Limpa canais antigos se houver
            supabase.removeChannel(supabase.channel(`room-${id}`));

            // Inscreve para mudanças em tempo real
            const channel = supabase.channel(`room-${id}`);
            
            channel
                .on('postgres_changes', 
                    { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, 
                    (payload) => {
                        set({ roomState: payload.new.state });
                    }
                )
                .subscribe();
        } else {
            set({ isLoading: false });
        }
    },

    updateRoomState: async (newState) => {
        const { roomId } = get();
        if (!roomId) return;

        await supabase
            .from('rooms')
            .update({ state: newState })
            .eq('id', roomId);
    },

    createRoom: async (name, settings, initialState) => {
        const { data, error } = await supabase
            .from('rooms')
            .insert([
                { name, settings, state: initialState }
            ])
            .select()
            .single();

        if (data) {
            return data.id;
        }
        return null;
    }
}));
