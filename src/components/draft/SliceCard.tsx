'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Hexagon } from '@/components/map/Hexagon';
import { hexToPixel } from '@/lib/hex';
import { sliceShapeOffsets } from '@/data/slices';
import { getTile, tileImage } from '@/data/tiles';
import { sliceStats, rawSliceStats } from '@/lib/sliceBalance';

const WORMHOLE_LETTER: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
};

// tiles.json stores specialty as the tech color
const SPECIALTY_ICON: Record<string, string> = {
  green: '/img/tech/biotic.webp',
  blue: '/img/tech/propulsion.webp',
  yellow: '/img/tech/cybernetic.webp',
  red: '/img/tech/warfare.webp',
};

const HEX = 26;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function StatChips({
  label,
  resources,
  influence,
  large,
}: {
  label: string;
  resources: number;
  influence: number;
  large?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold text-slate-400 ${large ? 'text-xs w-16' : 'text-[10px] w-14'}`}>{label}:</span>
      <span
        className={`text-center rounded-md bg-yellow-400 font-black text-slate-950 ${
          large ? 'min-w-9 px-2 py-1 text-sm' : 'min-w-7 px-1.5 py-0.5 text-[11px]'
        }`}
      >
        {fmt(resources)}
      </span>
      <span
        className={`text-center rounded-md bg-sky-400 font-black text-slate-950 ${
          large ? 'min-w-9 px-2 py-1 text-sm' : 'min-w-7 px-1.5 py-0.5 text-[11px]'
        }`}
      >
        {fmt(influence)}
      </span>
    </div>
  );
}

interface SliceCardProps {
  sliceId: string;
  /** the 7 drafted tile ids (sliceAssignment content order) */
  tileIds: number[];
  playerCount: number;
  /** name of the player who already drafted this fatia, if any */
  ownerName?: string;
  /** the fatia belongs to the viewing player */
  isMine?: boolean;
  /** the viewing player can draft it right now */
  canDraft: boolean;
  onDraft: () => void;
}

/** Card content, reused by the grid card and the enlarged (tap-to-zoom) overlay. */
function SliceCardBody({
  sliceId,
  tileIds,
  playerCount,
  ownerName,
  isMine,
  canDraft,
  onDraft,
  large,
}: SliceCardProps & { large?: boolean }) {
  const offsets = sliceShapeOffsets(playerCount);
  const number = sliceId.replace('slice-', '');
  const idPrefix = large ? `${sliceId}-lg` : sliceId;

  // Mini-map cells: home at the origin + the 7 content positions.
  const cells = [
    { key: 'home', x: 0, y: 0, tileId: null as number | null },
    ...(offsets ?? []).map((o, i) => {
      const { x, y } = hexToPixel(o.q, o.r, HEX);
      return { key: `t${i}`, x, y, tileId: tileIds[i] ?? null };
    }),
  ];
  const pad = HEX * 1.08;
  const minX = Math.min(...cells.map((c) => c.x)) - pad;
  const maxX = Math.max(...cells.map((c) => c.x)) + pad;
  const minY = Math.min(...cells.map((c) => c.y)) - pad;
  const maxY = Math.max(...cells.map((c) => c.y)) + pad;

  const tiles = tileIds.map(getTile);
  const specialties = tiles.flatMap((t) => t?.planets.map((p) => p.specialty).filter(Boolean) ?? []) as string[];
  const legendaryCount = tiles.reduce((acc, t) => acc + (t?.planets.filter((p) => p.legendary).length ?? 0), 0);
  const wormholes = tiles.map((t) => t?.wormhole).filter(Boolean) as string[];
  const raw = rawSliceStats(tileIds);
  const optimal = sliceStats(tileIds);
  const iconSize = large ? 22 : 16;

  return (
    <>
      <h4
        className={`font-black text-emerald-300 uppercase tracking-widest ${large ? 'text-xs' : 'text-[10px]'}`}
      >
        Fatia {number} {isMine && '✓'}
      </h4>

      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full">
        {cells.map((c) =>
          c.key === 'home' ? (
            <Hexagon
              key={c.key}
              id={`${idPrefix}-home`}
              size={HEX}
              x={c.x}
              y={c.y}
              fill="rgba(16,185,129,0.15)"
              stroke="rgba(16,185,129,0.6)"
              strokeWidth={HEX * 0.06}
              label="HOME"
              labelColor="#a7f3d0"
            />
          ) : (
            <Hexagon
              key={c.key}
              id={`${idPrefix}-${c.key}`}
              size={HEX}
              x={c.x}
              y={c.y}
              image={c.tileId ? tileImage(c.tileId) : undefined}
              stroke="rgba(255,255,255,0.12)"
            />
          ),
        )}
      </svg>

      {/* Feature badges: tech specialties, wormholes, legendary planets */}
      <div className={`flex items-center gap-1.5 ${large ? 'min-h-6' : 'min-h-5'}`}>
        {specialties.map((s, i) => (
          <Image key={`s${i}`} src={SPECIALTY_ICON[s] ?? SPECIALTY_ICON.green} alt={s} width={iconSize} height={iconSize} />
        ))}
        {wormholes.map((w, i) => (
          <span
            key={`w${i}`}
            className={`rounded-full bg-white text-slate-950 font-black flex items-center justify-center ${
              large ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-[11px]'
            }`}
          >
            {WORMHOLE_LETTER[w] ?? '?'}
          </span>
        ))}
        {Array.from({ length: legendaryCount }).map((_, i) => (
          <Image key={`l${i}`} src="/img/legendary.webp" alt="lendário" width={iconSize} height={iconSize} />
        ))}
      </div>

      <div className="space-y-1">
        <StatChips label="Total" resources={raw.resources} influence={raw.influence} large={large} />
        <StatChips label="Optimal" resources={optimal.resources} influence={optimal.influence} large={large} />
      </div>

      {ownerName ? (
        <div
          className={`w-full py-2 rounded-xl text-center font-black ${large ? 'text-sm' : 'text-[11px]'} ${
            isMine ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'
          }`}
        >
          {isMine ? 'Sua fatia' : ownerName}
        </div>
      ) : (
        <button
          disabled={!canDraft}
          onClick={(e) => {
            e.stopPropagation(); // don't toggle the zoom overlay
            onDraft();
          }}
          className={`w-full rounded-xl font-black uppercase tracking-widest border transition-all ${
            large ? 'py-3 text-sm' : 'py-2 text-[11px]'
          } ${
            canDraft
              ? 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
              : 'border-white/5 bg-white/5 text-slate-600 cursor-not-allowed'
          }`}
        >
          Draft
        </button>
      )}
    </>
  );
}

export function SliceCard(props: SliceCardProps) {
  const { ownerName, isMine } = props;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        title="Toque para ampliar"
        className={`rounded-2xl border p-3 space-y-2.5 transition-all cursor-zoom-in ${
          isMine
            ? 'border-emerald-400/50 bg-emerald-400/10'
            : ownerName
              ? 'border-white/5 bg-white/[0.02] opacity-60'
              : 'border-white/10 bg-white/5'
        }`}
      >
        <SliceCardBody {...props} />
      </div>

      {/* Tap-to-zoom overlay: any tap (except the Draft button) closes it. */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 cursor-zoom-out"
          onClick={() => setExpanded(false)}
        >
          <div
            className={`glass w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border p-4 sm:p-5 space-y-3 ${
              isMine ? 'border-emerald-400/50' : 'border-white/15'
            }`}
          >
            <SliceCardBody {...props} large />
          </div>
        </div>
      )}
    </>
  );
}
