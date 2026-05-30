import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.prediction_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  // Toggle endorsement
  const { data: existing } = await supabase
    .from('prediction_endorsements')
    .select('id')
    .eq('prediction_id', body.prediction_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (existing) {
    // Remove endorsement
    await supabase.from('prediction_endorsements').delete().eq('id', existing.id);
    return NextResponse.json({ ok: true, endorsed: false });
  } else {
    // Add endorsement
    await supabase.from('prediction_endorsements').insert({
      prediction_id: body.prediction_id,
      user_id: userData.user.id,
    });
    return NextResponse.json({ ok: true, endorsed: true });
  }
}
