import { createClient } from '@/lib/supabase/server';
import { normalizeTags } from '@/lib/markdown';
import type { PostListItem } from '@/types';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight, Search } from 'lucide-react';

export const revalidate = 60;

export default async function PostsPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, tags, sentiment, related_tickers')
    .order('published_at', { ascending: false })
    .limit(50);

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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-8 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-neutral-400 hover:text-neutral-600 text-xs">首页</Link>
          <ChevronRight className="w-3 h-3 text-neutral-200" />
          <h1 className="text-sm font-semibold text-neutral-900">深度研究</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100">
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-400">搜索文章...</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-8">
          <div>
            <span className="text-2xl font-bold text-neutral-900">{items.length}</span>
            <span className="text-sm text-neutral-400 ml-1.5">篇研究</span>
          </div>
          <div className="h-6 w-px bg-neutral-100" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-neutral-500">{items.filter(i => i.sentiment === 'bullish').length} 看多</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-neutral-500">{items.filter(i => i.sentiment === 'bearish').length} 看空</span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1">
          {items.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.slug}`}
              className="group flex items-start gap-5 p-5 rounded-xl hover:bg-white hover:border-neutral-200 hover:shadow-sm border border-transparent transition-all duration-200"
            >
              {/* Sentiment Indicator */}
              <div className="shrink-0 mt-0.5">
                {post.sentiment === 'bullish' ? (
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                  </div>
                ) : post.sentiment === 'bearish' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <div className="w-3 h-0.5 bg-neutral-400 rounded" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">{tag}</span>
                  ))}
                  {post.is_premium && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pro</span>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-neutral-900 mb-1.5 group-hover:text-blue-600 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-[13px] text-neutral-500 line-clamp-1 mb-2">
                  {post.summary_tldr}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400">
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
                          <span key={t} className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px] font-mono">{t}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-neutral-200 group-hover:text-neutral-400 shrink-0 mt-2 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
