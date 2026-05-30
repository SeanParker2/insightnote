import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const ALLOWED_ACTIONS = ['buy', 'sell', 'hold', 'reduce', 'add'] as const;
const ALLOWED_EMOTIONS = ['confident', 'neutral', 'hesitant', 'fearful', 'greedy'] as const;
const ALLOWED_DIRECTIONS = ['bullish', 'bearish', 'neutral'] as const;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

  let query = supabase
    .from('decision_journals')
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
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`journal:${ip}`, { windowMs: 60_000, max: 10 });
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
  const action = ALLOWED_ACTIONS.includes(body.action) ? body.action : null;
  const reasoning = typeof body.reasoning === 'string' ? body.reasoning.trim() : '';

  if (!symbol || !action || reasoning.length < 5) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const entry = {
    user_id: userData.user.id,
    symbol,
    action,
    price: typeof body.price === 'number' ? body.price : null,
    quantity: typeof body.quantity === 'number' ? body.quantity : null,
    reasoning,
    graph_node_id: typeof body.graph_node_id === 'string' ? body.graph_node_id : null,
    prediction_id: typeof body.prediction_id === 'string' ? body.prediction_id : null,
    emotion_level: typeof body.emotion_level === 'number' ? Math.max(1, Math.min(5, body.emotion_level)) : null,
    emotion_label: ALLOWED_EMOTIONS.includes(body.emotion_label) ? body.emotion_label : null,
    expected_direction: ALLOWED_DIRECTIONS.includes(body.expected_direction) ? body.expected_direction : null,
    expected_target_price: typeof body.expected_target_price === 'number' ? body.expected_target_price : null,
    expected_timeframe_days: typeof body.expected_timeframe_days === 'number' ? body.expected_timeframe_days : null,
  };

  const { data, error } = await supabase
    .from('decision_journals')
    .insert(entry)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
