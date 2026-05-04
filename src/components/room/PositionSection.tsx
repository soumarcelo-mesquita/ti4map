'use client';

interface PositionSectionProps {
    availablePositions: string[];
    isMyTurn: boolean;
    hasPickedPosition: boolean;
    onPick: (posId: string) => void;
    formatPosName: (posId: string) => string | null;
}

export function PositionSection({ 
    availablePositions, 
    isMyTurn, 
    hasPickedPosition, 
    onPick, 
    formatPosName 
}: PositionSectionProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                    Table Positions
                </h3>
                <div className="h-px flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(availablePositions?.length ?? 0) > 0 ? availablePositions.map((posId) => {
                    const disabled = !isMyTurn || hasPickedPosition;
                    return (
                        <button 
                            key={posId}
                            disabled={disabled}
                            onClick={() => onPick(posId)}
                            className={`glass p-6 rounded-[2rem] border border-white/5 text-center transition-all group ${
                                !disabled ? 'hover:border-emerald-400/50 hover:bg-emerald-400/5 cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed'
                            }`}
                        >
                            <span className="text-lg font-black text-white group-hover:text-emerald-400">{formatPosName(posId)}</span>
                        </button>
                    )
                }) : (
                    <div className="col-span-full py-12 text-center text-xs text-slate-600 font-black uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-[2rem]">
                        All Positions Secured
                    </div>
                )}
            </div>
        </section>
    );
}
