import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildAlertAnalysisPrompt } from '@/lib/prompts';

interface AlertContext {
  userId: string;
  holdings: Array<{ symbol: string; name: string | null; sector: string | null }>;
  watchlist: string[];
  recentArticles: Array<{ title: string; summary_tldr: string; sentiment: string | null; related_tickers: string[] }>;
  recentPredictions: Array<{ symbol: string; direction: string; status: string; confidence: number | null }>;
  readingHistory: Array<{ sentiment: string | null; tags: string[] }>;
}

export async function checkAndGenerateAlerts(ctx: AlertContext): Promise<Array<{
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  symbol: string | null;
  metadata: Record<string, unknown>;
}>> {
  const alerts: Array<{
    alert_type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    body: string;
    symbol: string | null;
    metadata: Record<string, unknown>;
  }> = [];

  const allSymbols = [...new Set([
    ...ctx.holdings.map((h) => h.symbol),
    ...ctx.watchlist,
  ])];

  if (allSymbols.length === 0) return alerts;

  // 1. Confirmation Bias Detection
  const sentiments = ctx.readingHistory.map((r) => r.sentiment).filter(Boolean);
  if (sentiments.length >= 5) {
    const bullishCount = sentiments.filter((s) => s === 'bullish').length;
    const bearishCount = sentiments.filter((s) => s === 'bearish').length;
    const total = sentiments.length;

    if (bullishCount / total > 0.8) {
      alerts.push({
        alert_type: 'bias_warning',
        severity: 'warning',
        title: '确认偏差预警',
        body: `你最近阅读的文章中 ${Math.round((bullishCount / total) * 100)}% 是看多观点。你的持仓方向与阅读偏好高度一致，可能正在陷入确认偏差。建议主动寻找一些看空观点来平衡认知。`,
        symbol: null,
        metadata: { bias_type: 'confirmation', bullish_pct: Math.round((bullishCount / total) * 100) },
      });
    } else if (bearishCount / total > 0.8) {
      alerts.push({
        alert_type: 'bias_warning',
        severity: 'warning',
        title: '确认偏差预警',
        body: `你最近阅读的文章中 ${Math.round((bearishCount / total) * 100)}% 是看空观点。你的阅读偏好过于单一，可能正在陷入确认偏差。建议关注一些看多分析。`,
        symbol: null,
        metadata: { bias_type: 'confirmation', bearish_pct: Math.round((bearishCount / total) * 100) },
      });
    }
  }

  // 2. Prediction Concentration Risk
  const activePredictions = ctx.recentPredictions.filter((p) => p.status === 'active');
  if (activePredictions.length >= 3) {
    const bullishPreds = activePredictions.filter((p) => p.direction === 'bullish');
    const bearishPreds = activePredictions.filter((p) => p.direction === 'bearish');

    if (bullishPreds.length > activePredictions.length * 0.8) {
      alerts.push({
        alert_type: 'bias_warning',
        severity: 'info',
        title: '预测方向集中',
        body: `你的 ${activePredictions.length} 个活跃预测中，${bullishPreds.length} 个是看多的。过度集中的方向可能意味着风险暴露过高。`,
        symbol: null,
        metadata: { prediction_direction: 'bullish_concentration' },
      });
    }
  }

  // 3. AI-powered analysis for news impact on holdings
  if (ctx.holdings.length > 0 && ctx.recentArticles.length > 0) {
    const holdingsStr = ctx.holdings.map((h) => `${h.symbol}(${h.name ?? ''})`).join('、');
    const newsStr = ctx.recentArticles.slice(0, 5).map((a) => `[${a.title}] ${a.summary_tldr}`).join('\n');

    try {
      const { system, user } = buildAlertAnalysisPrompt(holdingsStr, newsStr);

      const completion = await deepseek.chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        model: 'deepseek-chat',
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (content) {
        const result = JSON.parse(content);
        if (result.has_alert) {
          alerts.push({
            alert_type: 'news_impact',
            severity: result.severity ?? 'info',
            title: result.title ?? '新闻影响预警',
            body: result.body ?? '',
            symbol: result.symbol ?? null,
            metadata: { source: 'ai_analysis' },
          });
        }
      }
    } catch {
      // Non-critical, skip
    }
  }

  return alerts;
}

export async function runAlertScan() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Get all users
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .limit(100);

  if (!profiles) return { scanned: 0, alerts_generated: 0 };

  let totalAlerts = 0;

  for (const profile of profiles) {
    const userId = profile.id;

    // Get holdings
    const { data: portfolios } = await admin
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userId);

    const portfolioIds = (portfolios ?? []).map((p) => p.id);
    const { data: holdings } = portfolioIds.length > 0
      ? await admin.from('portfolio_holdings').select('symbol, name, sector').in('portfolio_id', portfolioIds)
      : { data: [] };

    // Get preferences
    const { data: prefs } = await admin
      .from('user_preferences')
      .select('watchlist')
      .eq('user_id', userId)
      .maybeSingle();

    // Get recent reading
    const { data: readings } = await admin
      .from('user_reading_history')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const postIds = (readings ?? []).map((r) => r.post_id);
    const { data: articles } = postIds.length > 0
      ? await admin.from('posts').select('title, summary_tldr, sentiment, related_tickers').in('id', postIds)
      : { data: [] };

    // Get predictions
    const { data: predictions } = await admin
      .from('predictions')
      .select('symbol, direction, status, confidence')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const readingHistory = (articles ?? []).map((a) => ({ sentiment: a.sentiment, tags: [] }));

    const ctx: AlertContext = {
      userId,
      holdings: (holdings ?? []) as AlertContext['holdings'],
      watchlist: Array.isArray(prefs?.watchlist) ? prefs.watchlist : [],
      recentArticles: (articles ?? []) as AlertContext['recentArticles'],
      recentPredictions: (predictions ?? []) as AlertContext['recentPredictions'],
      readingHistory,
    };

    const alerts = await checkAndGenerateAlerts(ctx);

    // Save alerts
    if (alerts.length > 0) {
      const rows = alerts.map((a) => ({
        user_id: userId,
        alert_type: a.alert_type,
        severity: a.severity,
        title: a.title,
        body: a.body,
        symbol: a.symbol,
        metadata: a.metadata,
      }));
      await admin.from('alerts').insert(rows);
      totalAlerts += alerts.length;
    }
  }

  return { scanned: profiles.length, alerts_generated: totalAlerts };
}
