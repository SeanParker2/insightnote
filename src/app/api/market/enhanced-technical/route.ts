import { NextRequest, NextResponse } from 'next/server';
import { createDataProvider } from '@/lib/data-provider';
import { performTechnicalAnalysis } from '@/lib/technical-analysis';
import { getEnhancedIndicators, performEnhancedAnalysis } from '@/lib/technical-analysis/enhanced-indicators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, period = '3mo', enhanced = false } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const provider = createDataProvider();
    const klines = await provider.getKline(symbol, period);

    if (!klines || klines.length === 0) {
      return NextResponse.json(
        { error: 'No data available for this symbol' },
        { status: 404 }
      );
    }

    const baseAnalysis = performTechnicalAnalysis(symbol, klines);

    if (enhanced) {
      const enhancedIndicators = getEnhancedIndicators(klines);
      const enhancedAnalysis = performEnhancedAnalysis(klines);

      return NextResponse.json({
        success: true,
        data: {
          ...baseAnalysis,
          indicators: [...baseAnalysis.indicators, ...enhancedIndicators],
          enhanced: enhancedAnalysis,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: baseAnalysis,
    });
  } catch (error) {
    console.error('Technical analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform technical analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || '3mo';
  const enhanced = searchParams.get('enhanced') === 'true';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    const provider = createDataProvider();
    const klines = await provider.getKline(symbol, period as any);

    if (!klines || klines.length === 0) {
      return NextResponse.json(
        { error: 'No data available for this symbol' },
        { status: 404 }
      );
    }

    const baseAnalysis = performTechnicalAnalysis(symbol, klines);

    if (enhanced) {
      const enhancedIndicators = getEnhancedIndicators(klines);
      const enhancedAnalysis = performEnhancedAnalysis(klines);

      return NextResponse.json({
        success: true,
        data: {
          ...baseAnalysis,
          indicators: [...baseAnalysis.indicators, ...enhancedIndicators],
          enhanced: enhancedAnalysis,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: baseAnalysis,
    });
  } catch (error) {
    console.error('Technical analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform technical analysis' },
      { status: 500 }
    );
  }
}
