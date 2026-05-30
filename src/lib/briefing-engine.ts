import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildBriefingPrompt } from '@/lib/prompts';

export interface UserContext {
  userId: string;
  email: string;
  holdings: Array<{ symbol: string; name: string | null; quantity: number; avg_cost: number; sector: string | null }>;
  watchlist: string[];
  recentArticles: Array<{ title: string; summary_tldr: string; sentiment: string | null; tags: string[] }>;
  recentPredictions: Array<{ symbol: string; direction: string; status: string }>;
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

  const symbols = [
    ...ctx.holdings.map((h) => h.symbol),
    ...ctx.watchlist,
  ];
  const uniqueSymbols = [...new Set(symbols)];

  const holdingsContext = ctx.holdings.length > 0
    ? `用户持仓：${ctx.holdings.map((h) => `${h.symbol}(${h.name ?? '未知'}, ${h.quantity}股, 成本${h.avg_cost})`).join('；')}`
    : '用户暂无持仓';

  const watchlistContext = ctx.watchlist.length > 0
    ? `关注列表：${ctx.watchlist.join('、')}`
    : '';

  const readingContext = ctx.recentArticles.length > 0
    ? `最近阅读：${ctx.recentArticles.slice(0, 5).map((a) => `[${a.title}](${a.sentiment ?? 'neutral'})`).join('；')}`
    : '';

  const predictionContext = ctx.recentPredictions.length > 0
    ? `历史预测：${ctx.recentPredictions.map((p) => `${p.symbol} ${p.direction}(${p.status})`).join('；')}`
    : '';

  const { system, user } = buildBriefingPrompt(ctx);

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const result = JSON.parse(content);
    return {
      headline: result.headline ?? '今日市场概览',
      portfolio_summary: result.portfolio_summary ?? {},
      top_events: Array.isArray(result.top_events) ? result.top_events : [],
      watchlist_items: Array.isArray(result.watchlist_items) ? result.watchlist_items : [],
      bias_warning: result.bias_warning ?? null,
      ai_analysis: result.ai_analysis ?? '',
    };
  } catch (error) {
    console.error('Briefing generation failed:', error);
    return null;
  }
}

export async function generateAllBriefings() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Get users with briefing enabled
  const { data: prefs } = await admin
    .from('user_preferences')
    .select('user_id, watchlist')
    .eq('briefing_enabled', true);

  if (!prefs || prefs.length === 0) {
    return { generated: 0 };
  }

  // Get all user profiles
  const userIds = prefs.map((p) => p.user_id);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  const profileMap = new Map<string, string>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, p.email));

  let generated = 0;

  for (const pref of prefs) {
    const userId = pref.user_id;
    const email = profileMap.get(userId) ?? '';

    // Get holdings
    const { data: portfolios } = await admin
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userId);

    const portfolioIds = (portfolios ?? []).map((p) => p.id);
    const { data: holdings } = portfolioIds.length > 0
      ? await admin
          .from('portfolio_holdings')
          .select('symbol, name, quantity, avg_cost, sector')
          .in('portfolio_id', portfolioIds)
      : { data: [] };

    // Get recent reading
    const { data: readings } = await admin
      .from('user_reading_history')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const postIds = (readings ?? []).map((r) => r.post_id);
    const { data: articles } = postIds.length > 0
      ? await admin
          .from('posts')
          .select('title, summary_tldr, sentiment, tags')
          .in('id', postIds)
      : { data: [] };

    // Get recent predictions
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

    // Save briefing
    await admin
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
