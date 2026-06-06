import { redirect } from 'next/navigation';
import { playfair } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/TrackedLink';

function resolveNext(value: string | string[] | undefined) {
  const raw = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const nextPath = resolveNext(searchParams?.next) ?? '/account';
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (user) {
    redirect(nextPath);
  }

  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className={`${playfair.className} text-3xl font-bold text-text-primary mb-2`}>登录</h1>
        <p className="text-sm text-text-secondary mb-8">
          登录后将自动校验你的身份与 Pro 权益。
        </p>

        <div className="p-6 rounded-xl bg-surface-1 border border-border-default">
          <LoginControl
            variant="page"
            forceExpanded
            initialEmail={null}
            initialSubscriptionStatus={'free'}
          />
        </div>

        <div className="mt-4 text-center">
          <TrackedLink href="/signup" eventName="login_page_signup_click" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            没有账号？去注册
          </TrackedLink>
        </div>

        <div className="mt-6 text-[11px] text-text-tertiary text-center">
          登录后将跳转至：{nextPath}
        </div>
      </div>
    </div>
  );
}
