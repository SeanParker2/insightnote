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
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return NextResponse.json({ ok: true, data });
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

  const updates: Record<string, unknown> = {};
  if (typeof body.briefing_enabled === 'boolean') updates.briefing_enabled = body.briefing_enabled;
  if (typeof body.alert_email_enabled === 'boolean') updates.alert_email_enabled = body.alert_email_enabled;
  if (typeof body.weekly_review_enabled === 'boolean') updates.weekly_review_enabled = body.weekly_review_enabled;
  if (Array.isArray(body.watchlist)) updates.watchlist = body.watchlist.slice(0, 20);
  if (['conservative', 'moderate', 'aggressive'].includes(body.risk_tolerance)) updates.risk_tolerance = body.risk_tolerance;
  if (typeof body.briefing_time === 'string') updates.briefing_time = body.briefing_time;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userData.user.id, ...updates }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
