'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Sun, TrendingUp, TrendingDown, AlertTriangle, BookOpen, Zap, ChevronRight, Activity } from 'lucide-react';
import type { DailyBriefing, Insight, ActionSuggestion, BiasAlert, MarketSentiment } from '@/lib/daily-assistant/types';
import { LoadingState } from '@/components/ui/LoadingState';

export function DailyDashboard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily');
      const data = await res.json();
      if (data.ok) setBriefing(data.data);
      else setError(data.error || '加载失败');
    } catch {
      setError('网络错误');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBriefing(); }, [loadBriefing]);

  if (loading) return <LoadingState text="生成今日简报..." />;
  if (error) return <div className="text-center py-12 text-sm text-text-tertiary">{error}</div>;
  if (!briefing) return null;

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
        <div className="flex items-center gap-2 text-xs text-text-tertiary mb-2">
          <Sun className="w-3.5 h-3.5" />
          <span>{new Date(briefing.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary leading-tight">{briefing.headline}</h1>
      </div>

      {/* Market Sentiment */}
      <SentimentBar sentiment={briefing.marketSentiment} />

      {/* Portfolio Summary */}
      <PortfolioCard summary={briefing.portfolioSummary} />

      {/* Top Insights */}
      {briefing.topInsights.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">今日要点</h2>
          <div className="space-y-2">
            {briefing.topInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Action Suggestion */}
      {briefing.actionSuggestion && (
        <ActionCard action={briefing.actionSuggestion} />
      )}

      {/* Bias Alert */}
      {briefing.biasAlert && (
        <BiasCard alert={briefing.biasAlert} />
      )}

      {/* Reading List */}
      {briefing.readingList.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">推荐阅读</h2>
          <div className="space-y-2">
            {briefing.readingList.map(item => (
              <Link
                key={item.id}
                href={`/posts/${item.id}`}
                className="block p-4 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-3 h-3 text-text-tertiary" />
                  <span className="text-[10px] text-text-tertiary">{item.estimatedReadTime} 分钟</span>
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1">{item.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-1">{item.reason}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: MarketSentiment }) {
  const color = sentiment.score > 20 ? 'text-signal-down' : sentiment.score < -20 ? 'text-signal-up' : 'text-text-secondary';
  const bg = sentiment.score > 20 ? 'bg-signal-down-bg' : sentiment.score < -20 ? 'bg-signal-up-bg' : 'bg-surface-2';

  return (
    <div className={`p-4 rounded-xl ${bg} border border-border-default`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-primary">市场情绪</span>
        <span className={`text-sm font-bold ${color}`}>{sentiment.score.toFixed(0)}</span>
      </div>
      <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${sentiment.score > 0 ? 'bg-signal-down' : 'bg-signal-up'}`}
          style={{ width: `${Math.abs(sentiment.score)}%` }}
        />
      </div>
      <p className="text-xs text-text-secondary mt-2">{sentiment.description}</p>
    </div>
  );
}

function PortfolioCard({ summary }: { summary: DailyBriefing['portfolioSummary'] }) {
  const isUp = summary.dayChangePct >= 0;

  return (
    <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-text-tertiary">持仓今日表现</span>
        <span className={`text-lg font-bold tabular-nums ${isUp ? 'text-signal-up' : 'text-signal-down'}`}>
          {isUp ? '+' : ''}{summary.dayChangePct.toFixed(2)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-surface-2">
          <div className="text-[10px] text-text-tertiary">总市值</div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">
            ¥{(summary.totalValue / 10000).toFixed(2)}万
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface-2">
          <div className="text-[10px] text-text-tertiary">今日盈亏</div>
          <div className={`text-lg font-semibold tabular-nums ${isUp ? 'text-signal-up' : 'text-signal-down'}`}>
            {isUp ? '+' : ''}¥{summary.dayChange.toFixed(0)}
          </div>
        </div>
      </div>

      {summary.bestPerformer && summary.worstPerformer && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-signal-down">
            <TrendingUp className="w-3 h-3" />
            <span>{summary.bestPerformer.symbol} +{summary.bestPerformer.change.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-1 text-signal-up">
            <TrendingDown className="w-3 h-3" />
            <span>{summary.worstPerformer.symbol} {summary.worstPerformer.change.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const impactConfig = {
    bullish: { bg: 'bg-signal-down-bg', text: 'text-signal-down', icon: TrendingUp },
    bearish: { bg: 'bg-signal-up-bg', text: 'text-signal-up', icon: TrendingDown },
    neutral: { bg: 'bg-surface-2', text: 'text-text-tertiary', icon: Activity },
  };
  const c = impactConfig[insight.impact];
  const Icon = c.icon;

  return (
    <div className="p-4 rounded-xl bg-surface-1 border border-border-default">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${c.bg} shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${c.text}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-primary">{insight.title}</span>
            {insight.actionRequired && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">需关注</span>
            )}
          </div>
          <p className="text-xs text-text-secondary">{insight.summary}</p>
          {insight.affectedSymbols.length > 0 && (
            <div className="flex gap-1 mt-2">
              {insight.affectedSymbols.map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-surface-2 rounded font-mono text-text-tertiary">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ActionSuggestion }) {
  const urgencyConfig = {
    high: { bg: 'bg-signal-up-bg', text: 'text-signal-up', border: 'border-signal-up/30' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    low: { bg: 'bg-surface-2', text: 'text-text-secondary', border: 'border-border-default' },
  };
  const c = urgencyConfig[action.urgency];

  return (
    <div className={`p-5 rounded-xl ${c.bg} border ${c.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className={`w-4 h-4 ${c.text}`} />
        <span className="text-sm font-semibold text-text-primary">{action.title}</span>
      </div>
      <p className="text-xs text-text-secondary mb-3">{action.description}</p>
      <p className="text-[10px] text-text-tertiary">{action.reasoning}</p>
      {action.relatedSymbols.length > 0 && (
        <div className="flex gap-1 mt-3">
          {action.relatedSymbols.map(s => (
            <Link key={s} href={`/market?symbol=${s}`} className="text-xs px-2 py-1 bg-surface-1 rounded text-text-secondary hover:text-text-primary transition-colors">
              {s}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function BiasCard({ alert }: { alert: BiasAlert }) {
  return (
    <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-300">{alert.title}</span>
      </div>
      <p className="text-xs text-amber-200 mb-2">{alert.description}</p>
      <p className="text-xs text-amber-300 font-medium">建议：{alert.suggestion}</p>
    </div>
  );
}
