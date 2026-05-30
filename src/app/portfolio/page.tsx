'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Briefcase, Plus, Upload, Trash2 } from 'lucide-react';

type Holding = { id: string; symbol: string; name: string | null; quantity: number; avg_cost: number; currency: string; asset_class: string; sector: string | null; };
type Portfolio = { id: string; name: string; is_default: boolean; holdings: Holding[]; total_cost: number; holding_count: number; };

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/portfolio');
    if (res.ok) { const d = await res.json(); setPortfolios(d.data ?? []); if (d.data?.length > 0 && !selected) setSelected(d.data[0].id); }
    setLoading(false);
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  async function handleImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    await fetch('/api/portfolio/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv: csvText, portfolio_id: selected }) });
    setCsvText(''); setShowImport(false); setImporting(false); await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此持仓？')) return;
    await fetch(`/api/portfolio/holdings?id=${id}`, { method: 'DELETE' });
    await load();
  }

  const current = portfolios.find(p => p.id === selected);
  const sectorMap = new Map<string, { count: number; cost: number }>();
  current?.holdings.forEach(h => {
    const s = h.sector || '未分类'; const c = sectorMap.get(s) ?? { count: 0, cost: 0 };
    c.count++; c.cost += h.quantity * h.avg_cost; sectorMap.set(s, c);
  });

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center justify-between px-8 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
          <ChevronRight className="w-3 h-3 text-neutral-200" />
          <h1 className="text-sm font-semibold text-neutral-900">持仓管理</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-xs text-neutral-600 rounded-lg hover:bg-neutral-50"><Upload className="w-3.5 h-3.5" />导入CSV</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {showImport && (
          <div className="mb-8 p-5 rounded-xl bg-white border border-neutral-100 animate-fade-in">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">CSV批量导入</h3>
            <p className="text-xs text-neutral-400 mb-3">格式：symbol, name, quantity, avg_cost</p>
            <textarea className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono min-h-[100px]" value={csvText} onChange={e => setCsvText(e.target.value)} placeholder={'AAPL,苹果,100,150.50\nNVDA,英伟达,50,420'} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleImport} disabled={importing || !csvText.trim()} className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">{importing ? '导入中...' : '开始导入'}</button>
              <button onClick={() => { setShowImport(false); setCsvText(''); }} className="px-4 py-2 text-xs text-neutral-500">取消</button>
            </div>
          </div>
        )}

        {loading ? <div className="text-center py-20 text-neutral-400 text-sm">加载中...</div> : !current ? (
          <div className="text-center py-20"><Briefcase className="w-12 h-12 text-neutral-200 mx-auto mb-4" /><p className="text-sm text-neutral-500">还没有持仓</p></div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">持仓数</div><div className="text-2xl font-bold text-neutral-900">{current.holding_count}</div></div>
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">总成本</div><div className="text-2xl font-bold text-neutral-900">¥{current.total_cost.toLocaleString()}</div></div>
              <div className="p-4 rounded-xl bg-white border border-neutral-100"><div className="text-xs text-neutral-400 mb-1">板块</div><div className="text-2xl font-bold text-neutral-900">{sectorMap.size}</div></div>
            </div>

            {/* Sector Concentration */}
            {sectorMap.size > 1 && (
              <div className="p-5 rounded-xl bg-white border border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">板块集中度</h3>
                <div className="space-y-3">{Array.from(sectorMap.entries()).sort((a, b) => b[1].cost - a[1].cost).map(([s, d]) => {
                  const pct = current.total_cost > 0 ? (d.cost / current.total_cost) * 100 : 0;
                  return (<div key={s}><div className="flex justify-between text-xs mb-1"><span className="text-neutral-600">{s}</span><span className="text-neutral-400">{pct.toFixed(1)}%</span></div><div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct > 50 ? 'bg-red-500' : pct > 30 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></div>);
                })}</div>
              </div>
            )}

            {/* Holdings */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">持仓明细</h3>
              <div className="space-y-2">{current.holdings.map(h => (
                <div key={h.id} className="p-4 rounded-xl bg-white border border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><span className="text-sm font-semibold text-neutral-900">{h.symbol}</span>{h.name && <span className="text-xs text-neutral-400">{h.name}</span>}<span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded">{h.sector || h.asset_class}</span></div>
                    <div className="text-xs text-neutral-400 mt-1">{h.quantity}股 · ¥{h.avg_cost} · 总计 ¥{(h.quantity * h.avg_cost).toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleDelete(h.id)} className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
