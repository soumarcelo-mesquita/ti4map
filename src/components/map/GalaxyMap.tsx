'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hexagon } from './Hexagon';
import { hexToPixel, key } from '@/lib/hex';
import { parseMapString } from '@/lib/mapString';
import { tileImage, MECATOL_TILE_ID } from '@/data/tiles';
import { factionImage } from '@/data/factions';
import { seatsClockwiseFrom, type SeatLayout } from '@/data/seats';

export interface SeatOccupant {
  playerName: string;
  factionId: string | null;
}

interface GalaxyMapProps {
  mapString: string;
  seats: SeatLayout[];
  /** seatId -> occupant (assigned player), when a position has been drafted */
  occupants?: Record<string, SeatOccupant | undefined>;
  /** seat that belongs to the speaker, highlighted */
  speakerSeatId?: string | null;
  /** seatIds that can currently be picked (highlighted + clickable) */
  pickableSeatIds?: string[];
  onSeatClick?: (seatId: string) => void;
  size?: number;
}

const SIZE = 50;

// Default viewBox spans -450..450 on both axes (900 units). Zoom shrinks/grows
// this span around a center point; pan moves the center.
const BASE = 900;
const MIN_SCALE = 0.6;
const MAX_SCALE = 6;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

interface ViewState {
  cx: number;
  cy: number;
  scale: number;
}
const DEFAULT_VIEW: ViewState = { cx: 0, cy: 0, scale: 1 };

export const GalaxyMap: React.FC<GalaxyMapProps> = ({
  mapString,
  seats,
  occupants = {},
  speakerSeatId,
  pickableSeatIds = [],
  onSeatClick,
  size = SIZE,
}) => {
  const placed = useMemo(() => parseMapString(mapString), [mapString]);

  const seatByHome = useMemo(() => {
    const m = new Map<string, SeatLayout>();
    for (const s of seats) m.set(key(s.home[0], s.home[1]), s);
    return m;
  }, [seats]);

  const pickable = useMemo(() => new Set(pickableSeatIds), [pickableSeatIds]);

  // Once the Speaker's seat is known, every seat gets a clockwise order number
  // (0 = Speaker) so players can see which position each home represents.
  const orderBySeat = useMemo(() => {
    const m = new Map<string, number>();
    if (!speakerSeatId) return m;
    seatsClockwiseFrom(seats, speakerSeatId).forEach((id, i) => m.set(id, i));
    return m;
  }, [seats, speakerSeatId]);
  const orderLabel = (seatId: string) => {
    const o = orderBySeat.get(seatId);
    return o === undefined ? '' : o === 0 ? 'Speaker' : `${o + 1}º`;
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [panning, setPanning] = useState(false);
  // Pan gesture in progress (null when idle). Captures the viewBox span at the
  // start of the drag so the math stays stable mid-gesture.
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; vb: number; rw: number; rh: number; moved: boolean } | null>(null);
  // Set when a pan actually moved, so the trailing click doesn't trigger a seat pick.
  const didPan = useRef(false);

  const vb = BASE / view.scale;
  const vbX = view.cx - vb / 2;
  const vbY = view.cy - vb / 2;
  const viewBox = `${vbX} ${vbY} ${vb} ${vb}`;

  const zoomAt = useCallback((factor: number, fx = 0.5, fy = 0.5) => {
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      if (scale === v.scale) return v;
      const span = BASE / v.scale;
      const nSpan = BASE / scale;
      // World point under the focal fraction, kept fixed across the zoom.
      const wx = v.cx - span / 2 + fx * span;
      const wy = v.cy - span / 2 + fy * span;
      return { scale, cx: wx + (0.5 - fx) * nSpan, cy: wy + (0.5 - fy) * nSpan };
    });
  }, []);

  // Wheel zoom toward the cursor. Registered non-passive so we can preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, fx, fy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    didPan.current = false;
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, vb, rw: rect.width, rh: rect.height, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return; // below threshold = still a click
    if (!d.moved) setPanning(true);
    d.moved = true;
    didPan.current = true;
    setView((v) => ({ ...v, cx: d.cx - dx * (d.vb / d.rw), cy: d.cy - dy * (d.vb / d.rh) }));
  };
  const endPan = () => {
    drag.current = null;
    setPanning(false);
  };

  return (
    <div className="relative w-full flex items-center justify-center">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {[
          { label: '+', title: 'Aproximar', onClick: () => zoomAt(1.3) },
          { label: '−', title: 'Afastar', onClick: () => zoomAt(1 / 1.3) },
          { label: '⟳', title: 'Resetar', onClick: () => setView(DEFAULT_VIEW) },
        ].map((b) => (
          <button
            key={b.label}
            title={b.title}
            onClick={b.onClick}
            className="w-10 h-10 rounded-lg glass border border-white/10 text-white font-black text-lg flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 active:bg-primary/20 transition-all"
          >
            {b.label}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onClickCapture={(e) => {
          if (didPan.current) {
            e.stopPropagation();
            didPan.current = false;
          }
        }}
        style={{ touchAction: 'none', cursor: panning ? 'grabbing' : 'grab' }}
        className="w-full aspect-square max-w-[1100px] drop-shadow-2xl"
      >
        {placed.map(({ q, r, tileId }) => {
          const { x, y } = hexToPixel(q, r, size);
          const id = key(q, r);
          const isMecatol = tileId === MECATOL_TILE_ID && q === 0 && r === 0;
          const seat = seatByHome.get(id);

          // Home-system slot (a draftable position)
          if (seat) {
            const occ = occupants[seat.id];
            const isSpeaker = speakerSeatId === seat.id;
            const canPick = pickable.has(seat.id);
            const ord = orderLabel(seat.id); // '', 'Speaker', '2º'...

            // Occupied: name + order. Empty: its order once the speaker is known.
            let label = occ ? (ord ? `${occ.playerName}\n${ord}` : occ.playerName) : ord;
            if (occ?.factionId) label = isSpeaker ? '★' : ord; // keep faction art readable

            return (
              <g key={id}>
                <Hexagon
                  id={id}
                  size={size}
                  x={x}
                  y={y}
                  image={occ?.factionId ? factionImage(occ.factionId) : undefined}
                  fill={occ ? 'rgba(16,185,129,0.35)' : canPick ? 'rgba(56,189,248,0.18)' : 'rgba(16,185,129,0.08)'}
                  stroke={isSpeaker ? '#fbbf24' : occ ? '#10b981' : canPick ? '#38bdf8' : 'rgba(16,185,129,0.5)'}
                  strokeWidth={canPick || isSpeaker ? size * 0.07 : size * 0.04}
                  label={label}
                  labelColor={isSpeaker ? '#fbbf24' : '#a7f3d0'}
                  clickable={canPick}
                  onClick={canPick ? () => onSeatClick?.(seat.id) : undefined}
                />
              </g>
            );
          }

          // Empty (unfilled) position from the string
          if (!tileId) {
            return (
              <Hexagon
                key={id}
                id={id}
                size={size}
                x={x}
                y={y}
                fill="rgba(255,255,255,0.02)"
                stroke="rgba(255,255,255,0.05)"
              />
            );
          }

          // Regular system tile
          return (
            <Hexagon
              key={id}
              id={id}
              size={size}
              x={x}
              y={y}
              image={tileImage(tileId)}
              stroke={isMecatol ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.08)'}
            />
          );
        })}
      </svg>
    </div>
  );
};
