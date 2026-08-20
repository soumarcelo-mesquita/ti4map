'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { GalaxyMap, type SeatOccupant } from '@/components/map/GalaxyMap';
import { SpeakerSection, FactionSection, SliceSection, PositionSection } from '@/components/draft/DraftBoard';
import { VetoBoard } from '@/components/draft/VetoBoard';
import { Roster } from '@/components/draft/Roster';
import { useRoomStore } from '@/store/roomStore';
import { getLayout, seatsClockwiseFrom } from '@/data/seats';
import { getFaction } from '@/data/factions';
import { currentPlayerId, nextPlayerId, hasPicked, makePick, finalizeVetoPhase } from '@/lib/draftEngine';
import type { DraftCategory, DraftPlayer } from '@/types/draft';

interface PendingPick {
  category: DraftCategory;
  value: string | number;
  /** human-readable description shown in the confirmation dialog */
  label: string;
}

/** Resolve the `?player=` param against player names (preferred) or ids (legacy). */
function resolvePlayer(players: DraftPlayer[], param: string | null): DraftPlayer | undefined {
  if (!param) return undefined;
  const want = decodeURIComponent(param).trim().toLowerCase();
  return players.find(
    (p) => p.name.trim().toLowerCase() === want || p.id.toLowerCase() === want,
  );
}

/** Link a player uses to enter the room as themselves. */
export const playerLink = (roomId: string, name: string) =>
  `/room/${roomId}?player=${encodeURIComponent(name)}`;

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
            Carregando sala...
          </div>
        </main>
      }
    >
      <RoomContent />
    </Suspense>
  );
}

function RoomContent() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const playerParam = search.get('player');

  const { state, vetoes, isLoading, error, loadRoom, saveState, submitVeto, leaveRoom } = useRoomStore();
  const [pickError, setPickError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPick | null>(null);

  useEffect(() => {
    if (params.id) loadRoom(params.id);
    return () => leaveRoom();
  }, [params.id, loadRoom, leaveRoom]);

  const layout = state ? getLayout(state.settings.playerCount) : undefined;

  const occupants = useMemo<Record<string, SeatOccupant>>(() => {
    const m: Record<string, SeatOccupant> = {};
    state?.players.forEach((p) => {
      if (p.seatId) m[p.seatId] = { playerName: p.name, factionId: p.faction };
    });
    return m;
  }, [state]);

  const speakerSeatId = useMemo(() => {
    const speaker = state?.players.find((p) => p.isSpeaker && p.seatId);
    return speaker?.seatId ?? null;
  }, [state]);

  // Browser-tab title carries the player identity (rooms are often opened in
  // several tabs/devices — one per player).
  const meName = state ? resolvePlayer(state.players, playerParam)?.name : undefined;
  useEffect(() => {
    document.title = meName ? `TI4 Setup — ${meName}` : 'TI4 Setup';
  }, [meName]);

  // Advance the veto phase as soon as every player's veto is in. This runs on
  // every connected client (and on page load) rather than only inside the
  // handler of whoever happens to submit last — a submit-only check races
  // against realtime propagation of the other players' rows and can leave
  // the room stuck in 'veto' forever if the last submitter's local state
  // hadn't caught up to everyone else's vetoes yet.
  useEffect(() => {
    if (!state || state.status !== 'veto') return;
    if (vetoes.length < state.players.length) return;
    const unionIds = Array.from(new Set(vetoes.flatMap((v) => v.factionIds)));
    saveState(finalizeVetoPhase(state, unionIds));
  }, [state, vetoes, saveState]);

  if (isLoading || !state) {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
          {error ?? 'Carregando sala...'}
        </div>
      </main>
    );
  }

  const me = resolvePlayer(state.players, playerParam);

  // No (valid) player in the URL → let the visitor pick who they are by name.
  if (!me) {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm glass rounded-3xl p-8 space-y-5 border border-white/10">
            <header className="space-y-1 text-center">
              <h1 className="text-2xl font-black text-white">Quem é você?</h1>
              <p className="text-xs text-slate-400">Escolha seu nome para entrar no draft.</p>
            </header>
            <div className="space-y-2">
              {state.players.map((p) => (
                <a
                  key={p.id}
                  href={playerLink(params.id, p.name)}
                  className="block w-full text-center py-3 rounded-xl font-black text-sm bg-white/5 text-white border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all"
                >
                  {p.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const myPlayerId = me.id;
  const turnId = currentPlayerId(state);
  const isMyTurn = turnId === myPlayerId && state.status === 'drafting';
  const turnPlayer = state.players.find((p) => p.id === turnId);
  const nextId = nextPlayerId(state);
  const nextPlayer = nextId && nextId !== turnId ? state.players.find((p) => p.id === nextId) : null;

  const canPickPosition = isMyTurn && !hasPicked(me, 'position') && !state.pools.speakerAvailable;
  const pickableSeatIds = canPickPosition ? state.pools.seats : [];

  // Clockwise order label for a seat (relative to the speaker), for nicer prompts.
  const seatDescription = (seatId: string): string => {
    const seatLabel = layout?.seats.find((s) => s.id === seatId)?.label ?? seatId;
    if (!speakerSeatId || !layout) return `assento ${seatLabel}`;
    const order = seatsClockwiseFrom(layout.seats, speakerSeatId).indexOf(seatId);
    if (order < 0) return `assento ${seatLabel}`;
    return order === 0 ? 'a posição do Speaker' : `a ${order + 1}ª posição (assento ${seatLabel})`;
  };

  const describePick = (category: DraftCategory, value: string | number): string => {
    if (category === 'faction') return getFaction(String(value))?.name ?? String(value);
    if (category === 'speaker') return 'ser o Speaker (1º a jogar)';
    if (category === 'slice') {
      const n = String(value).replace('slice-', '');
      return `a Fatia ${n}`;
    }
    return seatDescription(String(value));
  };

  // Stage a pick; the confirmation dialog commits it.
  const requestPick = (category: DraftCategory, value: string | number) => {
    setPickError(null);
    setPending({ category, value, label: describePick(category, value) });
  };

  const confirmPick = async () => {
    if (!pending) return;
    const { category, value } = pending;
    setPending(null);
    const result = makePick(state, myPlayerId, category, value);
    if (!result.ok) {
      setPickError(result.error ?? 'Pick inválido.');
      return;
    }
    await saveState(result.state);
  };

  // Just records this player's own veto; the effect above (which every
  // connected client runs) is what finalizes the phase once all are in.
  const confirmVeto = async (factionIds: string[]) => {
    await submitVeto(params.id, myPlayerId, factionIds);
  };

  if (state.status === 'veto') {
    return (
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-3xl">
            <VetoBoard state={state} me={me} vetoes={vetoes} onConfirm={confirmVeto} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col gap-6 p-4 lg:p-6">
        {/* Top section (full width): current turn + choices already made */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 border border-white/10">
            {state.status === 'complete' ? (
              <div className="space-y-1">
                <h2 className="text-lg font-black text-emerald-400">Draft completo!</h2>
                <p className="text-xs text-slate-400">
                  Ordem de jogo:{' '}
                  {state.gameOrder
                    ?.map((id) => state.players.find((p) => p.id === id)?.name)
                    .join(' → ')}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">
                  {isMyTurn ? 'Sua vez de escolher' : `Vez de ${turnPlayer?.name ?? '...'}`}
                </h2>
                <p className="text-xs text-slate-400">
                  Escolha <b>um</b>: speaker, facção{state.pools.slices.length > 0 ? ', fatia' : ''}
                  {state.pools.speakerAvailable ? '' : ' ou posição'}.
                  {state.pools.speakerAvailable && (
                    <> <span className="text-amber-400/80">Posições liberam após o speaker ser escolhido.</span></>
                  )}
                  {nextPlayer && (
                    <>
                      {' '}
                      <span className="text-amber-400/80">Próximo: {nextPlayer.name}.</span>
                    </>
                  )}
                </p>
              </div>
            )}
            {pickError && <p className="mt-2 text-xs font-bold text-red-400">{pickError}</p>}
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10">
            <Roster state={state} myPlayerId={myPlayerId} />
          </div>
        </div>

        {/* Full-width stacked areas: jogadores (acima) → facções → mapa → fatias */}
        {state.status === 'drafting' && (
          <div className="glass rounded-2xl p-4 border border-white/10 space-y-6">
            <SpeakerSection state={state} me={me} isMyTurn={isMyTurn} onPick={requestPick} />
            <FactionSection state={state} me={me} isMyTurn={isMyTurn} onPick={requestPick} />
          </div>
        )}

        <div className="glass rounded-3xl p-3 sm:p-4 border border-white/10 space-y-3">
          {state.status === 'drafting' && (
            <PositionSection state={state} me={me} isMyTurn={isMyTurn} onPick={requestPick} />
          )}
          <div className="flex items-center justify-center">
            <GalaxyMap
              mapString={state.mapString}
              seats={layout?.seats ?? []}
              occupants={occupants}
              speakerSeatId={speakerSeatId}
              pickableSeatIds={pickableSeatIds}
              onSeatClick={(seatId) => requestPick('position', seatId)}
            />
          </div>
        </div>

        {state.status === 'drafting' && (
          <SliceSection state={state} me={me} isMyTurn={isMyTurn} onPick={requestPick} />
        )}
      </div>

      {/* Confirmation dialog */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPending(null)}
        >
          <div
            className="glass w-full max-w-sm rounded-3xl p-6 border border-white/10 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Confirmar escolha
              </h2>
              <p className="text-base font-black text-white">
                Escolher <span className="text-primary">{pending.label}</span>?
              </p>
              <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-white/5 text-slate-300 border border-white/10 hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPick}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
