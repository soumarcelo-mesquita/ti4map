import Link from 'next/link';

export const Navbar = () => {
  return (
    <nav className="glass sticky top-0 z-50 w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-white/10 shadow-lg">
      <Link href="/" className="flex items-center gap-3 group min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)] group-hover:scale-110 transition-transform shrink-0">
          <span className="text-slate-950 font-black text-lg sm:text-xl">TI</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400 truncate">
            TI4 Map &amp; Draft
          </h1>
          <p className="hidden sm:block text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">
            Map Builder · Speaker / Faction / Position Draft
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <Link
          href="/historico"
          className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
        >
          Histórico
        </Link>
        <Link
          href="/"
          className="text-[11px] font-black uppercase tracking-widest text-white hover:text-primary transition-colors"
        >
          New Draft
        </Link>
      </div>
    </nav>
  );
};
