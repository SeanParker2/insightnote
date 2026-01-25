import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// 模拟数据接口，实际应对接你的 Supabase Posts
export interface GridItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  ticker?: { symbol: string; change: number };
  size: 'hero' | 'tall' | 'wide' | 'small'; // 决定卡片尺寸
  image?: string;
  slug?: string; // Add slug for linking
}

export function BentoGrid({ items }: { items: GridItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[180px]">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`
            relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors
            ${item.size === 'hero' ? 'md:col-span-2 md:row-span-2' : ''}
            ${item.size === 'tall' ? 'md:col-span-1 md:row-span-2' : ''}
            ${item.size === 'wide' ? 'md:col-span-2 md:row-span-1' : ''}
            ${item.size === 'small' ? 'md:col-span-1 md:row-span-1' : ''}
          `}
        >
          {/* 背景图效果 (仅 Hero 使用) */}
          {item.size === 'hero' && item.image && (
            <div
              className="absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-500"
              style={{ backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          )}
          
          {/* 内容层 */}
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 rounded-sm font-mono text-[10px] tracking-wider uppercase">
                {item.category}
              </Badge>
              {item.ticker && (
                <div className={`flex items-center gap-1 text-xs font-mono font-bold ${item.ticker.change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.ticker.symbol} {item.ticker.change > 0 ? '+' : ''}{item.ticker.change}%
                </div>
              )}
            </div>

            <div>
              <Link href={`/posts/${item.slug || item.id}`} className="block">
                <h3 className={`font-bold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors 
                  ${item.size === 'hero' ? 'text-2xl md:text-3xl tracking-tight' : 'text-sm md:text-base leading-snug'}
                `}>
                  {item.title}
                </h3>
              </Link>
              {item.size === 'hero' && (
                <p className="text-slate-400 line-clamp-2 text-sm max-w-lg">{item.summary}</p>
              )}
              {item.size === 'small' && (
                <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-mono">
                  Read Analysis <ArrowUpRight className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
