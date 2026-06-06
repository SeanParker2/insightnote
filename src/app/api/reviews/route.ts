import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWeeklyReview } from '@/lib/review-engine';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 20);

  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let weekStart: string;
  let weekEnd: string;

  if (body?.week_start && body?.week_end) {
    weekStart = body.week_start;
    weekEnd = body.week_end;
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    weekStart = monday.toISOString();
    weekEnd = sunday.toISOString();
  }

  try {
    const review = await generateWeeklyReview(userData.user.id, weekStart, weekEnd);
    return NextResponse.json({ ok: true, data: review });
  } catch (error) {
    console.error('Failed to generate review:', error);
    return NextResponse.json({ ok: false, error: 'generation_failed' }, { status: 500 });
  }
}
