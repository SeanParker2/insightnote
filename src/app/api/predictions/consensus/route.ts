import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'missing_symbol' }, { status: 400 });
  }

  const { data: predictions } = await supabase
    .from('predictions')
    .select('direction, target_price, confidence')
    .eq('symbol', symbol.toUpperCase())
    .eq('status', 'active');

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({
      ok: true,
      data: {
        symbol: symbol.toUpperCase(),
        bullish_count: 0,
        bearish_count: 0,
        neutral_count: 0,
        avg_target_price: null,
        consensus_direction: 'neutral',
        total_predictions: 0,
      },
    });
  }

  const bullish = predictions.filter((p) => p.direction === 'bullish');
  const bearish = predictions.filter((p) => p.direction === 'bearish');
  const neutral = predictions.filter((p) => p.direction === 'neutral');

  const targetPrices = predictions
    .filter((p) => p.target_price != null)
    .map((p) => Number(p.target_price));

  const avgTarget = targetPrices.length > 0
    ? targetPrices.reduce((a, b) => a + b, 0) / targetPrices.length
    : null;

  let consensus: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (bullish.length > bearish.length && bullish.length > neutral.length) consensus = 'bullish';
  else if (bearish.length > bullish.length && bearish.length > neutral.length) consensus = 'bearish';

  return NextResponse.json({
    ok: true,
    data: {
      symbol: symbol.toUpperCase(),
      bullish_count: bullish.length,
      bearish_count: bearish.length,
      neutral_count: neutral.length,
      avg_target_price: avgTarget ? Number(avgTarget.toFixed(2)) : null,
      consensus_direction: consensus,
      total_predictions: predictions.length,
    },
  });
}
