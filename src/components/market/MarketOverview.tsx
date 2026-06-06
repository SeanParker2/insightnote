'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Search, Star, X } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Quote, SearchResult } from '@/lib/data-provider/types';

const DEFAULT_WATCHLIST = [
  { symbol: '000001.SS', name: '上证指数' },
  { symbol: '399001.SZ', name: '深证成指' },
  { symbol: '399006.SZ', name: '创业板指' },
  { symbol: 'AAPL', name: '苹果' },
  { symbol: 'NVDA', name: '英伟达' },
  { symbol: 'MSFT', name: '微软' },
  { symbol: 'GOOGL', name: '谷歌' },
  { symbol: 'TSLA', name: '特斯拉' },
  { symbol: 'BTC-USD', name: '比特币' },
  { symbol: 'ETH-USD', name: '以太坊' },
];

export function MarketOverview() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [watchlist, setWatchlist] = useState<Array<{ symbol: string; name: string }>>(DEFAULT_WATCHLIST);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
          setWatchlist(data.data);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    const symbols = watchlist.map(w => w.symbol).join(',');
    const res = await fetch(`/api/market/batch?symbols=${symbols}`);
    const data = await res.json();

    if (data.ok && data.data) {
      const items = Object.entries(data.data).map(([symbol, info]: [string, any]) => ({
        symbol,
        name: watchlist.find(w => w.symbol === symbol)?.name ?? symbol,
        price: info.price ?? 0,
        change: info.changePercent ?? 0,
        changePercent: info.changePercent ?? 0,
        open: 0, high: 0, low: 0, close: 0, previousClose: 0, volume: 0,
        timestamp: info.lastUpdated ?? new Date().toISOString(),
      }));
      setQuotes(items);
    }
    setLoading(false);
  }, [watchlist]);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);
  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  async function handleAddToWatchlist(symbol: string, name: string) {
    if (!isLoggedIn) return;
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        setWatchlist(data.data);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
  }

  async function handleRemoveFromWatchlist(symbol: string) {
    if (!isLoggedIn) return;
    const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) setWatchlist(data.data);
    }
  }

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(searchQuery)}&type=search&limit=5`);
      const data = await res.json();
      if (data.ok) setSearchResults(data.data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索股票、ETF、加密货币..."
          className="w-full h-10 pl-10 pr-4 bg-surface-2 border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border-default rounded-lg overflow-hidden z-20 shadow-lg">
            {searchResults.map(r => (
              <div
                key={r.symbol}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <Link
                  href={`/market?symbol=${encodeURIComponent(r.symbol)}`}
                  className="flex-1 min-w-0"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                >
                  <span className="text-sm font-medium text-text-primary">{r.symbol}</span>
                  <span className="text-xs text-text-tertiary ml-2">{r.name}</span>
                </Link>
                {isLoggedIn && (
                  <button
                    onClick={() => handleAddToWatchlist(r.symbol, r.name)}
                    className="p-1 text-text-tertiary hover:text-amber-400 transition-colors"
                    title="添加到自选"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">自选行情</h2>
          {isLoggedIn && <span className="text-[10px] text-text-tertiary">{watchlist.length}/20</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quotes.map(q => {
            const isUp = q.changePercent >= 0;
            return (
              <div
                key={q.symbol}
                className="p-4 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors relative group"
              >
                <Link href={`/market?symbol=${encodeURIComponent(q.symbol)}`} className="block">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{q.name}</div>
                      <div className="text-[11px] text-text-tertiary font-mono">{q.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-text-primary tabular-nums">{q.price.toFixed(2)}</div>
                      <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-signal-up' : 'text-signal-down'}`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </Link>
                {isLoggedIn && !DEFAULT_WATCHLIST.some(d => d.symbol === q.symbol) && (
                  <button
                    onClick={() => handleRemoveFromWatchlist(q.symbol)}
                    className="absolute top-2 right-2 p-1 text-text-tertiary hover:text-signal-up opacity-0 group-hover:opacity-100 transition-all"
                    title="移除自选"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
