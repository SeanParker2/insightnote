import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SecurePostDetail, Prediction } from '@/types';
import { normalizeTags } from '@/lib/markdown';
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

  const { data: row, error } = await supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !row) notFound();

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

  const post: SecurePostDetail = {
    id: String(row.id), slug: String(row.slug), title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    content_mdx: typeof row.content_mdx === 'string' ? row.content_mdx : '',
    is_unlocked: true, is_premium: Boolean(row.is_premium),
    published_at: row.published_at, source_institution: row.source_institution ?? null,
    source_date: row.source_date ?? null, tags: normalizeTags(row.tags),
    sentiment: row.sentiment ?? null, related_tickers: normalizeTags(row.related_tickers),
    difficulty: row.difficulty ?? null, success_rate: row.success_rate ?? null,
    predictions: [], butterfly_nodes: [],
    created_at: row.created_at, updated_at: row.updated_at,
  };

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

  // Truncate content for non-premium users (security: don't send full content to client)
  const secureContent = canAccess ? post.content_mdx : post.content_mdx.substring(0, 200) + '...';
  post.content_mdx = secureContent;

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: post.summary_tldr,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: post.source_institution ?? 'InsightNote' },
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PostTouchpoints slug={post.slug} isPremium={post.is_premium} isUnlocked={canAccess} />
      <ReadingTracker postId={post.id} />

      {/* Top Nav */}
      <nav className="sticky top-0 z-20 h-12 flex items-center justify-between px-6 lg:px-8 border-b border-border-default bg-surface-0/80 backdrop-blur-sm">
        <Link href="/posts" className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> 返回列表
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton slug={post.slug} title={post.title} className="text-xs text-text-tertiary hover:text-text-secondary" />
          <VoteControl postId={post.id} />
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 lg:px-8 py-10 pb-24 lg:pb-10">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          {post.sentiment && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              post.sentiment === 'bullish' ? 'bg-signal-up-bg text-signal-up' :
              post.sentiment === 'bearish' ? 'bg-signal-down-bg text-signal-down' :
              'bg-surface-2 text-text-tertiary'
            }`}>
              {post.sentiment === 'bullish' ? <ArrowUpRight className="w-3 h-3" /> :
               post.sentiment === 'bearish' ? <ArrowDownRight className="w-3 h-3" /> : null}
              {post.sentiment === 'bullish' ? '看多' : post.sentiment === 'bearish' ? '看空' : '中性'}
            </span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="text-xs text-text-tertiary">{tag}</span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-6 tracking-tight">
          {post.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border-default">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{post.source_institution ?? 'InsightNote'}</div>
              <div className="text-[11px] text-text-tertiary flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {post.source_date ? formatDateCN(post.source_date) : formatDateCN(post.published_at)}
              </div>
            </div>
          </div>
          {post.related_tickers.length > 0 && (
            <div className="flex gap-1.5 ml-auto">
              {post.related_tickers.map((t) => (
                <span key={t} className="px-2 py-1 bg-surface-2 border border-border-default rounded-md text-xs font-mono text-text-secondary">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* TL;DR */}
        <div className="mb-10 p-6 rounded-xl bg-brand/5 border border-brand/20">
          <div className="text-xs font-semibold text-brand-light mb-2 uppercase tracking-wider">核心要点</div>
          <p className="text-base text-text-primary leading-relaxed">{post.summary_tldr || '暂无摘要'}</p>
        </div>

        {/* Content */}
        <div className={`relative ${!canAccess ? 'max-h-[500px] overflow-hidden' : ''}`}>
          <div className="prose-dark">
            <MarkdownContent content={post.content_mdx || ''} />
          </div>

          {!canAccess && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-0 via-surface-0/95 to-transparent pt-20 pb-8">
              <div className="max-w-md mx-auto text-center p-8 rounded-2xl border border-border-default bg-surface-1">
                <h3 className="text-xl font-bold text-text-primary mb-2">此内容为 Pro 专享</h3>
                <p className="text-sm text-text-secondary mb-6">开通 Pro 立即解锁，或等待 30 天后自动解锁</p>
                <TrackedLink
                  href={user ? '/pricing' : `/login?next=${encodeURIComponent(`/posts/${slug}`)}`}
                  eventName={user ? 'upgrade_click' : 'login_click'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors"
                >
                  {user ? '查看开通方式' : '登录后解锁'}
                </TrackedLink>
              </div>
            </div>
          )}
        </div>

        {/* Butterfly Link */}
        <div className="mt-12 p-6 rounded-xl bg-surface-1 border border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">蝴蝶效应分析</h3>
              <p className="text-xs text-text-tertiary">探索事件的因果传导链路</p>
            </div>
            <TrackedLink
              href={`/tools/butterfly?slug=${encodeURIComponent(post.slug)}`}
              eventName="open_butterfly"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" /> 查看图谱
            </TrackedLink>
          </div>
        </div>
      </article>
    </div>
  );
}
