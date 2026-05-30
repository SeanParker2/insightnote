import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

  let query = supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  // Mark as read
  if (body.action === 'mark_read') {
    const alertIds = Array.isArray(body.ids) ? body.ids : [body.ids];
    await supabase
      .from('alerts')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userData.user.id)
      .in('id', alertIds);
    return NextResponse.json({ ok: true });
  }

  // Mark all as read
  if (body.action === 'mark_all_read') {
    await supabase
      .from('alerts')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userData.user.id)
      .eq('is_read', false);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
}
