'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Playfair_Display } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

const playfair = Playfair_Display({ subsets: ['latin'] });

export default function SignupPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('请输入邮箱地址');
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
    if (!securityQuestion.trim()) {
      setErrorMessage('请输入密保问题');
      setSuccessMessage(null);
      return;
    }
    if (!securityAnswer.trim()) {
      setErrorMessage('请输入密保问题答案');
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    trackEvent('auth_signup_page_submit', {});
    try {
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          securityQuestion: securityQuestion.trim(),
          securityAnswer,
        }),
      });

      const signupJson = (await signupRes.json().catch(() => null)) as any;
      if (!signupRes.ok || !signupJson?.ok) {
        const message =
          typeof signupJson?.message === 'string'
            ? signupJson.message
            : typeof signupJson?.error === 'string'
              ? signupJson.error
              : '注册失败';
        setErrorMessage(message);
        trackEvent('auth_signup_page_error', { message });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        const message = signInError.message;
        setErrorMessage(message);
        trackEvent('auth_signup_page_signin_error', { message: signInError.message });
        return;
      }

      setSuccessMessage('注册成功，即将进入首页。');
      trackEvent('auth_signup_page_success', {});
      setTimeout(() => router.push('/'), 400);
    } catch (err: any) {
      setErrorMessage(typeof err?.message === 'string' ? err.message : '注册失败');
      trackEvent('auth_signup_page_exception', { message: typeof err?.message === 'string' ? err.message : 'unknown' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className={`${playfair.className} text-4xl font-bold text-slate-900`}>注册账号</h1>
        <p className="mt-4 text-sm text-slate-600">
          注册只需要邮箱、密码与密保问题。请牢记密保问题答案：若忘记密码与答案，账号可能无法找回。
        </p>

        <div className="mt-10 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">邮箱</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                placeholder="邮箱地址"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">密码</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                  placeholder="至少 8 位"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">确认密码</span>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">密保问题</span>
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                type="text"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                placeholder="例如：你最喜欢的城市？"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">密保问题答案</span>
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                type="password"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                placeholder="请牢记答案"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="bg-brand-900 hover:bg-brand-800" onClick={onSubmit} disabled={submitting}>
                {submitting ? '注册中…' : '注册并进入首页'}
              </Button>
              <Button variant="outline" onClick={() => router.push('/login')} disabled={submitting}>
                返回登录
              </Button>
            </div>

            {errorMessage && <div className="text-sm text-red-600">{errorMessage}</div>}
            {successMessage && <div className="text-sm text-emerald-700">{successMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
