'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Sun, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type BriefingData = {
  id: string;
  briefing_date: string;
  headline: string;
  portfolio_summary: {
    holdings?: Array<{ symbol: string; name: string | null; change_pct: number | null; news: string | null }>;
    total_change_pct?: number | null;
    best_performer?: string | null;
    worst_performer?: string | null;
  };
  top_events: Array<{ title: string; summary: string; impact: string; affected_symbols: string[]; butterfly_chain: string[] }>;
  watchlist_items: Array<{ symbol: string; reason: string; direction: string }>;
  bias_warning: string | null;
  ai_analysis: string | null;
};

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/briefing?date=${selectedDate}`);
    if (res.ok) {
      const data = await res.json();
      setBriefing(data.data);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadBriefing(); }, [loadBriefing]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="每日晨报"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '每日晨报' },
        ]}
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        }
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {loading ? (
          <LoadingState />
        ) : !briefing ? (
          <EmptyState
            icon={<Sun className="w-5 h-5 text-text-tertiary" />}
            title="今日晨报尚未生成"
            description="添加持仓后，系统将在每天早上自动生成个性化晨报"
            action={
              <Link href="/portfolio" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors">
                添加持仓
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Headline */}
            <div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-3">
                <Sun className="w-3.5 h-3.5" />
                <span>{new Date(briefing.briefing_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary leading-tight">{briefing.headline}</h2>
            </div>

            {/* Bias Warning */}
            {briefing.bias_warning && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-300 mb-1">认知偏差提醒</div>
                  <div className="text-sm text-amber-200">{briefing.bias_warning}</div>
                </div>
              </div>
            )}

            {/* Portfolio */}
            {briefing.portfolio_summary.holdings && briefing.portfolio_summary.holdings.length > 0 && (
              <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">持仓快报</h3>
                  {briefing.portfolio_summary.total_change_pct != null && (
                    <span className={`text-lg font-bold ${briefing.portfolio_summary.total_change_pct >= 0 ? 'text-signal-up' : 'text-signal-down'}`}>
                      {briefing.portfolio_summary.total_change_pct >= 0 ? '+' : ''}{briefing.portfolio_summary.total_change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {briefing.portfolio_summary.holdings.map((h) => (
                    <div key={h.symbol} className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary">{h.symbol}</span>
                        {h.name && <span className="text-xs text-text-tertiary">{h.name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {h.news && <span className="text-xs text-text-tertiary max-w-[200px] truncate">{h.news}</span>}
                        {h.change_pct != null && (
                          <span className={`text-sm font-mono font-semibold ${h.change_pct >= 0 ? 'text-signal-up' : 'text-signal-down'}`}>
                            {h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Events */}
            {briefing.top_events.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">今日要事</h3>
                <div className="space-y-3">
                  {briefing.top_events.map((event, i) => (
                    <div key={i} className="p-5 rounded-xl bg-surface-1 border border-border-default">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          event.impact === 'bullish' ? 'bg-signal-up-bg text-signal-up' :
                          event.impact === 'bearish' ? 'bg-signal-down-bg text-signal-down' :
                          'bg-surface-2 text-text-tertiary'
                        }`}>
                          {event.impact === 'bullish' ? '利好' : event.impact === 'bearish' ? '利空' : '中性'}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">{event.title}</span>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">{event.summary}</p>
                      {event.butterfly_chain.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-text-tertiary">传导链：</span>
                          {event.butterfly_chain.map((node, j) => (
                            <span key={j} className="flex items-center gap-1">
                              <span className="text-xs px-2 py-0.5 bg-surface-2 border border-border-default rounded text-text-secondary">{node}</span>
                              {j < event.butterfly_chain.length - 1 && <span className="text-text-tertiary">→</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {briefing.ai_analysis && (
              <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
                <h3 className="text-sm font-semibold text-text-primary mb-3">AI 分析</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{briefing.ai_analysis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
