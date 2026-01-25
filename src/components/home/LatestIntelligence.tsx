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
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h3 className="text-lg font-semibold tracking-tight">{uiTerms.latestIntelligence}</h3>
        {lastUpdatedLabel && (
          <span className="text-xs text-muted-foreground">
            更新于 {lastUpdatedLabel}
          </span>
        )}
      </div>

      <div className="grid gap-8">
        {items.map((post) => (
          <article key={post.id} className="group relative flex flex-col md:flex-row gap-6 items-start">
            {/* Thumbnail */}
            <div className="w-full md:w-48 aspect-video md:aspect-[4/3] relative rounded-lg overflow-hidden bg-muted flex-shrink-0">
               {/* Use random-like tech images or a placeholder if real image not available */}
               <img 
                 src="/images/tech-thumb.jpg" 
                 alt="" 
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
               />
               {post.is_premium && (
                 <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded border border-white/20 flex items-center gap-1">
                   <Lock className="w-3 h-3" />
                   <span>VIP</span>
                 </div>
               )}
            </div>

            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <span className="font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                   {post.source_institution || 'InsightNote'}
                </span>
                <span>•</span>
                <time dateTime={post.published_at instanceof Date ? post.published_at.toISOString() : post.published_at}>{formatDateCN(post.published_at)}</time>
              </div>

              <h4 className="text-xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                <TrackedLink 
                  href={`/posts/${post.slug}`}
                  eventName="home_post_click"
                  eventPayload={{ slug: post.slug }}
                >
                  {post.title}
                </TrackedLink>
              </h4>

              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                {post.summary_tldr || '暂无摘要'}
              </p>

              <div className="flex items-center gap-2">
                {post.tags?.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded hover:border-primary hover:text-primary transition-colors cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

LatestIntelligence.displayName = 'LatestIntelligence';
