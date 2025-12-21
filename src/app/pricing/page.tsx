import { Playfair_Display } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { isSubscriptionActive } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

function resolveNext(value: string | string[] | undefined) {
  const raw = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const nextPath = resolveNext(searchParams?.next);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const isProActive = isSubscriptionActive(profile?.subscription_status, profile?.subscription_end_date);
  const subscriptionStatus = isProActive ? 'pro' : 'free';
  const loginNext = nextPath ? `/pricing?next=${encodeURIComponent(nextPath)}` : '/pricing';
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  const billingMessage = nextPath
    ? `我想开通 InsightNote Pro，用于解锁内容（期望解锁页面：${nextPath}）。`
    : '我想开通 InsightNote Pro，用于解锁内容。';

  const billingHref = `/feedback?category=billing&message=${encodeURIComponent(billingMessage)}`;

  return (
    <div className="min-h-screen bg-white py-14">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className={`${playfair.className} text-4xl font-bold text-slate-900`}>订阅与权益</h1>
            <p className="mt-4 text-sm text-slate-600">
              清晰区分免费与 Pro 权益，并在受限内容处给出明确的下一步。
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Badge>{subscriptionStatus === 'pro' ? 'Pro' : '免费'}</Badge>
              <span className="text-sm text-slate-600 max-w-[260px] truncate">{profile?.email}</span>
            </div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">免费</h2>
              <Badge variant="outline">默认</Badge>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 leading-relaxed">
              <li>可浏览全部文章列表与基础摘要。</li>
              <li>Pro 文章发布 30 天后自动解锁完整内容。</li>
              <li>可使用已解锁文章的 Butterfly Map。</li>
            </ul>
          </div>

          <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Pro</h2>
              <Badge>推荐</Badge>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 leading-relaxed">
              <li>立即解锁所有 Pro 文章完整内容。</li>
              <li>优先访问模型与深度分析。</li>
              <li>更顺滑的阅读体验：无需等待解锁窗口。</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-base font-bold text-slate-900">下一步</h3>
          <p className="mt-2 text-sm text-slate-600">
            目前 Pro 开通流程暂未接入在线支付，你可以通过「订阅/付费」通道快速开通或咨询，我们会优先处理。
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            {!user ? (
              <Button asChild className="bg-brand-900 hover:bg-brand-800">
                <TrackedLink href={loginHref} eventName="pricing_login_click" eventPayload={{ next: nextPath ?? null }}>
                  登录后开通
                </TrackedLink>
              </Button>
            ) : subscriptionStatus === 'pro' ? (
              <Button asChild className="bg-brand-900 hover:bg-brand-800">
                <TrackedLink href="/account" eventName="pricing_account_click" eventPayload={{ plan: 'pro' }}>
                  查看账号
                </TrackedLink>
              </Button>
            ) : (
              <Button asChild className="bg-brand-900 hover:bg-brand-800">
                <TrackedLink href={billingHref} eventName="pricing_request_pro_click" eventPayload={{ next: nextPath ?? null }}>
                  申请开通 Pro
                </TrackedLink>
              </Button>
            )}

            {nextPath && (
              <Button asChild variant="outline">
                <TrackedLink href={nextPath} eventName="pricing_back_to_content_click" eventPayload={{ next: nextPath }}>
                  返回继续阅读
                </TrackedLink>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
