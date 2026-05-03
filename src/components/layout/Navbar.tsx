import Link from 'next/link';

export const Navbar = () => {
    return (
        <nav className="glass sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-white/10 shadow-lg">
            <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)] group-hover:scale-110 transition-transform">
                    <span className="text-slate-950 font-black text-xl">TI</span>
                </div>
                <div>
                    <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">
                        TI4 Draft & Map
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">
                        Milty Draft System
                    </p>
                </div>
            </Link>

            <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest">
                <Link href="/" className="text-white hover:text-primary transition-colors">
                    New Draft
                </Link>
                <Link href="/matches" className="text-slate-500 hover:text-primary transition-colors">
                    Previous matches
                </Link>
                <Link 
                    href="/"
                    className="px-5 py-2.5 bg-primary text-slate-950 rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                >
                    Create Room
                </Link>
            </div>
        </nav>
    );
};
