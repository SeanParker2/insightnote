import { createClient } from '@/lib/supabase/server';
import { normalizeTags } from '@/lib/markdown';
import type { PostListItem } from '@/types';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Clock, FileText, Brain, Target, Compass, Briefcase, BookOpen, BarChart2, Bell, Zap } from 'lucide-react';

export const revalidate = 60;

const NAV_ITEMS = [
  { href: '/posts', label: '深度研究', desc: 'AI 生成的分析报告', icon: FileText },
  { href: '/agents', label: 'AI 分析', desc: '多角色协作分析', icon: Brain },
  { href: '/tools/butterfly', label: '蝴蝶效应', desc: '因果传导图谱', icon: Target },
  { href: '/scenario', label: '情景模拟', desc: '宏观情景分析', icon: Compass },
  { href: '/portfolio', label: '持仓管理', desc: '管理投资组合', icon: Briefcase },
  { href: '/journal', label: '决策日志', desc: '记录投资决策', icon: BookOpen },
  { href: '/market', label: '行情中心', desc: '实时市场数据', icon: BarChart2 },
  { href: '/notifications', label: '预警通知', desc: '智能风险预警', icon: Bell },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, is_premium, published_at, source_institution, tags, sentiment, related_tickers')
    .order('published_at', { ascending: false })
    .limit(6);

  const items: PostListItem[] = (posts ?? []).map((row) => ({
    id: String(row.id), slug: String(row.slug), title: String(row.title),
    summary_tldr: typeof row.summary_tldr === 'string' ? row.summary_tldr : '',
    is_premium: Boolean(row.is_premium), published_at: row.published_at,
    source_institution: row.source_institution ?? null, source_date: null,
    tags: normalizeTags(row.tags), sentiment: (row.sentiment as PostListItem['sentiment']) ?? null,
    related_tickers: normalizeTags(row.related_tickers), difficulty: null, success_rate: null,
  }));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-[#1a1a1a]">
        <h1 className="text-sm font-medium text-[#888]">首页</h1>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs text-[#555] hover:text-[#888] transition-colors">登录</Link>
          <Link href="/signup" className="text-xs text-white bg-[#333] hover:bg-[#444] px-3 py-1.5 rounded transition-colors">注册</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold tracking-tight mb-3">投资研究平台</h2>
          <p className="text-[#666] text-lg">AI 驱动的深度分析与决策辅助</p>
        </div>

        {/* Quick Access */}
        <div className="mb-16">
          <h3 className="text-xs font-medium text-[#444] uppercase tracking-wider mb-4">功能入口</h3>
          <div className="grid grid-cols-4 gap-3">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="group p-4 rounded-lg border border-[#1a1a1a] hover:border-[#333] transition-colors">
                <item.icon size={18} className="text-[#444] mb-3" />
                <div className="text-sm font-medium mb-0.5">{item.label}</div>
                <div className="text-xs text-[#555]">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest Research */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-medium text-[#444] uppercase tracking-wider">最新研究</h3>
            <Link href="/posts" className="text-xs text-[#666] hover:text-[#888] transition-colors">
              查看全部 →
            </Link>
          </div>

          <div className="space-y-3">
            {items.map((post) => (
              <Link key={post.id} href={`/posts/${post.slug}`} className="group block p-4 rounded-lg border border-[#1a1a1a] hover:border-[#333] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {post.sentiment && (
                        <span className={`text-[10px] font-medium ${
                          post.sentiment === 'bullish' ? 'text-[#e55]' :
                          post.sentiment === 'bearish' ? 'text-[#5b5]' :
                          'text-[#555]'
                        }`}>
                          {post.sentiment === 'bullish' ? '看多' : post.sentiment === 'bearish' ? '看空' : '中性'}
                        </span>
                      )}
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] text-[#444]">{tag}</span>
                      ))}
                    </div>
                    <h4 className="text-sm font-medium mb-1 group-hover:text-[#888] transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs text-[#555] line-clamp-1">
                      {post.summary_tldr}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#444] shrink-0">
                    <span>{post.source_institution ?? 'InsightNote'}</span>
                    <span>·</span>
                    <span>{new Date(post.published_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
