import { NextResponse } from 'next/server';
import { generateMarketInsight } from '@/lib/ai-helper';

function getMockMarketData(symbols: string[]) {
  const results: Record<string, { price: number; changePercent: number; lastUpdated: string }> = {};
  
  symbols.forEach(symbol => {
    const price = 50 + Math.random() * 450;
    const changePercent = (Math.random() * 10) - 4.5;
    
    results[symbol] = {
      price: Number(price.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      lastUpdated: new Date().toISOString()
    };
  });
  
  return results;
}

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
  
  const data = getMockMarketData(symbols);

  const enrichedData: Record<string, { price: number; changePercent: number; lastUpdated: string; reason?: string }> = { ...data };
  
  const insightPromises = symbols.slice(0, 3).map(async (symbol) => {
    const info = data[symbol];
    if (info) {
      const reason = await generateMarketInsight(symbol, info.changePercent);
      enrichedData[symbol] = { ...info, reason };
    }
  });

  await Promise.all(insightPromises);
  
  return NextResponse.json({ ok: true, data: enrichedData });
}
