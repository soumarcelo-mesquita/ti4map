'use client';

interface PlayerTurnsProps {
    players: any[];
    currentTurnPlayerId: string;
    simulatedPlayerId: string;
    formatPosName: (posId: string) => string | null;
}

export function PlayerTurns({ players, currentTurnPlayerId, simulatedPlayerId, formatPosName }: PlayerTurnsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {players.map((p, i) => {
                const isCurrentTurn = currentTurnPlayerId === p.id;
                const isMe = simulatedPlayerId === p.id;
                const posName = formatPosName(p.position);
                
                return (
                    <div 
                        key={p.id}
                        className={`px-5 py-5 rounded-3xl border transition-all duration-500 relative group overflow-hidden ${
                            isCurrentTurn 
                            ? 'bg-primary/20 border-primary shadow-[0_0_30px_rgba(56,189,248,0.2)] scale-[1.02] z-20' 
                            : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
                        } ${isMe ? 'ring-2 ring-white/20' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
                                    {isCurrentTurn ? 'Selecting' : `Turn ${i + 1}`}
                                </div>
                                <div className="text-sm font-black text-white truncate">{p.name}</div>
                            </div>
                            {p.factionId ? (
                                <img 
                                    src={`/img/factions/ti_${p.factionId}.png`} 
                                    className="w-8 h-8 object-contain" 
                                    alt="" 
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] text-slate-600 font-black">?</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            {posName ? (
                                <div className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase">
                                    {posName}
                                </div>
                            ) : (
                                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-black text-slate-700 uppercase">
                                    No Pos
                                </div>
                            )}
                            {p.sliceId && (
                                <div className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase">
                                    {p.sliceId}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
