import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const status = searchParams.get('status') || 'active';
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  let query = supabase
    .from('predictions')
    .select('id, post_id, user_id, symbol, direction, start_price, target_price, timeframe_days, status, reasoning, confidence, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (symbol) {
    query = query.eq('symbol', symbol.toUpperCase());
  }
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  // Get endorsement counts
  const predictions = data ?? [];
  const predictionIds = predictions.map((p) => p.id);

  const { data: endorsements } = predictionIds.length > 0
    ? await supabase
        .from('prediction_endorsements')
        .select('prediction_id')
        .in('prediction_id', predictionIds)
    : { data: [] };

  const endorsementMap = new Map<string, number>();
  (endorsements ?? []).forEach((e) => {
    endorsementMap.set(e.prediction_id, (endorsementMap.get(e.prediction_id) ?? 0) + 1);
  });

  const enriched = predictions.map((p) => ({
    ...p,
    endorsement_count: endorsementMap.get(p.id) ?? 0,
  }));

  return NextResponse.json({ ok: true, data: enriched });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`prediction:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
  const direction = ['bullish', 'bearish', 'neutral'].includes(body.direction) ? body.direction : null;
  const post_id = typeof body.post_id === 'string' ? body.post_id : null;

  if (!symbol || !direction) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const prediction = {
    post_id: post_id || null, // Allow null for standalone predictions
    user_id: userData.user.id,
    symbol,
    direction,
    start_price: typeof body.start_price === 'number' ? body.start_price : null,
    target_price: typeof body.target_price === 'number' ? body.target_price : null,
    timeframe_days: typeof body.timeframe_days === 'number' ? body.timeframe_days : null,
    reasoning: typeof body.reasoning === 'string' ? body.reasoning.trim().slice(0, 500) : null,
    confidence: typeof body.confidence === 'number' ? Math.max(1, Math.min(10, body.confidence)) : null,
    status: 'active',
  };

  const { data, error } = await supabase
    .from('predictions')
    .insert(prediction)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
