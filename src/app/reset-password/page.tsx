'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverQuestion, setRecoverQuestion] = useState<string | null>(null);
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [recoverLoadingQuestion, setRecoverLoadingQuestion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setHasUser(Boolean(data.user));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const preset = (searchParams.get('email') ?? '').trim();
    if (preset && !recoverEmail) {
      setRecoverEmail(preset);
    }
  }, [recoverEmail, searchParams]);

  async function onSubmit() {
    if (!password || password.length < 8) {
      setErrorMessage('密码至少 8 位');
      setSuccessMessage(null);
      return;
    }
    if (password !== password2) {
      setErrorMessage('两次输入的密码不一致');
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('auth_password_update_submit', {});
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(error.message);
        trackEvent('auth_password_update_error', { message: error.message });
        return;
      }
      setSuccessMessage('密码已更新，即将跳转到账号中心。');
      setPassword('');
      setPassword2('');
      trackEvent('auth_password_update_success', {});
      setTimeout(() => router.push('/account'), 800);
    } finally {
      setSubmitting(false);
    }
  }

  async function onLoadSecurityQuestion() {
    const email = recoverEmail.trim();
    if (!email) {
      setErrorMessage('请先输入邮箱地址');
      setSuccessMessage(null);
      return;
    }

    setRecoverLoadingQuestion(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setRecoverQuestion(null);
    trackEvent('auth_security_question_fetch_submit', {});
    try {
      const res = await fetch('/api/auth/security-question', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => null)) as any;
      const question = typeof json?.question === 'string' ? (json.question as string) : null;
      setRecoverQuestion(question);
      if (!question) {
        setErrorMessage('该账号未设置密保问题，无法使用此方式找回。');
        trackEvent('auth_security_question_fetch_empty', {});
      } else {
        trackEvent('auth_security_question_fetch_success', {});
      }
    } catch (err: any) {
      setErrorMessage(typeof err?.message === 'string' ? err.message : '获取密保问题失败');
      trackEvent('auth_security_question_fetch_error', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
    } finally {
      setRecoverLoadingQuestion(false);
    }
  }

  async function onRecoverReset() {
    const email = recoverEmail.trim();
    if (!email) {
      setErrorMessage('请先输入邮箱地址');
      setSuccessMessage(null);
      return;
    }
    if (!recoverQuestion) {
      setErrorMessage('请先获取密保问题');
      setSuccessMessage(null);
      return;
    }
    if (!recoverAnswer.trim()) {
      setErrorMessage('请输入密保问题答案');
      setSuccessMessage(null);
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('密码至少 8 位');
      setSuccessMessage(null);
      return;
    }
    if (password !== password2) {
      setErrorMessage('两次输入的密码不一致');
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('auth_security_recover_submit', {});
    try {
      const res = await fetch('/api/auth/reset-with-security-question', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, answer: recoverAnswer, newPassword: password }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) {
        setErrorMessage('密保验证失败或账号未设置密保问题。');
        trackEvent('auth_security_recover_error', { code: json?.error ?? 'unknown' });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setSuccessMessage('密码已更新，请返回登录页使用新密码登录。');
        trackEvent('auth_security_recover_success_no_session', {});
        return;
      }

      setSuccessMessage('密码已更新，即将跳转到账号中心。');
      trackEvent('auth_security_recover_success', {});
      setTimeout(() => router.push('/account'), 800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-slate-900">重置密码</h1>
        <p className="mt-4 text-sm text-slate-600">通过登录态或密保问题设置新密码。</p>

        {hasUser === false && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-700">
              若你忘记密码，可通过密保问题找回。请注意：若忘记密保问题答案，账号可能无法找回。
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">邮箱</span>
                <input
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  type="email"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                  placeholder="注册邮箱"
                />
              </label>

              <div className="flex items-center gap-3">
                <Button className="bg-brand-900 hover:bg-brand-800" onClick={onLoadSecurityQuestion} disabled={recoverLoadingQuestion}>
                  {recoverLoadingQuestion ? '获取中…' : '获取密保问题'}
                </Button>
                <Button asChild variant="outline">
                  <a href="/login">返回登录</a>
                </Button>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">密保问题</span>
                <input
                  value={recoverQuestion ?? ''}
                  readOnly
                  className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
                  placeholder="点击上方按钮获取"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">密保问题答案</span>
                <input
                  value={recoverAnswer}
                  onChange={(e) => setRecoverAnswer(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                  placeholder="请输入答案"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">新密码</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                  placeholder="至少 8 位"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">确认新密码</span>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                />
              </label>

              <Button
                className="bg-brand-900 hover:bg-brand-800"
                onClick={onRecoverReset}
                disabled={submitting || recoverLoadingQuestion}
              >
                {submitting ? '处理中…' : '验证并重置密码'}
              </Button>

              {errorMessage && <div className="text-sm text-red-600">{errorMessage}</div>}
              {successMessage && <div className="text-sm text-emerald-700">{successMessage}</div>}
            </div>
          </div>
        )}

        {hasUser !== false && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">新密码</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                  placeholder="至少 8 位"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">确认新密码</span>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button className="bg-brand-900 hover:bg-brand-800" onClick={onSubmit} disabled={submitting}>
                {submitting ? '处理中…' : '更新密码'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  trackEvent('auth_logout', {});
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
              >
                退出登录
              </Button>
            </div>

            {errorMessage && <div className="mt-4 text-sm text-red-600">{errorMessage}</div>}
            {successMessage && <div className="mt-4 text-sm text-emerald-700">{successMessage}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
