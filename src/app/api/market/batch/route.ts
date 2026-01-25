import { NextResponse } from 'next/server';
import { generateMarketInsight } from '@/lib/ai-helper';

// Mock function to generate random market data
// In a real scenario, this would call a real market data API (e.g., Yahoo Finance, AlphaVantage)
function getMockMarketData(symbols: string[]) {
  const results: Record<string, { price: number; changePercent: number; lastUpdated: string }> = {};
  
  symbols.forEach(symbol => {
    // Generate a random price between 50 and 500
    const price = 50 + Math.random() * 450;
    
    // Generate a random change percent between -5% and +5%
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
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
  }
  
  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  if (symbols.length === 0) {
    return NextResponse.json({ data: {} });
  }
  
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const data = getMockMarketData(symbols);

  // Enhance with AI Insights (Limit to first 3 to avoid rate limits/timeouts in demo)
  // In production, you would cache these insights per hour/day
  const enrichedData: Record<string, any> = { ...data };
  
  const insightPromises = symbols.slice(0, 3).map(async (symbol) => {
    const info = data[symbol];
    if (info) {
      const reason = await generateMarketInsight(symbol, info.changePercent);
      enrichedData[symbol] = { ...info, reason };
    }
  });

  await Promise.all(insightPromises);
  
  return NextResponse.json(enrichedData);
}
