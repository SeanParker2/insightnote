'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Clock, CheckCircle, XCircle, AlertTriangle, BarChart3, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';

interface DecisionMemory {
  id: string;
  symbol: string;
  action: string;
  reasoning: string;
  confidence: number;
  emotionState: string;
  marketContext: { price?: number; change?: number };
  outcome?: { actualReturn: number; verifiedAt: string; holdingDays: number };
  reflection?: { summary: string; lessonLearned: string; biasDetected?: string };
  created_at: string;
}

interface MemoryContext {
  userProfile: {
    totalDecisions: number;
    winRate: number;
    avgReturn: number;
    dominantBiases: string[];
  };
  similarDecisions: Array<{
    id: string;
    symbol: string;
    action: string;
    outcome: 'win' | 'loss' | 'pending';
    returnPct?: number;
    lesson?: string;
    similarity: number;
  }>;
  coachReminders: string[];
}

export default function MemoryPage() {
  const [decisions, setDecisions] = useState<DecisionMemory[]>([]);
  const [context, setContext] = useState<MemoryContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/memory');
    if (res.ok) {
      const data = await res.json();
      setDecisions(data.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDecisions(); }, [loadDecisions]);

  const loadContext = async (symbol: string, action: string) => {
    const res = await fetch(`/api/memory?symbol=${encodeURIComponent(symbol)}&action=${action}`);
    if (res.ok) {
      const data = await res.json();
      setContext(data.data);
      setSelectedSymbol(symbol);
    }
  };

  const verified = decisions.filter(d => d.outcome);
  const wins = verified.filter(d => d.outcome!.actualReturn > 0);
  const losses = verified.filter(d => d.outcome!.actualReturn <= 0);
  const avgReturn = verified.length > 0 ? verified.reduce((s, d) => s + d.outcome!.actualReturn, 0) / verified.length : 0;
  const winRate = verified.length > 0 ? (wins.length / verified.length) * 100 : 0;

  if (loading) return <div className="min-h-screen"><LoadingState /></div>;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="决策记忆"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '决策记忆' }]}
      />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="总决策" value={decisions.length} />
          <StatCard label="胜率" value={`${winRate.toFixed(0)}%`} />
          <StatCard label="平均收益" value={`${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(2)}%`} />
          <StatCard label="已验证" value={verified.length} />
        </div>

        {/* Coach Reminders */}
        {context?.coachReminders && context.coachReminders.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">教练提醒</span>
            </div>
            {context.coachReminders.map((r, i) => (
              <p key={i} className="text-xs text-amber-200">{r}</p>
            ))}
          </div>
        )}

        {/* Similar Decisions */}
        {context?.similarDecisions && context.similarDecisions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text-primary mb-3">相似决策历史（{selectedSymbol}）</h2>
            <div className="space-y-2">
              {context.similarDecisions.map(d => (
                <div key={d.id} className="p-4 rounded-xl bg-surface-1 border border-border-default flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      d.outcome === 'win' ? 'bg-signal-down-bg' : d.outcome === 'loss' ? 'bg-signal-up-bg' : 'bg-surface-2'
                    }`}>
                      {d.outcome === 'win' ? <CheckCircle className="w-4 h-4 text-signal-down" /> :
                       d.outcome === 'loss' ? <XCircle className="w-4 h-4 text-signal-up" /> :
                       <Clock className="w-4 h-4 text-text-tertiary" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-text-primary">{d.symbol}</span>
                      <span className="text-xs text-text-tertiary ml-2">{d.action}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {d.returnPct !== undefined && (
                      <span className={`text-sm font-mono ${d.returnPct > 0 ? 'text-signal-down' : 'text-signal-up'}`}>
                        {d.returnPct > 0 ? '+' : ''}{d.returnPct.toFixed(2)}%
                      </span>
                    )}
                    {d.lesson && <p className="text-[10px] text-text-tertiary mt-1">{d.lesson}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision List */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-4">决策历史</h2>
          {decisions.length === 0 ? (
            <EmptyState
              icon={<Brain className="w-5 h-5 text-text-tertiary" />}
              title="暂无决策记录"
              description="在行情页面进行 AI 分析时，决策会自动记录"
            />
          ) : (
            <div className="space-y-3">
              {decisions.map(d => (
                <div
                  key={d.id}
                  className="p-5 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors cursor-pointer"
                  onClick={() => loadContext(d.symbol, d.action)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ActionBadge action={d.action} />
                      <div>
                        <span className="text-sm font-semibold text-text-primary">{d.symbol}</span>
                        <span className="text-xs text-text-tertiary ml-2">{d.emotionState}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ConfidenceBadge confidence={d.confidence} />
                      {d.outcome ? (
                        <span className={`text-sm font-mono font-semibold ${d.outcome.actualReturn > 0 ? 'text-signal-down' : 'text-signal-up'}`}>
                          {d.outcome.actualReturn > 0 ? '+' : ''}{d.outcome.actualReturn.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">待验证</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary mb-2">{d.reasoning}</p>

                  {d.marketContext?.price && (
                    <div className="text-[10px] text-text-tertiary">
                      入场价: {d.marketContext.price.toFixed(2)}
                      {d.outcome && ` · 持有 ${d.outcome.holdingDays} 天`}
                    </div>
                  )}

                  {d.reflection && (
                    <div className="mt-3 p-3 rounded-lg bg-surface-2">
                      <div className="text-[10px] text-text-tertiary mb-1">反思</div>
                      <p className="text-xs text-text-secondary">{d.reflection.summary}</p>
                      {d.reflection.lessonLearned && (
                        <p className="text-xs text-brand-light mt-1">教训：{d.reflection.lessonLearned}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    buy: { label: '买入', bg: 'bg-signal-down-bg', text: 'text-signal-down' },
    sell: { label: '卖出', bg: 'bg-signal-up-bg', text: 'text-signal-up' },
    hold: { label: '持有', bg: 'bg-surface-2', text: 'text-text-secondary' },
    add: { label: '加仓', bg: 'bg-signal-down-bg', text: 'text-signal-down' },
    reduce: { label: '减仓', bg: 'bg-signal-up-bg', text: 'text-signal-up' },
  };
  const c = config[action] || config.hold;
  return <span className={`text-xs px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{c.label}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className="text-[10px] text-text-tertiary">
      {'★'.repeat(confidence)}{'☆'.repeat(5 - confidence)}
    </span>
  );
}
