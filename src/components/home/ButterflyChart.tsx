'use client';

import { useState } from 'react';
import { mono } from '@/lib/fonts';

interface ChainNodeData {
  id: string;
  label: string;
  type: 'event' | 'impact' | 'ticker';
  change?: string;
}

const nodes: ChainNodeData[] = [
  { id: '1', label: '美联储降息', type: 'event' },
  { id: '2', label: '收益率下跌', type: 'impact' },
  { id: '3', label: '生物科技反弹', type: 'ticker', change: '+4.2%' },
];

export function ButterflyChart() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative pl-2 py-2 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* SVG Line Layer */}
      <svg 
        className="absolute left-[9px] top-0 bottom-0 h-full w-4 overflow-visible pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {/* Base Line (Dotted) */}
        <line 
          x1="8" y1="10" x2="8" y2="100%" 
          stroke="#334155" 
          strokeWidth="1" 
          strokeDasharray="4 4"
        />
        
        {/* Active Line (Glow) */}
        <line 
          x1="8" y1="10" x2="8" y2="100%" 
          stroke="url(#gradient-line)" 
          strokeWidth="2"
          className={`transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />
        
        <defs>
          <linearGradient id="gradient-line" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#00F090" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Nodes Layer */}
      <div className="flex flex-col gap-6 relative z-10">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-4 group cursor-pointer">
            {/* Dot */}
            <div className="relative flex items-center justify-center w-4 h-4">
              <div 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isHovered 
                    ? 'bg-(--signal-bull) shadow-[0_0_8px_var(--signal-bull)] scale-125' 
                    : 'bg-slate-700 group-hover:bg-slate-500'
                }`}
              />
              {/* Ripple Effect on Hover (CSS Animation) */}
              {isHovered && (
                 <div 
                   className="absolute inset-0 rounded-full border border-(--signal-bull) animate-ping opacity-75"
                   style={{ animationDuration: '1.5s', animationDelay: `${index * 0.2}s` }}
                 />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex justify-between items-center transition-transform duration-300 origin-left hover:translate-x-1">
               <span className={`text-sm transition-colors duration-300 ${
                 isHovered ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'
               }`}>
                 {node.label}
               </span>
               {node.change && (
                 <span className={`${mono.className} text-xs px-1.5 py-0.5 rounded tabular-nums transition-all duration-300 ${
                    isHovered 
                        ? 'text-(--signal-bull) bg-(--signal-bull)/10 shadow-[0_0_10px_rgba(0,240,144,0.2)]' 
                        : 'text-slate-500'
                 }`}>
                   {node.change}
                 </span>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
