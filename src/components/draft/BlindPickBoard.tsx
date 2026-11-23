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

  // Every eligible faction is offered, so list them by name to make them easy to find.
  const options = blindOptions(state, me.id).sort((a, b) => factionName(a).localeCompare(factionName(b)));
  const myTried = blind.tried[me.id] ?? [];
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

  const roundLog =
    blind.log.length > 0 ? (
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Conflitos</h3>
        <ul className="space-y-1">
          {blind.log.map((entry) => {
            const contested = Object.entries(entry.collisions);
            return (
              <li key={entry.round} className="text-[11px] font-bold text-slate-400">
                <span className="text-slate-500">Rodada {entry.round}:</span>{' '}
                {contested.length === 0
                  ? 'sem conflitos.'
                  : contested
                      .map(([fid, ids]) => `${factionName(fid)} (${ids.map(nameOf).join(', ')})`)
                      .join(' · ')}
                {entry.autoAssigned?.length ? (
                  <span className="text-amber-400/80">
                    {' '}
                    — sem opções restantes, sorteado para {entry.autoAssigned.map(nameOf).join(', ')}.
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

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
              Aguardando os jogadores que empataram escolherem de novo.
            </p>
          </div>
        </div>
        {roundLog}
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
        {roundLog}
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
      {header}
      <div className="space-y-1">
        <h2 className="text-lg font-black text-white">
          {round === 1 ? 'Escolha sua facção em segredo' : 'Conflito! Escolha outra facção'}
        </h2>
        {myCollision ? (
          <p className="text-xs text-amber-300/90 font-bold">
            {myCollision[1].map(nameOf).join(' e ')} escolheram {factionName(myCollision[0])}. Ninguém ficou com
            ela — escolham de novo (as facções que você já tentou não aparecem mais).
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Todos escolhem ao mesmo tempo e ninguém vê a escolha dos outros. Se duas ou mais pessoas escolherem a
            mesma facção, só elas escolhem de novo.
          </p>
        )}
        {myTried.length > 0 && (
          <p className="text-[11px] text-slate-500 font-bold">
            Já tentou: {myTried.map(factionName).join(', ')}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
        {options.map((fid) => {
          const isSelected = selected === fid;
          return (
            <button
              key={fid}
              onClick={() => setSelected(fid)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                  : 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
              }`}
            >
              <Image src={factionImage(fid)} alt={factionName(fid)} width={28} height={28} />
              <span className="text-[9px] opacity-80 text-center leading-tight">{factionName(fid)}</span>
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

      {roundLog}
    </div>
  );
}
