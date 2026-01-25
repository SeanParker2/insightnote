'use client';

import { memo, useEffect, useState } from 'react';

type MarketItem = {
  symbol: string;
  value: string;
  change: string;
  isUp: boolean;
};

type MissingItem = {
  symbol: string;
  reason: string;
};

type MarketTickerProps = {
  className?: string;
  transparent?: boolean;
};

export const MarketTicker = memo(({ className, transparent }: MarketTickerProps) => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function load() {
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
        const json = (await res.json().catch(() => null)) as any;
        const nextItems = Array.isArray(json?.items) ? (json.items as MarketItem[]) : [];
        const nextMissing = Array.isArray(json?.missing) ? (json.missing as MissingItem[]) : [];
        if (cancelled) return;
        setItems(
          nextItems.filter(
            (i) => i && typeof i.symbol === 'string' && typeof i.value === 'string' && typeof i.change === 'string' && typeof i.isUp === 'boolean',
          ),
        );
        setMissing(nextMissing.filter((m) => m && typeof m.symbol === 'string' && typeof m.reason === 'string'));
        setLoadError(res.ok ? null : '行情接口暂不可用');
      } catch {
        if (cancelled) return;
        setLoadError('行情接口暂不可用');
      }
    }

    void load();
    timer = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={className || "w-full bg-slate-950 border-b border-slate-800 text-xs font-mono tracking-wider py-2 overflow-hidden relative z-40 text-slate-300"}>
      <div className="flex items-center w-full h-full">
        {!transparent && (
          <div className="flex items-center gap-3 shrink-0 px-6 border-r border-slate-800 z-10 bg-slate-950 h-full">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            <span className="font-bold text-orange-500 uppercase tracking-widest">MARKET</span>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden relative flex items-center h-full">
          {/* Gradient Masks */}
          {!transparent && (
             <>
               <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-slate-950 to-transparent z-10" />
               <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-slate-950 to-transparent z-10" />
             </>
          )}

          <div className="flex gap-12 overflow-x-auto no-scrollbar items-center animate-scroll hover:paused">
            {items.length ? (
              // Duplicate items multiple times to ensure smooth infinite scroll on large screens
              [...items, ...items, ...items, ...items].map((item, idx) => (
                <span key={`${item.symbol}-${idx}`} className="flex items-center gap-3 whitespace-nowrap cursor-pointer hover:bg-slate-900 px-2 py-1 rounded transition-colors">
                  <span className="font-bold text-white">{item.symbol}</span>
                  <span className="text-slate-400">{item.value}</span>
                  <span className={`
                    flex items-center gap-1
                    ${item.isUp ? 'text-emerald-400' : 'text-rose-400'}
                  `}>
                    {item.isUp ? '▲' : '▼'} {item.change}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-slate-500 whitespace-nowrap pl-4">{loadError ? loadError : '正在初始化市场数据流...'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MarketTicker.displayName = 'MarketTicker';
