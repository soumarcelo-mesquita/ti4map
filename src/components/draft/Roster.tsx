'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { DraftState } from '@/types/draft';
import { getFaction, factionImage } from '@/data/factions';
import { getLayout, seatsClockwiseFrom } from '@/data/seats';
import { currentPlayerId, nextPlayerId } from '@/lib/draftEngine';

export function Roster({ state, myPlayerId }: { state: DraftState; myPlayerId: string }) {
  const turnId = currentPlayerId(state);
  const upNextId = nextPlayerId(state);
  const layout = getLayout(state.settings.playerCount);
  const seatLabel = (seatId: string | null) =>
    layout?.seats.find((s) => s.id === seatId)?.label ?? '—';

  // Clockwise turn-order index per seat, once the Speaker has a seat.
  const orderBySeat = useMemo(() => {
    const m = new Map<string, number>();
    const seats = getLayout(state.settings.playerCount)?.seats;
    const speaker = state.players.find((p) => p.isSpeaker && p.seatId);
    if (speaker?.seatId && seats) {
      seatsClockwiseFrom(seats, speaker.seatId).forEach((id, i) => m.set(id, i));
    }
    return m;
  }, [state.players, state.settings.playerCount]);

  const roleLabel = (p: DraftState['players'][number]) => {
    if (p.isSpeaker) return 'Speaker';
    const o = p.seatId ? orderBySeat.get(p.seatId) : undefined;
    return o === undefined ? '—' : `${o + 1}º`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {state.players.map((p) => {
        const isTurn = p.id === turnId;
        const isNext = !isTurn && p.id === upNextId;
        const isMe = p.id === myPlayerId;
        const faction = p.faction ? getFaction(p.faction) : null;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
              isTurn
                ? 'border-primary bg-primary/10 glow-blue'
                : isNext
                  ? 'border-amber-400/40 bg-amber-400/5'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {p.faction ? (
                <Image src={factionImage(p.faction)} alt={faction?.name ?? p.faction} width={52} height={52} />
              ) : (
                <span className="text-slate-600 font-black text-2xl">?</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black text-white truncate">{p.name}</span>
                {isMe && <span className="text-[9px] font-black text-primary uppercase">você</span>}
                {isTurn && (
                  <span className="text-[9px] font-black text-slate-950 bg-primary rounded-full px-2 py-0.5 uppercase">
                    Jogando
                  </span>
                )}
                {isNext && (
                  <span className="text-[9px] font-black text-amber-300 border border-amber-400/50 rounded-full px-2 py-0.5 uppercase">
                    Próximo
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-bold flex gap-2 mt-0.5">
                <span className={p.isSpeaker ? 'text-amber-400' : undefined}>{roleLabel(p)}</span>
                <span>·</span>
                <span>{seatLabel(p.seatId)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
