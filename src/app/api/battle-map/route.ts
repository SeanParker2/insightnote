import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDataProvider } from '@/lib/data-provider';

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
    return NextResponse.json({ ok: true, data: { events: [], heatmap: [], marketContext: {} } });
  }

  // Collect all unique tickers from articles
  const allTickers = new Set<string>();
  articles.forEach(a => {
    if (Array.isArray(a.related_tickers)) {
      a.related_tickers.forEach((t: string) => allTickers.add(t));
    }
  });

  // Fetch real-time market data for mentioned tickers
  let marketData: Array<{ symbol: string; price: number; change: number; changePercent: number; volume: number }> = [];
  if (allTickers.size > 0) {
    try {
      const provider = createDataProvider();
      const quotes = await provider.getQuotes(Array.from(allTickers));
      marketData = quotes.map(q => ({
        symbol: q.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
      }));
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }

  // Calculate market volatility context
  const marketContext = {
    totalTickers: allTickers.size,
    avgChange: marketData.length > 0 
      ? marketData.reduce((sum, m) => sum + m.changePercent, 0) / marketData.length 
      : 0,
    volatileTickers: marketData.filter(m => Math.abs(m.changePercent) > 3).length,
    highVolumeTickers: marketData.filter(m => m.volume > 1000000).length,
  };

  // Categorize by asset class and sentiment
  const assetClasses = ['股票', '债券', '商品', '外汇', '加密货币', '宏观'] as const;
  const heatmap: Array<{
    asset_class: string;
    hour: number;
    intensity: number;
    sentiment: string;
    count: number;
    avgMarketChange: number;
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
        
        // Calculate average market change for related tickers
        const relatedTickers = matching.flatMap(a => Array.isArray(a.related_tickers) ? a.related_tickers : []);
        const relatedMarketData = marketData.filter(m => relatedTickers.includes(m.symbol));
        const avgMarketChange = relatedMarketData.length > 0
          ? relatedMarketData.reduce((sum, m) => sum + m.changePercent, 0) / relatedMarketData.length
          : 0;

        heatmap.push({
          asset_class: ac,
          hour: h,
          intensity: matching.length + (relatedMarketData.length > 0 ? 1 : 0),
          sentiment: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
          count: matching.length,
          avgMarketChange,
        });
      }
    }
  }

  // Top events by impact (enhanced with market data)
  const events = articles
    .map((a) => {
      const tickers = Array.isArray(a.related_tickers) ? a.related_tickers : [];
      const relatedMarketData = marketData.filter(m => tickers.includes(m.symbol));
      const avgChange = relatedMarketData.length > 0
        ? relatedMarketData.reduce((sum, m) => sum + Math.abs(m.changePercent), 0) / relatedMarketData.length
        : 0;
      
      return {
        id: a.id,
        title: a.title,
        summary: a.summary_tldr,
        sentiment: a.sentiment,
        tickers,
        tags: Array.isArray(a.tags) ? a.tags : [],
        published_at: a.published_at,
        source: a.source_institution,
        impact_score: tickers.length + (Array.isArray(a.tags) ? a.tags.length : 0) + (avgChange > 3 ? 2 : avgChange > 1 ? 1 : 0),
        marketImpact: relatedMarketData.map(m => ({
          symbol: m.symbol,
          change: m.changePercent,
          volume: m.volume,
        })),
      };
    })
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 10);

  return NextResponse.json({ ok: true, data: { events, heatmap, marketContext } });
}
