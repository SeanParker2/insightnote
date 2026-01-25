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
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
      <div className="container-width flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 bg-primary rounded-sm group-hover:bg-brand-gold transition-colors duration-300"></div>
          <span className="font-sans text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
            InsightNote
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {isAdmin ? (
            <Button asChild variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent">
              <TrackedLink href="/admin" eventName="header_admin_click">
                管理后台
              </TrackedLink>
            </Button>
          ) : null}
          {!user ? (
            <Button asChild variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent">
              <TrackedLink href="/signup" eventName="header_signup_click">
                注册
              </TrackedLink>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent">
            <TrackedLink href="/pricing" eventName="header_pricing_click">
              订阅方案
            </TrackedLink>
          </Button>
          <Button asChild variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent">
            <Link href="/feedback">反馈</Link>
          </Button>
          <div className="pl-2 border-l border-border ml-2">
            <LoginControl
              initialEmail={user?.email ?? null}
              initialSubscriptionStatus={isProActive ? 'pro' : 'free'}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
