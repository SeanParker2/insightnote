'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, useConfirm } from '@/components/ui/ConfirmDialog';

type Holding = { id: string; symbol: string; name: string | null; quantity: number; avg_cost: number; sector: string | null; };
type Portfolio = { id: string; name: string; holdings: Holding[]; total_cost: number; holding_count: number; };

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: '', name: '', quantity: '', avg_cost: '', sector: '' });
  const { isOpen, config, confirm, handleClose } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/portfolio');
    if (res.ok) { const d = await res.json(); setPortfolios(d.data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!form.symbol.trim() || !form.quantity || !form.avg_cost) return;
    await fetch('/api/portfolio/holdings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_id: portfolios[0]?.id,
        symbol: form.symbol.trim().toUpperCase(),
        name: form.name.trim() || null,
        quantity: Number(form.quantity),
        avg_cost: Number(form.avg_cost),
        sector: form.sector.trim() || null,
      }),
    });
    setForm({ symbol: '', name: '', quantity: '', avg_cost: '', sector: '' });
    setShowAdd(false);
    await load();
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: '删除持仓',
      message: '确定要删除此持仓吗？',
      onConfirm: () => {},
    });
    if (!confirmed) return;
    await fetch(`/api/portfolio/holdings?id=${id}`, { method: 'DELETE' });
    await load();
  }

  const current = portfolios[0];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="持仓"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '持仓' }]}
        actions={
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#666] hover:text-white border border-[#222] rounded hover:border-[#444] transition-colors">
            <Plus size={14} />
            添加
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {showAdd && (
          <div className="mb-8 p-4 rounded-lg border border-[#1a1a1a]">
            <h3 className="text-sm font-medium mb-4">添加持仓</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.symbol}
                onChange={e => setForm({ ...form, symbol: e.target.value })}
                placeholder="代码 *"
                className="px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded text-sm focus:outline-none focus:border-[#333]"
              />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="名称"
                className="px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded text-sm focus:outline-none focus:border-[#333]"
              />
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                placeholder="数量 *"
                className="px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded text-sm focus:outline-none focus:border-[#333]"
              />
              <input
                type="number"
                value={form.avg_cost}
                onChange={e => setForm({ ...form, avg_cost: e.target.value })}
                placeholder="成本价 *"
                className="px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded text-sm focus:outline-none focus:border-[#333]"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-white text-black text-xs font-medium rounded hover:bg-[#eee] transition-colors">
                添加
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs text-[#444] hover:text-[#666] transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        {!current ? (
          <EmptyState title="暂无持仓" description="添加持仓开始使用" />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="持仓数" value={current.holding_count} />
              <StatCard label="总成本" value={`¥${current.total_cost.toLocaleString()}`} />
              <StatCard label="标的数" value={new Set(current.holdings.map(h => h.symbol)).size} />
            </div>

            <div>
              <h3 className="text-xs text-[#444] uppercase tracking-wider mb-3">持仓明细</h3>
              <div className="space-y-1">
                {current.holdings.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded border border-[#1a1a1a] hover:border-[#222] transition-colors group">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{h.symbol}</span>
                        {h.name && <span className="text-xs text-[#444]">{h.name}</span>}
                      </div>
                      <div className="text-xs text-[#444] mt-0.5">
                        {h.quantity}股 · ¥{h.avg_cost}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(h.id)} className="p-1 text-[#333] hover:text-[#e55] opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={isOpen} onClose={handleClose} onConfirm={config.onConfirm} title={config.title} message={config.message} />
    </div>
  );
}
