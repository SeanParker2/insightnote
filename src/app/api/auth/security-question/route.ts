import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import { isValidEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = checkRateLimit(`security-question:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({} as any))) as { email?: unknown };
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const email = rawEmail.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: true, question: null }, { status: 200 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from('profiles')
    .select('security_question')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const question = typeof (data as any)?.security_question === 'string' ? ((data as any).security_question as string).trim() : '';
  return NextResponse.json({ ok: true, question: question || null }, { status: 200 });
}

