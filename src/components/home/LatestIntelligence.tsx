'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { PostListItem } from '@/types';
import { Playfair_Display } from '@/lib/fonts';
import { Lock } from 'lucide-react';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { formatDateCN, formatTimeCN, uiTerms } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface LatestIntelligenceProps {
  posts: PostListItem[];
}

export const LatestIntelligence = memo(({ posts }: LatestIntelligenceProps) => {
  const [items, setItems] = useState<PostListItem[]>(posts ?? []);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const hasPosts = items.length > 0;

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    return formatTimeCN(lastUpdatedAt);
  }, [lastUpdatedAt]);

  const refresh = useCallback(async (reason: 'poll' | 'manual' | 'realtime') => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/posts?limit=20', { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; data: PostListItem[]; updated_at?: string }
        | { ok: false; error?: { code?: string | null; message?: string | null } }
        | null;

      if (!res.ok || !json || (json as any).ok !== true) {
        const message =
          (json as any)?.error?.message || `请求失败（status=${res.status}）`;
        setLoadError(message);
        trackEvent('home_posts_refresh_failed', { reason, status: res.status, message });
        return;
      }

      setItems(Array.isArray((json as any).data) ? (json as any).data : []);
      const updatedAtRaw = typeof (json as any).updated_at === 'string' ? (json as any).updated_at : null;
      setLastUpdatedAt(updatedAtRaw ? new Date(updatedAtRaw) : new Date());
      trackEvent('home_posts_refreshed', { reason, count: (json as any).data?.length ?? null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'network_error';
      setLoadError(message);
      trackEvent('home_posts_refresh_failed', { reason, status: 'network', message });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setItems(posts ?? []);
  }, [posts]);

  useEffect(() => {
    refresh('poll');
    const id = window.setInterval(() => refresh('poll'), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    try {
      const supabase = createSupabaseClient();
      const channel = supabase
        .channel('posts-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          refresh('realtime');
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      trackEvent('home_posts_realtime_unavailable', {});
      return;
    }
  }, [refresh]);

  if (!hasPosts) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        {loadError ? `加载失败：${loadError}` : '暂无更多文章'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center pb-2 border-b border-black">
        <div className="flex flex-col">
          <h3 className="font-bold text-sm tracking-widest uppercase">{uiTerms.latestIntelligence}</h3>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => void refresh('manual')}
              disabled={refreshing}
              className="underline underline-offset-2 disabled:opacity-50"
            >
              {refreshing ? '刷新中…' : '刷新'}
            </button>
            {lastUpdatedLabel && <span>更新于 {lastUpdatedLabel}</span>}
            {loadError && <span className="text-red-600">{loadError}</span>}
          </div>
        </div>
        <TrackedLink
          href="/posts"
          className="text-xs font-bold text-amber-500 hover:text-brand-900 transition-colors"
          eventName="home_view_all_posts_click"
        >
          {uiTerms.viewAll} →
        </TrackedLink>
      </div>

      {items.map((post) => (
        <TrackedLink
          href={`/posts/${post.slug}`}
          key={post.id}
          eventName="home_latest_post_click"
          eventPayload={{ slug: post.slug, is_premium: post.is_premium, source_institution: post.source_institution }}
        >
          <div 
            className={`group cursor-pointer ${post.is_premium ? 'opacity-90 hover:opacity-100 transition duration-300' : ''}`}
          >
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3 text-right pt-1">
                <span className="block text-xs font-bold text-slate-900">
                  {formatDateCN(post.published_at)}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <span className="block text-[10px] text-slate-400 uppercase mt-1">
                    {post.tags[0]}
                  </span>
                )}
                {post.is_premium && (
                  <span className="inline-block mt-1 border border-brand-900 text-brand-900 text-[9px] font-bold px-1 py-px uppercase">
                    {uiTerms.proOnly}
                  </span>
                )}
              </div>
              
              <div className="col-span-9 border-l border-solid border-gray-200 pl-6 relative">
                {!post.is_premium && (
                  <div className="absolute -left-[3px] top-2 w-[5px] h-[5px] rounded-full bg-slate-300 group-hover:bg-amber-500 transition"></div>
                )}
                
                <h4 className={`${playfair.className} text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-900/80 flex items-center gap-2`}>
                  {post.is_premium && <Lock className="w-4 h-4 text-slate-400" />}
                  {post.title}
                </h4>
                
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                  {post.summary_tldr || '暂无摘要'}
                </p>
              </div>
            </div>
          </div>
        </TrackedLink>
      ))}
    </div>
  );
});

LatestIntelligence.displayName = 'LatestIntelligence';
