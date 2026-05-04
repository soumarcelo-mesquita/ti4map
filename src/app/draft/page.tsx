'use client';

import { useState } from 'react';
import { generateDraft, DraftSettings } from '@/lib/draft';
import { Navbar } from '@/components/layout/Navbar';
import { MapGrid } from '@/components/map/MapGrid';

export default function DraftPage() {
    const [draft, setDraft] = useState<any>(null);

    const handleGenerate = () => {
        const settings: DraftSettings = {
            playerNames: Array(6).fill('').map((_, i) => `Player ${i + 1}`),
            playerCount: 6,
            sliceCount: 7,
            factionCount: 9,
            includePoK: true
        };
        const result = generateDraft(settings);
        setDraft(result);
    };

    return (
        <main className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1 p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold">Draft Setup</h2>
                        <button 
                            onClick={handleGenerate}
                            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                            Generate Test Draft
                        </button>
                    </div>

                    {draft && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in duration-500">
                            <div className="lg:col-span-1 space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-xl font-semibold text-primary">Slices</h3>
                                    <div className="grid gap-4">
                                        {draft.slices.map((slice: any, idx: number) => (
                                            <div key={idx} className="glass p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-colors">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold">{slice.id}</span>
                                                    <div className="text-xs space-x-2">
                                                        <span className="text-blue-400">R: {slice.optimalValues.resources}</span>
                                                        <span className="text-amber-400">I: {slice.optimalValues.influence}</span>
                                                        <span className="text-primary">O: {slice.optimalValues.optimal}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {slice.tiles.map((tId: string) => (
                                                        <span key={tId} className="text-[10px] px-2 py-1 bg-white/5 rounded border border-white/10">
                                                            #{tId}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xl font-semibold text-indigo-400">Factions</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {draft.factions.map((faction: any) => (
                                            <div key={faction.id} className="glass p-3 rounded-lg border border-white/5 flex items-center gap-3 hover:border-indigo-400/30 transition-colors">
                                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                                    {faction.id.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium">{faction.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="lg:col-span-2">
                                <section className="space-y-4 h-full flex flex-col">
                                    <h3 className="text-xl font-semibold text-purple-400">Tactical Preview</h3>
                                    <div className="flex-1 min-h-[500px]">
                                        <MapGrid radius={3} size={50} />
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
