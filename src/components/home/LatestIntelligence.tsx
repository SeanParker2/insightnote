'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { PostListItem } from '@/types';
import { Playfair_Display } from '@/lib/fonts';
import { Lock, ArrowUpRight } from 'lucide-react';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { formatDateCN, formatTimeCN, uiTerms, cn } from '@/lib/utils';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3 uppercase">
           <span className="w-1.5 h-6 bg-orange-500"></span>
           {uiTerms.latestIntelligence}
        </h3>
        {lastUpdatedLabel && (
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
            UPDATED: {lastUpdatedLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
        {items.map((post, index) => {
          const isFeatured = index === 0;
          const isWide = index === 1 || index === 2;
          
          return (
            <article 
                key={post.id} 
                className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-card transition-all duration-300 hover:border-orange-500/50 hover:shadow-xl",
                    isFeatured ? "md:col-span-2 md:row-span-2 min-h-[400px]" : "col-span-1",
                    isWide && !isFeatured ? "md:col-span-2" : ""
                )}
            >
                {/* Background Image / Gradient */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/images/tech-thumb.jpg" 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-6">
                     {/* Tags & Meta */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                         {post.is_premium && (
                            <span className="bg-brand-gold/20 text-brand-gold text-[10px] px-2 py-0.5 rounded-full border border-brand-gold/30 flex items-center gap-1 backdrop-blur-md">
                                <Lock className="w-3 h-3" /> VIP
                            </span>
                        )}
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 backdrop-blur-md">
                            {post.source_institution || 'InsightNote'}
                        </span>
                    </div>

                    <h4 className={cn(
                        "font-bold leading-tight mb-2 text-foreground group-hover:text-primary transition-colors",
                        isFeatured ? "text-2xl md:text-3xl" : "text-lg"
                    )}>
                        <TrackedLink 
                            href={`/posts/${post.slug}`}
                            eventName="home_post_click"
                            eventPayload={{ slug: post.slug }}
                            className="before:absolute before:inset-0" 
                        >
                            {post.title}
                        </TrackedLink>
                    </h4>

                    {(isFeatured || isWide) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 text-balance">
                            {post.summary_tldr || '暂无摘要'}
                        </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-white/10 group-hover:border-primary/30 transition-colors">
                        <time dateTime={post.published_at instanceof Date ? post.published_at.toISOString() : post.published_at}>
                            {formatDateCN(post.published_at)}
                        </time>
                         <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
                    </div>
                </div>
            </article>
          );
        })}
      </div>
    </div>
  );
});

LatestIntelligence.displayName = 'LatestIntelligence';
