import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFullAnalysis } from '@/lib/agents';
import { createDataProvider } from '@/lib/data-provider';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 20);

  let query = supabase
    .from('agent_analyses')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (symbol) {
    query = query.eq('symbol', symbol.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const symbol = body?.symbol;

  if (!symbol || typeof symbol !== 'string') {
    return NextResponse.json({ ok: false, error: 'missing_symbol' }, { status: 400 });
  }

  try {
    const provider = createDataProvider();

    const [quote, financials, news, klines] = await Promise.allSettled([
      provider.getQuote(symbol),
      provider.getFinancials(symbol),
      provider.getNews(symbol, 10),
      provider.getKline(symbol, '3mo'),
    ]);

    // Only get current user's holdings for this symbol
    const { data: portfolios } = await supabase
      .from('user_portfolios')
      .select('id')
      .eq('user_id', userData.user.id);

    const portfolioIds = (portfolios ?? []).map(p => p.id);
    const { data: holdings } = portfolioIds.length > 0
      ? await supabase
          .from('portfolio_holdings')
          .select('symbol, quantity, avg_cost')
          .eq('symbol', symbol)
          .in('portfolio_id', portfolioIds)
      : { data: [] };

    const result = await runFullAnalysis({
      symbol: symbol.toUpperCase(),
      quote: quote.status === 'fulfilled' ? quote.value : null,
      financials: financials.status === 'fulfilled' ? financials.value : null,
      news: news.status === 'fulfilled' ? news.value : [],
      klines: klines.status === 'fulfilled' ? klines.value : [],
      userHoldings: holdings?.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avgCost: h.avg_cost,
      })),
    });

    // Save analysis result to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('agent_analyses')
      .insert({
        user_id: userData.user.id,
        symbol: symbol.toUpperCase(),
        analysis_result: result,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
      // Still return the result even if saving fails
    }

    return NextResponse.json({ 
      ok: true, 
      data: result,
      saved_id: savedAnalysis?.id,
    });
  } catch (error: any) {
    console.error('Agent analysis error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'analysis_failed' },
      { status: 500 }
    );
  }
}
