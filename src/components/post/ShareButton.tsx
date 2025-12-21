'use client';

import { useCallback, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  slug: string;
  title?: string | null;
  className?: string;
};

export function ShareButton({ slug, title, className }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const href = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  const onShare = useCallback(async () => {
    trackEvent('post_share_click', { slug });
    const shareTitle = title ?? undefined;

    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({ title: shareTitle, url: href });
        trackEvent('post_share_success', { slug, method: 'web_share' });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href);
        setStatus('copied');
        trackEvent('post_share_success', { slug, method: 'clipboard' });
        window.setTimeout(() => setStatus('idle'), 1500);
        return;
      }

      setStatus('error');
      trackEvent('post_share_failed', { slug, reason: 'unsupported' });
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      setStatus('error');
      trackEvent('post_share_failed', { slug, reason: 'exception' });
      window.setTimeout(() => setStatus('idle'), 1500);
    }
  }, [href, slug, title]);

  return (
    <button
      type="button"
      onClick={onShare}
      className={className}
      aria-label={status === 'copied' ? 'Copied' : status === 'error' ? 'Share failed' : 'Share'}
    >
      <Share2 className="w-4 h-4 mr-2" />
      {status === 'copied' ? 'Copied' : status === 'error' ? 'Failed' : 'Share'}
    </button>
  );
}

