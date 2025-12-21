import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/env';
import crypto from 'node:crypto';

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

function sha256Base64Url(input: string) {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function htmlPage(title: string, body: string) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title></head><body style="margin:0;padding:40px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#ffffff;color:#0f172a;"><div style="max-width:720px;margin:0 auto;"><h1 style="font-size:22px;margin:0 0 12px 0;">${title}</h1><div style="font-size:14px;line-height:1.75;color:#334155;">${body}</div><div style="margin-top:22px;"><a href="/" style="display:inline-block;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;color:#0f172a;text-decoration:none;">返回首页</a></div></div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get('email') ?? '';
  const email = rawEmail.trim().toLowerCase();
  const token = (url.searchParams.get('token') ?? '').trim();

  if (!isValidEmail(email) || !token) {
    return htmlPage('退订失败', '退订链接无效或已过期。你也可以登录账号中心关闭邮件偏好。');
  }

  const unsubscribeSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ?? '';
  if (!unsubscribeSecret) {
    return htmlPage('退订失败', '服务未配置退订密钥，请通过账号中心关闭邮件偏好，或联系支持。');
  }

  const expected = hmacBase64Url(unsubscribeSecret, email);
  if (!safeEqual(token, expected)) {
    return htmlPage('退订失败', '退订链接无效或已过期。你也可以登录账号中心关闭邮件偏好。');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!serviceRoleKey) {
    return htmlPage('退订失败', '服务未配置必要权限，请稍后再试或联系支持。');
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const now = new Date().toISOString();
  await admin.from('profiles').update({ email_subscribed: false, updated_at: now }).eq('email', email);
  await admin.from('daily_briefing_subscribers').delete().eq('email', email);

  await admin.from('events').insert({
    user_id: null,
    event_name: 'email_unsubscribe',
    payload: { email_hash: sha256Base64Url(email).slice(0, 18) },
  });

  return htmlPage('已退订', '你已成功退订 InsightNote 更新邮件。之后如需恢复订阅，可在账号中心重新开启。');
}

