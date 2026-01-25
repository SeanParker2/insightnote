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

export const MarketTicker = memo(() => {
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
    <div className="bg-background border-b border-border text-[10px] font-medium tracking-wide py-1 overflow-hidden relative z-40">
      <div className="container-width flex items-center">
        <div className="flex gap-8 items-center flex-1 overflow-hidden relative">
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-border z-10 bg-background">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground uppercase tracking-wider">市场概览</span>
          </div>
          
          <div className="flex gap-8 overflow-x-auto no-scrollbar mask-linear-fade items-center animate-scroll opacity-80 hover:opacity-100 transition-opacity">
            {items.length ? (
              [...items, ...items].map((item, idx) => ( // Duplicate for infinite scroll feel
                <span key={`${item.symbol}-${idx}`} className="flex items-center gap-2 whitespace-nowrap group cursor-default">
                  <span className="font-semibold text-foreground">{item.symbol}</span>
                  <span className="font-mono text-muted-foreground">{item.value}</span>
                  <span className={`
                    flex items-center
                    ${item.isUp ? 'text-emerald-600' : 'text-rose-600'}
                  `}>
                    {item.isUp ? '↑' : '↓'} {item.change}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground whitespace-nowrap">{loadError ? loadError : '连接中...'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MarketTicker.displayName = 'MarketTicker';
