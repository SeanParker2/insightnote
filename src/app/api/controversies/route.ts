import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'active';
  const symbol = searchParams.get('symbol');
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  let query = supabase
    .from('controversies')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (symbol) {
    query = query.eq('symbol', symbol.toUpperCase());
  }

  const { data: controversies, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  if (!controversies || controversies.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  // Fetch sides, arguments, and stances
  const cIds = controversies.map((c) => c.id);

  const [sidesResult, stancesResult] = await Promise.all([
    supabase.from('controversy_sides').select('*').in('controversy_id', cIds),
    supabase.from('controversy_stances').select('controversy_id, side').in('controversy_id', cIds),
  ]);

  const sides = sidesResult.data ?? [];
  const stances = stancesResult.data ?? [];

  // Fetch arguments for all sides
  const sideIds = sides.map((s) => s.id);
  const { data: arguments_ } = sideIds.length > 0
    ? await supabase.from('controversy_arguments').select('*').in('side_id', sideIds)
    : { data: [] };

  const argsMap = new Map<string, typeof arguments_>();
  (arguments_ ?? []).forEach((a) => {
    const list = argsMap.get(a.side_id) ?? [];
    list.push(a);
    argsMap.set(a.side_id, list);
  });

  const sidesMap = new Map<string, typeof sides>();
  sides.forEach((s) => {
    const list = sidesMap.get(s.controversy_id) ?? [];
    list.push({ ...s, arguments: argsMap.get(s.id) ?? [] });
    sidesMap.set(s.controversy_id, list);
  });

  const stancesMap = new Map<string, { for_count: number; against_count: number; undecided_count: number }>();
  stances.forEach((s) => {
    const current = stancesMap.get(s.controversy_id) ?? { for_count: 0, against_count: 0, undecided_count: 0 };
    if (s.side === 'for') current.for_count++;
    else if (s.side === 'against') current.against_count++;
    else current.undecided_count++;
    stancesMap.set(s.controversy_id, current);
  });

  const result = controversies.map((c) => ({
    ...c,
    sides: sidesMap.get(c.id) ?? [],
    ...(stancesMap.get(c.id) ?? { for_count: 0, against_count: 0, undecided_count: 0 }),
  }));

  return NextResponse.json({ ok: true, data: result });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`controversy:${ip}`, { windowMs: 60_000, max: 3 });
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

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : '';
  if (!title) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  // Only admin can create controversies (for now)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { data: controversy, error } = await supabase
    .from('controversies')
    .insert({
      post_id: typeof body.post_id === 'string' ? body.post_id : null,
      title,
      description: typeof body.description === 'string' ? body.description.trim() : null,
      symbol: typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : null,
      topic_tags: Array.isArray(body.topic_tags) ? body.topic_tags.slice(0, 10) : [],
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  // Create sides if provided
  if (Array.isArray(body.sides) && body.sides.length >= 2) {
    const sideRows = body.sides.slice(0, 2).map((s: Record<string, unknown>, i: number) => ({
      controversy_id: controversy.id,
      side: i === 0 ? 'for' : 'against',
      title: String(s.title || (i === 0 ? '正方' : '反方')),
      summary: typeof s.summary === 'string' ? s.summary : null,
    }));
    await supabase.from('controversy_sides').insert(sideRows);
  }

  return NextResponse.json({ ok: true, data: controversy }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.controversy_id !== 'string' || !['for', 'against', 'undecided'].includes(body.side)) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('controversy_stances')
    .upsert(
      {
        controversy_id: body.controversy_id,
        user_id: userData.user.id,
        side: body.side,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'controversy_id,user_id' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
