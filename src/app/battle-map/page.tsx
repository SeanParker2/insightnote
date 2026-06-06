'use client';
import { useEffect, useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type Event = { id: string; title: string; summary: string; sentiment: string | null; tickers: string[]; tags: string[]; published_at: string; };
type Cell = { asset_class: string; hour: number; intensity: number; sentiment: string; count: number; };

const ASSETS = ['股票', '债券', '商品', '外汇', '加密货币', '宏观'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(s: string | null, i: number): string {
  if (i === 0) return 'bg-surface-2';
  const l = Math.min(i, 5);
  if (s === 'bullish') return ['bg-red-500/10', 'bg-red-500/20', 'bg-red-500/30', 'bg-red-500/40', 'bg-red-500/60', 'bg-red-500'][l];
  if (s === 'bearish') return ['bg-emerald-500/10', 'bg-emerald-500/20', 'bg-emerald-500/30', 'bg-emerald-500/40', 'bg-emerald-500/60', 'bg-emerald-500'][l];
  return ['bg-surface-2', 'bg-surface-3', 'bg-text-tertiary/20', 'bg-text-tertiary/30', 'bg-text-tertiary/50', 'bg-text-tertiary'][l];
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
      <PageHeader title="作战地图" breadcrumbs={[{ label: '首页', href: '/' }, { label: '作战地图' }]} />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {loading ? <LoadingState /> : (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="总事件" value={events.length} />
              <StatCard label="利好" value={bullish} />
              <StatCard label="利空" value={bearish} />
            </div>

            <div className="p-5 rounded-xl bg-surface-1 border border-border-default overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="flex mb-1"><div className="w-16" />{HOURS.map(h => <div key={h} className="flex-1 text-center text-[9px] text-text-tertiary font-mono">{h % 3 === 0 ? `${h}:00` : ''}</div>)}</div>
                {ASSETS.map(ac => (
                  <div key={ac} className="flex items-center mb-0.5">
                    <div className="w-16 text-[11px] text-text-secondary pr-2 text-right">{ac}</div>
                    {HOURS.map(h => { const c = cellMap.get(`${ac}-${h}`); return <div key={h} className={`flex-1 h-6 mx-px rounded-sm ${getColor(c?.sentiment ?? null, c?.intensity ?? 0)}`} title={c ? `${ac} ${h}:00 - ${c.count}条` : ''} />; })}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-text-primary mb-4">重点事件</h2>
              {events.length === 0 ? <EmptyState title="暂无事件" /> : (
                <div className="space-y-3">{events.map(e => (
                  <div key={e.id} className="p-5 rounded-xl bg-surface-1 border border-border-default">
                    <div className="flex items-center gap-2 mb-2">
                      {e.sentiment && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.sentiment === 'bullish' ? 'bg-signal-up-bg text-signal-up' : e.sentiment === 'bearish' ? 'bg-signal-down-bg text-signal-down' : 'bg-surface-2 text-text-tertiary'}`}>{e.sentiment === 'bullish' ? '利好' : e.sentiment === 'bearish' ? '利空' : '中性'}</span>}
                      <span className="text-sm font-semibold text-text-primary">{e.title}</span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{e.summary}</p>
                    <div className="flex gap-1">{e.tickers.slice(0, 5).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-surface-2 rounded font-mono text-text-secondary">{t}</span>)}</div>
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
