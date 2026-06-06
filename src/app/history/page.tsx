'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Star, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type HistoryItem = {
  id: string;
  post_id: string;
  read_at: string;
  title: string;
  slug?: string;
  summary?: string;
  sentiment?: string;
};

type FavoriteItem = {
  id: string;
  post_id: string;
  favorited_at: string;
  title: string;
  slug?: string;
  summary?: string;
  sentiment?: string;
};

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [favRes, histRes] = await Promise.all([
        fetch('/api/favorites?type=favorites&limit=50'),
        fetch('/api/favorites?type=history&limit=50'),
      ]);

      if (favRes.ok) {
        const favData = await favRes.json();
        if (favData.ok) setFavorites(favData.data);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.ok) setHistory(histData.data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function removeFavorite(id: string) {
    try {
      await fetch(`/api/favorites?id=${id}`, { method: 'DELETE' });
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch {}
  }

  const items = activeTab === 'favorites' ? favorites : history;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="我的收藏"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '我的收藏' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-brand text-white'
                : 'text-text-tertiary hover:bg-surface-2'
            }`}
          >
            <Star className="w-4 h-4" />
            收藏夹 ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-brand text-white'
                : 'text-text-tertiary hover:bg-surface-2'
            }`}
          >
            <Clock className="w-4 h-4" />
            阅读历史 ({history.length})
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState
            icon={activeTab === 'favorites' ? <Star className="w-5 h-5 text-text-tertiary" /> : <Clock className="w-5 h-5 text-text-tertiary" />}
            title={activeTab === 'favorites' ? '暂无收藏' : '暂无阅读记录'}
            description={activeTab === 'favorites' ? '在文章详情页点击收藏按钮添加' : '浏览文章后将自动记录'}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-surface-1 border border-border-default hover:border-border-strong transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Sentiment Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.sentiment === 'bullish' ? (
                      <div className="w-8 h-8 rounded-lg bg-signal-up-bg flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-signal-up" />
                      </div>
                    ) : item.sentiment === 'bearish' ? (
                      <div className="w-8 h-8 rounded-lg bg-signal-down-bg flex items-center justify-center">
                        <ArrowDownRight className="w-4 h-4 text-signal-down" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-text-tertiary" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={item.slug ? `/posts/${item.slug}` : '#'}
                      className="group"
                    >
                      <h3 className="text-[15px] font-semibold text-text-primary mb-1.5 group-hover:text-brand-light transition-colors">
                        {item.title}
                      </h3>
                    </Link>
                    {item.summary && (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                        {item.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(activeTab === 'favorites' ? (item as FavoriteItem).favorited_at : (item as HistoryItem).read_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === 'favorites' && (
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="p-2 text-text-tertiary hover:text-signal-up transition-colors"
                      title="取消收藏"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
