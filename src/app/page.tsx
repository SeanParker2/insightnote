import { MarketTicker } from '@/components/home/MarketTicker';
import { FeaturedPost } from '@/components/home/FeaturedPost';
import { LatestIntelligence } from '@/components/home/LatestIntelligence';
import { SidebarTool } from '@/components/home/SidebarTool';
import { butterflyEffects } from '@/lib/mock/tools.mock';
import { heroArticle, latestFeed } from '@/lib/mock/feed.mock';
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
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, source_date, tags, sentiment, related_tickers, difficulty, success_rate')
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
      sentiment: row.sentiment ?? null,
      related_tickers: normalizeTags(row.related_tickers),
      difficulty: row.difficulty ?? null,
      success_rate: row.success_rate ?? null,
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
          sentiment: row.sentiment ?? null,
          related_tickers: normalizeTags(row.related_tickers),
          difficulty: row.difficulty ?? null,
          success_rate: row.success_rate ?? null,
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
    // Fallback to mock data
    const mockHero: PostListItem = {
      id: heroArticle.id,
      slug: 'mock-hero',
      title: heroArticle.title,
      summary_tldr: '随着人工智能技术的指数级增长，数据中心对电力的需求正在重塑公用事业板块的估值模型。高盛预测，到 2030 年，AI 将推动数据中心电力需求增长 160%。',
      is_premium: false,
      published_at: new Date().toISOString(),
      source_institution: heroArticle.author || '高盛',
      source_date: new Date().toISOString(),
      tags: ['宏观', '公用事业'],
      sentiment: 'bullish',
      related_tickers: ['NVDA', 'XLU'],
      difficulty: 'medium',
      success_rate: 85,
      predictions: [
        {
          id: 'mock-pred-1',
          post_id: heroArticle.id,
          symbol: 'NVDA',
          direction: 'bullish',
          start_price: 135.0,
          target_price: 160.0,
          timeframe_days: 30,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]
    };

    const mockFeed: PostListItem[] = latestFeed.map((item) => ({
      id: item.id,
      slug: `mock-${item.id}`,
      title: item.title,
      summary_tldr: item.summary,
      is_premium: item.isPro || false,
      published_at: new Date().toISOString(),
      source_institution: '摩根士丹利',
      source_date: new Date().toISOString(),
      tags: [item.category || '综合'],
      sentiment: 'neutral',
      related_tickers: [],
      difficulty: 'medium',
      success_rate: null,
      predictions: [],
    }));

    items = [mockHero, ...mockFeed];
  }

  const hasLoadError = Boolean(loadError);
  const allPosts = items;
  const featuredPost = allPosts.length > 0 ? allPosts[0] : null;
  const latestPosts = allPosts.length > 1 ? allPosts.slice(1) : [];
  const editorPicksFromPosts = allPosts.slice(1, 3).map((p) => ({
    category: p.tags?.[0] ?? p.source_institution ?? '研究',
    title: p.title,
    url: `/posts/${p.slug}`,
  }));

  return (
    <div className="min-h-screen bg-brand-paper dark:bg-brand-navy transition-colors duration-500">
      {/* 1. Market Ticker */}
      <MarketTicker />
      
      {/* Main Content */}
      <div className="bg-background min-h-screen">
        
        {/* Full Width Hero Section */}
        {featuredPost && (
           <div className="container-width px-6 pt-8 pb-4">
             <FeaturedPost post={featuredPost} />
           </div>
        )}

        <main className="max-w-7xl mx-auto px-6 pb-20 grid grid-cols-12 gap-12">
          
          {/* Left Column (8/12) */}
          <div className="col-span-12 lg:col-span-8">
            {hasLoadError && (
              <div className="mb-10 border border-brand-red/20 bg-brand-red/5 px-6 py-4 rounded-xl text-sm text-brand-red flex items-center gap-4">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                <span>
                  首页内容加载失败，已启用离线预览模式。
                  <a href="/" className="underline underline-offset-4 ml-2 font-bold hover:text-brand-red/80">刷新重试</a>
                </span>
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
    </div>
  );
}
