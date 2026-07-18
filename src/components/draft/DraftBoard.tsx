'use client';

import Image from 'next/image';
import type { DraftCategory, DraftPlayer, DraftState } from '@/types/draft';
import { getFaction, factionImage } from '@/data/factions';
import { getLayout } from '@/data/seats';
import { getSliceLayouts } from '@/data/slices';
import { hasPicked } from '@/lib/draftEngine';
import { SliceCard } from './SliceCard';

/** Shared props of every draft section (page composes them full-width, in order). */
export interface DraftSectionProps {
  state: DraftState;
  me: DraftPlayer;
  isMyTurn: boolean;
  onPick: (category: DraftCategory, value: string | number) => void;
}

const lock = (props: DraftSectionProps, cat: DraftCategory) =>
  !props.isMyTurn || hasPicked(props.me, cat);

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

/** Speaker token pick (single token — first player). */
export function SpeakerSection(props: DraftSectionProps) {
  const { state, me, onPick } = props;
  const speaker = state.players.find((p) => p.isSpeaker);

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
        Speaker {me.isSpeaker && '✓'}
      </h3>
      {!speaker ? (
        <div className="max-w-xs">
          <PoolButton disabled={lock(props, 'speaker')} onClick={() => onPick('speaker', 1)}>
            <span className="text-base">★</span>
            <span className="text-[9px] opacity-70">Ser o Speaker (1º a jogar)</span>
          </PoolButton>
        </div>
      ) : (
        <div className="max-w-xs rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs font-black text-amber-300 flex items-center gap-2">
          <span className="text-base">★</span>
          <span>{speaker?.name ?? '—'}</span>
        </div>
      )}
    </section>
  );
}

/** Faction pool grid. */
export function FactionSection(props: DraftSectionProps) {
  const { state, me, onPick } = props;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
        Facções {hasPicked(me, 'faction') && '✓'}
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
        {state.pools.factions.map((fid) => {
          const f = getFaction(fid);
          return (
            <PoolButton key={fid} disabled={lock(props, 'faction')} onClick={() => onPick('faction', fid)}>
              <Image src={factionImage(fid)} alt={f?.name ?? fid} width={28} height={28} />
              <span className="text-[9px] opacity-80 text-center leading-tight">{f?.name ?? fid}</span>
            </PoolButton>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Fatias — conteúdo sorteado (7 sistemas balanceados), independente do
 * assento. O assento é escolhido separadamente na seção "Posição".
 * Renders nothing for rooms without slice draft.
 */
export function SliceSection(props: DraftSectionProps) {
  const { state, me, onPick } = props;
  const sliceLayouts = getSliceLayouts(state.settings.playerCount);
  const usesSlices =
    (state.pools.slices.length > 0 || state.players.some((p) => p.sliceId !== null)) &&
    sliceLayouts !== undefined &&
    state.settings.sliceAssignment !== undefined;
  if (!usesSlices) return null;

  return (
    <section className="glass rounded-2xl p-4 border border-white/10 space-y-2">
      <h3 className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
        Fatias {hasPicked(me, 'slice') && '✓'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sliceLayouts.map((s) => {
          const owner = state.players.find((p) => p.sliceId === s.id);
          const tileIds = state.settings.sliceAssignment?.[s.id] ?? [];
          return (
            <SliceCard
              key={s.id}
              sliceId={s.id}
              tileIds={tileIds}
              playerCount={state.settings.playerCount}
              ownerName={owner?.name}
              isMine={owner?.id === me.id}
              canDraft={!lock(props, 'slice') && state.pools.slices.includes(s.id)}
              onDraft={() => onPick('slice', s.id)}
            />
          );
        })}
      </div>
    </section>
  );
}

/** Position hint — the pick itself happens by clicking a home on the map. */
export function PositionSection({ state, me }: DraftSectionProps) {
  const seatLabel = (seatId: string | null) =>
    getLayout(state.settings.playerCount)?.seats.find((s) => s.id === seatId)?.label ?? '—';

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
        Posição {hasPicked(me, 'position') && '✓'}
      </h3>
      <p className="text-[11px] text-slate-400 font-bold rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
        {hasPicked(me, 'position')
          ? `Você escolheu o assento ${seatLabel(me.seatId)}.`
          : 'Clique em um assento livre no mapa para escolher sua posição.'}
      </p>
    </section>
  );
}
