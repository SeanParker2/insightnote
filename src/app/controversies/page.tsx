'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Swords } from 'lucide-react';

type Arg = { id: string; content: string; upvotes: number; evidence_url: string | null; };
type Side = { id: string; side: string; title: string; summary: string | null; arguments: Arg[]; };
type Controversy = { id: string; title: string; description: string | null; symbol: string | null; topic_tags: string[]; status: string; sides: Side[]; for_count: number; against_count: number; undecided_count: number; };

export default function ControversiesPage() {
  const [data, setData] = useState<Controversy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Controversy | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/controversies?status=all');
    if (res.ok) { const d = await res.json(); setData(d.data ?? []); if (d.data?.length > 0) setSelected(d.data[0]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStance(side: string) {
    if (!selected) return;
    await fetch('/api/controversies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ controversy_id: selected.id, side }) });
    await load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">加载中...</div>;

  if (data.length === 0) return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white"><Link href="/" className="text-xs text-neutral-400">首页</Link><ChevronRight className="w-3 h-3 text-neutral-200" /><h1 className="text-sm font-semibold text-neutral-900">争议地图</h1></header>
      <div className="max-w-5xl mx-auto px-8 py-20 text-center"><Swords className="w-12 h-12 text-neutral-200 mx-auto mb-4" /><p className="text-sm text-neutral-500">暂无争议话题</p></div>
    </div>
  );

  const s = selected;
  const forSide = s?.sides.find(x => x.side === 'for');
  const againstSide = s?.sides.find(x => x.side === 'against');
  const total = (s?.for_count ?? 0) + (s?.against_count ?? 0) + (s?.undecided_count ?? 0);
  const forPct = total > 0 ? ((s?.for_count ?? 0) / total) * 100 : 50;

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center px-8 border-b border-neutral-100 bg-white"><Link href="/" className="text-xs text-neutral-400">首页</Link><ChevronRight className="w-3 h-3 text-neutral-200" /><h1 className="text-sm font-semibold text-neutral-900">争议地图</h1></header>
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">{data.map(c => <button key={c.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selected?.id === c.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`} onClick={() => setSelected(c)}>{c.title}</button>)}</div>

        {s && <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">{s.title}</h2>
            {s.description && <p className="text-sm text-neutral-500 mb-3">{s.description}</p>}
            <div className="flex gap-1.5">{s.symbol && <span className="text-xs px-2 py-0.5 bg-neutral-100 rounded font-mono">{s.symbol}</span>}{s.topic_tags.map(t => <span key={t} className="text-xs px-2 py-0.5 bg-neutral-100 rounded">{t}</span>)}</div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2"><span>正方 ({s.for_count})</span><span>反方 ({s.against_count})</span></div>
            <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${forPct}%` }} /></div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleStance('for')} className="px-3 py-1.5 text-xs border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50">支持正方</button>
              <button onClick={() => handleStance('against')} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">支持反方</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100">
              <h3 className="text-sm font-semibold text-emerald-800 mb-3">正方：{forSide?.title ?? '支持'}</h3>
              {forSide?.summary && <p className="text-xs text-emerald-600 mb-3">{forSide.summary}</p>}
              <div className="space-y-2">{(forSide?.arguments ?? []).map(a => <div key={a.id} className="p-3 rounded-lg bg-white border border-emerald-100"><p className="text-xs text-neutral-700">{a.content}</p><div className="text-[10px] text-neutral-400 mt-1">👍 {a.upvotes}</div></div>)}</div>
            </div>
            <div className="p-5 rounded-xl bg-red-50 border border-red-100">
              <h3 className="text-sm font-semibold text-red-800 mb-3">反方：{againstSide?.title ?? '反对'}</h3>
              {againstSide?.summary && <p className="text-xs text-red-600 mb-3">{againstSide.summary}</p>}
              <div className="space-y-2">{(againstSide?.arguments ?? []).map(a => <div key={a.id} className="p-3 rounded-lg bg-white border border-red-100"><p className="text-xs text-neutral-700">{a.content}</p><div className="text-[10px] text-neutral-400 mt-1">👍 {a.upvotes}</div></div>)}</div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
