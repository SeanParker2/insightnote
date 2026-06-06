'use client';

import { useState, useCallback, useEffect } from 'react';
import { Brain, Search, TrendingUp, TrendingDown, Minus, Shield, BarChart3, Activity, AlertTriangle, Zap, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import type { AnalysisResult, AgentAnalysis, Recommendation } from '@/lib/agents/types';

type HistoryItem = {
  id: string;
  symbol: string;
  analysis_result: AnalysisResult;
  created_at: string;
};

export default function AgentsPage() {
  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch('/api/agents?limit=10');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.data)) {
            setHistory(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load agent history:', error);
      }
      setLoadingHistory(false);
    }
    loadHistory();
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.data);
        // Reload history
        const histRes = await fetch('/api/agents?limit=10');
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.ok) setHistory(histData.data);
        }
      } else {
        setError(data.error || '分析失败');
      }
    } catch {
      setError('网络错误');
    }
    setLoading(false);
  }, [symbol]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="AI 分析团队"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: 'AI 分析' }]}
      />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Input */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-2">多角色 AI 分析</h2>
          <p className="text-sm text-text-secondary mb-4">由基本面、情绪、技术、风控四位分析师协作完成</p>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                placeholder="输入股票代码，如 AAPL、NVDA、000001.SS"
                className="w-full h-11 pl-10 pr-4 bg-surface-2 border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <button
              onClick={runAnalysis}
              disabled={loading || !symbol.trim()}
              className="px-6 h-11 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {loading ? '分析中...' : '开始分析'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && <LoadingState text="AI 团队分析中，请稍候..." />}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-signal-up-bg border border-signal-up/20 text-sm text-signal-up mb-6">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-6 animate-fade-in">
            {/* Agent Cards */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">分析师报告</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'fundamental' as const, label: '基本面分析师', icon: BarChart3, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
                  { key: 'sentiment' as const, label: '情绪分析师', icon: Activity, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
                  { key: 'technical' as const, label: '技术分析师', icon: TrendingUp, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
                  { key: 'risk' as const, label: '风控官', icon: Shield, color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
                ].map(({ key, label, icon: Icon, color, bgColor }) => {
                  const analysis = result.agents[key];
                  return (
                    <div key={key} className="p-5 rounded-xl bg-surface-1 border border-border-default">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${bgColor}`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-text-primary">{label}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= analysis.confidence ? 'bg-brand' : 'bg-surface-3'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">{analysis.summary}</p>
                      <div className="flex gap-1.5">
                        {analysis.signals.map((s, i) => (
                          <SignalBadge key={i} signal={s} />
                        ))}
                      </div>
                      {analysis.reasoning && (
                        <p className="text-xs text-text-tertiary mt-3 pt-3 border-t border-border-default">{analysis.reasoning}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Debate */}
            <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-brand" />
                <h3 className="text-sm font-semibold text-text-primary">团队辩论</h3>
                <ConsensusBadge consensus={result.debate.consensus} confidence={result.debate.confidence} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <div className="text-xs font-medium text-signal-down mb-2">正方（看好）</div>
                  {result.debate.arguments.for.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <TrendingUp className="w-3 h-3 text-signal-down mt-0.5 shrink-0" />
                      <p className="text-xs text-text-secondary">{a.content}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-medium text-signal-up mb-2">反方（看空）</div>
                  {result.debate.arguments.against.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <TrendingDown className="w-3 h-3 text-signal-up mt-0.5 shrink-0" />
                      <p className="text-xs text-text-secondary">{a.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.debate.finalDecision && (
                <div className="p-4 rounded-lg bg-surface-2">
                  <div className="text-[10px] text-text-tertiary mb-1">最终判断</div>
                  <p className="text-sm text-text-primary">{result.debate.finalDecision}</p>
                </div>
              )}
            </div>

            {/* Recommendation */}
            <RecommendationCard recommendation={result.recommendation} symbol={result.symbol} />
          </div>
        )}

        {/* History */}
        {history.length > 0 && !loading && (
          <div className="mt-10">
            <h3 className="text-sm font-semibold text-text-primary mb-3">分析历史</h3>
            <div className="space-y-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  className="w-full text-left p-4 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors flex items-center justify-between"
                  onClick={() => { setSymbol(h.symbol); setResult(h.analysis_result); }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{h.symbol}</span>
                    <ConsensusBadge consensus={h.analysis_result.debate.consensus} confidence={h.analysis_result.debate.confidence} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-text-tertiary" />
                    <span className="text-xs text-text-tertiary">{new Date(h.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: { type: string; strength: string; reason: string } }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    buy: { label: '买入', bg: 'bg-signal-down-bg', text: 'text-signal-down' },
    sell: { label: '卖出', bg: 'bg-signal-up-bg', text: 'text-signal-up' },
    hold: { label: '持有', bg: 'bg-surface-2', text: 'text-text-tertiary' },
  };
  const c = config[signal.type] || config.hold;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text}`} title={signal.reason}>
      {c.label}
    </span>
  );
}

function ConsensusBadge({ consensus, confidence }: { consensus: string; confidence: number }) {
  const config: Record<string, { label: string; bg: string; text: string; icon: typeof TrendingUp }> = {
    bullish: { label: '看多', bg: 'bg-signal-down-bg', text: 'text-signal-down', icon: TrendingUp },
    bearish: { label: '看空', bg: 'bg-signal-up-bg', text: 'text-signal-up', icon: TrendingDown },
    neutral: { label: '中性', bg: 'bg-surface-2', text: 'text-text-tertiary', icon: Minus },
  };
  const c = config[consensus] || config.neutral;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label} {confidence}/5
    </span>
  );
}

function RecommendationCard({ recommendation, symbol }: { recommendation: Recommendation; symbol: string }) {
  const actionConfig: Record<string, { label: string; color: string; bg: string; icon: typeof TrendingUp }> = {
    buy: { label: '买入', color: 'text-signal-down', bg: 'bg-signal-down-bg', icon: TrendingUp },
    sell: { label: '卖出', color: 'text-signal-up', bg: 'bg-signal-up-bg', icon: TrendingDown },
    hold: { label: '持有', color: 'text-text-secondary', bg: 'bg-surface-2', icon: Minus },
    add: { label: '加仓', color: 'text-signal-down', bg: 'bg-signal-down-bg', icon: TrendingUp },
    reduce: { label: '减仓', color: 'text-signal-up', bg: 'bg-signal-up-bg', icon: TrendingDown },
  };
  const c = actionConfig[recommendation.action] || actionConfig.hold;
  const Icon = c.icon;

  return (
    <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${c.bg}`}>
          <Icon className={`w-6 h-6 ${c.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{symbol}</span>
            <span className={`text-xl font-bold ${c.color}`}>{c.label}</span>
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            信心度 {recommendation.confidence}/5 · {recommendation.timeHorizon === 'short' ? '短期' : recommendation.timeHorizon === 'medium' ? '中期' : '长期'}
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4">{recommendation.reasoning}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {recommendation.targetPrice && (
          <div className="p-3 rounded-lg bg-surface-2">
            <div className="text-[10px] text-text-tertiary">目标价</div>
            <div className="text-lg font-semibold text-text-primary tabular-nums">{recommendation.targetPrice.toFixed(2)}</div>
          </div>
        )}
        {recommendation.stopLoss && (
          <div className="p-3 rounded-lg bg-surface-2">
            <div className="text-[10px] text-text-tertiary">止损价</div>
            <div className="text-lg font-semibold text-signal-up tabular-nums">{recommendation.stopLoss.toFixed(2)}</div>
          </div>
        )}
      </div>

      {recommendation.risks.length > 0 && (
        <div>
          <div className="text-[10px] text-text-tertiary mb-2">风险提示</div>
          {recommendation.risks.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-text-secondary mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
