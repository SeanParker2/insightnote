import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { data: portfolios } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (!portfolios || portfolios.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const portfolioIds = portfolios.map((p) => p.id);
  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .in('portfolio_id', portfolioIds)
    .order('added_at', { ascending: false });

  const holdingsMap = new Map<string, typeof holdings>();
  (holdings ?? []).forEach((h) => {
    const list = holdingsMap.get(h.portfolio_id) ?? [];
    list.push(h);
    holdingsMap.set(h.portfolio_id, list);
  });

  const result = portfolios.map((p) => {
    const pHoldings = holdingsMap.get(p.id) ?? [];
    const totalCost = pHoldings.reduce((sum, h) => sum + Number(h.quantity) * Number(h.avg_cost), 0);
    return {
      ...p,
      holdings: pHoldings,
      total_cost: totalCost,
      holding_count: pHoldings.length,
    };
  });

  return NextResponse.json({ ok: true, data: result });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`portfolio:${ip}`, { windowMs: 60_000, max: 5 });
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

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '默认组合';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : null;

  // Check if user already has a default portfolio
  const { data: existing } = await supabase
    .from('user_portfolios')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('is_default', true)
    .maybeSingle();

  const { data, error } = await supabase
    .from('user_portfolios')
    .insert({
      user_id: userData.user.id,
      name,
      description,
      is_default: !existing,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
