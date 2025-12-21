import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import crypto from 'node:crypto';

function isValidEmail(email: string) {
  if (email.length < 3 || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64');
}

function hashSecurityAnswer(answer: string, opts?: { iterations?: number }) {
  const iterations = opts?.iterations ?? 150_000;
  const normalized = answer.trim();
  if (!normalized) throw new Error('security_answer_required');
  const salt = crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(normalized, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${toBase64(salt)}$${toBase64(digest)}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({} as any))) as {
    email?: unknown;
    password?: unknown;
    securityQuestion?: unknown;
    securityAnswer?: unknown;
  };

  const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const securityQuestion = typeof body.securityQuestion === 'string' ? body.securityQuestion : '';
  const securityAnswer = typeof body.securityAnswer === 'string' ? body.securityAnswer : '';

  if (!isValidEmail(email) || password.length < 8 || !securityQuestion.trim() || !securityAnswer.trim()) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const message = typeof (createError as any)?.message === 'string' ? ((createError as any).message as string) : 'signup_failed';
    const code = typeof (createError as any)?.code === 'string' ? ((createError as any).code as string) : null;
    return NextResponse.json({ ok: false, error: 'signup_failed', message, code }, { status: 400 });
  }

  const userId = created.user?.id ?? '';
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'signup_failed' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const phc = hashSecurityAnswer(securityAnswer);
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      security_question: securityQuestion.trim(),
      security_answer_phc: phc,
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    return NextResponse.json({ ok: false, error: 'profile_save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

