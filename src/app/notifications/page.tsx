'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

type Alert = { id: string; alert_type: string; severity: string; title: string; body: string; symbol: string | null; is_read: boolean; created_at: string; };

const SEV: Record<string, { bg: string; text: string; icon: string }> = {
  critical: { bg: 'bg-signal-up-bg', text: 'text-signal-up', icon: '🚨' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⚠️' },
  info: { bg: 'bg-brand/10', text: 'text-brand-light', icon: '💡' },
};
const TYPE: Record<string, string> = { bias_warning: '认知偏差', news_impact: '新闻影响', price_change: '价格异动' };

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);

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
      <PageHeader
        title="预警通知"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '预警通知' }]}
        actions={
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                <CheckCheck className="w-3.5 h-3.5" />全部已读
              </button>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${showSettings ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'}`}
            >
              <Settings className="w-3.5 h-3.5" />通知设置
            </button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {showSettings ? (
          <div className="mb-8">
            <NotificationSettings />
          </div>
        ) : null}

        <div className="flex gap-1 mb-6">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-brand text-white' : 'text-text-tertiary hover:bg-surface-2'}`} onClick={() => setFilter(f)}>
              {f === 'all' ? '全部' : `未读 ${unread > 0 ? `(${unread})` : ''}`}
            </button>
          ))}
        </div>

        {loading ? <LoadingState /> : sorted.length === 0 ? (
          <EmptyState icon={<Bell className="w-5 h-5 text-text-tertiary" />} title="暂无通知" description="系统会在检测到风险时通知你" />
        ) : (
          <div className="space-y-3">{sorted.map(a => {
            const s = SEV[a.severity] ?? SEV.info;
            return (
              <div key={a.id} className={`p-5 rounded-xl border transition-colors cursor-pointer ${!a.is_read ? `border-border-strong ${s.bg}` : 'border-border-default bg-surface-1 opacity-60'}`} onClick={() => !a.is_read && markOne(a.id)}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{s.icon}</span>
                  <span className="text-sm font-semibold text-text-primary">{a.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-surface-2 border border-border-default rounded text-text-secondary">{TYPE[a.alert_type] ?? a.alert_type}</span>
                  {a.symbol && <span className="text-[10px] px-1.5 py-0.5 bg-surface-2 rounded font-mono text-text-secondary">{a.symbol}</span>}
                  {!a.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brand ml-auto" />}
                </div>
                <p className="text-sm text-text-secondary">{a.body}</p>
              </div>
            );
          })}</div>
        )}
      </div>
    </div>
  );
}
