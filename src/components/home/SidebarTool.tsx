import { memo } from 'react';
import { ButterflyEffect, EditorPick } from '@/lib/mock/tools.mock';
import { Playfair_Display } from '@/lib/fonts';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface SidebarToolProps {
  butterflyEffects: ButterflyEffect[];
  editorPicks: EditorPick[];
}

export const SidebarTool = memo(({ butterflyEffects, editorPicks }: SidebarToolProps) => {
  return (
    <aside className="col-span-12 lg:col-span-4 pl-0 lg:pl-8 border-l border-solid border-gray-200">
      
      {/* Butterfly Effect Map Widget */}
      <div className="bg-brand-900 text-white p-6 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
          </svg>
        </div>
        <h3 className={`${playfair.className} text-lg font-bold mb-1`}>Butterfly Effect Map</h3>
        <p className="text-xs text-slate-400 mb-4 font-sans">Visualize market causality chains.</p>
        
        <div className="space-y-3 mb-6">
          {butterflyEffects.map((effect, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs border-b border-brand-800 pb-2">
              <span className="text-amber-500">{effect.cause}</span>
              <span className="text-slate-500">→</span>
              <span>{effect.effect}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-white text-brand-900 py-2 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition">
          Launch Terminal
        </button>
      </div>

      {/* Editor's Picks */}
      <div className="mb-10">
        <h3 className="font-bold text-xs uppercase tracking-widest border-b border-black pb-2 mb-4">Editor&apos;s Picks</h3>
        <ul className="space-y-4">
          {editorPicks.map((pick, idx) => (
            <li key={idx} className="flex flex-col gap-1">
              <span className="text-[10px] text-amber-500 font-bold uppercase">{pick.category}</span>
              <a href={pick.url} className={`${playfair.className} font-bold text-slate-900 hover:text-brand-900 leading-tight`}>
                {pick.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Daily Briefing CTA */}
      <div className="bg-slate-50 border border-solid border-gray-200 p-6 text-center">
        <h4 className={`${playfair.className} font-bold text-lg mb-2`}>Daily Briefing</h4>
        <p className="text-xs text-slate-500 mb-4 px-2">Join 15,000+ investors receiving our pre-market analysis.</p>
        <input 
          type="email" 
          placeholder="Email Address" 
          className="w-full bg-white border border-slate-300 px-3 py-2 text-xs mb-2 focus:outline-none focus:border-brand-900"
        />
        <button className="w-full bg-brand-900 text-white py-2 text-xs font-bold uppercase hover:bg-brand-800 transition-colors">
          Subscribe Free
        </button>
      </div>

    </aside>
  );
});

SidebarTool.displayName = 'SidebarTool';
