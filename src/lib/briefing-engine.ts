import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai-utils';
import { buildBriefingPrompt } from '@/lib/prompts';
import { createDataProvider } from '@/lib/data-provider';

export interface UserContext {
  userId: string;
  email: string;
  holdings: Array<{ symbol: string; name: string | null; quantity: number; avg_cost: number; sector: string | null }>;
  watchlist: string[];
  recentArticles: Array<{ title: string; summary_tldr: string; sentiment: string | null; tags: string[] }>;
  recentPredictions: Array<{ symbol: string; direction: string; status: string }>;
  marketData?: {
    holdingsQuotes: Array<{ symbol: string; price: number; change: number; changePercent: number }>;
    watchlistQuotes: Array<{ symbol: string; price: number; change: number; changePercent: number }>;
  };
}

async function fetchMarketData(symbols: string[]): Promise<Array<{ symbol: string; price: number; change: number; changePercent: number }>> {
  if (symbols.length === 0) return [];
  
  try {
    const provider = createDataProvider();
    const quotes = await provider.getQuotes(symbols);
    return quotes.map(q => ({
      symbol: q.symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
    }));
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return [];
  }
}

export async function generateBriefingForUser(ctx: UserContext): Promise<{
  headline: string;
  portfolio_summary: Record<string, unknown>;
  top_events: Record<string, unknown>[];
  watchlist_items: Record<string, unknown>[];
  bias_warning: string | null;
  ai_analysis: string;
} | null> {
  if (ctx.holdings.length === 0 && ctx.watchlist.length === 0) {
    return null;
  }

  // Fetch real-time market data
  const holdingSymbols = ctx.holdings.map(h => h.symbol);
  const allSymbols = [...new Set([...holdingSymbols, ...ctx.watchlist])];
  
  const [holdingsQuotes, watchlistQuotes] = await Promise.all([
    fetchMarketData(holdingSymbols),
    fetchMarketData(ctx.watchlist),
  ]);

  ctx.marketData = { holdingsQuotes, watchlistQuotes };

  const { system, user } = buildBriefingPrompt(ctx);

  const result = await callAI<{
    headline?: string;
    portfolio_summary?: Record<string, unknown>;
    top_events?: Record<string, unknown>[];
    watchlist_items?: Record<string, unknown>[];
    bias_warning?: string | null;
    ai_analysis?: string;
  }>({ system, user, temperature: 0.3, maxTokens: 1500, responseFormat: 'json_object' });

  if (!result.success || !result.data) {
    console.error('Briefing generation failed:', result.error);
    return null;
  }

  const data = result.data;
  return {
    headline: data.headline ?? '今日市场概览',
    portfolio_summary: data.portfolio_summary ?? {},
    top_events: Array.isArray(data.top_events) ? data.top_events : [],
    watchlist_items: Array.isArray(data.watchlist_items) ? data.watchlist_items : [],
    bias_warning: data.bias_warning ?? null,
    ai_analysis: data.ai_analysis ?? '',
  };
}

export async function generateAllBriefings() {
  const admin = getSupabaseAdmin();

  const { data: prefs } = await admin
    .from('user_preferences')
    .select('user_id, watchlist')
    .eq('briefing_enabled', true);

  if (!prefs || prefs.length === 0) {
    return { generated: 0 };
  }

  const typedPrefs = prefs as Array<{ user_id: string; watchlist: string[] }>;
  const userIds = typedPrefs.map(p => p.user_id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  const profileMap = new Map<string, string>();
  (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p.email));

  let generated = 0;

  for (const pref of typedPrefs) {
    const userId = pref.user_id;
    const email = profileMap.get(userId) ?? '';

    const { data: portfolios } = await admin
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userId);

    const portfolioIds = (portfolios ?? []).map((p: any) => p.id);
    const { data: holdings } = portfolioIds.length > 0
      ? await admin
          .from('portfolio_holdings')
          .select('symbol, name, quantity, avg_cost, sector')
          .in('portfolio_id', portfolioIds)
      : { data: [] };

    const { data: readings } = await admin
      .from('user_reading_history')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const postIds = (readings ?? []).map((r: any) => r.post_id);
    const { data: articles } = postIds.length > 0
      ? await admin
          .from('posts')
          .select('title, summary_tldr, sentiment, tags')
          .in('id', postIds)
      : { data: [] };

    const { data: predictions } = await admin
      .from('predictions')
      .select('symbol, direction, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const ctx: UserContext = {
      userId,
      email,
      holdings: (holdings ?? []) as UserContext['holdings'],
      watchlist: Array.isArray(pref.watchlist) ? pref.watchlist : [],
      recentArticles: (articles ?? []) as UserContext['recentArticles'],
      recentPredictions: (predictions ?? []) as UserContext['recentPredictions'],
    };

    const briefing = await generateBriefingForUser(ctx);
    if (!briefing) continue;

    await (admin as any)
      .from('daily_briefings')
      .upsert(
        {
          user_id: userId,
          briefing_date: new Date().toISOString().split('T')[0],
          headline: briefing.headline,
          portfolio_summary: briefing.portfolio_summary,
          top_events: briefing.top_events,
          watchlist_items: briefing.watchlist_items,
          bias_warning: briefing.bias_warning,
          ai_analysis: briefing.ai_analysis,
        },
        { onConflict: 'user_id,briefing_date' },
      );

    generated++;
  }

  return { generated };
}
