'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { factionImage, getFaction } from '@/data/factions';
import referenceJson from '@/data/faction-reference.json';

/**
 * Faction reference sheets, generated from TI4 Reference by scottmk
 * (https://scottmk.github.io/ti4-reference/, CC-BY-4.0) with
 * scripts/build-faction-reference.py.
 */
interface ReferenceSection {
  title: string;
  /** small markdown subset: #-headings, ---, "* " lists, **bold**, _italic_, "| a | b |" stat rows */
  body: string;
}

const REFERENCE = referenceJson as {
  source: string;
  license: string;
  factions: Record<string, { url: string; sections: ReferenceSection[] } | undefined>;
};

export const hasFactionReference = (factionId: string) => !!REFERENCE.factions[factionId];

/** Small "i" button that opens the faction's reference sheet. */
export function FactionInfoButton({ factionId, className = '' }: { factionId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!hasFactionReference(factionId)) return null;
  const name = getFaction(factionId)?.name ?? factionId;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Referência: ${name}`}
        aria-label={`Ver referência de ${name}`}
        className={`flex h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-[10px] font-black italic text-slate-200 hover:border-primary hover:text-primary transition-all ${className}`}
      >
        i
      </button>
      {open && <FactionReferenceModal factionId={factionId} onClose={() => setOpen(false)} />}
    </>
  );
}

export function FactionReferenceModal({ factionId, onClose }: { factionId: string; onClose: () => void }) {
  const ref = REFERENCE.factions[factionId];
  const name = getFaction(factionId)?.name ?? factionId;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!ref) return null;

  // Portal: ancestors with backdrop-filter (.glass) would otherwise trap a fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Referência de ${name}`}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 p-4">
          <Image src={factionImage(factionId)} alt="" width={40} height={40} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-white">{name}</h2>
            <a
              href={ref.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Abrir no TI4 Reference ↗
            </a>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
          >
            ✕
          </button>
        </header>

        <nav className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2">
          {ref.sections.map((s, i) => (
            <a
              key={i}
              href={`#ref-${factionId}-${i}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`ref-${factionId}-${i}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300 hover:border-primary/50 hover:text-white"
            >
              {s.title}
            </a>
          ))}
        </nav>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {ref.sections.map((s, i) => (
            <section
              key={i}
              id={`ref-${factionId}-${i}`}
              className="scroll-mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-indigo-300">{s.title}</h3>
              <Markdown text={s.body} />
            </section>
          ))}
          <p className="pb-1 text-center text-[10px] text-slate-500">
            Fonte:{' '}
            <a href={REFERENCE.source} target="_blank" rel="noreferrer" className="underline">
              TI4 Reference
            </a>{' '}
            por scottmk (CC BY 4.0). Textos em inglês, como nas cartas.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** **bold**, __bold__, _italic_ */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|(?<![\w])_[^_]+_(?![\w]))/g).map((part, i) => {
    if (/^(\*\*|__).+(\*\*|__)$/.test(part)) return <strong key={i} className="text-white">{inline(part.slice(2, -2))}</strong>;
    if (/^_.+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
      para = [];
    }
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc space-y-0.5 pl-5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,4}) (.*)$/);
    if (!line) {
      flush();
    } else if (/^-{3,}$/.test(line)) {
      flush();
      blocks.push(<hr key={blocks.length} className="border-white/10" />);
    } else if (heading) {
      flush();
      const h4 = heading[1].length === 4;
      blocks.push(
        <p
          key={blocks.length}
          className={h4 ? 'pt-1 text-[11px] font-black uppercase tracking-wide text-amber-300' : 'text-sm font-black text-white'}
        >
          {inline(heading[2])}
        </p>,
      );
    } else if (/^[*-] /.test(line)) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else if (line.startsWith('|')) {
      flush();
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      blocks.push(
        <div key={blocks.length} className="flex flex-wrap gap-1.5">
          {cells.map((c, i) => (
            <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
              {inline(c)}
            </span>
          ))}
        </div>,
      );
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();

  return <div className="space-y-2 text-[13px] leading-relaxed text-slate-300">{blocks}</div>;
}
