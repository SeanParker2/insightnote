'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type RecommendedArticle = {
  id: string;
  slug: string;
  title: string;
  summary_tldr: string;
  sentiment: string | null;
  tags: string[];
  related_tickers: string[];
  recommendation_score: number;
  reason: string;
};

export function RecommendedPosts() {
  const [recommendations, setRecommendations] = useState<RecommendedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = useCallback(async () => {
    try {
      const res = await fetch('/api/recommendations?limit=5');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.data ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="mt-8 p-6 rounded-xl border border-purple-200 bg-purple-50">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎯</span>
        <h2 className="text-sm font-bold text-purple-900">为你推荐</h2>
        <span className="text-[10px] text-purple-600">基于你的持仓和阅读偏好</span>
      </div>
      <div className="space-y-3">
        {recommendations.map((article) => (
          <Link
            key={article.id}
            href={`/posts/${article.slug}`}
            className="block p-4 rounded-lg border border-purple-100 bg-white hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-sm">{article.title}</span>
              {article.sentiment && (
                <Badge variant={article.sentiment === 'bullish' ? 'default' : article.sentiment === 'bearish' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {article.sentiment === 'bullish' ? '看多' : article.sentiment === 'bearish' ? '看空' : '中性'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 line-clamp-1">{article.summary_tldr}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-purple-600">{article.reason}</span>
                {article.related_tickers.slice(0, 3).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="感兴趣"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  👍
                </button>
                <button
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                  title="不感兴趣"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  👎
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
