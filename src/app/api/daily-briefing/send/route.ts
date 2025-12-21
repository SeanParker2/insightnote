import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import { isSubscriptionActive } from '@/lib/utils';
import crypto from 'node:crypto';

type ResendSendRequest = {
  from: string;
  to: string[];
  subject: string;
  html: string;
};

function isValidEmail(email: string) {
  if (email.length < 3 || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hmacBase64Url(secret: string, message: string) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message);
  return hmac
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildEmailHtml(
  origin: string,
  posts: Array<{ slug: string; title: string; summary_tldr: string }>,
  opts: { unsubscribeUrl?: string | null },
) {
  const items = posts
    .map((post) => {
      const href = `${origin}/posts/${encodeURIComponent(post.slug)}`;
      const title = String(post.title || '').trim();
      const summary = String(post.summary_tldr || '').trim();
      return `<li style="margin: 0 0 16px 0;"><div style="font-weight: 700; margin-bottom: 6px;"><a href="${href}" style="color: #0f172a; text-decoration: none;">${title}</a></div><div style="color: #475569; font-size: 13px; line-height: 1.6;">${summary}</div></li>`;
    })
    .join('');

  const unsubscribe = opts.unsubscribeUrl
    ? `<div style="margin-top: 18px; color: #94a3b8; font-size: 12px;">不想再收到更新？点击 <a href="${opts.unsubscribeUrl}" style="color: #0f172a; text-decoration: underline;">退订</a>（无需登录）。</div>`
    : `<div style="margin-top: 18px; color: #94a3b8; font-size: 12px;">如果你不希望收到此邮件，请回复邮件说明。</div>`;

  return `<!doctype html><html><body style="margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f8fafc;"><div style="max-width: 640px; margin: 0 auto; padding: 28px 16px;"><div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px;"><div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">InsightNote 更新</div><div style="color: #64748b; font-size: 13px; line-height: 1.7; margin-bottom: 16px;">以下为最近更新的内容（Pro 订阅用户专享推送）。</div><ol style="padding-left: 18px; margin: 0;">${items}</ol>${unsubscribe}</div></div></body></html>`;
}

async function sendViaResend(apiKey: string, payload: ResendSendRequest) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`resend_error:${response.status}:${text.slice(0, 200)}`);
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'cron_secret_missing' }, { status: 500 });
  }

  const providedSecret = request.headers.get('x-cron-secret') ?? '';
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim() ?? '';
  const fromEmail = process.env.DAILY_BRIEFING_FROM?.trim() ?? '';
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 });
  }

  const unsubscribeSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ?? '';

  const origin = (process.env.SITE_URL?.trim() || request.headers.get('origin') || '').replace(/\/$/, '');
  if (!origin) {
    return NextResponse.json({ ok: false, error: 'site_url_missing' }, { status: 500 });
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const now = new Date();
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('email, subscription_status, subscription_end_date, email_subscribed, email_frequency')
    .eq('subscription_status', 'pro');

  if (profileError) {
    return NextResponse.json({ ok: false, error: 'profiles_query_failed' }, { status: 500 });
  }

  const recipients = (profiles ?? [])
    .map((p: any) => ({
      email: typeof p.email === 'string' ? p.email : null,
      active: isSubscriptionActive(p.subscription_status, p.subscription_end_date, now),
      subscribed: Boolean(p.email_subscribed),
      frequency: typeof p.email_frequency === 'string' ? p.email_frequency : 'daily',
    }))
    .filter((p) => Boolean(p.email) && p.active && p.subscribed && p.frequency === 'daily')
    .map((p) => String(p.email).toLowerCase())
    .filter((email) => isValidEmail(email));

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 }, { status: 200 });
  }

  const { data: posts, error: postsError } = await admin
    .from('posts')
    .select('slug, title, summary_tldr, published_at, is_premium')
    .order('published_at', { ascending: false })
    .limit(6);

  if (postsError) {
    return NextResponse.json({ ok: false, error: 'posts_query_failed' }, { status: 500 });
  }

  const items = (posts ?? [])
    .filter((p: any) => typeof p.slug === 'string' && typeof p.title === 'string')
    .slice(0, 5)
    .map((p: any) => ({
      slug: p.slug,
      title: p.title,
      summary_tldr: typeof p.summary_tldr === 'string' ? p.summary_tldr : '',
    }));

  if (items.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 }, { status: 200 });
  }

  const subject = `InsightNote 更新（${now.toLocaleDateString('zh-CN')}）`;

  let sent = 0;

  for (const email of recipients) {
    const token = unsubscribeSecret ? hmacBase64Url(unsubscribeSecret, email) : null;
    const unsubscribeUrl = token
      ? `${origin}/api/daily-briefing/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      : null;

    const html = buildEmailHtml(origin, items, { unsubscribeUrl });
    await sendViaResend(resendApiKey, { from: fromEmail, to: [email], subject, html });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent }, { status: 200 });
}
