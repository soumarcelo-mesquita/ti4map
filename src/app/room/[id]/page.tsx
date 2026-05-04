'use client';

import { useEffect, Suspense, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRoomStore } from '@/store/roomStore';
import { Navbar } from '@/components/layout/Navbar';
import { MapGrid } from '@/components/map/MapGrid';
import mapData from '@/../map.json';

import { DraftHeader } from '@/components/room/DraftHeader';
import { PlayerTurns } from '@/components/room/PlayerTurns';
import { FactionSection } from '@/components/room/FactionSection';
import { SliceSection } from '@/components/room/SliceSection';
import { PositionSection } from '@/components/room/PositionSection';

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
    const turnPlayer = roomState?.players?.find((p: any) => p.id === currentPlayerId);

    // Update dynamic title based on simulated player
    useEffect(() => {
        if (actingPlayer) {
            document.title = `TI4 Setup - ${actingPlayer.name}`;
        } else {
            document.title = `TI4 Setup`;
        }
    }, [actingPlayer]);

    const formatPosName = (posId: string) => {
        if (!posId) return null;
        if (posId.toLowerCase() === 'p1') return 'SPEAKER';
        const num = posId.replace(/\D/g, '');
        return `${num}º`;
    };

    const sortedPlayers = useMemo(() => {
        if (!roomState?.players || !roomState?.turnOrder) return [];
        const turnOrder = roomState.turnOrder;
        const currentIndex = roomState.currentTurnIndex;
        const playersMap = new Map(roomState.players.map((p: any) => [p.id, p]));
        const rotatedOrder = [
            ...turnOrder.slice(currentIndex),
            ...turnOrder.slice(0, currentIndex)
        ];
        return rotatedOrder.map(id => playersMap.get(id)).filter(Boolean);
    }, [roomState?.players, roomState?.turnOrder, roomState?.currentTurnIndex]);

    const handlePick = async (category: 'slice' | 'faction' | 'position', valueId: string) => {
        if (!isMyTurn || !roomState) return;

        const newState = JSON.parse(JSON.stringify(roomState));
        const playerIndex = newState.players.findIndex((p: any) => p.id === simulatedPlayerId);
        if (playerIndex === -1) return;

        if (category === 'slice' && newState.players[playerIndex].sliceId) return;
        if (category === 'faction' && newState.players[playerIndex].factionId) return;
        if (category === 'position' && newState.players[playerIndex].position) return;

        if (category === 'slice') {
            const selectedSlice = newState.slices.find((s: any) => s.id === valueId);
            newState.players[playerIndex].sliceId = valueId;
            newState.players[playerIndex].slice = selectedSlice;
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
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-2"></div>
                    <p className="text-primary font-bold animate-pulse text-xs tracking-[0.3em] uppercase">Connecting...</p>
                </div>
            </div>
        );
    }

    if (!roomState) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h1 className="text-3xl font-black text-white">Galaxy Not Found</h1>
                <button onClick={() => window.location.href = '/'} className="mt-6 px-8 py-3 bg-white/5 border border-white/10 rounded-xl font-bold">Return Home</button>
            </div>
        );
    }

    const pCount = roomState.settings?.playerCount?.toString() || "6";
    const availablePositions = Object.keys((mapData as any)[pCount] || {})
        .filter(key => key !== 'empty')
        .filter(posId => !roomState.players?.some((p: any) => p.position === posId));

    const getFormattedDate = () => {
        if (!roomState.settings?.matchDate) return null;
        try {
            const date = new Date(roomState.settings.matchDate + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return roomState.settings.matchDate;
        }
    };

    return (
        <main className="min-h-screen flex flex-col relative bg-[#020617] text-white">
            <Navbar />
            
            <div className="flex-1 w-full max-w-[1600px] mx-auto p-6 lg:p-10 flex flex-col gap-12 relative z-10 pb-32">
                
                <DraftHeader 
                    roomName={roomName || 'TI4 Draft'}
                    roomId={id as string}
                    formattedDate={getFormattedDate()}
                    matchTime={roomState.settings?.matchTime}
                    status={roomState.status}
                    actingPlayerName={actingPlayer?.name || 'Observer'}
                    turnPlayerName={turnPlayer?.name || '...'}
                />

                <PlayerTurns 
                    players={sortedPlayers}
                    currentTurnPlayerId={currentPlayerId}
                    simulatedPlayerId={simulatedPlayerId || ''}
                    formatPosName={formatPosName}
                />

                {/* Tactical Preview Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                            Tactical Sector Preview
                        </h3>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <div className="glass rounded-[3.5rem] border border-white/5 overflow-hidden flex flex-col relative bg-black/40 shadow-2xl min-h-[600px]">
                        <div className="flex-1 relative z-10 flex items-center justify-center p-10 overflow-hidden">
                            <MapGrid 
                                radius={3} 
                                size={70} 
                                playerCount={roomState.settings?.playerCount} 
                                players={roomState.players}
                                allSlices={roomState.slices}
                                staticTiles={roomState.staticTiles}
                                onPositionPick={(posId) => handlePick('position', posId)}
                            />
                        </div>
                    </div>
                </section>

                <PositionSection 
                    availablePositions={availablePositions}
                    isMyTurn={isMyTurn}
                    hasPickedPosition={!!actingPlayer?.position}
                    onPick={(posId) => handlePick('position', posId)}
                    formatPosName={formatPosName}
                />

                <FactionSection 
                    factions={roomState.factions}
                    isMyTurn={isMyTurn}
                    hasPickedFaction={!!actingPlayer?.factionId}
                    onPick={(factionId) => handlePick('faction', factionId)}
                />

                <SliceSection 
                    slices={roomState.slices}
                    isMyTurn={isMyTurn}
                    hasPickedSlice={!!actingPlayer?.sliceId}
                    onPick={(sliceId) => handlePick('slice', sliceId)}
                />
            </div>

            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(56,189,248,0.15),transparent_70%)] pointer-events-none -z-10"></div>
        </main>
    );
}

export default function RoomPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
        }>
            <RoomContent />
        </Suspense>
    );
}
