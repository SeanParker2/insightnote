import { NextResponse } from 'next/server';
import { createDataProvider } from '@/lib/data-provider';
import { performTechnicalAnalysis, type IndicatorType } from '@/lib/technical-analysis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || '3mo';
  const indicatorsParam = searchParams.get('indicators');

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'missing_symbol' }, { status: 400 });
  }

  try {
    const provider = createDataProvider();
    const klines = await provider.getKline(symbol, period as any);

    if (klines.length === 0) {
      return NextResponse.json({ ok: false, error: 'no_data' }, { status: 404 });
    }

    const analysis = performTechnicalAnalysis(symbol, klines);

    // Filter indicators if specified
    if (indicatorsParam) {
      const requested = indicatorsParam.split(',').map(s => s.trim().toLowerCase());
      analysis.indicators = analysis.indicators.filter(i => 
        requested.includes(i.name.toLowerCase())
      );
    }

    return NextResponse.json({ ok: true, data: analysis });
  } catch (error: any) {
    console.error('Technical analysis error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
