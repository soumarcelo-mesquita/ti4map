'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRoomStore } from '@/store/roomStore';
import { Navbar } from '@/components/layout/Navbar';
import { MapGrid } from '@/components/map/MapGrid';
import mapaData from '@/../mapa.json';

function RoomContent() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const simulatedPlayerId = searchParams.get('player');
    
    const { roomName, roomState, isLoading, setRoom, updateRoomState } = useRoomStore();

    useEffect(() => {
        if (id) {
            setRoom(id as string);
        }
    }, [id, setRoom]);

    const currentPlayerId = roomState?.turnOrder?.[roomState?.currentTurnIndex ?? 0];
    const isMyTurn = simulatedPlayerId === currentPlayerId && roomState?.status === 'drafting';
    
    const actingPlayer = roomState?.players?.find((p: any) => p.id === simulatedPlayerId);

    const handlePick = async (category: 'slice' | 'faction' | 'position', valueId: string) => {
        if (!isMyTurn || !roomState) return;

        const newState = JSON.parse(JSON.stringify(roomState));
        const playerIndex = newState.players.findIndex((p: any) => p.id === simulatedPlayerId);
        if (playerIndex === -1) return;

        if (category === 'slice' && newState.players[playerIndex].sliceId) return;
        if (category === 'faction' && newState.players[playerIndex].factionId) return;
        if (category === 'position' && newState.players[playerIndex].position) return;

        if (category === 'slice') {
            newState.players[playerIndex].sliceId = valueId;
            newState.slices = newState.slices.filter((s: any) => s.id !== valueId);
        } else if (category === 'faction') {
            newState.players[playerIndex].factionId = valueId;
            newState.factions = newState.factions.filter((f: any) => f.id !== valueId);
        } else if (category === 'position') {
            newState.players[playerIndex].position = valueId;
        }

        let nextIndex = newState.currentTurnIndex;
        let nextDescending = newState.isSnakeDraftDescending;

        if (nextDescending) {
            if (nextIndex === newState.turnOrder.length - 1) {
                nextDescending = false;
            } else {
                nextIndex++;
            }
        } else {
            if (nextIndex === 0) {
                nextDescending = true;
            } else {
                nextIndex--;
            }
        }

        newState.currentTurnIndex = nextIndex;
        newState.isSnakeDraftDescending = nextDescending;
        
        if (newState.players.every((p: any) => p.sliceId && p.factionId && p.position)) {
            newState.status = 'finished';
        }

        await updateRoomState(newState);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2"></div>
                    <p className="text-primary font-bold animate-pulse text-xs tracking-[0.3em] uppercase">Connecting...</p>
                </div>
            </div>
        );
    }

    if (!roomState) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h1 className="text-3xl font-black text-white">Galaxy Not Found</h1>
                <button onClick={() => window.location.href = '/'} className="mt-6 px-8 py-3 bg-white/5 border border-white/10 rounded-xl font-bold">Return Home</button>
            </div>
        );
    }

    const pCount = roomState.settings?.playerCount?.toString() || "6";
    const formatPosName = (posId: string) => {
        if (posId.toLowerCase() === 'p1') return 'SPEAKER';
        const num = posId.replace(/\D/g, '');
        return `${num}º`;
    };

    const availablePositions = Object.keys((mapaData as any)[pCount] || {})
        .filter(posId => !roomState.players?.some((p: any) => p.position === posId));

    // Formatação segura de data
    const getFormattedDate = () => {
        if (!roomState.settings?.matchDate) return null;
        try {
            const date = new Date(roomState.settings.matchDate + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return roomState.settings.matchDate;
        }
    };

    const formattedDate = getFormattedDate();

    return (
        <main className="min-h-screen flex flex-col relative overflow-hidden bg-[#020617]">
            <Navbar />
            
            <div className="flex-1 p-6 lg:p-8 flex flex-col lg:flex-row gap-8 relative z-10 h-[calc(100vh-80px)] overflow-hidden">
                {/* Draft Selection Column */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full min-h-0">
                    <header className="flex flex-col gap-4 flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-white tracking-tight">{roomName}</h2>
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">ID: {id?.toString().substring(0, 8)}</p>
                                    
                                    {(formattedDate || roomState.settings?.matchTime) && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#38bdf8] animate-pulse"></div>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                                                {formattedDate} {roomState.settings.matchTime && `• ${roomState.settings.matchTime}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                {roomState.status}
                            </span>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {roomState.players?.map((p: any, i: number) => {
                                const isCurrentTurn = roomState.turnOrder?.[roomState.currentTurnIndex] === p.id;
                                const isMe = simulatedPlayerId === p.id;
                                return (
                                    <div 
                                        key={p.id}
                                        className={`flex-shrink-0 px-4 py-3 rounded-2xl border transition-all duration-500 ${
                                            isCurrentTurn 
                                            ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(56,189,248,0.25)]' 
                                            : 'bg-white/5 border-white/10 opacity-60'
                                        } ${isMe ? 'ring-2 ring-white ring-offset-4 ring-offset-[#020617]' : ''}`}
                                    >
                                        <div className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">P{i+1}</div>
                                        <div className="text-sm font-black text-white truncate max-w-[80px]">{p.name}</div>
                                        {isCurrentTurn && <div className="text-[8px] font-black text-primary animate-pulse mt-1 uppercase text-center">Deciding</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto pr-3 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                Table Positions
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(availablePositions?.length ?? 0) > 0 ? availablePositions.map((posId) => {
                                    const disabled = !isMyTurn || !!actingPlayer?.position;
                                    return (
                                        <button 
                                            key={posId}
                                            disabled={disabled}
                                            onClick={() => handlePick('position', posId)}
                                            className={`glass p-3 rounded-xl border border-white/5 text-center transition-all group ${
                                                !disabled ? 'hover:border-emerald-400/50 hover:bg-emerald-400/5 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-white group-hover:text-emerald-400">{formatPosName(posId)}</span>
                                        </button>
                                    )
                                }) : (
                                    <div className="col-span-3 py-4 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                                        Positions Finalized
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                                Strategic Factions
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {(roomState.factions?.length ?? 0) > 0 ? roomState.factions.map((faction: any) => {
                                    const disabled = !isMyTurn || !!actingPlayer?.factionId;
                                    return (
                                        <button 
                                            key={faction.id}
                                            disabled={disabled}
                                            onClick={() => handlePick('faction', faction.id)}
                                            className={`glass p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 transition-all group text-left ${
                                                !disabled ? 'hover:border-indigo-400/50 hover:bg-indigo-400/5 cursor-pointer active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center p-2 border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all relative">
                                                <img 
                                                    src={`/img/factions/ti_${faction.id}.png`} 
                                                    alt={faction.name}
                                                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]"
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-white leading-tight uppercase tracking-wide h-8 flex items-center justify-center">{faction.name}</span>
                                        </button>
                                    );
                                }) : (
                                    <div className="col-span-2 py-4 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                                        All Factions Drafted
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-4 pb-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                                Map Slices
                            </h3>
                            <div className="grid gap-3">
                                {(roomState.slices?.length ?? 0) > 0 ? roomState.slices.map((slice: any, idx: number) => {
                                    const disabled = !isMyTurn || !!actingPlayer?.sliceId;
                                    return (
                                        <button 
                                            key={idx}
                                            disabled={disabled}
                                            onClick={() => handlePick('slice', slice.id)}
                                            className={`glass p-5 rounded-2xl border border-white/5 text-left transition-all group relative overflow-hidden ${
                                                !disabled ? 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="relative z-10 flex justify-between items-center">
                                                <span className="text-lg font-black text-white group-hover:text-primary transition-colors">{slice.id}</span>
                                                <div className="flex gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Res</span>
                                                        <span className="text-sm text-blue-400 font-black">{slice.optimalValues?.resources}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end border-l border-white/10 pl-4">
                                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Inf</span>
                                                        <span className="text-sm text-amber-400 font-black">{slice.optimalValues?.influence}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="col-span-1 py-4 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest border border-dashed border-white/10 rounded-xl">
                                        All Slices Claimed
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Map View Column */}
                <div className="flex-1 flex flex-col gap-6 h-full min-h-0 relative">
                    <section className="flex-1 glass rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col relative bg-black/40 shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-xl relative z-20">
                            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                                Tactical Sector Preview
                            </h3>
                            {isMyTurn && (
                                <div className="px-5 py-2 bg-primary/20 border border-primary/50 text-primary text-[10px] font-black rounded-xl animate-pulse uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                                    Your Turn
                                </div>
                            )}
                        </div>
                        <div className="flex-1 relative z-10 flex items-center justify-center p-8 overflow-hidden">
                            <MapGrid 
                                radius={3} 
                                size={55} 
                                playerCount={roomState.settings?.playerCount} 
                                players={roomState.players}
                                onPositionPick={(posId) => handlePick('position', posId)}
                            />
                        </div>
                    </section>
                    
                    {/* Draft Info Panel */}
                    <div className="glass p-8 rounded-[2rem] border border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-lg shadow-2xl flex-shrink-0">
                        <div className="flex gap-12">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Simulated Player</span>
                                <span className="text-xl font-black text-white">{actingPlayer?.name || 'Observer'}</span>
                            </div>
                            <div className="flex flex-col border-l border-white/10 pl-12">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Current Initiative</span>
                                <span className="text-xl font-black text-primary">{roomState.players?.find((p: any) => p.id === currentPlayerId)?.name || '...'}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {actingPlayer?.position && (
                                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-500/20 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]"></div>
                                    {formatPosName(actingPlayer.position)}
                                </div>
                            )}
                            {actingPlayer?.sliceId && (
                                <div className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black border border-primary/20 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#38bdf8]"></div>
                                    SLICE
                                </div>
                            )}
                            {actingPlayer?.factionId && (
                                <div className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-black border border-indigo-500/20 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]"></div>
                                    <img src={`/img/factions/ti_${actingPlayer.factionId}.png`} className="w-4 h-4 object-contain" alt="" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none"></div>
        </main>
    );
}

export default function RoomPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
        }>
            <RoomContent />
        </Suspense>
    );
}
