import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Get recent articles (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: articles } = await supabase
    .from('posts')
    .select('id, title, summary_tldr, sentiment, tags, related_tickers, published_at, source_institution')
    .gte('published_at', oneDayAgo)
    .order('published_at', { ascending: false })
    .limit(30);

  if (!articles || articles.length === 0) {
    return NextResponse.json({ ok: true, data: { events: [], heatmap: [] } });
  }

  // Categorize by asset class and sentiment
  const assetClasses = ['股票', '债券', '商品', '外汇', '加密货币', '宏观'] as const;
  const heatmap: Array<{
    asset_class: string;
    hour: number;
    intensity: number;
    sentiment: string;
    count: number;
  }> = [];

  for (const ac of assetClasses) {
    for (let h = 0; h < 24; h++) {
      const matching = articles.filter((a) => {
        const articleHour = new Date(a.published_at).getHours();
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const matchesAsset = ac === '宏观' || tags.some((t: string) => t.includes(ac));
        return matchesAsset && articleHour === h;
      });

      if (matching.length > 0) {
        const bullish = matching.filter((a) => a.sentiment === 'bullish').length;
        const bearish = matching.filter((a) => a.sentiment === 'bearish').length;
        heatmap.push({
          asset_class: ac,
          hour: h,
          intensity: matching.length,
          sentiment: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
          count: matching.length,
        });
      }
    }
  }

  // Top events by impact (most tickers mentioned)
  const events = articles
    .map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary_tldr,
      sentiment: a.sentiment,
      tickers: Array.isArray(a.related_tickers) ? a.related_tickers : [],
      tags: Array.isArray(a.tags) ? a.tags : [],
      published_at: a.published_at,
      source: a.source_institution,
      impact_score: (Array.isArray(a.related_tickers) ? a.related_tickers.length : 0) + (Array.isArray(a.tags) ? a.tags.length : 0),
    }))
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 10);

  return NextResponse.json({ ok: true, data: { events, heatmap } });
}
