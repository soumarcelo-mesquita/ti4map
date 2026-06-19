'use client';

import Image from 'next/image';
import type { DraftCategory, DraftPlayer, DraftState } from '@/types/draft';
import { getFaction, factionImage } from '@/data/factions';
import { hasPicked } from '@/lib/draftEngine';

interface DraftBoardProps {
  state: DraftState;
  me: DraftPlayer;
  isMyTurn: boolean;
  onPick: (category: DraftCategory, value: string | number) => void;
}

function PoolButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${
        disabled
          ? 'border-white/5 bg-white/5 text-slate-600 cursor-not-allowed'
          : 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function DraftBoard({ state, me, isMyTurn, onPick }: DraftBoardProps) {
  const lock = (cat: DraftCategory) => !isMyTurn || hasPicked(me, cat);
  const speaker = state.players.find((p) => p.isSpeaker);

  return (
    <div className="space-y-6">
      {/* Speaker (single token — first player) */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
          Speaker {me.isSpeaker && '✓'}
        </h3>
        {!speaker ? (
          <PoolButton disabled={lock('speaker')} onClick={() => onPick('speaker', 1)}>
            <span className="text-base">★</span>
            <span className="text-[9px] opacity-70">Ser o Speaker (1º a jogar)</span>
          </PoolButton>
        ) : (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs font-black text-amber-300 flex items-center gap-2">
            <span className="text-base">★</span>
            <span>{speaker?.name ?? '—'}</span>
          </div>
        )}
      </section>

      {/* Factions */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
          Facções {hasPicked(me, 'faction') && '✓'}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {state.pools.factions.map((fid) => {
            const f = getFaction(fid);
            return (
              <PoolButton key={fid} disabled={lock('faction')} onClick={() => onPick('faction', fid)}>
                <Image src={factionImage(fid)} alt={f?.name ?? fid} width={28} height={28} />
                <span className="text-[9px] opacity-80 text-center leading-tight">{f?.name ?? fid}</span>
              </PoolButton>
            );
          })}
        </div>
      </section>

      {/* Positions — chosen by clicking a home on the map */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
          Posição {hasPicked(me, 'position') && '✓'}
        </h3>
        <p className="text-[11px] text-slate-400 font-bold rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
          {hasPicked(me, 'position')
            ? 'Você já escolheu sua posição.'
            : 'Clique em um assento livre no mapa para escolher sua posição.'}
        </p>
      </section>
    </div>
  );
}
