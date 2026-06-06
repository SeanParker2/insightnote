import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAutoReflection, generateWeeklyInsights } from '@/lib/auto-reflection';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action || 'reflect';

  try {
    switch (action) {
      case 'reflect': {
        const result = await runAutoReflection(userData.user.id);
        return NextResponse.json({ ok: true, data: result });
      }

      case 'weekly-insights': {
        const insights = await generateWeeklyInsights(userData.user.id);
        return NextResponse.json({ ok: true, data: { insights } });
      }

      default:
        return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Auto reflection error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
