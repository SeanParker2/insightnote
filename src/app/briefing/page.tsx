'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Sun, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';

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
      <header className="h-14 flex items-center justify-between px-8 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600">首页</Link>
          <ChevronRight className="w-3 h-3 text-neutral-200" />
          <h1 className="text-sm font-semibold text-neutral-900">每日晨报</h1>
        </div>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 rounded-lg border border-neutral-200 px-3 text-xs" />
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-20 text-neutral-400 text-sm">加载中...</div>
        ) : !briefing ? (
          <div className="text-center py-20">
            <Sun className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">今日晨报尚未生成</h2>
            <p className="text-sm text-neutral-500 mb-6">添加持仓后，系统将在每天早上自动生成个性化晨报</p>
            <Link href="/portfolio" className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors">
              添加持仓
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Headline */}
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-3">
                <Sun className="w-3.5 h-3.5" />
                <span>{new Date(briefing.briefing_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 leading-tight">{briefing.headline}</h2>
            </div>

            {/* Bias Warning */}
            {briefing.bias_warning && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-700 mb-1">认知偏差提醒</div>
                  <div className="text-sm text-amber-600">{briefing.bias_warning}</div>
                </div>
              </div>
            )}

            {/* Portfolio */}
            {briefing.portfolio_summary.holdings && briefing.portfolio_summary.holdings.length > 0 && (
              <div className="p-6 rounded-xl bg-white border border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-900">持仓快报</h3>
                  {briefing.portfolio_summary.total_change_pct != null && (
                    <span className={`text-lg font-bold ${briefing.portfolio_summary.total_change_pct >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {briefing.portfolio_summary.total_change_pct >= 0 ? '+' : ''}{briefing.portfolio_summary.total_change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {briefing.portfolio_summary.holdings.map((h) => (
                    <div key={h.symbol} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-neutral-900">{h.symbol}</span>
                        {h.name && <span className="text-xs text-neutral-400">{h.name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {h.news && <span className="text-xs text-neutral-400 max-w-[200px] truncate">{h.news}</span>}
                        {h.change_pct != null && (
                          <span className={`text-sm font-mono font-semibold ${h.change_pct >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
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
                <h3 className="text-sm font-semibold text-neutral-900 mb-4">今日要事</h3>
                <div className="space-y-3">
                  {briefing.top_events.map((event, i) => (
                    <div key={i} className="p-5 rounded-xl bg-white border border-neutral-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          event.impact === 'bullish' ? 'bg-red-50 text-red-600' :
                          event.impact === 'bearish' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-neutral-100 text-neutral-500'
                        }`}>
                          {event.impact === 'bullish' ? '利好' : event.impact === 'bearish' ? '利空' : '中性'}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900">{event.title}</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-3">{event.summary}</p>
                      {event.butterfly_chain.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-neutral-400">传导链：</span>
                          {event.butterfly_chain.map((node, j) => (
                            <span key={j} className="flex items-center gap-1">
                              <span className="text-xs px-2 py-0.5 bg-neutral-50 border border-neutral-100 rounded text-neutral-600">{node}</span>
                              {j < event.butterfly_chain.length - 1 && <span className="text-neutral-200">→</span>}
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
              <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">AI 分析</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{briefing.ai_analysis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
