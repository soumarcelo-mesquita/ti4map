'use client';

interface DraftHeaderProps {
    roomName: string;
    roomId: string;
    formattedDate: string | null;
    matchTime?: string;
    status: string;
    actingPlayerName: string;
    turnPlayerName: string;
}

export function DraftHeader({ 
    roomName, 
    roomId, 
    formattedDate, 
    matchTime, 
    status, 
    actingPlayerName, 
    turnPlayerName 
}: DraftHeaderProps) {
    return (
        <header className="flex flex-col gap-8 flex-shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                        {roomName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Sector ID: {roomId.substring(0, 8)}</p>
                        </div>
                        
                        {formattedDate && (
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                                    {formattedDate} {matchTime && `• ${matchTime}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 w-fit min-w-[140px] justify-between">
                        <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Status</span>
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{status}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 w-fit min-w-[140px] justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">User</span>
                        <span className="text-xs font-black text-white uppercase tracking-widest">{actingPlayerName}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 w-fit min-w-[140px] justify-between">
                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Turn</span>
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{turnPlayerName}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
