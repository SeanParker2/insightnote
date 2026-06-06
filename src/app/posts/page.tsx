import { createClient } from '@/lib/supabase/server';
import { normalizeTags } from '@/lib/markdown';
import type { PostListItem } from '@/types';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export const revalidate = 60;

const PAGE_SIZE = 20;

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ page?: string; sentiment?: string; tag?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sentiment = params.sentiment || '';
  const tag = params.tag || '';
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, tags, sentiment, related_tickers', { count: 'exact' })
    .order('published_at', { ascending: false });

  if (sentiment && ['bullish', 'bearish', 'neutral'].includes(sentiment)) {
    query = query.eq('sentiment', sentiment);
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data: posts, count } = await query
    .range(offset, offset + PAGE_SIZE - 1);

  const items: PostListItem[] = (posts ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    is_premium: Boolean(row.is_premium),
    published_at: row.published_at,
    source_institution: row.source_institution ?? null,
    source_date: null,
    tags: normalizeTags(row.tags),
    sentiment: (row.sentiment as PostListItem['sentiment']) ?? null,
    related_tickers: normalizeTags(row.related_tickers),
    difficulty: null,
    success_rate: null,
  }));

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildUrl(newPage: number, newSentiment?: string, newTag?: string) {
    const params = new URLSearchParams();
    if (newPage > 1) params.set('page', String(newPage));
    if (newSentiment) params.set('sentiment', newSentiment);
    else if (sentiment && newSentiment === undefined) params.set('sentiment', sentiment);
    if (newTag) params.set('tag', newTag);
    else if (tag && newTag === undefined) params.set('tag', tag);
    const qs = params.toString();
    return `/posts${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="深度研究"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '深度研究' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div>
            <span className="text-2xl font-bold text-text-primary">{count ?? items.length}</span>
            <span className="text-sm text-text-tertiary ml-1.5">篇研究</span>
          </div>
          <div className="h-6 w-px bg-border-default" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-signal-up" />
            <span className="text-xs text-text-secondary">{items.filter(i => i.sentiment === 'bullish').length} 看多</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-signal-down" />
            <span className="text-xs text-text-secondary">{items.filter(i => i.sentiment === 'bearish').length} 看空</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Link
            href={buildUrl(1, '', '')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              !sentiment ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            }`}
          >
            全部
          </Link>
          <Link
            href={buildUrl(1, 'bullish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              sentiment === 'bullish' ? 'bg-signal-up text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            }`}
          >
            看多
          </Link>
          <Link
            href={buildUrl(1, 'bearish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              sentiment === 'bearish' ? 'bg-signal-down text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            }`}
          >
            看空
          </Link>
          <Link
            href={buildUrl(1, 'neutral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              sentiment === 'neutral' ? 'bg-text-tertiary text-white' : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
            }`}
          >
            中性
          </Link>
        </div>

        {/* List */}
        <div className="space-y-1">
          {items.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="group flex items-start gap-5 p-5 rounded-xl hover:bg-surface-2 border border-transparent transition-all duration-200"
            >
              {/* Sentiment Icon */}
              <div className="shrink-0 mt-0.5">
                {post.sentiment === 'bullish' ? (
                  <div className="w-8 h-8 rounded-lg bg-signal-up-bg flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-signal-up" />
                  </div>
                ) : post.sentiment === 'bearish' ? (
                  <div className="w-8 h-8 rounded-lg bg-signal-down-bg flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-signal-down" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                    <div className="w-3 h-0.5 bg-text-tertiary rounded" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{tag}</span>
                  ))}
                  {post.is_premium && (
                    <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Pro</span>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-1.5 group-hover:text-brand-light transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-[13px] text-text-secondary line-clamp-1 mb-2">
                  {post.summary_tldr}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                  <span>{post.source_institution ?? 'InsightNote'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(post.published_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                  </span>
                  {post.related_tickers.length > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex gap-1">
                        {post.related_tickers.slice(0, 3).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px] font-mono text-text-secondary">{t}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary shrink-0 mt-2 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors text-xs"
              >
                <ChevronLeft className="w-3 h-3" />
                上一页
              </Link>
            )}
            <span className="text-xs text-text-tertiary px-3">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl(page + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors text-xs"
              >
                下一页
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
