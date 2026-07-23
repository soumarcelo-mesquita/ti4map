'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useRoomStore } from '@/store/roomStore';
import { createDraftState, createVetoState } from '@/lib/draftEngine';
import { isValidMapString } from '@/lib/mapString';
import { SUPPORTED_PLAYER_COUNTS } from '@/data/seats';
import { factionPool, factionImage } from '@/data/factions';
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
  const [includeTE, setIncludeTE] = useState(false);
  const [mapString, setMapString] = useState('');
  const [factionPoolSize, setFactionPoolSize] = useState(8);
  const [excludedFactionIds, setExcludedFactionIds] = useState<Set<string>>(new Set());
  const [enableFactionVetoes, setEnableFactionVetoes] = useState(false);
  const [vetoCount, setVetoCount] = useState(1);
  const [useSliceDraft, setUseSliceDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableFactions = factionPool(includePoK, includeTE);
  const eligibleFactionCount = availableFactions.filter((f) => !excludedFactionIds.has(f.id)).length;
  const maxFactions = eligibleFactionCount;
  const sliceDraftAvailable = getSliceLayouts(playerCount) !== undefined;

  const toggleFaction = (id: string) => {
    const next = new Set(excludedFactionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExcludedFactionIds(next);
    const newMax = availableFactions.filter((f) => !next.has(f.id)).length;
    setFactionPoolSize((prev) => Math.min(prev, newMax));
    setVetoCount((prev) => Math.max(0, Math.min(prev, newMax - playerCount)));
  };

  const toggleExpansion = (expansion: 'pok' | 'te') => {
    const nextPoK = expansion === 'pok' ? !includePoK : includePoK;
    const nextTE = expansion === 'te' ? !includeTE : includeTE;
    if (expansion === 'pok') setIncludePoK(nextPoK);
    else setIncludeTE(nextTE);
    const newAvailable = factionPool(nextPoK, nextTE);
    const newMax = newAvailable.filter((f) => !excludedFactionIds.has(f.id)).length;
    setFactionPoolSize((prev) => Math.min(prev, newMax));
    setVetoCount((prev) => Math.max(0, Math.min(prev, newMax - playerCount)));
  };

  const setCount = (count: number) => {
    setPlayerCount(count);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(DEFAULT_NAMES[next.length] ?? `Player ${next.length + 1}`);
      next.length = count;
      return next;
    });
    setFactionPoolSize(Math.min(count + 2, maxFactions));
    setVetoCount((prev) => Math.max(0, Math.min(prev, maxFactions - count)));
    if (getSliceLayouts(count) === undefined) setUseSliceDraft(false);
  };

  const handleCreate = async () => {
    setError(null);
    const finalMapString = useSliceDraft ? buildSliceModeMapString() : mapString.trim();
    if (!useSliceDraft && !isValidMapString(mapString)) {
      setError('Cole uma map string válida (lista de IDs de tile separados por espaço).');
      return;
    }
    if (eligibleFactionCount < playerCount) {
      setError('Facções demais foram excluídas — restam menos opções do que jogadores.');
      return;
    }
    setLoading(true);
    try {
      const baseConfig = {
        playerNames: names.slice(0, playerCount),
        playerCount,
        mapString: finalMapString,
        includePoK,
        includeTE,
        factionPoolSize,
        excludedFactionIds: Array.from(excludedFactionIds),
      };
      const state =
        enableFactionVetoes && vetoCount > 0
          ? createVetoState({ ...baseConfig, vetoCount })
          : createDraftState(baseConfig);
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expansões</label>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleExpansion('pok')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${
                    includePoK
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  PoK
                </button>
                <button
                  onClick={() => toggleExpansion('te')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${
                    includeTE
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  TE
                </button>
              </div>
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

          {/* Vetos / exclusão de facções */}
          <section className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableFactionVetoes}
                onChange={(e) => setEnableFactionVetoes(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Vetar facções antes do draft
              </span>
            </label>

            {enableFactionVetoes && (
              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Vetos secretos por jogador
                  </label>
                  <p className="text-[11px] text-slate-400 font-bold">
                    Antes do draft, cada jogador vai vetar facções em segredo; quando todos confirmarem, o draft
                    começa sem elas. Mais de um jogador pode vetar a mesma facção.
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, eligibleFactionCount - playerCount)}
                    value={vetoCount}
                    onChange={(e) =>
                      setVetoCount(
                        Math.max(0, Math.min(eligibleFactionCount - playerCount, parseInt(e.target.value) || 0)),
                      )
                    }
                    className="w-24 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-center text-sm font-bold text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Remover facções do draft ({eligibleFactionCount}/{availableFactions.length})
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setExcludedFactionIds(new Set())}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                      >
                        Selecionar todas
                      </button>
                      <button
                        onClick={() => setExcludedFactionIds(new Set(availableFactions.map((f) => f.id)))}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <ul className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
                    {availableFactions.map((f) => {
                      const isExcluded = excludedFactionIds.has(f.id);
                      return (
                        <li key={f.id}>
                          <button
                            onClick={() => toggleFaction(f.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                              isExcluded
                                ? 'border-white/5 bg-white/5 text-slate-600 opacity-40'
                                : 'border-primary/40 bg-primary/10 text-white hover:bg-primary/20 hover:border-primary'
                            }`}
                          >
                            <Image src={factionImage(f.id)} alt={f.name} width={24} height={24} />
                            <span>{f.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {eligibleFactionCount < playerCount && (
                    <p className="text-[11px] text-red-400 font-bold">
                      Restam poucas facções para {playerCount} jogadores — reative algumas.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {error && (
            <p className="text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || eligibleFactionCount < playerCount}
            className="w-full py-4 rounded-2xl bg-white text-slate-950 font-black text-lg hover:bg-primary transition-all disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Iniciar draft'}
          </button>
        </div>
      </div>
    </main>
  );
}
