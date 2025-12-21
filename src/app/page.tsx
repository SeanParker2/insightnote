import { MarketTicker } from '@/components/home/MarketTicker';
import { FeaturedPost } from '@/components/home/FeaturedPost';
import { LatestIntelligence } from '@/components/home/LatestIntelligence';
import { SidebarTool } from '@/components/home/SidebarTool';
import { butterflyEffects } from '@/lib/mock/tools.mock';
import { createClient } from '@/lib/supabase/server';
import { PostListItem } from '@/types';

export const revalidate = 60; // Revalidate every 60 seconds

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

export default async function Home() {
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

  if (loadError) {
    console.error('Error fetching posts:', loadError);
  }

  const hasLoadError = Boolean(loadError);
  const allPosts = (!hasLoadError ? items : []) || [];
  const featuredPost = allPosts.length > 0 ? allPosts[0] : null;
  const latestPosts = allPosts.length > 1 ? allPosts.slice(1) : [];
  const editorPicksFromPosts = allPosts.slice(1, 3).map((p) => ({
    category: p.tags?.[0] ?? p.source_institution ?? '研究',
    title: p.title,
    url: `/posts/${p.slug}`,
  }));

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 1. Market Ticker */}
      <MarketTicker />
      
      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-10">
        
        {/* Left Column (8/12) */}
        <div className="col-span-12 lg:col-span-8">
          {hasLoadError && (
            <div className="mb-10 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              首页内容加载失败，请刷新重试或稍后再来。{' '}
              <a href="/" className="underline underline-offset-2">
                刷新
              </a>
              {' · '}
              <a href="/posts" className="underline underline-offset-2">
                去文章列表
              </a>
              {loadError?.message && (
                <div className="mt-2 text-xs text-red-700 break-words">
                  {loadError.message}
                </div>
              )}
            </div>
          )}
          
          {/* 2. Featured Post (Hero) */}
          {featuredPost ? (
            <FeaturedPost post={featuredPost} />
          ) : (
            <div className="mb-12 pb-12 border-b border-solid border-gray-200 text-center text-slate-500">
              {hasLoadError ? '无法加载内容' : '加载中…'}
            </div>
          )}
          
          {/* 3. Latest Intelligence (Feed) */}
          <LatestIntelligence posts={latestPosts} />
          
        </div>

        {/* Right Column (4/12) - Sidebar */}
        {/* 4. Sidebar Tools */}
        <SidebarTool 
          butterflyEffects={butterflyEffects} 
          editorPicks={editorPicksFromPosts} 
        />
        
      </main>
    </div>
  );
}
