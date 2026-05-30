import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 20);

  // Get user's reading history to understand preferences
  const { data: readings } = await supabase
    .from('user_reading_history')
    .select('post_id')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const readPostIds = new Set((readings ?? []).map((r) => r.post_id));

  // Get user's holdings for relevance matching
  const { data: portfolios } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('user_id', userData.user.id);

  const portfolioIds = (portfolios ?? []).map((p) => p.id);
  const { data: holdings } = portfolioIds.length > 0
    ? await supabase.from('portfolio_holdings').select('symbol, sector').in('portfolio_id', portfolioIds)
    : { data: [] };

  const userSymbols = new Set((holdings ?? []).map((h) => h.symbol));
  const userSectors = new Set((holdings ?? []).map((h) => h.sector).filter(Boolean));

  // Get reading sentiment distribution for bias detection
  const readPostIdArray = Array.from(readPostIds);
  const { data: readArticles } = readPostIdArray.length > 0
    ? await supabase.from('posts').select('sentiment, tags, related_tickers').in('id', readPostIdArray.slice(0, 20))
    : { data: [] };

  let bullishCount = 0;
  let bearishCount = 0;
  const readTags = new Set<string>();
  const readTickers = new Set<string>();

  (readArticles ?? []).forEach((a) => {
    if (a.sentiment === 'bullish') bullishCount++;
    if (a.sentiment === 'bearish') bearishCount++;
    (a.tags ?? []).forEach((t: string) => readTags.add(t));
    (a.related_tickers ?? []).forEach((t: string) => readTickers.add(t));
  });

  // Determine recommendation strategy
  const totalSentiment = bullishCount + bearishCount;
  const isBiased = totalSentiment >= 3 && (bullishCount / totalSentiment > 0.75 || bearishCount / totalSentiment > 0.75);
  const biasedDirection = bullishCount > bearishCount ? 'bullish' : 'bearish';

  // Fetch candidate articles (not yet read, recent)
  const { data: candidates } = await supabase
    .from('posts')
    .select('id, slug, title, summary_tldr, sentiment, tags, related_tickers, is_premium, published_at, source_institution')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, data: [], strategy: 'no_candidates' });
  }

  // Score each candidate
  const scored = candidates
    .filter((c) => !readPostIds.has(c.id))
    .map((c) => {
      let score = 0;
      const tags = Array.isArray(c.tags) ? c.tags : [];
      const tickers = Array.isArray(c.related_tickers) ? c.related_tickers : [];

      // Relevance to holdings (high weight)
      tickers.forEach((t: string) => {
        if (userSymbols.has(t)) score += 10;
      });
      tags.forEach((t: string) => {
        if (userSectors.has(t)) score += 5;
      });

      // Bias correction (if user is biased, recommend opposite direction)
      if (isBiased) {
        if (biasedDirection === 'bullish' && c.sentiment === 'bearish') score += 8;
        if (biasedDirection === 'bearish' && c.sentiment === 'bullish') score += 8;
      }

      // Novelty (new tickers user hasn't read about)
      tickers.forEach((t: string) => {
        if (!readTickers.has(t)) score += 2;
      });

      // Recency bonus
      const ageHours = (Date.now() - new Date(c.published_at).getTime()) / (1000 * 60 * 60);
      if (ageHours < 6) score += 3;
      else if (ageHours < 24) score += 1;

      return { ...c, recommendation_score: score, reason: buildReason(c, userSymbols, isBiased, biasedDirection) };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    data: scored,
    strategy: {
      bias_correction: isBiased,
      user_holdings: Array.from(userSymbols),
      read_count: readPostIds.size,
    },
  });
}

function buildReason(
  article: { sentiment: string | null; tags: string[]; related_tickers: string[] },
  userSymbols: Set<string>,
  isBiased: boolean,
  biasedDirection: string,
): string {
  const reasons: string[] = [];
  const tickers = Array.isArray(article.related_tickers) ? article.related_tickers : [];

  const matchingHoldings = tickers.filter((t) => userSymbols.has(t));
  if (matchingHoldings.length > 0) {
    reasons.push(`与你的持仓相关(${matchingHoldings.join(', ')})`);
  }

  if (isBiased && article.sentiment !== biasedDirection && article.sentiment !== 'neutral') {
    reasons.push('平衡你的阅读偏好');
  }

  if (reasons.length === 0) {
    reasons.push('推荐');
  }

  return reasons.join(' · ');
}
