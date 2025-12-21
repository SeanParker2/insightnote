import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import crypto from 'node:crypto';

function isValidEmail(email: string) {
  if (email.length < 3 || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parsePhc(value: string) {
  const parts = value.split('$');
  if (parts.length !== 4) return null;
  if (parts[0] !== 'pbkdf2_sha256') return null;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 50_000 || iterations > 2_000_000) return null;
  const salt = parts[2] ?? '';
  const hash = parts[3] ?? '';
  if (!salt || !hash) return null;
  return { iterations, saltB64: salt, hashB64: hash };
}

function safeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({} as any))) as {
    email?: unknown;
    answer?: unknown;
    newPassword?: unknown;
  };

  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const email = rawEmail.trim().toLowerCase();
  const answer = typeof body.answer === 'string' ? body.answer : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!isValidEmail(email) || !answer.trim() || newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, security_answer_phc')
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  const userId = typeof (profile as any)?.id === 'string' ? ((profile as any).id as string) : '';
  const phcRaw = typeof (profile as any)?.security_answer_phc === 'string' ? ((profile as any).security_answer_phc as string) : '';
  const phc = phcRaw ? parsePhc(phcRaw) : null;

  if (!userId || !phc) {
    return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 400 });
  }

  const expectedHash = Buffer.from(phc.hashB64, 'base64');
  const salt = Buffer.from(phc.saltB64, 'base64');
  if (!expectedHash.length || !salt.length) {
    return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 400 });
  }

  const actualHash = crypto.pbkdf2Sync(answer.trim(), salt, phc.iterations, expectedHash.length, 'sha256');
  if (!safeEqual(actualHash, expectedHash)) {
    return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 400 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (updateError) {
    return NextResponse.json({ ok: false, error: 'reset_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

