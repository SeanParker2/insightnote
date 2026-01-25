'use client';

import { memo, useMemo, useState } from 'react';
import { ButterflyEffect, EditorPick } from '@/lib/mock/tools.mock';
import { Playfair_Display } from '@/lib/fonts';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import { uiTerms } from '@/lib/utils';
import { Terminal, ArrowRight, Zap, TrendingUp, Mail } from 'lucide-react';

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
    <aside className="col-span-12 lg:col-span-4 lg:pl-12 border-l border-border/50 hidden lg:block h-fit sticky top-24">
      <div className="space-y-12">
        {/* Butterfly Effect Map Widget - Terminal Style */}
        <div className="relative group">
           <div className="absolute -inset-1 bg-linear-to-r from-orange-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
           
           <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-orange-500" />
                   <span className="text-[10px] font-mono text-slate-400 font-bold tracking-widest uppercase">
                      InsightNote 终端
                   </span>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-slate-700" />
                   <div className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-5">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                       <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                       {uiTerms.butterflyMap}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                       <span className="text-[10px] text-emerald-500 font-mono">实时</span>
                    </div>
                 </div>

                 <div className="space-y-4 mb-6">
                    {butterflyEffects.slice(0, 3).map((effect, idx) => (
                      <div key={idx} className="group/item relative pl-4 border-l-2 border-slate-800 hover:border-orange-500 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400 font-mono truncate">{effect.cause}</span>
                          <div className="flex items-center gap-2 text-orange-400">
                             <ArrowRight className="w-3 h-3" />
                             <span className="text-sm font-medium text-white group-hover/item:text-orange-400 transition-colors">{effect.effect}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>

                 <TrackedLink
                    href="/tools/butterfly"
                    eventName="home_launch_terminal_click"
                    eventPayload={{ effect_count: butterflyEffects.length }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs py-2.5 rounded border border-slate-800 transition-all hover:border-orange-500/50 hover:text-white"
                 >
                    启动全功能终端
                    <ArrowRight className="w-3 h-3" />
                 </TrackedLink>
              </div>
           </div>
        </div>

        {/* Editor's Picks - Briefing Wire Style */}
        <div>
          <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-2">
             <TrendingUp className="w-4 h-4 text-primary" />
             <h3 className="font-bold text-sm tracking-tight text-foreground uppercase">研报简讯</h3>
          </div>
          
          <ul className="space-y-6">
            {editorPicks.map((pick, idx) => (
              <li key={idx} className="group">
                <div className="flex items-center gap-2 mb-1.5">
                   <span className="w-1.5 h-1.5 bg-primary rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-300"></span>
                   <span className="text-[10px] text-primary font-bold uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">{pick.category}</span>
                </div>
                {pick.url && pick.url !== '#' ? (
                  <TrackedLink
                    href={pick.url}
                    eventName="home_editor_pick_click"
                    eventPayload={{ category: pick.category, url: pick.url }}
                    className="block font-medium text-base text-foreground group-hover:text-primary transition-colors leading-snug"
                  >
                    {pick.title}
                  </TrackedLink>
                ) : (
                  <span className="font-medium text-base text-muted-foreground leading-snug cursor-not-allowed">
                    {pick.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Daily Briefing CTA - Minimalist */}
        <div className="bg-muted/30 rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
             <div className="p-2 bg-foreground text-background rounded-lg">
                <Mail className="w-4 h-4" />
             </div>
             <h4 className="font-bold text-sm text-foreground">{uiTerms.dailyBriefing}</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
             加入 15,000+ 专业投资者，每日盘前获取关键市场情报与 AI 预测。
          </p>
          
          <div className="space-y-2">
            <input 
              type="email" 
              placeholder="工作邮箱" 
              value={email}
              onChange={(e) => {
                setSubscribed(false);
                setErrorMessage(null);
                setEmail(e.target.value);
              }}
              className="w-full bg-background border border-border px-3 py-2.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={onSubscribe}
              disabled={!canSubmit}
              className="w-full bg-primary text-primary-foreground py-2.5 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '处理中...' : '立即订阅'}
            </button>
          </div>
          {errorMessage && <div className="text-xs text-destructive mt-2 font-medium">{errorMessage}</div>}
          {subscribed && <div className="text-xs text-emerald-600 mt-2 font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> 订阅成功</div>}
        </div>
      </div>
    </aside>
  );
});

SidebarTool.displayName = 'SidebarTool';
