'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { BlindPickSubmission, DraftState } from '@/types/draft';
import { getFaction, factionImage } from '@/data/factions';
import { getLayout, seatsClockwiseFrom } from '@/data/seats';
import { currentPlayerId, nextPlayerId } from '@/lib/draftEngine';

type BlindStatus = 'picking' | 'picked' | 'locked';

export function Roster({
  state,
  myPlayerId,
  blindPicks = [],
}: {
  state: DraftState;
  myPlayerId: string;
  /** secret picks of the blind phase — only used to tell who already chose (never what) */
  blindPicks?: BlindPickSubmission[];
}) {
  // During the blind pick each card shows whether that player already chose
  // this round, or already has a faction locked from an earlier round.
  const blind = state.status === 'blind' ? state.blind : undefined;
  const blindStatus = (playerId: string): BlindStatus | null => {
    if (!blind) return null;
    if (!blind.pendingPlayerIds.includes(playerId)) return 'locked';
    return blindPicks.some((b) => b.round === blind.round && b.playerId === playerId) ? 'picked' : 'picking';
  };
  const turnId = currentPlayerId(state);
  const upNextId = nextPlayerId(state);
  const layout = getLayout(state.settings.playerCount, state.settings.mapVariant);
  const seatLabel = (seatId: string | null) =>
    layout?.seats.find((s) => s.id === seatId)?.label ?? '—';

  // Clockwise turn-order index per seat, once the Speaker has a seat.
  const orderBySeat = useMemo(() => {
    const m = new Map<string, number>();
    const seats = getLayout(state.settings.playerCount, state.settings.mapVariant)?.seats;
    const speaker = state.players.find((p) => p.isSpeaker && p.seatId);
    if (speaker?.seatId && seats) {
      seatsClockwiseFrom(seats, speaker.seatId).forEach((id, i) => m.set(id, i));
    }
    return m;
  }, [state.players, state.settings.playerCount, state.settings.mapVariant]);

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
        const bStatus = blindStatus(p.id);
        // Other players' factions stay secret until the blind pick is over for everyone.
        const shownFactionId = blind && !isMe ? null : p.faction;
        const faction = shownFactionId ? getFaction(shownFactionId) : null;
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
              {shownFactionId ? (
                <Image src={factionImage(shownFactionId)} alt={faction?.name ?? shownFactionId} width={52} height={52} />
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
                {bStatus === 'picking' && (
                  <span className="text-[9px] font-black text-slate-400 border border-white/15 rounded-full px-2 py-0.5 uppercase">
                    ⏳ Escolhendo
                  </span>
                )}
                {bStatus === 'picked' && (
                  <span className="text-[9px] font-black text-slate-950 bg-emerald-400 rounded-full px-2 py-0.5 uppercase">
                    ✓ Escolheu
                  </span>
                )}
                {bStatus === 'locked' && (
                  <span className="text-[9px] font-black text-emerald-300 border border-emerald-400/50 rounded-full px-2 py-0.5 uppercase">
                    ✓ Facção definida
                  </span>
                )}
                {isNext && (
                  <span className="text-[9px] font-black text-amber-300 border border-amber-400/50 rounded-full px-2 py-0.5 uppercase">
                    Próximo
                  </span>
                )}
              </div>
              {state.settings.factionsOnly ? (
                <div className="text-xs text-slate-400 font-bold mt-0.5 truncate">{faction?.name ?? '—'}</div>
              ) : (
              <div className="text-xs text-slate-400 font-bold flex gap-2 mt-0.5">
                <span className={p.isSpeaker ? 'text-amber-400' : undefined}>{roleLabel(p)}</span>
                <span>·</span>
                <span>{seatLabel(p.seatId)}</span>
              </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
