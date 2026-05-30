'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateCN } from '@/lib/utils';

type Prediction = {
  id: string;
  user_id: string | null;
  symbol: string;
  direction: string;
  target_price: number | null;
  timeframe_days: number | null;
  status: string;
  reasoning: string | null;
  confidence: number | null;
  endorsement_count: number;
  created_at: string;
};

type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_predictions: number;
  won_count: number;
  lost_count: number;
  accuracy_rate: number;
  avg_confidence: number | null;
};

const DIRECTION_COLORS: Record<string, string> = {
  bullish: 'bg-emerald-100 text-emerald-800',
  bearish: 'bg-red-100 text-red-800',
  neutral: 'bg-slate-100 text-slate-800',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
  expired: 'bg-slate-100 text-slate-800',
};

export default function PredictionsPage() {
  const supabase = createClient();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed');
  const [dirFilter, setDirFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState('bullish');
  const [targetPrice, setTargetPrice] = useState('');
  const [timeframe, setTimeframe] = useState('30');
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [predRes, lbRes] = await Promise.all([
      fetch('/api/predictions/community?limit=50'),
      fetch('/api/predictions/leaderboard?limit=20'),
    ]);

    if (predRes.ok) {
      const data = await predRes.json();
      setPredictions(data.data ?? []);
    }
    if (lbRes.ok) {
      const data = await lbRes.json();
      setLeaderboard(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit() {
    if (!symbol.trim() || !reasoning.trim()) return;
    setSubmitting(true);

    const res = await fetch('/api/predictions/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: symbol.trim().toUpperCase(),
        direction,
        target_price: targetPrice ? Number(targetPrice) : null,
        timeframe_days: timeframe ? Number(timeframe) : null,
        reasoning: reasoning.trim(),
        confidence,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setSymbol('');
      setReasoning('');
      setTargetPrice('');
      await loadData();
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">预测市场</h1>
            <p className="mt-2 text-sm text-slate-500">
              发表你的预测，与社区一起验证，发现群体智慧
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-brand-900 hover:bg-brand-800">
            {showForm ? '取消' : '+ 发表预测'}
          </Button>
        </div>

        {/* Tabs + Filters */}
        <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-2">
          <div className="flex gap-1">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'feed' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTab('feed')}
            >
              预测动态
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'leaderboard' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTab('leaderboard')}
            >
            排行榜
          </button>
          </div>
          {tab === 'feed' && (
            <div className="flex gap-1 ml-auto">
              {[
                { value: 'all', label: '全部' },
                { value: 'bullish', label: '看多' },
                { value: 'bearish', label: '看空' },
                { value: 'neutral', label: '中性' },
              ].map((f) => (
                <button
                  key={f.value}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${dirFilter === f.value ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  onClick={() => setDirFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Prediction Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-xl border border-slate-200 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-900 mb-4">发表新预测</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">标的代码</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="如 AAPL, NVDA" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">方向</span>
                <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="bullish">看多</option>
                  <option value="bearish">看空</option>
                  <option value="neutral">中性</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">目标价（可选）</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} type="number" placeholder="预期价格" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">时间窗口（天）</span>
                <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} type="number" placeholder="30" />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">置信度: {confidence}/10</span>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={10} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="flex-1" />
                  <span className={`text-sm font-bold min-w-[60px] ${confidence >= 8 ? 'text-emerald-600' : confidence <= 3 ? 'text-red-600' : 'text-slate-600'}`}>
                    {confidence >= 8 ? '非常确信' : confidence >= 6 ? '较确信' : confidence >= 4 ? '一般' : '不太确信'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${confidence >= 8 ? 'bg-emerald-500' : confidence >= 5 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${confidence * 10}%` }}
                  />
                </div>
              </label>
            </div>
            <label className="flex flex-col gap-1 mt-4">
              <span className="text-xs font-medium text-slate-600">预测理由</span>
              <textarea className="rounded-md border border-slate-200 px-3 py-2 text-sm min-h-[80px]" value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="你的预测逻辑..." />
            </label>
            <div className="mt-4 flex gap-3">
              <Button onClick={handleSubmit} disabled={submitting || !symbol.trim() || !reasoning.trim()}>发表预测</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">加载中...</div>
        ) : tab === 'feed' ? (
          predictions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无预测，成为第一个发表预测的人</div>
          ) : (
            <div className="space-y-4">
              {predictions.filter((p) => dirFilter === 'all' || p.direction === dirFilter).map((p) => (
                <div key={p.id} className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900">{p.symbol}</span>
                      <Badge className={DIRECTION_COLORS[p.direction] ?? ''}>
                        {p.direction === 'bullish' ? '看多' : p.direction === 'bearish' ? '看空' : '中性'}
                      </Badge>
                      <Badge className={STATUS_COLORS[p.status] ?? ''}>
                        {p.status === 'active' ? '进行中' : p.status === 'won' ? '已验证' : p.status === 'lost' ? '未达成' : '已过期'}
                      </Badge>
                      {p.confidence && <span className="text-xs text-slate-500">置信度 {p.confidence}/10</span>}
                    </div>
                    <span className="text-xs text-slate-400">{formatDateCN(p.created_at)}</span>
                  </div>
                  {p.reasoning && <p className="text-sm text-slate-700 mb-2">{p.reasoning}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {p.target_price && <span>目标价: {p.target_price}</span>}
                    {p.timeframe_days && <span>时间窗口: {p.timeframe_days}天</span>}
                    <button
                      className="flex items-center gap-1 hover:text-brand-900 transition-colors"
                      onClick={async () => {
                        await fetch('/api/predictions/endorse', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prediction_id: p.id }),
                        });
                        loadData();
                      }}
                    >
                      👍 支持: {p.endorsement_count}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无排行榜数据，至少需要 3 条已验证预测</div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div key={entry.user_id} className="p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-900 text-white flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">{entry.display_name}</div>
                    <div className="text-xs text-slate-500">
                      {entry.total_predictions} 次预测 · {entry.won_count} 胜 · {entry.lost_count} 负
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{entry.accuracy_rate}%</div>
                    <div className="text-xs text-slate-400">准确率</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
