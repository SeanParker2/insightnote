import { MarketTicker } from '@/components/home/MarketTicker';
import { InsightCard } from '@/components/home/TerminalUI';
import { ButterflyChart } from '@/components/home/ButterflyChart';
import { butterflyEffects } from '@/lib/mock/tools.mock';
import { createClient } from '@/lib/supabase/server';
import { PostListItem } from '@/types';
import { playfair, mono } from '@/lib/fonts';
import { Activity, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

export default async function AlphaTerminalPage() {
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
    // Fallback logic for missing columns or errors
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
          tags: normalizeTags(row.tags),
          sentiment: row.sentiment ?? null,
          related_tickers: normalizeTags(row.related_tickers),
          difficulty: row.difficulty ?? null,
          success_rate: row.success_rate ?? null,
        }));
      } else {
        loadError = fallback.error.message;
      }
    } else {
      loadError = primary.error.message;
    }
  }

  // 1. Separate Featured (Hero) and Others
  const heroPost = items.length > 0 ? items[0] : null;
  const gridPosts = items.length > 0 ? items.slice(1, 7) : [];
  
  // Use mock or real butterfly effects
  const chainEffects = butterflyEffects || [];

  return (
    <main className="min-h-screen flex flex-col bg-(--bg-obsidian) text-slate-300 font-sans selection:bg-(--signal-bull) selection:text-black">
      {/* 1. 顶栏：状态栏 & Ticker */}
      <header className="sticky top-0 z-40 border-b border-(--border-glass) bg-[#0B1120]/90 backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center justify-between h-14 px-6">
          
          {/* Ticker */}
          <div className="flex-1 mr-8 overflow-hidden mask-linear-fade relative h-full flex items-center">
             <MarketTicker className="w-full h-full flex items-center text-xs font-mono" transparent />
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> 纽约: 休市</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-(--signal-bull) animate-pulse"></span> 伦敦: 开盘</span>
          </div>
        </div>
      </header>

      {/* 2. 核心工作区 (2-Column Layout: Content + Right Sidebar) */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.5rem)]">
        
        {/* 中间栏：主要情报流 (The Intelligence Stream) */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          
          {loadError && (
             <div className="mb-4 border border-(--signal-bear)/20 bg-(--signal-bear)/5 px-6 py-4 rounded-xl text-sm text-(--signal-bear) flex items-center gap-4">
               <span className="w-2 h-2 rounded-full bg-(--signal-bear) animate-pulse"></span>
               <span>
                 连接中断，使用缓存数据。
               </span>
             </div>
          )}

          {/* Hero Section: The "Magnum Opus" - Daily Insight */}
          <section className="relative mb-12">
            {/* Background Ambient Mesh */}
            <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-accent/5 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />

            {heroPost ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 1. Main Editorial (Cols 1-8) */}
                <div className="lg:col-span-8 relative group">
                  {/* Decorative Top Line */}
                  <div className="w-12 h-0.5 bg-brand-accent mb-6" />
                  
                  <div className="flex items-center gap-3 mb-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    <span className="text-brand-accent">●</span>
                    <span>Daily Briefing</span>
                    <span className="text-slate-700">|</span>
                    <span>{new Date(heroPost.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                  </div>

                  <Link href={`/post/${heroPost.slug}`} className="block">
                    <h1 className={`${playfair.className} text-5xl lg:text-7xl font-bold text-slate-100 mb-6 leading-[0.95] tracking-tight group-hover:text-white transition-colors`}>
                      {heroPost.title}
                    </h1>
                  </Link>

                  <p className="text-xl text-slate-400 leading-relaxed font-light max-w-3xl border-l-2 border-white/10 pl-6 mb-8 text-pretty">
                    {heroPost.summary_tldr}
                  </p>

                  <div className="flex items-center gap-4">
                     <Link href={`/post/${heroPost.slug}`} className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-sm transition-all group/btn">
                        READ BRIEFING
                        <ArrowUpRight className="w-4 h-4 text-brand-accent group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                     </Link>
                     <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>{heroPost.source_institution || 'INSIGHT NOTE'}</span>
                        <span>•</span>
                        <span>{heroPost.difficulty || 'Market'} Level</span>
                     </div>
                  </div>
                </div>

                {/* 2. Key Metrics / HUD (Cols 9-12) */}
                <div className="lg:col-span-4 flex flex-col gap-4 pt-12 lg:pt-0">
                   <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex justify-between">
                      <span>Market Context</span>
                      <span className="text-brand-accent">LIVE</span>
                   </div>
                   
                   {/* Mini Cards */}
                   <div className="p-4 rounded-sm border border-white/5 bg-white/2 backdrop-blur-sm hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-end mb-2">
                         <span className="text-xs text-slate-400 font-mono">VIX Index</span>
                         <span className="text-brand-accent text-lg font-bold font-mono">13.45</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                         <div className="bg-brand-accent w-[30%] h-full" />
                      </div>
                   </div>

                   <div className="p-4 rounded-sm border border-white/5 bg-white/2 backdrop-blur-sm hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-end mb-2">
                         <span className="text-xs text-slate-400 font-mono">US 10Y Yield</span>
                         <span className="text-slate-200 text-lg font-bold font-mono">4.12%</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                         <span className="text-(--signal-bear)">+0.05%</span>
                         <span>Today</span>
                      </div>
                   </div>
                   
                   {/* Sentiment Radar (Mock Visual) */}
                   <div className="mt-2 p-4 rounded-sm border border-white/5 bg-white/2 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center relative">
                         <div className="absolute inset-0 border-t-2 border-brand-accent rounded-full animate-spin duration-[3s]" />
                         <span className="text-[10px] font-bold">N</span>
                      </div>
                      <div>
                         <div className="text-xs text-slate-300 font-bold">Neutral Sentiment</div>
                         <div className="text-[10px] text-slate-500">Awaiting Fed Decision</div>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                <span className="text-slate-500 font-mono">No Insight Available</span>
              </div>
            )}
          </section>

          {/* Sub-Section: Intelligence Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 auto-rows-fr">
             {gridPosts.map(post => (
               <InsightCard 
                  key={post.id}
                  category={post.source_institution || 'Market'} 
                  title={post.title} 
                  tickers={post.related_tickers} 
                  isLocked={post.is_premium}
                  summary={post.summary_tldr}
                  date={new Date(post.published_at).toLocaleDateString()}
               />
             ))}
             {gridPosts.length === 0 && !loadError && (
                <div className="col-span-2 text-center py-12 text-slate-500">
                   暂无更多情报。
                </div>
             )}
          </section>
        </main>

        {/* 右侧栏：量子侧边栏 (The Quantum Sidebar) */} 
         <aside className="w-80 hidden xl:flex flex-col border-l border-(--border-glass) bg-(--bg-layer-1)/20 backdrop-blur-sm"> 
           
           {/* 1. 蝴蝶效应：今日热链 */} 
           <div className="p-6 border-b border-(--border-glass)"> 
            <h3 className={`${mono.className} text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2`}> 
              <Activity className="w-3 h-3" /> 
              今日蝴蝶效应链 
            </h3> 
            <ButterflyChart />
          </div> 
 
           {/* 2. 市场情绪雷达 */} 
           <div className="p-6"> 
              <h3 className={`${mono.className} text-xs font-bold text-slate-500 uppercase mb-4`}>市场情绪</h3> 
              <div className="h-48 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden"> 
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]" />
                 {/* 这里未来放 ECharts 雷达图 */} 
                 <span className="text-xs text-slate-600 font-mono">情绪雷达图占位符</span> 
              </div> 
              <div className="mt-4 flex justify-between text-xs font-mono"> 
                 <span className="text-slate-400">散户: <span className="text-(--signal-bear)">恐慌</span></span> 
                 <span className="text-slate-400">机构: <span className="text-(--signal-bull)">贪婪</span></span> 
              </div> 
           </div> 
 
         </aside> 

      </div>
    </main>
  );
}
