'use client';

import { SliceHoneycomb } from './SliceHoneycomb';

interface SliceSectionProps {
    slices: any[];
    isMyTurn: boolean;
    hasPickedSlice: boolean;
    onPick: (sliceId: string) => void;
}

export function SliceSection({ slices, isMyTurn, hasPickedSlice, onPick }: SliceSectionProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                    Available Slices
                </h3>
                <div className="h-px flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(slices?.length ?? 0) > 0 ? slices.map((slice: any, idx: number) => {
                    const disabled = !isMyTurn || hasPickedSlice;
                    return (
                        <button 
                            key={idx}
                            disabled={disabled}
                            onClick={() => onPick(slice.id)}
                            className={`glass p-8 rounded-[3rem] border border-white/5 text-left transition-all group relative overflow-hidden flex flex-col gap-4 ${
                                !disabled ? 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                            }`}
                        >
                            <div className="relative z-10 flex justify-between items-start w-full">
                                <div className="flex flex-col gap-1">
                                    <span className="text-2xl font-black text-white group-hover:text-primary transition-colors">{slice.id}</span>
                                    <div className="flex gap-1.5">
                                        {slice.special?.techSkips?.map((color: string, sIdx: number) => (
                                            <div key={sIdx} title={`Tech Skip: ${color}`} className={`w-2.5 h-2.5 rounded-full ${
                                                color === 'blue' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                                                color === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
                                                color === 'yellow' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                                                'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                                            }`}></div>
                                        ))}
                                        {slice.special?.wormholes?.map((w: string, wIdx: number) => (
                                            <div key={wIdx} className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[8px] font-black text-white uppercase leading-none">
                                                {w.charAt(0)}
                                            </div>
                                        ))}
                                        {slice.special?.hasLegendary && (
                                            <div title="Legendary Planet" className="px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30 text-[8px] font-black text-primary uppercase leading-none">
                                                L
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Milty</span>
                                        <span className="text-xl text-primary font-black">{slice.optimalValues?.optimal}</span>
                                    </div>
                                    <div className="flex flex-col items-end border-l border-white/10 pl-4">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Res/Inf</span>
                                        <span className="text-sm text-slate-300 font-bold">{slice.optimalValues?.resources}/{slice.optimalValues?.influence}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center -my-4">
                                <SliceHoneycomb slice={slice} scale={0.7} />
                            </div>
                        </button>
                    );
                }) : (
                    <div className="col-span-full py-12 text-center text-xs text-slate-600 font-black uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-[2rem]">
                        All Slices Claimed
                    </div>
                )}
            </div>
        </section>
    );
}
