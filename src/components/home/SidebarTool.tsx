'use client';

import { memo, useMemo, useState } from 'react';
import { ButterflyEffect, EditorPick } from '@/lib/mock/tools.mock';
import { Playfair_Display } from '@/lib/fonts';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import { uiTerms } from '@/lib/utils';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface SidebarToolProps {
  butterflyEffects: ButterflyEffect[];
  editorPicks: EditorPick[];
}

export const SidebarTool = memo(({ butterflyEffects, editorPicks }: SidebarToolProps) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (subscribed) return false;
    if (trimmedEmail.length < 3 || trimmedEmail.length > 255) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  }, [submitting, subscribed, trimmedEmail]);

  async function onSubscribe() {
    const emailToSubmit = trimmedEmail;
    trackEvent('daily_briefing_subscribe_click', { email_present: Boolean(emailToSubmit) });

    if (!canSubmit) {
      setErrorMessage('请输入有效邮箱');
      trackEvent('daily_briefing_subscribe_invalid', { email_present: Boolean(emailToSubmit) });
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSubscribed(false);

    try {
      const response = await fetch('/api/daily-briefing/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailToSubmit, source: 'home_sidebar' }),
      });

      if (!response.ok) {
        setErrorMessage('订阅失败，请稍后重试');
        trackEvent('daily_briefing_subscribe_error', { status: response.status });
        return;
      }

      setSubscribed(true);
      setEmail('');
      trackEvent('daily_briefing_subscribe_success', {});
    } catch {
      setErrorMessage('订阅失败，请检查网络后重试');
      trackEvent('daily_briefing_subscribe_error', { status: 'network_error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="col-span-12 lg:col-span-4 lg:pl-12 border-l border-border hidden lg:block">
      <div className="sticky top-20 space-y-12">
        {/* Butterfly Effect Map Widget */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sans font-semibold text-sm text-foreground">{uiTerms.butterflyMap}</h3>
            <TrackedLink
              href="/tools/butterfly"
              eventName="home_launch_terminal_click"
              eventPayload={{ effect_count: butterflyEffects.length }}
              className="text-xs font-medium text-primary hover:underline"
            >
              启动工具
            </TrackedLink>
          </div>
          
          <div className="border border-border rounded-sm p-4 bg-card">
            <div className="space-y-3">
              {butterflyEffects.map((effect, idx) => (
                <div key={idx} className="flex items-center text-xs gap-2">
                  <span className="text-muted-foreground font-medium truncate max-w-[40%]">{effect.cause}</span>
                  <span className="text-border flex-shrink-0">→</span>
                  <span className="text-foreground truncate">{effect.effect}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor's Picks */}
        <div>
          <h3 className="font-sans font-semibold text-sm text-foreground mb-4">编辑精选</h3>
          <ul className="space-y-4">
            {editorPicks.map((pick, idx) => (
              <li key={idx} className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{pick.category}</span>
                {pick.url && pick.url !== '#' ? (
                  <TrackedLink
                    href={pick.url}
                    eventName="home_editor_pick_click"
                    eventPayload={{ category: pick.category, url: pick.url }}
                    className="font-medium text-sm text-foreground hover:text-primary transition-colors leading-snug"
                  >
                    {pick.title}
                  </TrackedLink>
                ) : (
                  <span className="font-medium text-sm text-muted-foreground leading-snug cursor-not-allowed">
                    {pick.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Daily Briefing CTA */}
        <div>
          <h4 className="font-sans font-semibold text-sm text-foreground mb-2">{uiTerms.dailyBriefing}</h4>
          <p className="text-xs text-muted-foreground mb-3">加入 15,000+ 专业投资者，获取盘前情报。</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="您的邮箱地址" 
              value={email}
              onChange={(e) => {
                setSubscribed(false);
                setErrorMessage(null);
                setEmail(e.target.value);
              }}
              className="flex-1 bg-background border border-border px-3 py-2 text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            <button
              type="button"
              onClick={onSubscribe}
              disabled={!canSubmit}
              className="bg-primary text-primary-foreground px-4 py-2 text-xs font-medium rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? '...' : '订阅'}
            </button>
          </div>
          {errorMessage && <div className="text-xs text-destructive mt-2">{errorMessage}</div>}
          {subscribed && <div className="text-xs text-emerald-600 mt-2">订阅成功。</div>}
        </div>
      </div>
    </aside>
  );
});

SidebarTool.displayName = 'SidebarTool';
