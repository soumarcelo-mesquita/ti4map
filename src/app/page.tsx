'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useRoomStore } from '@/store/roomStore';
import { createDraftState } from '@/lib/draftEngine';
import { isValidMapString } from '@/lib/mapString';
import { SUPPORTED_PLAYER_COUNTS } from '@/data/seats';
import { factionPool } from '@/data/factions';
import { getSliceLayouts, buildSliceModeMapString } from '@/data/slices';

const DEFAULT_NAMES = ['Marcelo', 'Wesley', 'Sam', 'Lucas', 'Estranho', 'Saulo'];

// Demo 6-player map string (homes at positions 19/22/25/28/31/34 = "0").
const EXAMPLE_6P =
  '62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 59 60 61 0 19 20 0 21 22 0 23 24 0 25 26 0 27 28 0 29 30';

export default function Home() {
  const router = useRouter();
  const createRoom = useRoomStore((s) => s.createRoom);

  const [playerCount, setPlayerCount] = useState(6);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [includePoK, setIncludePoK] = useState(true);
  const [mapString, setMapString] = useState('');
  const [factionPoolSize, setFactionPoolSize] = useState(8);
  const [useSliceDraft, setUseSliceDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFactions = factionPool(includePoK).length;
  const sliceDraftAvailable = getSliceLayouts(playerCount) !== undefined;

  const setCount = (count: number) => {
    setPlayerCount(count);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(DEFAULT_NAMES[next.length] ?? `Player ${next.length + 1}`);
      next.length = count;
      return next;
    });
    setFactionPoolSize(Math.min(count + 2, maxFactions));
    if (getSliceLayouts(count) === undefined) setUseSliceDraft(false);
  };

  const handleCreate = async () => {
    setError(null);
    const finalMapString = useSliceDraft ? buildSliceModeMapString() : mapString.trim();
    if (!useSliceDraft && !isValidMapString(mapString)) {
      setError('Cole uma map string válida (lista de IDs de tile separados por espaço).');
      return;
    }
    setLoading(true);
    try {
      const state = createDraftState({
        playerNames: names.slice(0, playerCount),
        playerCount,
        mapString: finalMapString,
        includePoK,
        factionPoolSize,
      });
      const id = await createRoom(`Draft TI4 — ${playerCount}p`, state);
      if (!id) throw new Error('Falha ao criar a sala no Supabase.');
      router.push(`/room/${id}?player=${encodeURIComponent(state.players[0].name)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-2xl glass rounded-3xl p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 border border-white/10">
          <header className="space-y-2">
            <h1 className="text-3xl font-black text-white">Criar mapa &amp; draft</h1>
            <p className="text-sm text-slate-400">
              Importe uma map string padrão (estilo ti-assistant), depois faça o draft de
              speaker, facção e posição.
            </p>
          </header>

          {/* Player count */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jogadores</label>
            <div className="flex gap-2">
              {SUPPORTED_PLAYER_COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border ${
                    playerCount === c
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 glow-blue'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* Names */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomes</label>
            <div className="grid grid-cols-2 gap-2">
              {names.slice(0, playerCount).map((name, i) => (
                <input
                  key={i}
                  value={name}
                  onChange={(e) =>
                    setNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))
                  }
                  placeholder={`Player ${i + 1}`}
                  className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              ))}
            </div>
          </section>

          {/* Slice draft toggle (only for player counts with a defined slice layout) */}
          {sliceDraftAvailable && (
            <section className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Modo de mapa
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUseSliceDraft(false)}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${
                    !useSliceDraft
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  Mapa personalizado
                </button>
                <button
                  onClick={() => setUseSliceDraft(true)}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${
                    useSliceDraft
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  Draft com fatias balanceadas
                </button>
              </div>
              {useSliceDraft && (
                <p className="text-[11px] text-slate-400 font-bold rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
                  4 fatias com sistemas sorteados e balanceados (recursos/influência). Fatia e
                  assento são escolhas independentes — escolha as duas, em qualquer ordem.
                </p>
              )}
            </section>
          )}

          {/* Map string */}
          {!useSliceDraft && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Map string</label>
                <button
                  onClick={() => setMapString(EXAMPLE_6P)}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Usar exemplo (6p)
                </button>
              </div>
              <textarea
                value={mapString}
                onChange={(e) => setMapString(e.target.value)}
                rows={4}
                placeholder="Ex: 62 63 64 ... (Mecatol é implícito no centro)"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-white focus:outline-none focus:border-primary/50 resize-none"
              />
            </section>
          )}

          {/* Expansion + faction pool */}
          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expansão</label>
              <button
                onClick={() => setIncludePoK((v) => !v)}
                className={`w-full py-3 rounded-xl text-[11px] font-black border transition-all ${
                  includePoK
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {includePoK ? 'COM PoK' : 'BASE GAME'}
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Pool de facções
              </label>
              <input
                type="number"
                min={playerCount}
                max={maxFactions}
                value={factionPoolSize}
                onChange={(e) =>
                  setFactionPoolSize(
                    Math.max(playerCount, Math.min(maxFactions, parseInt(e.target.value) || playerCount)),
                  )
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-center text-sm font-bold text-white focus:outline-none"
              />
            </div>
          </section>

          {error && (
            <p className="text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-lg hover:bg-primary transition-all disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Iniciar draft'}
          </button>
        </div>
      </div>
    </main>
  );
}
