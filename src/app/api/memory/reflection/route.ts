import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DecisionMemoryStore } from '@/lib/decision-memory';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const store = new DecisionMemoryStore(supabase, userData.user.id);
    const report = await store.generateReflectionReport(startDate, new Date().toISOString());
    return NextResponse.json({ ok: true, data: report });
  } catch (error: any) {
    console.error('Reflection report error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
