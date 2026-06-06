'use client';

import { useState, useCallback } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Shield, BarChart3, Activity, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { AnalysisResult, AgentAnalysis, Recommendation } from '@/lib/agents/types';
import { LoadingState } from '@/components/ui/LoadingState';

interface AgentAnalysisPanelProps {
  symbol: string;
  className?: string;
}

export function AgentAnalysisPanel({ symbol, className }: AgentAnalysisPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data.ok) setResult(data.data);
      else setError(data.error || '分析失败');
    } catch {
      setError('网络错误');
    }
    setLoading(false);
  }, [symbol]);

  if (loading) return <LoadingState text="AI 团队分析中..." />;

  if (!result) {
    return (
      <div className={`text-center py-12 ${className ?? ''}`}>
        <Brain className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">AI 多角色分析</h3>
        <p className="text-sm text-text-secondary mb-6">由基本面、情绪、技术、风控四位分析师协作完成</p>
        <button
          onClick={runAnalysis}
          className="px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors"
        >
          开始分析 {symbol}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-brand" />
          <h3 className="text-lg font-semibold text-text-primary">AI 分析报告</h3>
        </div>
        <button onClick={runAnalysis} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          重新分析
        </button>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'fundamental' as const, label: '基本面', icon: BarChart3, color: 'text-blue-400' },
          { key: 'sentiment' as const, label: '情绪面', icon: Activity, color: 'text-amber-400' },
          { key: 'technical' as const, label: '技术面', icon: TrendingUp, color: 'text-purple-400' },
          { key: 'risk' as const, label: '风控', icon: Shield, color: 'text-rose-400' },
        ].map(({ key, label, icon: Icon, color }) => {
          const analysis = result.agents[key];
          return (
            <div key={key} className="p-4 rounded-xl bg-surface-1 border border-border-default">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs font-semibold text-text-primary">{label}</span>
                <ConfidenceBadge confidence={analysis.confidence} />
              </div>
              <p className="text-xs text-text-secondary mb-2">{analysis.summary}</p>
              <div className="flex gap-1">
                {analysis.signals.map((s, i) => (
                  <SignalBadge key={i} signal={s} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Debate */}
      <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-text-primary">团队辩论</span>
          <ConsensusBadge consensus={result.debate.consensus} confidence={result.debate.confidence} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-signal-down font-medium mb-2">正方（看好）</div>
            {result.debate.arguments.for.map((a, i) => (
              <p key={i} className="text-xs text-text-secondary mb-1">• {a.content}</p>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-signal-up font-medium mb-2">反方（看空）</div>
            {result.debate.arguments.against.map((a, i) => (
              <p key={i} className="text-xs text-text-secondary mb-1">• {a.content}</p>
            ))}
          </div>
        </div>

        {result.debate.finalDecision && (
          <div className="p-3 rounded-lg bg-surface-2">
            <div className="text-[10px] text-text-tertiary mb-1">最终判断</div>
            <p className="text-sm text-text-primary">{result.debate.finalDecision}</p>
          </div>
        )}
      </div>

      {/* Recommendation */}
      <RecommendationCard recommendation={result.recommendation} />
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className="ml-auto text-[10px] text-text-tertiary">
      {'★'.repeat(confidence)}{'☆'.repeat(5 - confidence)}
    </span>
  );
}

function SignalBadge({ signal }: { signal: { type: string; strength: string; reason: string } }) {
  const config = {
    buy: { bg: 'bg-signal-down-bg', text: 'text-signal-down', label: '买' },
    sell: { bg: 'bg-signal-up-bg', text: 'text-signal-up', label: '卖' },
    hold: { bg: 'bg-surface-2', text: 'text-text-tertiary', label: '持' },
  };
  const c = config[signal.type as keyof typeof config] ?? config.hold;

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.bg} ${c.text}`} title={signal.reason}>
      {c.label}
    </span>
  );
}

function ConsensusBadge({ consensus, confidence }: { consensus: string; confidence: number }) {
  const config = {
    bullish: { bg: 'bg-signal-down-bg', text: 'text-signal-down', label: '看多', icon: TrendingUp },
    bearish: { bg: 'bg-signal-up-bg', text: 'text-signal-up', label: '看空', icon: TrendingDown },
    neutral: { bg: 'bg-surface-2', text: 'text-text-tertiary', label: '中性', icon: Minus },
  };
  const c = config[consensus as keyof typeof config] ?? config.neutral;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label} {confidence}/5
    </span>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const actionConfig = {
    buy: { label: '买入', color: 'text-signal-down', bg: 'bg-signal-down-bg', icon: TrendingUp },
    sell: { label: '卖出', color: 'text-signal-up', bg: 'bg-signal-up-bg', icon: TrendingDown },
    hold: { label: '持有', color: 'text-text-secondary', bg: 'bg-surface-2', icon: Minus },
    add: { label: '加仓', color: 'text-signal-down', bg: 'bg-signal-down-bg', icon: TrendingUp },
    reduce: { label: '减仓', color: 'text-signal-up', bg: 'bg-signal-up-bg', icon: TrendingDown },
  };
  const c = actionConfig[recommendation.action] ?? actionConfig.hold;
  const Icon = c.icon;

  return (
    <div className="p-5 rounded-xl bg-surface-1 border border-border-default">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.color}`} />
        </div>
        <div>
          <div className={`text-lg font-bold ${c.color}`}>{c.label}</div>
          <div className="text-xs text-text-tertiary">
            信心度 {recommendation.confidence}/5 · {recommendation.timeHorizon === 'short' ? '短期' : recommendation.timeHorizon === 'medium' ? '中期' : '长期'}
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4">{recommendation.reasoning}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {recommendation.targetPrice && (
          <div className="p-3 rounded-lg bg-surface-2">
            <div className="text-[10px] text-text-tertiary">目标价</div>
            <div className="text-lg font-semibold text-text-primary">{recommendation.targetPrice.toFixed(2)}</div>
          </div>
        )}
        {recommendation.stopLoss && (
          <div className="p-3 rounded-lg bg-surface-2">
            <div className="text-[10px] text-text-tertiary">止损价</div>
            <div className="text-lg font-semibold text-signal-up">{recommendation.stopLoss.toFixed(2)}</div>
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
