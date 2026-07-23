'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DraftPlayer, DraftState, VetoSubmission } from '@/types/draft';
import { factionImage, factionPool } from '@/data/factions';

interface VetoBoardProps {
  state: DraftState;
  me: DraftPlayer;
  vetoes: VetoSubmission[];
  onConfirm: (factionIds: string[]) => Promise<void>;
}

/** Secret pre-draft veto phase: each player bans N factions before the draft starts. */
export function VetoBoard({ state, me, vetoes, onConfirm }: VetoBoardProps) {
  const vetoCount = state.settings.vetoCount ?? 0;
  const hostExcluded = state.settings.excludedFactionIds ?? [];
  const eligible = factionPool(state.settings.includePoK, state.settings.includeTE ?? false).filter(
    (f) => !hostExcluded.includes(f.id),
  );

  const myVeto = vetoes.find((v) => v.playerId === me.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < vetoCount) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(Array.from(selected));
    setSubmitting(false);
  };

  const confirmedCount = vetoes.length;
  const total = state.players.length;

  if (myVeto) {
    return (
      <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
        <header className="space-y-1">
          <h2 className="text-lg font-black text-emerald-400">Vetos enviados ✓</h2>
          <p className="text-xs text-slate-400">
            Aguardando os outros jogadores confirmarem seus vetos secretos ({confirmedCount}/{total}).
          </p>
        </header>
        <ul className="space-y-1.5">
          {state.players.map((p) => {
            const done = vetoes.some((v) => v.playerId === p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold"
              >
                <span className={p.id === me.id ? 'text-white' : 'text-slate-300'}>
                  {p.name}
                  {p.id === me.id && ' (você)'}
                </span>
                <span className={done ? 'text-emerald-400' : 'text-slate-500'}>{done ? '✓ confirmado' : '⏳ aguardando'}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-5">
      <header className="space-y-1">
        <h2 className="text-lg font-black text-white">Vete facções antes do draft</h2>
        <p className="text-xs text-slate-400">
          Escolha <b>{vetoCount}</b> facç{vetoCount === 1 ? 'ão' : 'ões'} para banir do draft. Seus vetos são
          secretos — ninguém vê suas escolhas. Mais de um jogador pode vetar a mesma facção.
        </p>
        <p className="text-[11px] font-bold text-slate-500">
          {confirmedCount}/{total} jogadores já confirmaram.
        </p>
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2 max-h-96 overflow-y-auto pr-1">
        {eligible.map((f) => {
          const isSelected = selected.has(f.id);
          const disabled = !isSelected && selected.size >= vetoCount;
          return (
            <button
              key={f.id}
              disabled={disabled}
              onClick={() => toggle(f.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${
                isSelected
                  ? 'border-red-500/60 bg-red-500/20 text-red-300'
                  : disabled
                    ? 'border-white/5 bg-white/5 text-slate-600 cursor-not-allowed opacity-40'
                    : 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
              }`}
            >
              <Image src={factionImage(f.id)} alt={f.name} width={28} height={28} />
              <span className="text-[9px] opacity-80 text-center leading-tight">{f.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={selected.size !== vetoCount || submitting}
        className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-lg hover:bg-primary transition-all disabled:opacity-50"
      >
        {submitting ? 'Enviando...' : `Confirmar vetos (${selected.size}/${vetoCount})`}
      </button>
    </div>
  );
}
