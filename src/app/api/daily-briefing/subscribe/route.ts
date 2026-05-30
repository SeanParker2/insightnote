import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

type SubscribeRequestBody = {
  email?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`subscribe:${ip}`, { windowMs: 60_000, max: 3 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({} as SubscribeRequestBody))) as SubscribeRequestBody;
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  const email = rawEmail.toLowerCase();
  const source = typeof body.source === 'string' ? body.source.trim().slice(0, 80) : null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? null;
  const referer = request.headers.get('referer') ?? null;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { error } = await supabase
    .from('daily_briefing_subscribers')
    .upsert(
      {
        user_id: userId,
        email,
        source,
        referer,
        user_agent: userAgent,
      },
      { onConflict: 'email' },
    );

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

