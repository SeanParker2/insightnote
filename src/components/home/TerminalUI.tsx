import { ReactNode } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JetBrains_Mono } from '@/lib/fonts';

const mono = JetBrains_Mono({ subsets: ['latin'] });

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
    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5"> 
       <span className={`${mono.className} text-xs text-slate-400`}>{label}</span> 
       <div className="flex items-center gap-2"> 
         <span className={`${mono.className} text-sm font-bold text-white`}>{value}</span> 
         <span className={`${mono.className} text-xs ${isUp ? 'text-(--signal-bull)' : 'text-(--signal-bear)'}`}>{change}</span> 
       </div> 
    </div> 
  ) 
} 

export function ChainNode({ label, type, change, active }: { label: string; type: string; change?: string; active?: boolean }) { 
    const isTicker = type === 'ticker'; 
    return ( 
        <div className="relative pl-6 flex items-center justify-between group cursor-default"> 
            <div className={`absolute left-[5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-black ${active ? 'bg-(--signal-bull) shadow-[0_0_10px_var(--signal-bull)]' : 'bg-slate-700'}`} /> 
            <span className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>{label}</span> 
            {isTicker && ( 
                <span className={`${mono.className} text-xs text-(--signal-bull) bg-(--signal-bull)/10 px-1.5 py-0.5 rounded`}> 
                    {change} 
                </span> 
            )} 
        </div> 
    ) 
} 

export function InsightCard({ category, title, tickers, isLocked, summary, date }: { category: string; title: string; tickers?: string[]; isLocked?: boolean; summary?: string; date?: string }) { 
    return ( 
        <div className="obsidian-card rounded-2xl p-6 hover:border-white/20 transition-all cursor-pointer group relative"> 
            <div className="flex justify-between items-start mb-4"> 
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{category}</span> 
                {isLocked && <Lock className="w-4 h-4 text-(--accent-gold)" />} 
            </div> 
            <h3 className="text-xl font-bold text-white mb-4 group-hover:text-(--signal-bull) transition-colors line-clamp-2">{title}</h3> 
            <div className="flex gap-2"> 
                {tickers?.map((t: string) => ( 
                    <span key={t} className={`${mono.className} text-xs border border-white/10 px-2 py-1 rounded text-slate-400`}> 
                        {t} 
                    </span> 
                ))} 
            </div> 
        </div> 
    ) 
}
