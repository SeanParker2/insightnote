import { playfair } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { AccountCenterClient } from '@/components/account/AccountCenterClient';
import { AccountSecurity } from '@/components/account/AccountSecurity';
import { formatDateCN, isSubscriptionActive } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const loginHref = `/login?next=${encodeURIComponent('/account')}`;

  if (!user) {
    return (
      <div className="min-h-screen">
        <PageHeader title="账号" breadcrumbs={[{ label: '首页', href: '/' }, { label: '账号' }]} />
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
          <p className="text-sm text-text-secondary mb-6">登录后可查看订阅状态与权益说明。</p>
          <Button asChild>
            <TrackedLink href={loginHref} eventName="account_login_click">去登录</TrackedLink>
          </Button>
        </div>
      </div>
    );
  }

  if (user.email) {
    await supabase.from('profiles').upsert({ id: user.id, email: user.email, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, nickname, avatar_path, language, timezone, email_subscribed, email_frequency, subscription_status, subscription_end_date, cancel_at_period_end, subscription_interval')
    .eq('id', user.id)
    .maybeSingle();

  const subscriptionEndDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
  const isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);
  const subscriptionStatus = isProActive ? 'pro' : 'free';
  const isExpiredPro = profile?.subscription_status === 'pro' && !isProActive;
  const badgeText = isProActive ? 'Pro' : isExpiredPro ? 'Pro（已过期）' : '免费';
  const cancelAtPeriodEnd = Boolean((profile as any)?.cancel_at_period_end);

  const billingMessage = subscriptionStatus === 'pro' || isExpiredPro
    ? '我需要帮助管理/续费 InsightNote Pro（请协助确认账号状态）。'
    : '我想开通 InsightNote Pro（请协助开通/报价）。';
  const billingHref = `/feedback?category=billing&message=${encodeURIComponent(billingMessage)}`;

  return (
    <div className="min-h-screen">
      <PageHeader title="账号" breadcrumbs={[{ label: '首页', href: '/' }, { label: '账号' }]} />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <div className="rounded-xl border border-border-default bg-surface-1 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-text-tertiary">登录邮箱</div>
              <div className="mt-1 text-base font-semibold text-text-primary truncate">{profile?.email ?? user.email}</div>
            </div>
            <Badge>{badgeText}</Badge>
          </div>

          <div className="mt-6">
            <div className="rounded-lg border border-border-default bg-surface-2 p-4">
              <div className="text-sm font-semibold text-text-primary">权益说明</div>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary leading-relaxed">
                {subscriptionStatus === 'pro' ? (
                  <><li>已解锁所有 Pro 文章完整内容。</li><li>可直接使用受限文章的 Butterfly Map。</li></>
                ) : (
                  <><li>可阅读全部文章摘要与已解锁内容。</li><li>Pro 文章发布 30 天后自动解锁完整内容。</li></>
                )}
              </ul>
              {(subscriptionStatus === 'pro' || isExpiredPro) && (
                <div className="mt-3 text-xs text-text-tertiary">
                  {subscriptionEndDate ? `订阅到期：${formatDateCN(subscriptionEndDate, { year: 'numeric', month: 'long', day: 'numeric' })}` : '订阅到期时间：未设置'}
                  {cancelAtPeriodEnd && <span className="ml-2 text-text-tertiary">（已设置到期后取消）</span>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {subscriptionStatus === 'pro' ? (
              <Button asChild>
                <TrackedLink href={billingHref} eventName="account_manage_billing_click" eventPayload={{ plan: 'pro' }}>管理订阅</TrackedLink>
              </Button>
            ) : (
              <Button asChild>
                <TrackedLink href="/pricing?next=%2Faccount" eventName="account_upgrade_click" eventPayload={{ plan: 'free' }}>升级到 Pro</TrackedLink>
              </Button>
            )}
            <Button asChild variant="outline">
              <TrackedLink href="/posts" eventName="account_browse_posts_click">浏览文章</TrackedLink>
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <AccountCenterClient userId={user.id} email={profile?.email ?? user.email ?? null} initialProfile={profile as any} />
        </div>

        <div className="mt-6">
          <AccountSecurity />
        </div>
      </div>
    </div>
  );
}
