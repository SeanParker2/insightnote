import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { LoginControl } from '@/components/auth/LoginControl';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { isSubscriptionActive } from '@/lib/utils';

export async function Header() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, is_admin')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);
  const isAdmin = Boolean((profile as any)?.is_admin);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-brand-900">
            InsightNote
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          {isAdmin ? (
            <Button asChild variant="ghost" className="text-sm font-medium">
              <TrackedLink href="/admin" eventName="header_admin_click">
                管理后台
              </TrackedLink>
            </Button>
          ) : null}
          {!user ? (
            <Button asChild variant="ghost" className="text-sm font-medium">
              <TrackedLink href="/signup" eventName="header_signup_click">
                注册
              </TrackedLink>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="text-sm font-medium">
            <TrackedLink href="/pricing" eventName="header_pricing_click">
              订阅
            </TrackedLink>
          </Button>
          <Button asChild variant="ghost" className="text-sm font-medium">
            <Link href="/feedback">反馈</Link>
          </Button>
          <LoginControl
            initialEmail={user?.email ?? null}
            initialSubscriptionStatus={isProActive ? 'pro' : 'free'}
          />
        </nav>
      </div>
    </header>
  );
}
