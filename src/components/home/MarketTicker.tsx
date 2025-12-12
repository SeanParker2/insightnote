import { memo } from 'react';
import { MarketItem } from '@/lib/mock/market.mock';

interface MarketTickerProps {
  data: MarketItem[];
}

export const MarketTicker = memo(({ data }: MarketTickerProps) => {
  return (
    <div className="bg-brand-900 text-white text-[11px] font-medium tracking-wide py-1.5 border-b border-brand-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex gap-6 items-center flex-1 overflow-hidden">
          <span className="text-slate-400 shrink-0">MARKET OPEN</span>
          
          {/* Mobile/Desktop responsive behavior - simple list on desktop, could be marquee on mobile if needed */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar mask-linear-fade">
             {data.map((item) => (
              <span key={item.symbol} className="flex items-center gap-1 whitespace-nowrap">
                {item.symbol}{' '}
                <span className={item.isUp ? 'text-brand-green' : 'text-brand-red'}>
                  {item.isUp ? '▲' : '▼'} {item.change}
                </span>
              </span>
            ))}
          </div>
        </div>
        
        <div className="gap-4 text-slate-400 shrink-0 hidden md:flex">
          <a href="#" className="hover:text-white transition">Institutional Login</a>
          <a href="#" className="hover:text-white transition">Support</a>
        </div>
      </div>
    </div>
  );
});

MarketTicker.displayName = 'MarketTicker';
