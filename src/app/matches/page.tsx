'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/Navbar';

interface Room {
    id: string;
    name: string;
    created_at: string;
    state: any;
}

export default function MatchesPage() {
    const [matches, setMatches] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setMatches(data);
            }
            setIsLoading(false);
        };

        fetchMatches();
    }, []);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return 'Date Unknown';
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-[#020617] text-slate-200">
            <Navbar />
            
            <div className="flex-1 p-8 lg:p-16 max-w-7xl mx-auto w-full relative">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none"></div>

                <header className="mb-12 relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                        Previous <span className="text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">Matches</span>
                    </h1>
                    <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
                        A record of all galactic conflicts and diplomatic summits. Revisit your past strategies and map configurations.
                    </p>
                </header>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 border-r-2 opacity-50"></div>
                        <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Retrieving Archives</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="glass-morphism p-16 rounded-[3rem] border border-white/5 text-center flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-3xl border border-white/10">📜</div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">The archives are empty</h2>
                        <p className="text-slate-500 max-w-xs mx-auto">No matches have been recorded yet. Lead your faction to its first draft.</p>
                        <Link href="/" className="mt-4 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-primary transition-all shadow-xl">
                            START A NEW DRAFT
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {matches.map((match) => {
                            const settings = match.state?.settings;
                            const players = match.state?.players || [];
                            const status = match.state?.status || 'unknown';
                            
                            return (
                                <Link 
                                    key={match.id} 
                                    href={`/room/${match.id}`}
                                    className="group glass-morphism p-8 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500 hover:scale-[1.02] flex flex-col h-full bg-white/5 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                                            status === 'finished' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-primary/10 text-primary border-primary/20'
                                        }`}>
                                            {status}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{formatDate(match.created_at)}</span>
                                    </div>

                                    <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors mb-2 line-clamp-1">
                                        {match.name}
                                    </h3>
                                    
                                    <div className="flex flex-wrap gap-2 mb-8 min-h-[20px]">
                                        {settings?.matchLocation && (
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                {settings.matchLocation}
                                            </div>
                                        )}
                                        {settings?.matchTime && (
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                {settings.matchTime}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-white/5">
                                        <div className="flex -space-x-3 overflow-hidden mb-4">
                                            {players.slice(0, 6).map((p: any, idx: number) => (
                                                <div 
                                                    key={idx}
                                                    title={p.name}
                                                    className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#020617] flex items-center justify-center text-[10px] font-black text-white"
                                                >
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                            ))}
                                            {players.length > 6 && (
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#020617] flex items-center justify-center text-[8px] font-black text-slate-400">
                                                    +{players.length - 6}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                                            VIEW RECAP
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
