'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Bell, CheckCheck } from 'lucide-react';

type Alert = { id: string; alert_type: string; severity: string; title: string; body: string; symbol: string | null; is_read: boolean; created_at: string; };

const SEV: Record<string, { bg: string; text: string; icon: string }> = { critical: { bg: 'bg-red-50', text: 'text-red-600', icon: '🚨' }, warning: { bg: 'bg-amber-50', text: 'text-amber-600', icon: '⚠️' }, info: { bg: 'bg-blue-50', text: 'text-blue-600', icon: '💡' } };
const TYPE: Record<string, string> = { bias_warning: '认知偏差', news_impact: '新闻影响', price_change: '价格异动' };

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '50' });
    if (filter === 'unread') p.set('unread', 'true');
    const res = await fetch(`/api/alerts?${p}`);
    if (res.ok) { const d = await res.json(); setAlerts(d.data ?? []); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markAll() {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) });
    await load();
  }

  async function markOne(id: string) {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', ids: [id] }) });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }

  const unread = alerts.filter(a => !a.is_read).length;
  const sorted = [...alerts].sort((a, b) => { if (a.is_read !== b.is_read) return a.is_read ? 1 : -1; const so: Record<string, number> = { critical: 0, warning: 1, info: 2 }; return (so[a.severity] ?? 3) - (so[b.severity] ?? 3); });

  return (
    <div className="min-h-screen">
      <header className="h-14 flex items-center justify-between px-8 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
          <ChevronRight className="w-3 h-3 text-neutral-200" />
          <h1 className="text-sm font-semibold text-neutral-900">预警通知</h1>
          {unread > 0 && <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">{unread}</span>}
        </div>
        {unread > 0 && <button onClick={markAll} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"><CheckCheck className="w-3.5 h-3.5" />全部已读</button>}
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex gap-1 mb-6">
          {(['all', 'unread'] as const).map(f => <button key={f} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`} onClick={() => setFilter(f)}>{f === 'all' ? '全部' : `未读 ${unread > 0 ? `(${unread})` : ''}`}</button>)}
        </div>

        {loading ? <div className="text-center py-20 text-neutral-400 text-sm">加载中...</div> : sorted.length === 0 ? (
          <div className="text-center py-20"><Bell className="w-12 h-12 text-neutral-200 mx-auto mb-4" /><h2 className="text-lg font-semibold text-neutral-900 mb-2">暂无通知</h2><p className="text-sm text-neutral-500">系统会在检测到风险时通知你</p></div>
        ) : (
          <div className="space-y-3">{sorted.map(a => {
            const s = SEV[a.severity] ?? SEV.info;
            return (
              <div key={a.id} className={`p-5 rounded-xl border transition-colors cursor-pointer ${!a.is_read ? `border-neutral-200 ${s.bg}` : 'border-neutral-100 bg-white opacity-60'}`} onClick={() => !a.is_read && markOne(a.id)}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{s.icon}</span>
                  <span className="text-sm font-semibold text-neutral-900">{a.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white border border-neutral-200 rounded">{TYPE[a.alert_type] ?? a.alert_type}</span>
                  {a.symbol && <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded font-mono">{a.symbol}</span>}
                  {!a.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto" />}
                </div>
                <p className="text-sm text-neutral-600">{a.body}</p>
              </div>
            );
          })}</div>
        )}
      </div>
    </div>
  );
}
