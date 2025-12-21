'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trackEvent } from '@/lib/analytics';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { isSubscriptionActive } from '@/lib/utils';

type Props = {
  initialEmail?: string | null;
  initialSubscriptionStatus?: 'free' | 'pro' | null;
  variant?: 'header' | 'page';
  forceExpanded?: boolean;
};

export function LoginControl({ initialEmail, initialSubscriptionStatus, variant = 'header', forceExpanded }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [expanded, setExpanded] = useState(Boolean(forceExpanded));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(initialEmail ?? null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'pro' | null>(
    initialSubscriptionStatus ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      const nextEmail = data.user?.email ?? null;
      setUserEmail(nextEmail);

      if (!data.user) return;
      if (!data.user.email) return;

      const { error } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (cancelled) return;
      if (error) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date')
        .eq('id', data.user.id)
        .maybeSingle();

      if (cancelled) return;
      const nextStatus = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date) ? 'pro' : 'free';
      setSubscriptionStatus(nextStatus);

      if (nextStatus === 'pro') {
        try {
          await fetch('/api/daily-briefing/subscribe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: data.user.email, source: 'pro_login' }),
          });
        } catch {}
      }
    }

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserEmail(null);
        setSubscriptionStatus(null);
        return;
      }

      const user = session?.user;
      if (!user) return;
      if (!user.email) return;

      setUserEmail(user.email ?? null);

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date')
        .eq('id', user.id)
        .maybeSingle();

      const nextStatus = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date) ? 'pro' : 'free';
      setSubscriptionStatus(nextStatus);

      if (nextStatus === 'pro') {
        try {
          await fetch('/api/daily-briefing/subscribe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: user.email, source: 'pro_login' }),
          });
        } catch {}
      }

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next');
        if (next) {
          window.location.assign(next);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceExpanded) {
      setExpanded(true);
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get('login') === '1') {
      setExpanded(true);
    }
  }, [forceExpanded]);

  async function onSubmitAuth() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('请输入邮箱和密码');
      setNoticeMessage(null);
      return;
    }
    if (password.length < 8) {
      setErrorMessage('密码至少 8 位');
      setNoticeMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    trackEvent('auth_password_login_submit', {});
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        trackEvent('auth_password_login_error', { message: error.message });
        return;
      }

      setPassword('');
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgotPassword() {
    const trimmedEmail = email.trim();
    try {
      trackEvent('auth_password_reset_navigate', {});
      if (typeof window !== 'undefined') {
        window.location.assign(trimmedEmail ? `/reset-password?email=${encodeURIComponent(trimmedEmail)}` : '/reset-password');
      }
    } catch {}
  }

  async function onLogout() {
    trackEvent('auth_logout', {});
    await supabase.auth.signOut();
  }

  if (userEmail) {
    return (
      <div className="flex items-center gap-3">
        {subscriptionStatus === 'pro' && <Badge>Pro</Badge>}
        <span className="text-sm text-slate-600 max-w-[220px] truncate">{userEmail}</span>
        {subscriptionStatus === 'pro' ? (
          <Button asChild variant="ghost" size="sm">
            <TrackedLink href="/account" eventName="header_account_click" eventPayload={{ plan: 'pro' }}>
              账号
            </TrackedLink>
          </Button>
        ) : (
          <Button asChild size="sm" className="bg-brand-900 hover:bg-brand-800">
            <TrackedLink href="/pricing" eventName="header_upgrade_click" eventPayload={{ plan: 'free' }}>
              升级到 Pro
            </TrackedLink>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    );
  }

  if (variant === 'page' && userEmail) {
    return (
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-base font-semibold text-slate-900">你已登录</div>
        <div className="mt-2 text-sm text-slate-600">{userEmail}</div>
        <div className="mt-6 flex items-center gap-3">
          <Button asChild className="bg-brand-900 hover:bg-brand-800">
            <TrackedLink href="/account" eventName="login_page_account_click">
              进入账号中心
            </TrackedLink>
          </Button>
          <Button variant="outline" onClick={onLogout}>
            退出登录
          </Button>
        </div>
      </div>
    );
  }

  const showToggle = variant === 'header';
  const expandedValue = forceExpanded ? true : expanded;

  return (
    <div className={variant === 'page' ? 'w-full max-w-lg' : 'flex items-center gap-3'}>
      {showToggle && (
        <Button
          size="sm"
          variant={expandedValue ? 'outline' : 'default'}
          onClick={() =>
            setExpanded((v) => {
              const next = !v;
              trackEvent('auth_login_toggle', { expanded: next });
              return next;
            })
          }
        >
          登录
        </Button>
      )}
      {expandedValue && (
        <div className={variant === 'page' ? 'rounded-xl border border-slate-200 bg-white p-6' : 'flex items-center gap-2 flex-wrap'}>
          {variant === 'page' && (
            <div className="mb-4">
              <div className="text-xl font-bold text-slate-900">账号登录</div>
              <div className="mt-1 text-sm text-slate-600">登录后会自动校验你的 Pro 权益。</div>
            </div>
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="邮箱地址"
            className="w-full sm:w-[260px] h-9 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="密码（至少 8 位）"
            className="w-full sm:w-[220px] h-9 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
          />
          <Button size="sm" onClick={onSubmitAuth} disabled={!email || !password || submitting}>
            {submitting ? '处理中…' : '登录'}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <TrackedLink href="/signup" eventName="auth_signup_link_click">
              注册账号
            </TrackedLink>
          </Button>
          <Button size="sm" variant="ghost" onClick={onForgotPassword} disabled={submitting}>
            忘记密码
          </Button>
          {errorMessage && <div className="text-sm text-red-600">{errorMessage}</div>}
          {noticeMessage && <div className="text-sm text-emerald-700">{noticeMessage}</div>}
        </div>
      )}
    </div>
  );
}
