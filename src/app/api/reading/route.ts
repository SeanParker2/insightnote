import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`reading:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const body = await request.json().catch(() => null);
  if (!body || typeof body.post_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const postId = body.post_id;
  const duration = typeof body.read_duration_seconds === 'number' ? Math.min(body.read_duration_seconds, 7200) : null;
  const percentage = typeof body.read_percentage === 'number' ? Math.min(Math.max(body.read_percentage, 0), 100) : null;

  const userId = userData.user?.id ?? null;

  // Upsert reading history
  const { error } = await supabase
    .from('user_reading_history')
    .upsert(
      {
        user_id: userId,
        post_id: postId,
        read_duration_seconds: duration,
        read_percentage: percentage,
        source: 'web',
      },
      { onConflict: 'user_id,post_id,created_at' },
    );

  if (error) {
    // Non-critical, don't fail
    console.error('Reading tracking error:', error);
  }

  return NextResponse.json({ ok: true });
}
