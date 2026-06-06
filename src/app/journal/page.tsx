'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Plus, X, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportJournalEntries } from '@/lib/export';

type JournalEntry = {
  id: string; symbol: string; action: string; price: number | null; quantity: number | null;
  reasoning: string; emotion_label: string | null; emotion_level: number | null;
  expected_direction: string | null; actual_outcome: string | null; actual_return_pct: number | null; created_at: string;
};

type BiasReport = {
  overconfidence: { detected: boolean; description: string };
  loss_aversion: { detected: boolean; description: string };
  directional_bias: { detected: boolean; description: string };
  emotional_trading: { detected: boolean; description: string };
};

const ACTION_LABELS: Record<string, string> = { buy: '买入', sell: '卖出', hold: '持有', reduce: '减仓', add: '加仓' };
const EMOTION_LABELS: Record<string, string> = { confident: '自信', neutral: '中性', hesitant: '犹豫', fearful: '恐惧', greedy: '贪婪' };

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [biasReport, setBiasReport] = useState<BiasReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState(''); const [action, setAction] = useState('buy');
  const [price, setPrice] = useState(''); const [reasoning, setReasoning] = useState('');
  const [emotionLabel, setEmotionLabel] = useState('neutral'); const [emotionLevel, setEmotionLevel] = useState(3);
  const [expectedDirection, setExpectedDirection] = useState('bullish'); const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [jRes, aRes] = await Promise.all([fetch('/api/journal?limit=50'), fetch('/api/journal/analysis')]);
    if (jRes.ok) { const d = await jRes.json(); setEntries(d.data ?? []); }
    if (aRes.ok) { const d = await aRes.json(); setBiasReport(d.data); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit() {
    if (!symbol.trim() || reasoning.length < 5) return;
    setSubmitting(true);
    const res = await fetch('/api/journal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), action, price: price ? Number(price) : null, reasoning: reasoning.trim(), emotion_label: emotionLabel, emotion_level: emotionLevel, expected_direction: expectedDirection }),
    });
    if (res.ok) { setShowForm(false); setSymbol(''); setReasoning(''); setPrice(''); await loadData(); }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="决策日志"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '决策日志' }]}
        actions={
          <div className="flex gap-2">
            {entries.length > 0 && (
              <button 
                onClick={() => exportJournalEntries(entries)} 
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border-default text-xs text-text-secondary rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors">
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? '取消' : '记录决策'}
            </button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="总决策" value={entries.length} />
            <StatCard label="看多" value={entries.filter(e => e.expected_direction === 'bullish').length} />
            <StatCard label="看空" value={entries.filter(e => e.expected_direction === 'bearish').length} />
            <div className="p-4 rounded-xl bg-surface-1 border border-border-default">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">标的</div>
              <div className="flex flex-wrap gap-1">{[...new Set(entries.map(e => e.symbol))].slice(0, 3).map(s => <span key={s} className="text-xs px-1.5 py-0.5 bg-surface-2 rounded text-text-secondary">{s}</span>)}</div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="mb-8 p-6 rounded-xl bg-surface-1 border border-border-default animate-fade-in">
            <h2 className="text-sm font-semibold text-text-primary mb-4">记录新决策</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1"><span className="text-xs text-text-tertiary">标的代码</span><input className="h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL" /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-text-tertiary">操作</span><select className="h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" value={action} onChange={e => setAction(e.target.value)}>{Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-text-tertiary">价格</span><input className="h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="可选" /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-text-tertiary">情绪</span><select className="h-9 rounded-lg border border-border-default bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" value={emotionLabel} onChange={e => setEmotionLabel(e.target.value)}>{Object.entries(EMOTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
            <label className="flex flex-col gap-1 mb-4"><span className="text-xs text-text-tertiary">决策理由</span><textarea className="rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-sm min-h-[80px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" value={reasoning} onChange={e => setReasoning(e.target.value)} placeholder="写下你的投资逻辑..." /></label>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={submitting || !symbol.trim() || reasoning.length < 5} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">{submitting ? '保存中...' : '保存'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors">取消</button>
            </div>
          </div>
        )}

        {biasReport && (
          <div className="mb-8 p-5 rounded-xl bg-surface-1 border border-border-default">
            <h3 className="text-sm font-semibold text-text-primary mb-3">认知偏差分析</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '过度自信', data: biasReport.overconfidence },
                { label: '损失厌恶', data: biasReport.loss_aversion },
                { label: '方向偏差', data: biasReport.directional_bias },
                { label: '情绪交易', data: biasReport.emotional_trading },
              ].map(({ label, data }) => (
                <div key={label} className={`p-3 rounded-lg border ${data.detected ? 'border-signal-up/30 bg-signal-up-bg' : 'border-border-default bg-surface-2'}`}>
                  <div className="flex items-center gap-2 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${data.detected ? 'bg-signal-up' : 'bg-signal-down'}`} /><span className="text-xs font-medium text-text-primary">{label}</span></div>
                  <p className="text-[11px] text-text-secondary">{data.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? <LoadingState /> : entries.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-5 h-5 text-text-tertiary" />} title="还没有决策记录" description="点击右上角记录你的第一个投资决策" />
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="p-5 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-text-primary">{entry.symbol}</span>
                  <span className="text-xs px-2 py-0.5 bg-surface-2 rounded text-text-secondary">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                  {entry.emotion_label && <span className="text-xs text-text-tertiary">{EMOTION_LABELS[entry.emotion_label]} {entry.emotion_level}/5</span>}
                  <span className="text-xs text-text-tertiary ml-auto">{new Date(entry.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <p className="text-sm text-text-secondary">{entry.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
