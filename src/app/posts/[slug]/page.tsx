import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Playfair_Display } from '@/lib/fonts';
import { Calendar, GitBranch, User as UserIcon, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/post/MarkdownContent';
import { createClient } from '@/lib/supabase/server';
import { SecurePostDetail } from '@/types';
import Link from 'next/link';
import { PostTouchpoints } from '@/components/analytics/PostTouchpoints';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { ShareButton } from '@/components/post/ShareButton';
import { formatDateCN, isSubscriptionActive, uiTerms } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

function toPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[>#*_~=-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeContent(markdown: unknown) {
  if (typeof markdown !== 'string' || !markdown.trim()) return '';
  const text = toPlainText(markdown);
  if (!text) return '';
  return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text;
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === 'string');
}

type PostRouteParams = { slug: string } | Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PostRouteParams }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const primary = await supabase
    .from('posts')
    .select('title, summary_tldr')
    .eq('slug', slug)
    .maybeSingle();

  if (!primary.error && primary.data) {
    const description =
      typeof (primary.data as any).summary_tldr === 'string' ? (primary.data as any).summary_tldr : '';
    return {
      title: `${(primary.data as any).title} | InsightNote`,
      description,
    };
  }

  const isMissingSummary =
    primary.error?.code === '42703' ||
    (typeof primary.error?.message === 'string' && primary.error.message.includes('summary_tldr'));

  if (isMissingSummary) {
    const fallback = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!fallback.data) return { title: '文章未找到' };

    return {
      title: `${(fallback.data as any).title} | InsightNote`,
      description: pickFirstString(
        (fallback.data as any).summary_tldr,
        (fallback.data as any).summary,
        (fallback.data as any).tldr,
        (fallback.data as any).abstract,
        (fallback.data as any).description,
        (fallback.data as any).excerpt,
        summarizeContent(
          pickFirstString(
            (fallback.data as any).content_mdx,
            (fallback.data as any).content,
            (fallback.data as any).content_markdown,
            (fallback.data as any).content_md,
            (fallback.data as any).body,
          ),
        ),
      ),
    };
  }

  if (!primary.data) return { title: '文章未找到' };
  
  return {
    title: `${(primary.data as any).title} | InsightNote`,
    description: '',
  };
}

export default async function PostPage({ params }: { params: PostRouteParams }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, is_admin')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);
  const isAdmin = Boolean((profile as any)?.is_admin);

  let post: SecurePostDetail | null = null;

  const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('post-by-slug', {
    body: { slug },
  });

  if (!edgeError && edgeResult?.data) {
    post = edgeResult.data as SecurePostDetail;
  }

  if (!post) {
    const { data: rpcPost, error: rpcError } = await supabase.rpc('get_post_secure_by_slug', {
      slug_in: slug,
    });
    if (!rpcError && rpcPost) {
      post = rpcPost as SecurePostDetail;
    }
  }

  if (!post) {
    const { data: row, error: rowError } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (rowError) {
      const status = (rowError as any)?.status ?? null;
      if (status === 404) notFound();
      return (
        <div className="min-h-screen bg-white py-20">
          <div className="max-w-2xl mx-auto px-6">
            <h1 className={`${playfair.className} text-3xl font-bold text-slate-900`}>暂时无法加载文章</h1>
            <p className="mt-4 text-sm text-slate-600 break-words">
              {typeof rowError?.message === 'string' ? rowError.message : 'post_fetch_failed'}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <TrackedLink
                href="/posts"
                eventName="post_fetch_failed_to_posts_click"
                className="text-sm font-bold text-brand-900 hover:text-brand-gold transition-colors"
              >
                去文章列表
              </TrackedLink>
              <TrackedLink
                href="/"
                eventName="post_fetch_failed_to_home_click"
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                返回首页
              </TrackedLink>
            </div>
          </div>
        </div>
      );
    }

    if (!row) notFound();

    const rowAny = row as any;
    const isPremium = Boolean(rowAny.is_premium ?? rowAny.premium ?? rowAny.is_paid);
    const publishedAtRaw = rowAny.published_at ?? rowAny.created_at ?? null;
    const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
    const unlockedByAge =
      publishedAt ? publishedAt.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000 : false;

    const isUnlockedValue = isAdmin || !isPremium || isProActive || unlockedByAge;
    const summaryTldr =
      pickFirstString(
        rowAny.summary_tldr,
        rowAny.summary,
        rowAny.tldr,
        rowAny.abstract,
        rowAny.description,
        rowAny.excerpt,
        summarizeContent(
          pickFirstString(rowAny.content_mdx, rowAny.content, rowAny.content_markdown, rowAny.content_md, rowAny.body),
        ),
      );
    const content = pickFirstString(
      rowAny.content_mdx,
      rowAny.content,
      rowAny.content_markdown,
      rowAny.content_md,
      rowAny.body,
    );

    post = {
      ...(rowAny as any),
      summary_tldr: summaryTldr,
      content_mdx: content,
      is_unlocked: isUnlockedValue,
      butterfly_nodes: [],
      is_premium: isPremium,
      published_at: publishedAtRaw ?? new Date().toISOString(),
      source_institution: rowAny.source_institution ?? rowAny.institution ?? null,
      source_date: rowAny.source_date ?? null,
      tags: normalizeTags(rowAny.tags ?? rowAny.topics ?? rowAny.labels),
      created_at: rowAny.created_at ?? new Date().toISOString(),
      updated_at: rowAny.updated_at ?? new Date().toISOString(),
    } as SecurePostDetail;
  }

  if (!post) {
    notFound();
  }

  const publishedAtRaw = (post as any).published_at ?? null;
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
  const unlockedByAge =
    publishedAt && !Number.isNaN(publishedAt.getTime())
      ? publishedAt.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000
      : false;

  const canAccess = isAdmin || !post.is_premium || isProActive || unlockedByAge;
  const safeTags = Array.isArray((post as any).tags) ? ((post as any).tags as unknown[]) : [];
  const tags = safeTags.filter((tag): tag is string => typeof tag === 'string');
  const summaryText = typeof (post as any).summary_tldr === 'string' ? ((post as any).summary_tldr as string) : '';
  const loginHref = `/login?next=${encodeURIComponent(`/posts/${slug}`)}`;
  const pricingHref = `/pricing?next=${encodeURIComponent(`/posts/${slug}`)}`;

  return (
    <div className="min-h-screen bg-white pb-20">
      <PostTouchpoints slug={post.slug} isPremium={post.is_premium} isUnlocked={canAccess} />
      
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <TrackedLink
            href="/"
            className={`font-serif font-bold text-lg text-brand-900 truncate max-w-[50%] ${playfair.className} hover:text-brand-gold transition-colors`}
            eventName="post_back_home_click"
            eventPayload={{ slug: post.slug }}
          >
            ← 返回情报
          </TrackedLink>
          <div className="flex gap-2">
            <ShareButton
              slug={post.slug}
              title={post.title}
              className="h-8 inline-flex items-center justify-center rounded-md px-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-brand-900 hover:bg-slate-100 transition-colors"
            />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-brand-900 uppercase text-xs font-bold tracking-wider"
            >
              <TrackedLink
                href={`/tools/butterfly?slug=${encodeURIComponent(post.slug)}`}
                eventName="post_open_butterfly_click"
                eventPayload={{ slug: post.slug, placement: 'top_nav' }}
              >
                <GitBranch className="w-4 h-4 mr-2" /> 图谱
              </TrackedLink>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Main Content Column (70%) */}
        <main className="lg:col-span-8">
          
          {/* Header Section */}
          <header className="mb-10 text-center lg:text-left">
            <div className="flex flex-wrap items-center gap-2 mb-6 justify-center lg:justify-start">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-brand-gold/30 text-brand-gold/80 bg-brand-gold/5 uppercase text-[10px] tracking-widest px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className={`${playfair.className} text-3xl md:text-5xl font-bold leading-tight text-brand-900 mb-6`}>
              {post.title}
            </h1>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-100 mb-8">
              <div className="text-center lg:text-left border-r border-slate-100 last:border-0 px-4 first:pl-0">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <Building2 className="w-3 h-3" /> 来源
                </div>
                <div className="text-sm font-bold text-slate-900">{post.source_institution}</div>
              </div>
              <div className="text-center lg:text-left border-r border-slate-100 last:border-0 px-4">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <Calendar className="w-3 h-3" /> 报告日期
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {post.source_date
                    ? formatDateCN(post.source_date)
                    : '—'}
                </div>
              </div>
              <div className="text-center lg:text-left px-4">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
                  <UserIcon className="w-3 h-3" /> 分析师
                </div>
                <div className="text-sm font-bold text-slate-900">{uiTerms.insightNoteTeam}</div>
              </div>
            </div>
          </header>

          {/* TL;DR Section */}
          <div className="relative mb-12 p-8 bg-[#FFF9E6] border border-[#FFD700] rounded-lg">
            <div className="absolute -top-3 left-6 bg-brand-900 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-sm">
              要点
            </div>
            <p className="font-sans text-base leading-relaxed text-slate-800">
              {summaryText || '暂无摘要'}
            </p>
          </div>

          {/* Main Content Area */}
          <div className={`relative min-h-[400px] ${!canAccess ? 'relative overflow-hidden max-h-[500px]' : ''}`}>
            <MarkdownContent content={post.content_mdx || ''} />

            {!canAccess && (
              <>
                <div className="absolute inset-0 z-10" style={{ 
                  maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' 
                }} />
                <div className="absolute bottom-0 left-0 right-0 flex justify-center py-12 bg-linear-to-t from-white via-white/95 to-transparent z-20">
                  <div className="bg-white p-8 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] text-center border border-slate-100 max-w-md mx-4">
                    <h3 className={`${playfair.className} text-2xl font-bold text-brand-900 mb-2`}>此内容为 Pro 权限</h3>
                    <p className="text-slate-500 mb-6 text-sm">
                      开通 InsightNote Pro 可立即解锁全文；未开通时，Pro 文章在发布 30 天后将自动解锁。
                    </p>
                    <Button
                      asChild
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-900 font-bold px-8 py-6 w-full text-base"
                    >
                      <TrackedLink
                        href={user ? pricingHref : loginHref}
                        eventName={user ? 'upgrade_click' : 'login_to_unlock_click'}
                        eventPayload={{ slug: post.slug }}
                      >
                        {user ? '查看开通方式' : '登录后解锁'}
                      </TrackedLink>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

        </main>

        {/* Sidebar Column (30%) */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Table of Contents (Static for now) */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg sticky top-24">
             <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-200 pb-2">目录</h3>
             <ul className="space-y-3 text-sm text-slate-600">
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-brand-gold rounded-full"></span>
                 投资逻辑
               </li>
               <li className="hover:text-brand-900 cursor-pointer pl-4">关键催化</li>
               <li className="hover:text-brand-900 cursor-pointer pl-4">估值模型</li>
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                 风险因素
               </li>
               <li className="hover:text-brand-900 cursor-pointer flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                 结论
               </li>
             </ul>
          </div>

          {/* Related Graph Placeholder */}
          <div className="p-6 bg-brand-900 rounded-lg text-white">
             <h3 className={`${playfair.className} text-xl font-bold mb-2`}>关联洞察</h3>
             <p className="text-xs text-slate-400 mb-4">探索相关的市场事件。</p>
             <TrackedLink
               href={`/tools/butterfly?slug=${encodeURIComponent(post.slug)}`}
               eventName="related_graph_open"
               eventPayload={{ slug: post.slug }}
             >
               <div className="h-40 bg-white/5 rounded border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer group">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 group-hover:text-brand-gold transition-colors">查看图谱</span>
               </div>
             </TrackedLink>
          </div>
        </aside>
        
      </div>
    </div>
  );
}
