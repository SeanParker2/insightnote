import { NextResponse } from 'next/server';
import { createDataProvider } from '@/lib/data-provider';
import { generateMarketInsight } from '@/lib/ai-helper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  
  if (!symbolsParam) {
    return NextResponse.json({ ok: false, error: 'missing_symbols' }, { status: 400 });
  }
  
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  if (symbols.length === 0) {
    return NextResponse.json({ ok: true, data: {} });
  }

  try {
    const provider = createDataProvider();
    const quotes = await provider.getQuotes(symbols);

    const data: Record<string, { price: number; changePercent: number; lastUpdated: string; reason?: string }> = {};

    for (const quote of quotes) {
      data[quote.symbol] = {
        price: quote.price,
        changePercent: quote.changePercent,
        lastUpdated: quote.timestamp,
      };
    }

    // Add AI insights for up to 3 symbols
    const symbolsWithQuotes = quotes.filter(q => q.price > 0).slice(0, 3);
    const insightPromises = symbolsWithQuotes.map(async (quote) => {
      try {
        const reason = await generateMarketInsight(quote.symbol, quote.changePercent);
        if (data[quote.symbol]) {
          data[quote.symbol].reason = reason;
        }
      } catch {
        // Non-critical
      }
    });

    await Promise.all(insightPromises);
    
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error('Batch market error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
