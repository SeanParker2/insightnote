import { NextResponse } from 'next/server';
import { createDataProvider } from '@/lib/data-provider';

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || '3mo';
  const type = searchParams.get('type') || 'quote';

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'missing_symbol' }, { status: 400 });
  }

  const provider = createDataProvider();

  try {
    switch (type) {
      case 'kline': {
        const klines = await provider.getKline(symbol, period as any);
        return NextResponse.json({ ok: true, data: klines });
      }
      case 'financials': {
        const financials = await provider.getFinancials(symbol);
        return NextResponse.json({ ok: true, data: financials });
      }
      case 'news': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const news = await provider.getNews(symbol, limit);
        return NextResponse.json({ ok: true, data: news });
      }
      case 'search': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const results = await provider.search(symbol, limit);
        return NextResponse.json({ ok: true, data: results });
      }
      case 'quote':
      default: {
        const quote = await provider.getQuote(symbol);
        return NextResponse.json({ ok: true, data: quote });
      }
    }
  } catch (error: any) {
    console.error(`Market API error for ${symbol}:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'fetch_failed' },
      { status: 500 }
    );
  }
}
