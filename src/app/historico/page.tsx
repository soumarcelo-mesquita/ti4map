'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import type { DraftState } from '@/types/draft';

interface RoomSummary {
  id: string;
  name: string;
  created_at: string;
  state: DraftState;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function HistoricoPage() {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('rooms')
      .select('id,name,created_at,state')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        setRooms((data ?? []) as RoomSummary[]);
      });
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-2xl glass rounded-3xl p-5 sm:p-8 lg:p-10 space-y-6 border border-white/10">
          <header className="space-y-2">
            <h1 className="text-3xl font-black text-white">Histórico de partidas</h1>
            <p className="text-sm text-slate-400">Salas de draft criadas anteriormente.</p>
          </header>

          {error && (
            <p className="text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {!error && !rooms && (
            <p className="text-sm text-slate-400 font-bold">Carregando...</p>
          )}

          {rooms && rooms.length === 0 && (
            <p className="text-sm text-slate-400 font-bold">Nenhuma sala encontrada ainda.</p>
          )}

          {rooms && rooms.length > 0 && (
            <ul className="space-y-2">
              {rooms.map((room) => {
                const isComplete = room.state?.status === 'complete';
                const playerCount = room.state?.players?.length ?? room.state?.settings?.playerCount;
                return (
                  <li key={room.id}>
                    <Link
                      href={`/room/${room.id}`}
                      className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl py-3 px-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{room.name}</p>
                        <p className="text-[11px] text-slate-500">{formatDate(room.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {playerCount != null && (
                          <span className="text-[11px] text-slate-400 font-bold">{playerCount}p</span>
                        )}
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {isComplete ? 'Completo' : 'Em andamento'}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
