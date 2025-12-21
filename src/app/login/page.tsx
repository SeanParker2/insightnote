import { redirect } from 'next/navigation';
import { Playfair_Display } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/TrackedLink';

const playfair = Playfair_Display({ subsets: ['latin'] });

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
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className={`${playfair.className} text-4xl font-bold text-slate-900`}>账号系统</h1>
        <p className="mt-4 text-sm text-slate-600">
          登录后将自动校验你的身份与 Pro 权益，并在访问内容时进行权限判断。
        </p>

        <div className="mt-10">
          <LoginControl
            variant="page"
            forceExpanded
            initialEmail={null}
            initialSubscriptionStatus={'free'}
          />
        </div>

        <div className="mt-6">
          <Button asChild variant="outline">
            <TrackedLink href="/signup" eventName="login_page_signup_click">
              没有账号？去注册
            </TrackedLink>
          </Button>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          登录后将自动跳转至：{nextPath}
          <span className="ml-2 text-slate-300">|</span>
          <a className="ml-2 text-brand-900 hover:text-brand-gold" href={loginHref}>
            刷新此页面
          </a>
        </div>
      </div>
    </div>
  );
}
