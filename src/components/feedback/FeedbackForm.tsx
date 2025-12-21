'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

type FeedbackCategory = 'general' | 'bug' | 'feature' | 'billing';

type Props = {
  defaultPagePath?: string;
  defaultCategory?: FeedbackCategory;
  defaultMessage?: string;
  defaultEmail?: string;
};

export function FeedbackForm({ defaultPagePath, defaultCategory, defaultMessage, defaultEmail }: Props) {
  const resolvedDefaultPath = useMemo(() => {
    if (typeof defaultPagePath === 'string' && defaultPagePath.trim()) return defaultPagePath.trim();
    if (typeof window === 'undefined') return '';
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }, [defaultPagePath]);

  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory ?? 'general');
  const [rating, setRating] = useState<number | ''>('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [message, setMessage] = useState(defaultMessage ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('feedback_view', { page_path: resolvedDefaultPath });
  }, [resolvedDefaultPath]);

  const canSubmit = message.trim().length >= 5 && message.trim().length <= 2000 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitted(false);
    setErrorMessage(null);

    const payload = {
      category,
      message: message.trim(),
      rating: rating === '' ? undefined : rating,
      email: email.trim() ? email.trim() : undefined,
      page_path: resolvedDefaultPath || undefined,
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setErrorMessage('提交失败，请稍后重试');
        trackEvent('feedback_submit_failed', { status: res.status, category });
        return;
      }

      setSubmitted(true);
      setMessage('');
      setRating('');
      trackEvent('feedback_submitted', { category, page_path: resolvedDefaultPath });
    } catch {
      setErrorMessage('网络错误，请稍后重试');
      trackEvent('feedback_submit_failed', { status: 'network', category });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-slate-900">反馈与建议</h1>
          <p className="text-sm text-slate-600">告诉我们你遇到的问题或你想要的功能，我们会优先改进关键触点体验。</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">类型</span>
              <select
                className="h-9 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              >
                <option value="general">一般建议</option>
                <option value="bug">问题/异常</option>
                <option value="feature">功能需求</option>
                <option value="billing">订阅/付费</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">满意度（可选）</span>
              <select
                className="h-9 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={rating}
                onChange={(e) => {
                  const v = e.target.value;
                  setRating(v === '' ? '' : Number(v));
                }}
              >
                <option value="">不填写</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">邮箱（可选）</span>
              <input
                className="h-9 rounded-md border border-slate-200 px-3 text-sm outline-none focus-visible:border-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">内容</span>
            <textarea
              className="min-h-[140px] rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:border-slate-400"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="描述你遇到的问题 / 想要的功能 / 体验不顺的地方（至少 5 个字）"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{resolvedDefaultPath ? `页面：${resolvedDefaultPath}` : ''}</span>
              <span>{message.trim().length}/2000</span>
            </div>
          </label>

          <div className="flex items-center gap-3">
            <Button onClick={onSubmit} disabled={!canSubmit}>
              {submitting ? '提交中…' : '提交反馈'}
            </Button>
            {submitted && <span className="text-sm text-emerald-700">已提交，感谢你的反馈</span>}
            {errorMessage && <span className="text-sm text-red-600">{errorMessage}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
