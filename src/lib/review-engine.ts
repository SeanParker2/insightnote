import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildReviewPrompt } from '@/lib/prompts';

export async function generateWeeklyReview(userId: string, weekStart: string, weekEnd: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Get holdings
  const { data: portfolios } = await admin
    .from('user_portfolios')
    .select('id')
    .eq('user_id', userId);

  const portfolioIds = (portfolios ?? []).map((p) => p.id);
  const { data: holdings } = portfolioIds.length > 0
    ? await admin.from('portfolio_holdings').select('symbol, name, quantity, avg_cost, sector').in('portfolio_id', portfolioIds)
    : { data: [] };

  // Get reading history for the week
  const { data: readings } = await admin
    .from('user_reading_history')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekStart)
    .lte('created_at', weekEnd);

  const postIds = (readings ?? []).map((r) => r.post_id);
  const { data: articles } = postIds.length > 0
    ? await admin.from('posts').select('title, sentiment, tags').in('id', postIds)
    : { data: [] };

  // Get predictions for the week
  const { data: predictions } = await admin
    .from('predictions')
    .select('symbol, direction, status, target_price, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekStart)
    .lte('created_at', weekEnd);

  // Get decision journal entries
  const { data: decisions } = await admin
    .from('decision_journals')
    .select('symbol, action, emotion_label, expected_direction, actual_return_pct, created_at')
    .eq('user_id', userId)
    .gte('created_at', weekStart)
    .lte('created_at', weekEnd);

  // Analyze reading sentiment
  const sentimentDist = { bullish: 0, bearish: 0, neutral: 0 };
  const tagCounts = new Map<string, number>();
  (articles ?? []).forEach((a) => {
    if (a.sentiment === 'bullish') sentimentDist.bullish++;
    else if (a.sentiment === 'bearish') sentimentDist.bearish++;
    else sentimentDist.neutral++;
    (a.tags ?? []).forEach((t: string) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
  });

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Prediction accuracy
  const completedPreds = (predictions ?? []).filter((p) => p.status === 'won' || p.status === 'lost');
  const wonPreds = completedPreds.filter((p) => p.status === 'won');

  // AI analysis
  const holdingsStr = (holdings ?? []).map((h) => h.symbol).join('、') || '无持仓';
  const readingStr = (articles ?? []).slice(0, 5).map((a) => a.title).join('；') || '无阅读';
  const decisionsStr = (decisions ?? []).map((d) => `${d.symbol} ${d.action}(${d.emotion_label ?? '无情绪'})`).join('；') || '无决策';

  let aiInsights = '';
  try {
    const { system, user } = buildReviewPrompt({
      holdingsStr,
      readingStr,
      decisionsStr,
      completedPreds: completedPreds.length,
      wonPreds: wonPreds.length,
      sentimentDist,
    });

    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 200,
    });
    aiInsights = completion.choices[0].message.content ?? '';
  } catch {
    aiInsights = '本周复盘生成失败，请稍后再试。';
  }

  // Check confirmation bias
  const totalSentiment = sentimentDist.bullish + sentimentDist.bearish + sentimentDist.neutral;
  const confirmationBias = totalSentiment >= 3 && (
    sentimentDist.bullish / totalSentiment > 0.8 || sentimentDist.bearish / totalSentiment > 0.8
  );

  const review = {
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    portfolio_return_pct: null, // Would need real market data
    benchmark_return_pct: null,
    alpha: null,
    top_contributors: [],
    reading_summary: {
      articles_read: articles?.length ?? 0,
      top_tags: topTags,
      sentiment_distribution: sentimentDist,
    },
    bias_analysis: {
      confirmation_bias_detected: confirmationBias,
      description: confirmationBias
        ? `本周阅读的文章中${sentimentDist.bullish > sentimentDist.bearish ? '看多' : '看空'}观点占绝对主导，可能存在确认偏差`
        : '本周阅读情绪分布较为均衡',
      recommendation: confirmationBias
        ? '建议下周主动关注一些相反方向的分析，避免信息茧房'
        : '继续保持多元化的信息来源',
    },
    prediction_accuracy: {
      total: completedPreds.length,
      correct: wonPreds.length,
      accuracy_pct: completedPreds.length > 0 ? Math.round((wonPreds.length / completedPreds.length) * 100) : 0,
    },
    ai_insights: aiInsights,
  };

  // Save
  await admin
    .from('weekly_reviews')
    .upsert(review, { onConflict: 'user_id,week_start' });

  return review;
}

export async function generateAllWeeklyReviews() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()); // Last Sunday
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6); // Previous Monday

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data: prefs } = await admin
    .from('user_preferences')
    .select('user_id')
    .eq('weekly_review_enabled', true);

  if (!prefs || prefs.length === 0) return { generated: 0 };

  let generated = 0;
  for (const pref of prefs) {
    try {
      await generateWeeklyReview(pref.user_id, weekStartStr, weekEndStr);
      generated++;
    } catch (error) {
      console.error(`Failed to generate review for ${pref.user_id}:`, error);
    }
  }

  return { generated, week_start: weekStartStr, week_end: weekEndStr };
}
