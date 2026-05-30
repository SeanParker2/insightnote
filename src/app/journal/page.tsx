'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Plus, X } from 'lucide-react';

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
      <header className="h-14 flex items-center justify-between px-8 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
          <ChevronRight className="w-3 h-3 text-neutral-200" />
          <h1 className="text-sm font-semibold text-neutral-900">决策日志</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? '取消' : '记录决策'}
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Stats */}
        {entries.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-white border border-neutral-100">
              <div className="text-xs text-neutral-400 mb-1">总决策</div>
              <div className="text-2xl font-bold text-neutral-900">{entries.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-neutral-100">
              <div className="text-xs text-neutral-400 mb-1">看多</div>
              <div className="text-2xl font-bold text-red-600">{entries.filter(e => e.expected_direction === 'bullish').length}</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-neutral-100">
              <div className="text-xs text-neutral-400 mb-1">看空</div>
              <div className="text-2xl font-bold text-emerald-600">{entries.filter(e => e.expected_direction === 'bearish').length}</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-neutral-100">
              <div className="text-xs text-neutral-400 mb-1">标的</div>
              <div className="flex flex-wrap gap-1 mt-1">{[...new Set(entries.map(e => e.symbol))].slice(0, 3).map(s => <span key={s} className="text-xs px-1.5 py-0.5 bg-neutral-100 rounded">{s}</span>)}</div>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-xl bg-white border border-neutral-100 animate-fade-in">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">记录新决策</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1"><span className="text-xs text-neutral-500">标的代码</span><input className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL" /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-neutral-500">操作</span><select className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" value={action} onChange={e => setAction(e.target.value)}>{Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-neutral-500">价格</span><input className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="可选" /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-neutral-500">情绪</span><select className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" value={emotionLabel} onChange={e => setEmotionLabel(e.target.value)}>{Object.entries(EMOTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
            <label className="flex flex-col gap-1 mb-4"><span className="text-xs text-neutral-500">决策理由</span><textarea className="rounded-lg border border-neutral-200 px-3 py-2 text-sm min-h-[80px]" value={reasoning} onChange={e => setReasoning(e.target.value)} placeholder="写下你的投资逻辑..." /></label>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={submitting || !symbol.trim() || reasoning.length < 5} className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">{submitting ? '保存中...' : '保存'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700">取消</button>
            </div>
          </div>
        )}

        {/* Bias Report */}
        {biasReport && (
          <div className="mb-8 p-5 rounded-xl bg-neutral-50 border border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">认知偏差分析</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '过度自信', data: biasReport.overconfidence },
                { label: '损失厌恶', data: biasReport.loss_aversion },
                { label: '方向偏差', data: biasReport.directional_bias },
                { label: '情绪交易', data: biasReport.emotional_trading },
              ].map(({ label, data }) => (
                <div key={label} className={`p-3 rounded-lg border ${data.detected ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-white'}`}>
                  <div className="flex items-center gap-2 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${data.detected ? 'bg-red-500' : 'bg-emerald-500'}`} /><span className="text-xs font-medium text-neutral-900">{label}</span></div>
                  <p className="text-[11px] text-neutral-500">{data.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entries */}
        {loading ? <div className="text-center py-20 text-neutral-400 text-sm">加载中...</div> : entries.length === 0 ? (
          <div className="text-center py-20"><BookOpen className="w-12 h-12 text-neutral-200 mx-auto mb-4" /><p className="text-sm text-neutral-500">还没有决策记录</p></div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="p-5 rounded-xl bg-white border border-neutral-100 hover:border-neutral-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-neutral-900">{entry.symbol}</span>
                  <span className="text-xs px-2 py-0.5 bg-neutral-100 rounded">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                  {entry.emotion_label && <span className="text-xs text-neutral-400">{EMOTION_LABELS[entry.emotion_label]} {entry.emotion_level}/5</span>}
                  <span className="text-xs text-neutral-300 ml-auto">{new Date(entry.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <p className="text-sm text-neutral-600">{entry.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
