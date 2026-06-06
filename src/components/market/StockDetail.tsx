'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Newspaper } from 'lucide-react';
import type { Quote, Financials, NewsItem } from '@/lib/data-provider/types';
import { KlineChart } from '@/components/charts/KlineChart';
import { LoadingState } from '@/components/ui/LoadingState';

interface StockDetailProps {
  symbol: string;
}

export function StockDetail({ symbol }: StockDetailProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'financials' | 'news'>('chart');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quoteRes, finRes, newsRes] = await Promise.allSettled([
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&type=quote`).then(r => r.json()),
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&type=financials`).then(r => r.json()),
        fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&type=news&limit=5`).then(r => r.json()),
      ]);

      if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) setQuote(quoteRes.value.data);
      if (finRes.status === 'fulfilled' && finRes.value.ok) setFinancials(finRes.value.data);
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) setNews(newsRes.value.data);
    } catch (error) {
      console.error('Failed to load stock detail:', error);
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState />;

  const isUp = (quote?.change ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      {quote && (
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{quote.symbol}</h1>
              <span className="text-sm text-text-tertiary">{quote.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-text-primary tabular-nums">{quote.price.toFixed(2)}</span>
              <div className="flex items-center gap-1.5">
                {isUp ? <TrendingUp className="w-4 h-4 text-signal-up" /> : <TrendingDown className="w-4 h-4 text-signal-down" />}
                <span className={`text-lg font-semibold ${isUp ? 'text-signal-up' : 'text-signal-down'}`}>
                  {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between"><span className="text-text-tertiary">开盘</span><span className="text-text-secondary tabular-nums">{quote.open.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-tertiary">最高</span><span className="text-text-secondary tabular-nums">{quote.high.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-tertiary">最低</span><span className="text-text-secondary tabular-nums">{quote.low.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-tertiary">昨收</span><span className="text-text-secondary tabular-nums">{quote.previousClose.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-tertiary">成交量</span><span className="text-text-secondary tabular-nums">{(quote.volume / 10000).toFixed(0)}万</span></div>
            {quote.marketCap && <div className="flex justify-between"><span className="text-text-tertiary">市值</span><span className="text-text-secondary tabular-nums">{(quote.marketCap / 100000000).toFixed(0)}亿</span></div>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {[
          { key: 'chart' as const, label: 'K线图', icon: Activity },
          { key: 'financials' as const, label: '基本面', icon: BarChart3 },
          { key: 'news' as const, label: '相关新闻', icon: Newspaper },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-brand text-brand-light'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'chart' && (
        <KlineChart symbol={symbol} />
      )}

      {activeTab === 'financials' && financials && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '市盈率(TTM)', value: financials.peRatio?.toFixed(2) ?? '-' },
            { label: '市净率', value: financials.pbRatio?.toFixed(2) ?? '-' },
            { label: '每股收益', value: financials.eps?.toFixed(2) ?? '-' },
            { label: '股息率', value: financials.dividendYield ? `${(financials.dividendYield * 100).toFixed(2)}%` : '-' },
            { label: '52周最高', value: financials.fiftyTwoWeekHigh?.toFixed(2) ?? '-' },
            { label: '52周最低', value: financials.fiftyTwoWeekLow?.toFixed(2) ?? '-' },
            { label: '市值', value: financials.marketCap ? `${(financials.marketCap / 100000000).toFixed(0)}亿` : '-' },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-xl bg-surface-1 border border-border-default">
              <div className="text-[11px] text-text-tertiary mb-1">{label}</div>
              <div className="text-lg font-semibold text-text-primary tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-3">
          {news.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-tertiary">暂无相关新闻</div>
          ) : (
            news.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-text-tertiary">{item.source}</span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{new Date(item.publishedAt).toLocaleDateString('zh-CN')}</span>
                  {item.sentiment && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.sentiment === 'bullish' ? 'bg-signal-up-bg text-signal-up' :
                      item.sentiment === 'bearish' ? 'bg-signal-down-bg text-signal-down' :
                      'bg-surface-2 text-text-tertiary'
                    }`}>
                      {item.sentiment === 'bullish' ? '利好' : item.sentiment === 'bearish' ? '利空' : '中性'}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1">{item.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-2">{item.summary}</p>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
