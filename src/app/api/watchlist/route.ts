import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('user_preferences')
    .select('watchlist')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return NextResponse.json({ ok: true, data: data?.watchlist ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.symbol) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const symbol = body.symbol.trim().toUpperCase();
  const name = typeof body.name === 'string' ? body.name.trim() : symbol;

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('watchlist')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const currentWatchlist: Array<{ symbol: string; name: string }> = Array.isArray(prefs?.watchlist) ? prefs.watchlist : [];
  
  if (currentWatchlist.some(w => w.symbol === symbol)) {
    return NextResponse.json({ ok: true, data: currentWatchlist, message: 'already_exists' });
  }

  if (currentWatchlist.length >= 20) {
    return NextResponse.json({ ok: false, error: 'limit_reached' }, { status: 400 });
  }

  const newWatchlist = [...currentWatchlist, { symbol, name }];

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ 
      user_id: userData.user.id, 
      watchlist: newWatchlist,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('watchlist')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data?.watchlist ?? newWatchlist });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'missing_symbol' }, { status: 400 });
  }

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('watchlist')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const currentWatchlist: Array<{ symbol: string; name: string }> = Array.isArray(prefs?.watchlist) ? prefs.watchlist : [];
  const newWatchlist = currentWatchlist.filter(w => w.symbol !== symbol.toUpperCase());

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ 
      user_id: userData.user.id, 
      watchlist: newWatchlist,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('watchlist')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data?.watchlist ?? newWatchlist });
}
