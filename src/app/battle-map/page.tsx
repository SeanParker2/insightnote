'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Event = { id: string; title: string; summary: string; sentiment: string | null; tickers: string[]; tags: string[]; published_at: string; };
type Cell = { asset_class: string; hour: number; intensity: number; sentiment: string; count: number; };

const ASSETS = ['股票', '债券', '商品', '外汇', '加密货币', '宏观'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(s: string | null, i: number): string {
  if (i === 0) return 'bg-neutral-50';
  const l = Math.min(i, 5);
  if (s === 'bullish') return ['bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500'][l];
  if (s === 'bearish') return ['bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'][l];
  return ['bg-neutral-50', 'bg-neutral-100', 'bg-neutral-200', 'bg-neutral-300', 'bg-neutral-400', 'bg-neutral-500'][l];
}

export default function BattleMapPage() {
  const [heatmap, setHeatmap] = useState<Cell[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/battle-map');
    if (res.ok) { const d = await res.json(); setHeatmap(d.data?.heatmap ?? []); setEvents(d.data?.events ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cellMap = new Map<string, Cell>();
  heatmap.forEach(c => cellMap.set(`${c.asset_class}-${c.hour}`, c));

  const bullish = events.filter(e => e.sentiment === 'bullish').length;
  const bearish = events.filter(e => e.sentiment === 'bearish').length;

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
        <ChevronRight className="w-3 h-3 text-neutral-200" />
        <h1 className="text-sm font-semibold text-neutral-900">作战地图</h1>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {loading ? <div className="text-center py-20 text-neutral-400 text-sm">加载中...</div> : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">总事件</div><div className="text-2xl font-bold text-neutral-900">{events.length}</div></div>
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">利好</div><div className="text-2xl font-bold text-red-600">{bullish}</div></div>
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">利空</div><div className="text-2xl font-bold text-emerald-600">{bearish}</div></div>
            </div>

            {/* Heatmap */}
            <div className="p-5 rounded-xl bg-white border border-neutral-100 overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="flex mb-1"><div className="w-16" />{HOURS.map(h => <div key={h} className="flex-1 text-center text-[9px] text-neutral-300 font-mono">{h % 3 === 0 ? `${h}:00` : ''}</div>)}</div>
                {ASSETS.map(ac => (
                  <div key={ac} className="flex items-center mb-0.5">
                    <div className="w-16 text-[11px] text-neutral-500 pr-2 text-right">{ac}</div>
                    {HOURS.map(h => { const c = cellMap.get(`${ac}-${h}`); return <div key={h} className={`flex-1 h-6 mx-px rounded-sm ${getColor(c?.sentiment ?? null, c?.intensity ?? 0)}`} title={c ? `${ac} ${h}:00 - ${c.count}条` : ''} />; })}
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-4">重点事件</h2>
              {events.length === 0 ? <div className="text-center py-12 text-neutral-400 text-sm">暂无事件</div> : (
                <div className="space-y-3">{events.map(e => (
                  <div key={e.id} className="p-5 rounded-xl bg-white border border-neutral-100">
                    <div className="flex items-center gap-2 mb-2">
                      {e.sentiment && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.sentiment === 'bullish' ? 'bg-red-50 text-red-600' : e.sentiment === 'bearish' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}`}>{e.sentiment === 'bullish' ? '利好' : e.sentiment === 'bearish' ? '利空' : '中性'}</span>}
                      <span className="text-sm font-semibold text-neutral-900">{e.title}</span>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">{e.summary}</p>
                    <div className="flex gap-1">{e.tickers.slice(0, 5).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded font-mono">{t}</span>)}</div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
