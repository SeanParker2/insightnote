import { MarketTicker } from '@/components/home/MarketTicker';
import { SidebarItem, DataPoint, InsightCard, ChainNode } from '@/components/home/TerminalUI';
import { butterflyEffects } from '@/lib/mock/tools.mock';
import { createClient } from '@/lib/supabase/server';
import { PostListItem } from '@/types';
import { Playfair_Display, JetBrains_Mono } from '@/lib/fonts';
import { Activity, Layers, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const revalidate = 60; // Revalidate every 60 seconds

// 字体配置
const playfair = Playfair_Display({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

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
      {/* 1. 顶栏：不再是简单的Header，而是状态栏 */}
      <header className="sticky top-0 z-50 border-b border-(--border-glass) bg-(--bg-obsidian)/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-(--signal-bull) rounded-full animate-pulse shadow-[0_0_8px_rgba(0,240,144,0.6)]" />
            <span className={`${playfair.className} font-bold text-xl tracking-tight text-white`}>InsightNote</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 border border-slate-800 px-1.5 rounded ml-2 font-mono">终端 v3.0</span>
          </div>
          {/* 这里的 Ticker 嵌入在 Header 里，节省空间 */}
          <div className="flex-1 mx-8 overflow-hidden mask-linear-fade relative h-full flex items-center">
             <MarketTicker className="w-full h-full flex items-center text-xs font-mono" transparent />
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
            <span>纽约: <span className="text-white">休市</span></span>
            <span>伦敦: <span className="text-(--signal-bull)">开盘</span></span>
          </div>
        </div>
      </header>

      {/* 2. 核心工作区 (3-Column Layout) */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-3.5rem)]">
        
        {/* 左侧栏：极简导航 (Icon Only on Tablet, Full on Desktop) */}
        <nav className="w-64 hidden lg:flex flex-col border-r border-(--border-glass) bg-(--bg-layer-1)/30 p-4 gap-2 shrink-0">
           <SidebarItem icon={<Activity className="w-4 h-4" />} label="Market Overview" active />
           <SidebarItem icon={<Layers className="w-4 h-4" />} label="Deep Dives" />
           <SidebarItem icon={<Zap className="w-4 h-4" />} label="Flash Intel" />
           <div className="mt-auto p-4 rounded-xl bg-linear-to-br from-indigo-900/20 to-purple-900/20 border border-white/5">
              <p className="text-xs text-indigo-300 mb-2 font-mono uppercase tracking-wider">Upgrade to Pro</p>
              <button className="w-full text-xs bg-white text-black font-bold py-2 rounded hover:bg-slate-200 transition-colors">Unlock Alpha</button>
           </div>
        </nav>

        {/* 中间栏：主要情报流 (The Intelligence Stream) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          
          {loadError && (
             <div className="mb-4 border border-(--signal-bear)/20 bg-(--signal-bear)/5 px-6 py-4 rounded-xl text-sm text-(--signal-bear) flex items-center gap-4">
               <span className="w-2 h-2 rounded-full bg-(--signal-bear) animate-pulse"></span>
               <span>
                 Connection Interrupted. Using Cached Data.
               </span>
             </div>
          )}

          {/* Hero Section: The "Magnum Opus" */}
          <section className="relative group">
            <div className="absolute inset-0 bg-linear-to-r from-(--signal-bull)/20 to-blue-600/20 blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
            <div className="obsidian-card rounded-3xl p-8 relative overflow-hidden border-t border-white/10">
              {heroPost ? (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <Badge variant="outline" className="border-(--signal-bull) text-(--signal-bull) bg-(--signal-bull)/10 px-3 py-1 font-mono tracking-wider">
                      CORE THESIS
                    </Badge>
                    <span className={`${mono.className} text-xs text-slate-500`}>
                      {new Date(heroPost.published_at).toLocaleDateString()} • {heroPost.source_institution || 'INSIGHTNOTE'}
                    </span>
                  </div>
                  
                  <h1 className={`${playfair.className} text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight`}>
                    {heroPost.title}
                  </h1>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 border-t border-white/5 pt-8">
                    <div className="col-span-2">
                      <p className="text-lg text-slate-400 leading-relaxed font-light">
                        {heroPost.summary_tldr}
                      </p>
                    </div>
                    <div className="col-span-1 flex flex-col justify-end gap-2">
                       {/* 迷你数据看板 (Mock Data for Demo) */}
                       <DataPoint label="DXY Index" value="102.45" change="-0.8%" isUp={false} />
                       <DataPoint label="Gold (XAU)" value="2,412.00" change="+1.2%" isUp={true} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  Initializing Core Thesis...
                </div>
              )}
            </div>
          </section>

          {/* Sub-Section: Intelligence Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* 右侧栏：量子侧边栏 (The Quantum Sidebar) */} 
         <aside className="w-80 hidden xl:flex flex-col border-l border-(--border-glass) bg-(--bg-layer-1)/20"> 
           
           {/* 1. 蝴蝶效应：今日热链 */} 
           <div className="p-6 border-b border-(--border-glass)"> 
             <h3 className={`${mono.className} text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2`}> 
               <Activity className="w-3 h-3" /> 
               今日蝴蝶效应链 
             </h3> 
             {/* 这里用 SVG 画一个垂直的传导链 */} 
             <div className="space-y-3 relative"> 
               <div className="absolute left-[7px] top-2 bottom-2 w-px bg-linear-to-b from-white/20 to-transparent" /> 
               <ChainNode label="美联储降息" type="root" /> 
               <ChainNode label="收益率下跌" type="event" /> 
               <ChainNode label="生物科技反弹" type="impact" active /> 
               <ChainNode label="XBI ETF" type="ticker" change="+4.2%" /> 
             </div> 
           </div> 
 
           {/* 2. 市场情绪雷达 */} 
           <div className="p-6"> 
              <h3 className={`${mono.className} text-xs font-bold text-slate-500 uppercase mb-4`}>市场情绪</h3> 
              <div className="h-40 bg-white/5 rounded-lg flex items-center justify-center border border-white/5"> 
                 {/* 这里未来放 ECharts 雷达图 */} 
                 <span className="text-xs text-slate-600">情绪雷达图占位符</span> 
              </div> 
              <div className="mt-4 flex justify-between text-xs"> 
                 <span className="text-slate-400">散户: <span className="text-(--signal-bear)">恐慌</span></span> 
                 <span className="text-slate-400">机构: <span className="text-(--signal-bull)">贪婪</span></span> 
              </div> 
           </div> 
 
         </aside> 

      </div>
    </main>
  );
}
