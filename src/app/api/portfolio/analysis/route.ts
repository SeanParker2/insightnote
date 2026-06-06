import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePortfolioMetrics, calculateReturnAttribution } from '@/lib/portfolio-analysis';
import { createDataProvider } from '@/lib/data-provider';

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { data: portfolios } = await supabase
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userData.user.id)
      .limit(1);

    if (!portfolios?.length) {
      return NextResponse.json({ ok: true, data: null, message: 'no_portfolio' });
    }

    const { data: holdings } = await supabase
      .from('portfolio_holdings')
      .select('symbol, name, quantity, avg_cost, sector, asset_class')
      .eq('portfolio_id', portfolios[0].id);

    if (!holdings?.length) {
      return NextResponse.json({ ok: true, data: null, message: 'no_holdings' });
    }

    const provider = createDataProvider();
    const symbols = holdings.map(h => h.symbol);
    const quotes = await provider.getQuotes(symbols);
    
    const priceMap = new Map<string, number>();
    quotes.forEach(q => priceMap.set(q.symbol, q.price));

    const metrics = calculatePortfolioMetrics(
      holdings.map(h => ({
        symbol: h.symbol,
        name: h.name ?? undefined,
        quantity: h.quantity,
        avgCost: h.avg_cost,
        sector: h.sector ?? undefined,
        assetClass: h.asset_class ?? undefined,
      })),
      priceMap
    );

    return NextResponse.json({ ok: true, data: metrics });
  } catch (error: any) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'analysis_failed' }, { status: 500 });
  }
}
