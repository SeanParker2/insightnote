import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SearchResult {
  id: string;
  type: 'post' | 'portfolio' | 'agent' | 'scenario' | 'notification' | 'journal' | 'review' | 'tool' | 'page';
  title: string;
  subtitle?: string;
  url: string;
  category: string;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  if (!query || query.length < 2) {
    // Return quick actions when no query
    return NextResponse.json({
      ok: true,
      data: [
        { id: 'market', type: 'page', title: '行情', subtitle: '查看市场行情', url: '/market', category: '页面' },
        { id: 'agents', type: 'page', title: 'AI 分析', subtitle: '多角色 AI 分析', url: '/agents', category: '页面' },
        { id: 'scenario', type: 'page', title: '情景模拟', subtitle: '宏观情景分析', url: '/scenario', category: '页面' },
        { id: 'portfolio', type: 'page', title: '持仓管理', subtitle: '管理投资组合', url: '/portfolio', category: '页面' },
      ],
    });
  }

  const results: SearchResult[] = [];
  const searchPattern = `%${query}%`;

  // Search posts
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, slug, title, summary_tldr, sentiment')
      .or(`title.ilike.${searchPattern},summary_tldr.ilike.${searchPattern}`)
      .order('published_at', { ascending: false })
      .limit(5);

    if (posts) {
      posts.forEach(post => {
        results.push({
          id: `post-${post.id}`,
          type: 'post',
          title: post.title,
          subtitle: post.summary_tldr?.substring(0, 60) + '...',
          url: `/posts/${post.slug}`,
          category: '深度研究',
        });
      });
    }
  } catch {}

  // Search user's portfolio (if logged in)
  if (userData.user) {
    try {
      const { data: holdings } = await supabase
        .from('portfolio_holdings')
        .select('id, symbol, name, sector')
        .or(`symbol.ilike.${searchPattern},name.ilike.${searchPattern}`)
        .limit(5);

      if (holdings) {
        holdings.forEach(h => {
          results.push({
            id: `holding-${h.id}`,
            type: 'portfolio',
            title: h.symbol,
            subtitle: h.name || h.sector || '',
            url: `/market?symbol=${h.symbol}`,
            category: '持仓',
          });
        });
      }
    } catch {}

    // Search journal entries
    try {
      const { data: journals } = await supabase
        .from('decision_journals')
        .select('id, symbol, action, reasoning, created_at')
        .or(`symbol.ilike.${searchPattern},reasoning.ilike.${searchPattern}`)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (journals) {
        journals.forEach(j => {
          results.push({
            id: `journal-${j.id}`,
            type: 'journal',
            title: `${j.symbol} - ${j.action === 'buy' ? '买入' : j.action === 'sell' ? '卖出' : '持有'}`,
            subtitle: j.reasoning?.substring(0, 50),
            url: '/journal',
            category: '决策日志',
          });
        });
      }
    } catch {}

    // Search notifications
    try {
      const { data: alerts } = await supabase
        .from('user_alerts')
        .select('id, title, body, alert_type, symbol')
        .or(`title.ilike.${searchPattern},body.ilike.${searchPattern},symbol.ilike.${searchPattern}`)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (alerts) {
        alerts.forEach(a => {
          results.push({
            id: `alert-${a.id}`,
            type: 'notification',
            title: a.title,
            subtitle: a.symbol || a.alert_type,
            url: '/notifications',
            category: '预警通知',
          });
        });
      }
    } catch {}
  }

  // Static page matches
  const pageMatches: SearchResult[] = [
    { id: 'page-market', type: 'page', title: '行情', url: '/market', category: '页面' },
    { id: 'page-agents', type: 'page', title: 'AI 分析团队', url: '/agents', category: '页面' },
    { id: 'page-scenario', type: 'page', title: '情景模拟', url: '/scenario', category: '页面' },
    { id: 'page-portfolio', type: 'page', title: '持仓管理', url: '/portfolio', category: '页面' },
    { id: 'page-briefing', type: 'page', title: '每日晨报', url: '/briefing', category: '页面' },
    { id: 'page-daily', type: 'page', title: '每日助手', url: '/daily', category: '页面' },
    { id: 'page-butterfly', type: 'page', title: '蝴蝶效应', url: '/tools/butterfly', category: '页面' },
    { id: 'page-battle-map', type: 'page', title: '作战地图', url: '/battle-map', category: '页面' },
    { id: 'page-controversies', type: 'page', title: '争议地图', url: '/controversies', category: '页面' },
    { id: 'page-journal', type: 'page', title: '决策日志', url: '/journal', category: '页面' },
    { id: 'page-reviews', type: 'page', title: '周度复盘', url: '/reviews', category: '页面' },
    { id: 'page-predictions', type: 'page', title: '预测市场', url: '/predictions', category: '页面' },
    { id: 'page-tournament', type: 'page', title: '锦标赛', url: '/tournament', category: '页面' },
    { id: 'page-memory', type: 'page', title: '决策记忆', url: '/memory', category: '页面' },
    { id: 'page-notifications', type: 'page', title: '预警通知', url: '/notifications', category: '页面' },
  ];

  const lowerQuery = query.toLowerCase();
  const matchedPages = pageMatches.filter(p => 
    p.title.toLowerCase().includes(lowerQuery)
  );
  results.push(...matchedPages.slice(0, 3));

  // Remove duplicates and limit
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.id === result.id)
  ).slice(0, limit);

  return NextResponse.json({ ok: true, data: uniqueResults });
}
