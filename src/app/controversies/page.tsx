'use client';
import { useEffect, useState, useCallback } from 'react';
import { Swords, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type Arg = { id: string; content: string; upvotes: number; evidence_url: string | null; };
type Side = { id: string; side: string; title: string; summary: string | null; arguments: Arg[]; };
type Controversy = { id: string; title: string; description: string | null; symbol: string | null; topic_tags: string[]; status: string; sides: Side[]; for_count: number; against_count: number; undecided_count: number; };

export default function ControversiesPage() {
  const [data, setData] = useState<Controversy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Controversy | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', symbol: '', topic_tags: '', for_title: '支持', for_summary: '', against_title: '反对', against_summary: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/controversies?status=all');
    if (res.ok) { const d = await res.json(); setData(d.data ?? []); if (d.data?.length > 0 && !selected) setSelected(d.data[0]); }
    setLoading(false);
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  async function handleStance(side: string) {
    if (!selected) return;
    await fetch('/api/controversies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ controversy_id: selected.id, side }) });
    await load();
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setCreating(true);
    const res = await fetch('/api/controversies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || null,
        symbol: form.symbol.trim().toUpperCase() || null,
        topic_tags: form.topic_tags.split(',').map(t => t.trim()).filter(Boolean),
        sides: [
          { title: form.for_title || '支持', summary: form.for_summary || null },
          { title: form.against_title || '反对', summary: form.against_summary || null },
        ],
      }),
    });
    if (res.ok) {
      setForm({ title: '', description: '', symbol: '', topic_tags: '', for_title: '支持', for_summary: '', against_title: '反对', against_summary: '' });
      setShowCreate(false);
      await load();
    }
    setCreating(false);
  }

  if (loading) return <div className="min-h-screen"><LoadingState /></div>;

  if (data.length === 0) return (
    <div className="min-h-screen">
      <PageHeader 
        title="争议地图" 
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '争议地图' }]}
        actions={
          <button 
            onClick={() => setShowCreate(!showCreate)} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />发起争议
          </button>
        }
      />
      {showCreate && <CreateForm />}
      <EmptyState icon={<Swords className="w-5 h-5 text-text-tertiary" />} title="暂无争议话题" description="点击右上角按钮发起第一个争议话题" />
    </div>
  );

  const s = selected;
  const forSide = s?.sides.find(x => x.side === 'for');
  const againstSide = s?.sides.find(x => x.side === 'against');
  const total = (s?.for_count ?? 0) + (s?.against_count ?? 0) + (s?.undecided_count ?? 0);
  const forPct = total > 0 ? ((s?.for_count ?? 0) / total) * 100 : 50;

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="争议地图" 
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '争议地图' }]}
        actions={
          <button 
            onClick={() => setShowCreate(!showCreate)} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />发起争议
          </button>
        }
      />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {showCreate && <CreateForm />}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">{data.map(c => <button key={c.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selected?.id === c.id ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'}`} onClick={() => setSelected(c)}>{c.title}</button>)}</div>

        {s && <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{s.title}</h2>
            {s.description && <p className="text-sm text-text-secondary mb-3">{s.description}</p>}
            <div className="flex gap-1.5">{s.symbol && <span className="text-xs px-2 py-0.5 bg-surface-2 rounded font-mono text-text-secondary">{s.symbol}</span>}{s.topic_tags.map(t => <span key={t} className="text-xs px-2 py-0.5 bg-surface-2 rounded text-text-secondary">{t}</span>)}</div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-text-tertiary mb-2"><span>正方 ({s.for_count})</span><span>反方 ({s.against_count})</span></div>
            <div className="w-full h-3 bg-signal-down-bg rounded-full overflow-hidden"><div className="h-full bg-signal-down transition-all" style={{ width: `${forPct}%` }} /></div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleStance('for')} className="px-3 py-1.5 text-xs border border-signal-down/30 text-signal-down rounded-lg hover:bg-signal-down-bg transition-colors">支持正方</button>
              <button onClick={() => handleStance('against')} className="px-3 py-1.5 text-xs border border-signal-up/30 text-signal-up rounded-lg hover:bg-signal-up-bg transition-colors">支持反方</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-signal-down-bg border border-signal-down/20">
              <h3 className="text-sm font-semibold text-signal-down mb-3">正方：{forSide?.title ?? '支持'}</h3>
              {forSide?.summary && <p className="text-xs text-text-secondary mb-3">{forSide.summary}</p>}
              <div className="space-y-2">{(forSide?.arguments ?? []).map(a => <div key={a.id} className="p-3 rounded-lg bg-surface-1 border border-border-default"><p className="text-xs text-text-secondary">{a.content}</p><div className="text-[10px] text-text-tertiary mt-1">👍 {a.upvotes}</div></div>)}</div>
            </div>
            <div className="p-5 rounded-xl bg-signal-up-bg border border-signal-up/20">
              <h3 className="text-sm font-semibold text-signal-up mb-3">反方：{againstSide?.title ?? '反对'}</h3>
              {againstSide?.summary && <p className="text-xs text-text-secondary mb-3">{againstSide.summary}</p>}
              <div className="space-y-2">{(againstSide?.arguments ?? []).map(a => <div key={a.id} className="p-3 rounded-lg bg-surface-1 border border-border-default"><p className="text-xs text-text-secondary">{a.content}</p><div className="text-[10px] text-text-tertiary mt-1">👍 {a.upvotes}</div></div>)}</div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );

  function CreateForm() {
    return (
      <div className="mb-8 p-5 rounded-xl bg-surface-1 border border-border-default animate-fade-in">
        <h3 className="text-sm font-semibold text-text-primary mb-4">发起新争议</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-tertiary mb-1 block">争议标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="例如：特斯拉是否被高估？"
              className="w-full h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-tertiary mb-1 block">描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="简要描述争议背景..."
              className="w-full rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-xs text-text-primary min-h-[60px] focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">相关标的</label>
            <input
              type="text"
              value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value })}
              placeholder="TSLA"
              className="w-full h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">标签（逗号分隔）</label>
            <input
              type="text"
              value={form.topic_tags}
              onChange={e => setForm({ ...form, topic_tags: e.target.value })}
              placeholder="科技,估值,电动车"
              className="w-full h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">正方标题</label>
            <input
              type="text"
              value={form.for_title}
              onChange={e => setForm({ ...form, for_title: e.target.value })}
              placeholder="支持"
              className="w-full h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary mb-1 block">反方标题</label>
            <input
              type="text"
              value={form.against_title}
              onChange={e => setForm({ ...form, against_title: e.target.value })}
              placeholder="反对"
              className="w-full h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCreate}
            disabled={creating || !form.title.trim()}
            className="px-4 py-2 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {creating ? '创建中...' : '提交争议'}
          </button>
          <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors">取消</button>
        </div>
      </div>
    );
  }
}
