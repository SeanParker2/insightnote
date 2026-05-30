import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SecurePostDetail, Prediction } from '@/types';
import { pickFirstString, summarizeContent, normalizeTags } from '@/lib/markdown';
import { formatDateCN, isSubscriptionActive } from '@/lib/utils';
import { MarkdownContent } from '@/components/post/MarkdownContent';
import { PostTouchpoints } from '@/components/analytics/PostTouchpoints';
import { ReadingTracker } from '@/components/analytics/ReadingTracker';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { ShareButton } from '@/components/post/ShareButton';
import { VoteControl } from '@/components/community/VoteControl';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Building2, Calendar, ChevronLeft, GitBranch } from 'lucide-react';

const POST_FIELDS = 'id, slug, title, summary_tldr, content_mdx, is_premium, published_at, source_institution, source_date, tags, sentiment, related_tickers, difficulty, success_rate, created_at, updated_at';

type PostRouteParams = { slug: string } | Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PostRouteParams }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('posts').select('title, summary_tldr').eq('slug', slug).maybeSingle();
  if (!data) return { title: '文章未找到' };
  return { title: `${data.title} | InsightNote`, description: data.summary_tldr ?? '' };
}

export default async function PostPage({ params }: { params: PostRouteParams }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch post directly
  const { data: row, error } = await supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !row) notFound();

  // Get user info
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  let isProActive = false;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_end_date, is_admin')
      .eq('id', user.id)
      .maybeSingle();
    isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);
    isAdmin = Boolean(profile?.is_admin);
  }

  // Build post
  const post: SecurePostDetail = {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    content_mdx: typeof row.content_mdx === 'string' ? row.content_mdx : '',
    is_unlocked: true,
    is_premium: Boolean(row.is_premium),
    published_at: row.published_at,
    source_institution: row.source_institution ?? null,
    source_date: row.source_date ?? null,
    tags: normalizeTags(row.tags),
    sentiment: row.sentiment ?? null,
    related_tickers: normalizeTags(row.related_tickers),
    difficulty: row.difficulty ?? null,
    success_rate: row.success_rate ?? null,
    predictions: [],
    butterfly_nodes: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Fetch predictions
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, post_id, symbol, direction, start_price, target_price, timeframe_days, status, created_at')
    .eq('post_id', post.id)
    .order('created_at', { ascending: false });
  if (predictions?.length) post.predictions = predictions as Prediction[];

  const publishedAt = new Date(post.published_at);
  const unlockedByAge = publishedAt.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;
  const canAccess = isAdmin || !post.is_premium || isProActive || unlockedByAge;
  const tags = Array.isArray(post.tags) ? post.tags : [];

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: post.summary_tldr,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: post.source_institution ?? 'InsightNote' },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PostTouchpoints slug={post.slug} isPremium={post.is_premium} isUnlocked={canAccess} />
      <ReadingTracker postId={post.id} />

      {/* Top Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/posts" className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> 返回列表
          </Link>
          <div className="flex items-center gap-2">
            <ShareButton slug={post.slug} title={post.title} className="text-xs text-neutral-500 hover:text-neutral-900" />
            <VoteControl postId={post.id} />
          </div>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-10">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          {post.sentiment && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              post.sentiment === 'bullish' ? 'bg-red-50 text-red-600' :
              post.sentiment === 'bearish' ? 'bg-emerald-50 text-emerald-600' :
              'bg-neutral-100 text-neutral-500'
            }`}>
              {post.sentiment === 'bullish' ? <ArrowUpRight className="w-3 h-3" /> :
               post.sentiment === 'bearish' ? <ArrowDownRight className="w-3 h-3" /> : null}
              {post.sentiment === 'bullish' ? '看多' : post.sentiment === 'bearish' ? '看空' : '中性'}
            </span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="text-xs text-neutral-400">{tag}</span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 leading-tight mb-6 tracking-tight">
          {post.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-900">{post.source_institution ?? 'InsightNote'}</div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {post.source_date ? formatDateCN(post.source_date) : formatDateCN(post.published_at)}
              </div>
            </div>
          </div>
          {post.related_tickers.length > 0 && (
            <div className="flex gap-1.5 ml-auto">
              {post.related_tickers.map((t) => (
                <span key={t} className="px-2 py-1 bg-neutral-50 border border-neutral-100 rounded-md text-xs font-mono text-neutral-600">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* TL;DR */}
        <div className="mb-10 p-6 rounded-xl bg-blue-50 border border-blue-100">
          <div className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wider">核心要点</div>
          <p className="text-base text-neutral-800 leading-relaxed">{post.summary_tldr || '暂无摘要'}</p>
        </div>

        {/* Content */}
        <div className={`relative ${!canAccess ? 'max-h-[500px] overflow-hidden' : ''}`}>
          <div className="prose prose-neutral prose-lg max-w-none">
            <MarkdownContent content={post.content_mdx || ''} />
          </div>

          {!canAccess && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-20 pb-8">
              <div className="max-w-md mx-auto text-center p-8 rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-100/50">
                <h3 className="text-xl font-bold text-neutral-900 mb-2">此内容为 Pro 专享</h3>
                <p className="text-sm text-neutral-500 mb-6">开通 Pro 立即解锁，或等待 30 天后自动解锁</p>
                <TrackedLink
                  href={user ? '/pricing' : `/login?next=${encodeURIComponent(`/posts/${slug}`)}`}
                  eventName={user ? 'upgrade_click' : 'login_click'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  {user ? '查看开通方式' : '登录后解锁'}
                </TrackedLink>
              </div>
            </div>
          )}
        </div>

        {/* Butterfly Link */}
        <div className="mt-12 p-6 rounded-xl bg-neutral-50 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">蝴蝶效应分析</h3>
              <p className="text-xs text-neutral-500">探索事件的因果传导链路</p>
            </div>
            <TrackedLink
              href={`/tools/butterfly?slug=${encodeURIComponent(post.slug)}`}
              eventName="open_butterfly"
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" /> 查看图谱
            </TrackedLink>
          </div>
        </div>
      </article>
    </div>
  );
}
