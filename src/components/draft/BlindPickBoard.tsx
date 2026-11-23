'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { BlindPickSubmission, DraftPlayer, DraftState } from '@/types/draft';
import { factionImage, getFaction } from '@/data/factions';
import { blindOptions } from '@/lib/draftEngine';

interface BlindPickBoardProps {
  state: DraftState;
  me: DraftPlayer;
  blindPicks: BlindPickSubmission[];
  onConfirm: (factionId: string) => Promise<void>;
}

const factionName = (id: string) => getFaction(id)?.name ?? id;

/** "A", "A e B", "A, B e C" */
const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;

/**
 * Blind faction pick: every pending player secretly picks one faction at the
 * same time. Unique picks are locked; players who collided pick again among
 * themselves, without the factions they already tried.
 */
export function BlindPickBoard({ state, me, blindPicks, onConfirm }: BlindPickBoardProps) {
  const blind = state.blind!;
  const round = blind.round;
  const pending = blind.pendingPlayerIds;
  const iAmPending = pending.includes(me.id);
  const myPick = blindPicks.find((b) => b.round === round && b.playerId === me.id);
  const submittedIds = new Set(blindPicks.filter((b) => b.round === round).map((b) => b.playerId));
  const submittedCount = pending.filter((id) => submittedIds.has(id)).length;

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Every faction of the room is listed (by name, to make them easy to find);
  // the ones another player already locked, and the ones I already tried and
  // lost to a collision, stay visible but disabled.
  const options = new Set(blindOptions(state, me.id));
  const myTried = blind.tried[me.id] ?? [];
  const takenByOthers = new Set(
    state.players.filter((p) => p.id !== me.id && p.faction).map((p) => p.faction as string),
  );
  const allFactions = Array.from(new Set([...state.pools.factions, ...takenByOthers])).sort((a, b) =>
    factionName(a).localeCompare(factionName(b)),
  );
  const myAutoAssigned = blind.log.some((l) => l.autoAssigned?.includes(me.id));
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;

  // Collision that sent me to this round (if any), for the prompt.
  const lastLog = blind.log[blind.log.length - 1];
  const myCollision = lastLog
    ? Object.entries(lastLog.collisions).find(([, ids]) => ids.includes(me.id))
    : undefined;

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    await onConfirm(selected);
    setSubmitting(false);
    setSelected(null);
  };

  const header = (
    <header className="space-y-1">
      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
        Blind pick de facções · Rodada {round}
      </p>
      <p className="text-[11px] font-bold text-slate-500">
        {submittedCount}/{pending.length} jogador{pending.length === 1 ? '' : 'es'} desta rodada já
        escolhe{pending.length === 1 ? 'u' : 'ram'}.
      </p>
    </header>
  );

  // Already have a faction: just wait for the others.
  if (!iAmPending) {
    return (
      <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
        {header}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3">
          {me.faction && <Image src={factionImage(me.faction)} alt="" width={40} height={40} />}
          <div>
            <h2 className="text-base font-black text-emerald-400">
              Sua facção: {me.faction ? factionName(me.faction) : '—'}
            </h2>
            <p className="text-xs text-slate-400">
              {myAutoAssigned
                ? 'Você já tinha tentado todas as facções restantes, então esta foi sorteada para você. '
                : ''}
              Aguardando os jogadores que empataram escolherem de novo. As facções dos outros aparecem quando todos
              tiverem a sua.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Picked this round: wait.
  if (myPick) {
    return (
      <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
        {header}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <Image src={factionImage(myPick.factionId)} alt="" width={40} height={40} />
          <div>
            <h2 className="text-base font-black text-white">Escolha enviada: {factionName(myPick.factionId)}</h2>
            <p className="text-xs text-slate-400">
              Ninguém vê sua escolha. Se outro jogador escolher a mesma facção, vocês escolhem de novo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
      {header}
      {myCollision ? (
        <div
          role="alert"
          className="flex items-center gap-4 rounded-2xl border-2 border-amber-400 bg-amber-400/15 p-5 sm:p-6"
        >
          <Image src={factionImage(myCollision[0])} alt="" width={64} height={64} className="shrink-0 opacity-60" />
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300">Conflito! Escolha uma nova facção</h2>
            <p className="text-sm sm:text-base font-bold text-amber-100">
              {joinNames(myCollision[1].map(nameOf))} escolheram <b>{factionName(myCollision[0])}</b>. Ninguém
              ficou com ela — escolham de novo.
            </p>
            <p className="text-xs font-bold text-amber-200/70">
              Facções já escolhidas por outros jogadores e as que você já tentou estão desabilitadas.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white">Escolha sua facção em segredo</h2>
          <p className="text-xs text-slate-400">
            Todos escolhem ao mesmo tempo e ninguém vê a escolha dos outros. Se duas ou mais pessoas escolherem a
            mesma facção, só elas escolhem de novo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
        {allFactions.map((fid) => {
          const isSelected = selected === fid;
          const tried = myTried.includes(fid);
          const disabled = !options.has(fid);
          return (
            <button
              key={fid}
              disabled={disabled}
              onClick={() => setSelected(fid)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${
                disabled
                  ? tried
                    ? 'border-red-500/30 bg-red-500/5 text-slate-500 cursor-not-allowed opacity-50'
                    : 'border-white/5 bg-white/5 text-slate-600 cursor-not-allowed opacity-35'
                  : isSelected
                    ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                    : 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
              }`}
            >
              <Image
                src={factionImage(fid)}
                alt={factionName(fid)}
                width={28}
                height={28}
                className={disabled ? 'grayscale' : undefined}
              />
              <span className="text-[9px] opacity-80 text-center leading-tight">{factionName(fid)}</span>
              {disabled && (
                <span className={`text-[8px] uppercase tracking-wide ${tried ? 'text-red-400' : 'text-slate-500'}`}>
                  {tried ? 'Você já tentou' : 'Indisponível'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected || submitting}
        className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-lg hover:bg-primary transition-all disabled:opacity-50"
      >
        {submitting ? 'Enviando...' : selected ? `Confirmar ${factionName(selected)}` : 'Selecione uma facção'}
      </button>

    </div>
  );
}
