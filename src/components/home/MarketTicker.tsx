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
    <div className="bg-brand-900 text-white text-[11px] font-medium tracking-wide py-1.5 border-b border-brand-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 flex items-center">
        <div className="flex gap-6 items-center flex-1 overflow-hidden">
          <span className="text-slate-400 shrink-0">市场开盘</span>
          
          {/* Mobile/Desktop responsive behavior - simple list on desktop, could be marquee on mobile if needed */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar mask-linear-fade">
            {items.length ? (
              items.map((item) => (
                <span key={item.symbol} className="flex items-center gap-1 whitespace-nowrap">
                  {item.symbol} {item.value}{' '}
                  <span className={item.isUp ? 'text-brand-green' : 'text-brand-red'}>
                    {item.isUp ? '▲' : '▼'} {item.change}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-slate-300 whitespace-nowrap">{loadError ? loadError : '加载中…'}</span>
            )}

            {items.length > 0 && missing.length > 0 ? (
              <span className="text-slate-400 whitespace-nowrap">
                部分数据缺失：{missing.map((m) => `${m.symbol}（${m.reason}）`).join('；')}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

MarketTicker.displayName = 'MarketTicker';
