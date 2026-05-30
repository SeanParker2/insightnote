import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  const { data: briefing } = await supabase
    .from('daily_briefings')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('briefing_date', date)
    .maybeSingle();

  if (!briefing) {
    return NextResponse.json({ ok: true, data: null, message: '今日晨报尚未生成' });
  }

  // Mark as read
  if (!briefing.is_read) {
    await supabase
      .from('daily_briefings')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', briefing.id);
  }

  return NextResponse.json({ ok: true, data: briefing });
}
