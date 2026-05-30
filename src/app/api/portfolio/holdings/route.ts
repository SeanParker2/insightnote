import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const portfolio_id = typeof body.portfolio_id === 'string' ? body.portfolio_id : null;
  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
  const quantity = typeof body.quantity === 'number' ? body.quantity : null;
  const avg_cost = typeof body.avg_cost === 'number' ? body.avg_cost : null;

  if (!portfolio_id || !symbol || !quantity || !avg_cost || quantity <= 0 || avg_cost <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  // Verify portfolio belongs to user
  const { data: portfolio } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('id', portfolio_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!portfolio) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('portfolio_holdings')
    .insert({
      portfolio_id,
      symbol,
      name: typeof body.name === 'string' ? body.name.trim() : null,
      quantity,
      avg_cost,
      currency: typeof body.currency === 'string' ? body.currency : 'CNY',
      asset_class: ['stock', 'bond', 'commodity', 'crypto', 'forex', 'fund', 'other'].includes(body.asset_class) ? body.asset_class : 'stock',
      sector: typeof body.sector === 'string' ? body.sector.trim() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const holdingId = searchParams.get('id');
  if (!holdingId) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }

  // Verify ownership through portfolio
  const { data: holding } = await supabase
    .from('portfolio_holdings')
    .select('portfolio_id')
    .eq('id', holdingId)
    .maybeSingle();

  if (!holding) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { data: portfolio } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('id', holding.portfolio_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!portfolio) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('portfolio_holdings').delete().eq('id', holdingId);
  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
