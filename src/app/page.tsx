import { createClient } from '@/lib/supabase/server';
import { normalizeTags } from '@/lib/markdown';
import type { PostListItem } from '@/types';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight, FileText, Activity, Target, Edit3, Compass, Layers, Swords, BookOpen, Briefcase, BarChart3, Bell, Settings, Zap } from 'lucide-react';

export const revalidate = 60;

const NAV_ITEMS = [
  { href: '/posts', label: '深度研究', desc: 'AI 生成的金融分析报告', icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { href: '/briefing', label: '每日晨报', desc: '基于持仓的个性化简报', icon: Activity, color: 'bg-amber-50 text-amber-600' },
  { href: '/tools/butterfly', label: '蝴蝶效应', desc: '事件因果传导图谱', icon: Target, color: 'bg-purple-50 text-purple-600' },
  { href: '/tools/graph-editor', label: '图谱编辑', desc: '自定义因果链路', icon: Edit3, color: 'bg-indigo-50 text-indigo-600' },
  { href: '/scenario', label: '情景模拟', desc: '宏观假设对持仓影响', icon: Compass, color: 'bg-cyan-50 text-cyan-600' },
  { href: '/battle-map', label: '作战地图', desc: '24h 事件热力图', icon: Layers, color: 'bg-rose-50 text-rose-600' },
  { href: '/controversies', label: '争议地图', desc: '市场多空辩论', icon: Swords, color: 'bg-orange-50 text-orange-600' },
  { href: '/journal', label: '决策日志', desc: '记录与复盘投资决策', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
  { href: '/portfolio', label: '持仓管理', desc: '管理投资组合', icon: Briefcase, color: 'bg-teal-50 text-teal-600' },
  { href: '/reviews', label: '周度复盘', desc: '行为分析与偏差识别', icon: BarChart3, color: 'bg-violet-50 text-violet-600' },
  { href: '/notifications', label: '预警通知', desc: '智能风险预警', icon: Bell, color: 'bg-red-50 text-red-600' },
  { href: '/pricing', label: '订阅 Pro', desc: '解锁全部深度研究', icon: Zap, color: 'bg-amber-50 text-amber-600' },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, tags, sentiment, related_tickers')
    .order('published_at', { ascending: false })
    .limit(10);

  const items: PostListItem[] = (posts ?? []).map((row) => ({
    id: String(row.id), slug: String(row.slug), title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    is_premium: Boolean(row.is_premium), published_at: row.published_at,
    source_institution: row.source_institution ?? null, source_date: null,
    tags: normalizeTags(row.tags), sentiment: (row.sentiment as PostListItem['sentiment']) ?? null,
    related_tickers: normalizeTags(row.related_tickers), difficulty: null, success_rate: null,
  }));

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 md:px-8 border-b border-neutral-100 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">IN</span>
          </div>
          <span className="text-sm font-semibold text-neutral-900">InsightNote</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs text-neutral-500 hover:text-neutral-900">登录</Link>
          <Link href="/signup" className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800">注册</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        {/* Hero */}
        {hero && (
          <Link href={`/posts/${hero.slug}`} className="group block mb-10">
            <div className="p-6 md:p-8 rounded-2xl bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-lg hover:shadow-neutral-100/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                {hero.sentiment && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    hero.sentiment === 'bullish' ? 'bg-red-50 text-red-600' :
                    hero.sentiment === 'bearish' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-neutral-100 text-neutral-500'
                  }`}>
                    {hero.sentiment === 'bullish' ? '看多' : hero.sentiment === 'bearish' ? '看空' : '中性'}
                  </span>
                )}
                {hero.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[11px] text-neutral-400">{tag}</span>
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                {hero.title}
              </h2>
              <p className="text-base text-neutral-500 leading-relaxed max-w-3xl mb-5">
                {hero.summary_tldr}
              </p>
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <span>{hero.source_institution ?? 'InsightNote'}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(hero.published_at).toLocaleDateString('zh-CN')}</span>
                {hero.related_tickers.length > 0 && (<><span>·</span><div className="flex gap-1.5">{hero.related_tickers.slice(0, 3).map((t) => <span key={t} className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px] font-mono">{t}</span>)}</div></>)}
              </div>
            </div>
          </Link>
        )}

        {/* Feature Navigation Grid */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">全部功能</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="group p-4 rounded-xl bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-md hover:shadow-neutral-100/50 transition-all duration-300">
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-0.5 group-hover:text-blue-600 transition-colors">{item.label}</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Articles */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-neutral-900">最新研究</h2>
            <Link href="/posts" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">查看全部 <ChevronRight className="w-3 h-3" /></Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className="group p-5 rounded-xl bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-md hover:shadow-neutral-100/50 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  {post.sentiment && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      post.sentiment === 'bullish' ? 'bg-red-50 text-red-600' :
                      post.sentiment === 'bearish' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-neutral-100 text-neutral-500'
                    }`}>
                      {post.sentiment === 'bullish' ? <ArrowUpRight className="w-3 h-3" /> : post.sentiment === 'bearish' ? <ArrowDownRight className="w-3 h-3" /> : null}
                      {post.sentiment === 'bullish' ? '看多' : post.sentiment === 'bearish' ? '看空' : '中性'}
                    </span>
                  )}
                  {post.tags.slice(0, 2).map((tag) => <span key={tag} className="text-[10px] text-neutral-400">{tag}</span>)}
                  {post.is_premium && <span className="ml-auto text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pro</span>}
                </div>
                <h3 className="text-[15px] font-semibold text-neutral-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">{post.title}</h3>
                <p className="text-[13px] text-neutral-500 line-clamp-2 mb-3">{post.summary_tldr}</p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span>{post.source_institution ?? 'InsightNote'}</span>
                    <span>·</span>
                    <span>{new Date(post.published_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {post.related_tickers.length > 0 && (
                    <div className="flex gap-1">{post.related_tickers.slice(0, 2).map((t) => <span key={t} className="px-1.5 py-0.5 bg-neutral-50 rounded text-[10px] font-mono text-neutral-500">{t}</span>)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 px-6 md:px-8 border-t border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-neutral-600">隐私政策</Link>
            <Link href="/terms" className="hover:text-neutral-600">服务条款</Link>
            <Link href="/feedback" className="hover:text-neutral-600">意见反馈</Link>
          </div>
          <span>&copy; {new Date().getFullYear()} InsightNote</span>
        </div>
      </footer>
    </div>
  );
}
