import { ReactNode } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mono } from '@/lib/fonts';

export function SidebarItem({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) { 
  return ( 
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${active ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> 
      {icon} 
      <span className="text-sm font-medium">{label}</span> 
      {active && <div className="ml-auto w-1 h-1 bg-(--signal-bull) rounded-full shadow-[0_0_8px_var(--signal-bull)]" />} 
    </div> 
  ) 
} 

export function DataPoint({ label, value, change, isUp }: { label: string; value: string; change: string; isUp: boolean }) { 
  return ( 
    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 group hover:bg-white/10 transition-colors"> 
       <span className={`${mono.className} text-xs text-slate-400 font-medium`}>{label}</span> 
       <div className="flex items-center gap-2"> 
         <span className={`${mono.className} text-sm font-bold text-white tabular-nums`}>{value}</span> 
         <span className={`${mono.className} text-xs font-medium tabular-nums ${isUp ? 'text-(--signal-bull) bg-(--signal-bull)/10' : 'text-(--signal-bear) bg-(--signal-bear)/10'} px-1.5 py-0.5 rounded`}>
            {change}
         </span> 
       </div> 
    </div> 
  ) 
} 

export function ChainNode({ label, type, change, active }: { label: string; type: string; change?: string; active?: boolean }) { 
    const isTicker = type === 'ticker'; 
    return ( 
        <div className={`
            relative pl-6 flex items-center justify-between group cursor-pointer py-1 transition-all duration-300
            ${active ? 'opacity-100' : 'opacity-60 hover:opacity-100'}
        `}> 
            {/* Connection Line Node */}
            <div className={`
                absolute left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-slate-900 transition-all duration-300 z-10
                ${active 
                    ? 'bg-(--signal-bull) shadow-[0_0_8px_var(--signal-bull)] scale-110' 
                    : 'bg-slate-700 group-hover:bg-slate-500 group-hover:scale-110'
                }
            `} /> 
            
            <span className={`text-sm transition-colors duration-300 ${active ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span> 
            
            {isTicker && ( 
                <span className={`
                    ${mono.className} text-xs px-1.5 py-0.5 rounded tabular-nums transition-all duration-300
                    ${active ? 'text-(--signal-bull) bg-(--signal-bull)/10 shadow-[0_0_10px_var(--signal-bull)]' : 'text-slate-500'}
                `}> 
                    {change} 
                </span> 
            )} 
        </div> 
    ) 
} 

export function InsightCard({ category, title, tickers, isLocked, summary, date }: { category: string; title: string; tickers?: string[]; isLocked?: boolean; summary?: string; date?: string }) { 
    return ( 
        <div className="group relative flex flex-col h-full bg-[#0B1120] border border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden"> 
            {/* Tech Decoration: Corner Brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-brand-accent/50 transition-colors" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-brand-accent/50 transition-colors" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-brand-accent/50 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-brand-accent/50 transition-colors" />

            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-4"> 
                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-brand-accent/80 font-mono border border-brand-accent/20 px-1.5 py-0.5 rounded-sm">
                        {category}
                    </span> 
                    {isLocked && <Lock className="w-3 h-3 text-slate-600" />} 
                </div> 
                
                <h3 className="text-lg font-bold text-slate-200 mb-3 group-hover:text-white transition-colors leading-tight line-clamp-2">
                    {title}
                </h3> 
                
                {summary && (
                  <p className="text-xs text-slate-500 line-clamp-3 mb-6 leading-relaxed font-light border-l border-white/5 pl-3">
                    {summary}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-dashed border-white/5">
                    <div className="flex gap-2"> 
                        {tickers?.slice(0, 3).map((t: string) => ( 
                            <span key={t} className={`${mono.className} text-[10px] bg-white/5 px-1.5 py-0.5 rounded-sm text-slate-400 group-hover:text-slate-300 transition-colors`}> 
                                {t} 
                            </span> 
                        ))} 
                    </div> 
                    <span className="text-[10px] text-slate-600 font-mono">{date}</span>
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div> 
    ) 
}
