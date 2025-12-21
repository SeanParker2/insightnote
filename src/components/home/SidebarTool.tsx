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
    <aside className="col-span-12 lg:col-span-4 pl-0 lg:pl-8 border-l border-solid border-gray-200">
      
      {/* Butterfly Effect Map Widget */}
      <div className="bg-brand-900 text-white p-6 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
          </svg>
        </div>
        <h3 className={`${playfair.className} text-lg font-bold mb-1`}>{uiTerms.butterflyMap}</h3>
        <p className="text-xs text-slate-400 mb-4 font-sans">可视化市场因果链。</p>
        
        <div className="space-y-3 mb-6">
          {butterflyEffects.map((effect, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs border-b border-brand-800 pb-2">
              <span className="text-amber-500">{effect.cause}</span>
              <span className="text-slate-500">→</span>
              <span>{effect.effect}</span>
            </div>
          ))}
        </div>
        <TrackedLink
          href="/tools/butterfly"
          eventName="home_launch_terminal_click"
          eventPayload={{ effect_count: butterflyEffects.length }}
          className="w-full bg-white text-brand-900 py-2 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition block text-center"
        >
          进入图谱
        </TrackedLink>
      </div>

      {/* Editor's Picks */}
      <div className="mb-10">
        <h3 className="font-bold text-xs uppercase tracking-widest border-b border-black pb-2 mb-4">编辑精选</h3>
        <ul className="space-y-4">
          {editorPicks.map((pick, idx) => (
            <li key={idx} className="flex flex-col gap-1">
              <span className="text-[10px] text-amber-500 font-bold uppercase">{pick.category}</span>
              {pick.url && pick.url !== '#' ? (
                <TrackedLink
                  href={pick.url}
                  eventName="home_editor_pick_click"
                  eventPayload={{ category: pick.category, url: pick.url }}
                  className={`${playfair.className} font-bold text-slate-900 hover:text-brand-900 leading-tight`}
                >
                  {pick.title}
                </TrackedLink>
              ) : (
                <span
                  className={`${playfair.className} font-bold text-slate-400 leading-tight cursor-not-allowed`}
                  aria-disabled="true"
                >
                  {pick.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Daily Briefing CTA */}
      <div className="bg-slate-50 border border-solid border-gray-200 p-6 text-center">
        <h4 className={`${playfair.className} font-bold text-lg mb-2`}>{uiTerms.dailyBriefing}</h4>
        <p className="text-xs text-slate-500 mb-4 px-2">加入 15,000+ 位投资者，获取开盘前要点解读。</p>
        <input 
          type="email" 
          placeholder="邮箱地址" 
          value={email}
          onChange={(e) => {
            setSubscribed(false);
            setErrorMessage(null);
            setEmail(e.target.value);
          }}
          className="w-full bg-white border border-slate-300 px-3 py-2 text-xs mb-2 focus:outline-none focus:border-brand-900"
        />
        <button
          type="button"
          onClick={onSubscribe}
          disabled={!canSubmit}
          className="w-full bg-brand-900 text-white py-2 text-xs font-bold uppercase hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:hover:bg-brand-900"
        >
          {submitting ? '订阅中…' : subscribed ? '已订阅' : '免费订阅'}
        </button>
        {errorMessage && <div className="text-xs text-red-600 mt-2">{errorMessage}</div>}
        {subscribed && <div className="text-xs text-emerald-700 mt-2">订阅成功</div>}
      </div>

    </aside>
  );
});

SidebarTool.displayName = 'SidebarTool';
