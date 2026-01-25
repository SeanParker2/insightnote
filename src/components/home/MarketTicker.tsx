'use client';

import { memo, useEffect, useState } from 'react';
import { mono } from '@/lib/fonts';

type MarketItem = {
  symbol: string;
  value: string;
  change: string;
  isUp: boolean;
};

type MarketTickerProps = {
  className?: string;
  transparent?: boolean;
};

export const MarketTicker = memo(({ className, transparent }: MarketTickerProps) => {
  const [items, setItems] = useState<MarketItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
        const json = (await res.json().catch(() => null)) as any;
        const nextItems = Array.isArray(json?.items) ? (json.items as MarketItem[]) : [];
        
        // 确保有足够的数据进行滚动（如果数据太少，复制几份）
        let displayItems = nextItems.filter(
          (i) => i && typeof i.symbol === 'string' && typeof i.value === 'string' && typeof i.change === 'string' && typeof i.isUp === 'boolean',
        );

        if (displayItems.length > 0 && displayItems.length < 10) {
            displayItems = [...displayItems, ...displayItems, ...displayItems];
        }

        setItems(displayItems);
      } catch {
        // Silent error
      }
    }
    void load();
  }, []);

  if (!items.length) return null;

  return (
    <div className={className || "w-full bg-slate-950 border-b border-white/5 text-xs font-mono tracking-wider py-2 overflow-hidden relative z-40 text-slate-300"}>
      <div className="flex items-center w-full h-full relative">
        
        {/* Gradient Masks for Smooth Fade In/Out */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-slate-950 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-slate-950 to-transparent z-20 pointer-events-none" />

        {/* Scrolling Container */}
        {/* We need two sets of items to create the illusion of infinite scroll */}
        <div className="flex w-max animate-scroll hover:paused group">
          {/* First Set */}
          <div className="flex gap-12 px-6 shrink-0">
            {items.map((item, idx) => (
              <TickerItem key={`set1-${item.symbol}-${idx}`} item={item} />
            ))}
          </div>
          {/* Second Set (Duplicate) */}
          <div className="flex gap-12 px-6 shrink-0">
            {items.map((item, idx) => (
              <TickerItem key={`set2-${item.symbol}-${idx}`} item={item} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
});

// Extracted for cleaner code
function TickerItem({ item }: { item: MarketItem }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap cursor-pointer transition-opacity duration-300 hover:opacity-80">
      <span className={`${mono.className} font-bold text-slate-200 tabular-nums`}>
        {item.symbol}
      </span>
      
      <span className={`${mono.className} text-slate-400 tabular-nums`}>
        {item.value}
      </span>
      
      <span className={`
        flex items-center gap-1 tabular-nums
        ${mono.className}
        ${item.isUp ? 'text-(--signal-bull)' : 'text-(--signal-bear)'}
      `}>
        {item.isUp ? '▲' : '▼'} {item.change}
      </span>
    </div>
  );
}
