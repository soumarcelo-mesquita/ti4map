'use client';

interface FactionSectionProps {
    factions: any[];
    isMyTurn: boolean;
    hasPickedFaction: boolean;
    onPick: (factionId: string) => void;
}

export function FactionSection({ factions, isMyTurn, hasPickedFaction, onPick }: FactionSectionProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.8)]"></span>
                    Strategic Factions
                </h3>
                <div className="h-px flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {(factions?.length ?? 0) > 0 ? factions.map((faction: any) => {
                    const disabled = !isMyTurn || hasPickedFaction;
                    return (
                        <button 
                            key={faction.id}
                            disabled={disabled}
                            onClick={() => onPick(faction.id)}
                            className={`glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 transition-all group ${
                                !disabled ? 'hover:border-indigo-400/50 hover:bg-indigo-400/5 cursor-pointer active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                            }`}
                        >
                            <div className="w-full aspect-square rounded-2xl bg-white/5 flex items-center justify-center p-4 border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all">
                                <img 
                                    src={`/img/factions/ti_${faction.id}.png`} 
                                    alt={faction.name}
                                    className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(129,140,248,0.4)]"
                                />
                            </div>
                            <span className="text-[10px] font-black text-white leading-tight uppercase tracking-widest text-center">{faction.name}</span>
                        </button>
                    );
                }) : (
                    <div className="col-span-full py-12 text-center text-xs text-slate-600 font-black uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-[2rem]">
                        Faction Draft Complete
                    </div>
                )}
            </div>
        </section>
    );
}
