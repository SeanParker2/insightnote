import { Wifi } from 'lucide-react';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-8 bg-(--bg-obsidian) border-t border-white/5 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500 select-none">
      {/* Left: System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-emerald-500 font-bold tracking-wider">SYSTEM READY</span>
        </div>
        <div className="hidden sm:block w-px h-3 bg-white/10" />
        <span className="hidden sm:block">INSIGHT_OS v2.4.0</span>
      </div>

      {/* Center: Copyright (Minimal) */}
      <div className="hidden md:block opacity-50">
        &copy; {new Date().getFullYear()} InsightNote Research.
      </div>

      {/* Right: Network Metrics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 group cursor-help">
          <span className="group-hover:text-slate-300 transition-colors">HKG-01</span>
          <Wifi className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-500">12ms</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-1">
          <span className="uppercase">Gas:</span>
          <span className="text-slate-300">12 gwei</span>
        </div>
      </div>
    </footer>
  );
}
