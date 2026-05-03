'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateDraft } from '@/lib/draft';
import { Navbar } from '@/components/layout/Navbar';

const DEFAULT_NAMES = ['Marcelo', 'Wesley', 'Sam', 'Lucas', 'Estranho', 'Saulo'];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Configurações da Partida
  const [playerCount, setPlayerCount] = useState(6);
  const [playerNames, setPlayerNames] = useState<string[]>(DEFAULT_NAMES);
  const [includePoK, setIncludePoK] = useState(true);
  const [sliceCount, setSliceCount] = useState(7);
  const [factionCount, setFactionCount] = useState(9);
  
  // Novos campos de logística com valores padrão (Hoje e 00:00)
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('00:00');
  const [matchLocation, setMatchLocation] = useState('');

  useEffect(() => {
    // Definir data de hoje como padrão no formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    setMatchDate(today);
  }, []);

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newNames = [...playerNames];
    if (count > newNames.length) {
      for (let i = newNames.length; i < count; i++) {
        newNames.push(DEFAULT_NAMES[i] || `Player ${i + 1}`);
      }
    } else {
      newNames.splice(count);
    }
    setPlayerNames(newNames);
    setSliceCount(count + 1);
    setFactionCount(count + 3);
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const settings = {
        playerCount,
        sliceCount,
        factionCount,
        includePoK,
        matchDate,
        matchTime,
        matchLocation,
      };

      const initialDraft = generateDraft(settings);
      
      const players = playerNames.map((name, i) => ({
        id: `player-${i}`,
        name: name || `Player ${i + 1}`,
        position: null,
        sliceId: null,
        factionId: null,
      }));

      const turnOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);

      const roomName = `Partida TI4 - ${matchLocation || 'Galáxia Desconhecida'}`;
      const initialState = {
        ...initialDraft,
        players,
        turnOrder,
        currentTurnIndex: 0,
        isSnakeDraftDescending: true,
        status: 'drafting',
        settings,
      };

      const { data, error } = await supabase
        .from('rooms')
        .insert([
          { 
            name: roomName,
            state: initialState
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        router.push(`/room/${data.id}?player=player-0`);
      }
    } catch (err) {
      console.error('Erro ao criar sala:', err);
      alert('Falha ao criar a galáxia.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#020617] text-slate-200">
      <Navbar />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none"></div>
        
        <div className="w-full max-w-6xl relative z-10 grid lg:grid-cols-2 gap-16 items-start">
          
          <div className="space-y-10 py-10">
            <div className="space-y-6">
              <h1 className="text-7xl font-black text-white leading-none tracking-tighter">
                Forge Your <span className="text-primary drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]">Empire.</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium max-w-md leading-relaxed">
                The ultimate Milty Draft tool for Twilight Imperium IV. Balanced slices and real-time visualization.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="flex items-center gap-5 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-all shadow-xl">
                  <span className="text-primary font-black text-2xl">01</span>
                </div>
                <div>
                  <h3 className="font-bold text-white uppercase tracking-[0.2em] text-[10px]">Logistics</h3>
                  <p className="text-sm text-slate-500">Set date, time and physical location.</p>
                </div>
              </div>
              <div className="flex items-center gap-5 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-all shadow-xl">
                  <span className="text-primary font-black text-2xl">02</span>
                </div>
                <div>
                  <h3 className="font-bold text-white uppercase tracking-[0.2em] text-[10px]">Strategic Draft</h3>
                  <p className="text-sm text-slate-500">Player names and expansion settings.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-morphism p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            
            <div className="space-y-10">
              {/* Seção de Logística */}
              <div className="space-y-6">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#38bdf8]"></span>
                  Mission Briefing
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Date</label>
                    <input 
                      type="date" 
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Time</label>
                    <input 
                      type="time" 
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Location / Sector</label>
                  <input 
                    type="text" 
                    placeholder="Where will the battle take place?"
                    value={matchLocation}
                    onChange={(e) => setMatchLocation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* Seção de Jogadores */}
              <div className="space-y-6">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                  Strategic Council
                </h2>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[4, 5, 6].map(count => (
                      <button
                        key={count}
                        onClick={() => handlePlayerCountChange(count)}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border ${
                          playerCount === count 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {count} PLAYERS
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {playerNames.map((name, i) => (
                      <div key={i} className="relative group">
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => handleNameChange(i, e.target.value)}
                          placeholder={`Name for P${i+1}`}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expansão e Slices */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Expansion</label>
                  <button 
                    onClick={() => setIncludePoK(!includePoK)}
                    className={`w-full py-3 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center gap-2 ${
                      includePoK ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' : 'bg-white/5 text-slate-500 border-white/10'
                    }`}
                  >
                    {includePoK ? 'POK ENABLED' : 'BASE GAME ONLY'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Map Slices</label>
                  <input 
                    type="number" 
                    value={sliceCount}
                    onChange={(e) => setSliceCount(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-center text-xs font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="w-full py-6 rounded-3xl bg-white text-slate-950 font-black text-xl hover:bg-primary transition-all duration-500 shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-slate-950"></div>
                ) : (
                  <>
                    INITIATE GALAXY
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
