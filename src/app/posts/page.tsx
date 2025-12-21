import { Playfair_Display } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import type { PostListItem } from '@/types';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { Lock } from 'lucide-react';
import { formatDateCN } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

export const metadata = {
  title: '全部文章｜InsightNote',
};

export const revalidate = 60;

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

export default async function PostsPage() {
  const supabase = await createClient();
  let items: PostListItem[] = [];
  let loadError: any = null;

  const primary = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, source_date, tags')
    .order('published_at', { ascending: false });

  if (!primary.error) {
    items = (primary.data ?? []).map((row: any) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
      is_premium: Boolean(row.is_premium),
      published_at: row.published_at,
      source_institution: row.source_institution ?? null,
      source_date: row.source_date ?? null,
      tags: normalizeTags(row.tags),
    }));
  } else {
    const isMissingSummary =
      primary.error.code === '42703' ||
      (typeof primary.error.message === 'string' && primary.error.message.includes('summary_tldr'));

    if (isMissingSummary) {
      const fallback = await supabase
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (!fallback.error) {
        items = (fallback.data ?? []).map((row: any) => ({
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.title),
          summary_tldr: pickFirstString(
            row.summary_tldr,
            row.summary,
            row.tldr,
            row.abstract,
            row.description,
            row.excerpt,
            summarizeContent(
              pickFirstString(row.content_mdx, row.content, row.content_markdown, row.content_md, row.body),
            ),
          ),
          is_premium: Boolean(row.is_premium ?? row.premium ?? row.is_paid),
          published_at: row.published_at ?? row.created_at ?? new Date().toISOString(),
          source_institution: row.source_institution ?? row.institution ?? null,
          source_date: row.source_date ?? null,
          tags: normalizeTags(row.tags ?? row.topics ?? row.labels),
        }));
      } else {
        loadError = fallback.error;
      }
    } else {
      loadError = primary.error;
    }
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-5xl mx-auto px-6">
        <header className="flex items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">文章库</div>
            <h1 className={`${playfair.className} mt-2 text-4xl font-bold text-slate-900`}>全部文章</h1>
            <p className="mt-3 text-sm text-slate-600">按最新发布时间排序，持续更新。</p>
          </div>
          <TrackedLink
            href="/"
            className="text-sm font-bold text-brand-900 hover:text-brand-gold transition-colors"
            eventName="posts_back_home_click"
          >
            ← 返回首页
          </TrackedLink>
        </header>

        {loadError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            暂时无法加载文章列表，请稍后重试。
            {loadError.message && (
              <div className="mt-2 text-xs text-red-700 break-words">{loadError.message}</div>
            )}
          </div>
        )}

        {!loadError && items.length === 0 && (
          <div className="mt-12 text-center text-sm text-slate-500">暂无文章</div>
        )}

        <div className="mt-10 divide-y divide-slate-200">
          {items.map((post) => (
            <TrackedLink
              key={post.id}
              href={`/posts/${post.slug}`}
              eventName="posts_item_click"
              eventPayload={{
                slug: post.slug,
                is_premium: post.is_premium,
                source_institution: post.source_institution,
                tag: post.tags?.[0] ?? null,
              }}
              className="block py-8 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span>{formatDateCN(post.published_at)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{post.source_institution ?? 'InsightNote'}</span>
                    {post.tags?.[0] && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{post.tags[0]}</span>
                      </>
                    )}
                    {post.is_premium && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[9px] text-brand-900">
                        <Lock className="w-3 h-3" /> Pro
                      </span>
                    )}
                  </div>

                  <h2 className={`${playfair.className} mt-3 text-2xl font-bold text-slate-900`}>
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {post.summary_tldr || '暂无摘要'}
                  </p>
                </div>
              </div>
            </TrackedLink>
          ))}
        </div>
      </div>
    </div>
  );
}
