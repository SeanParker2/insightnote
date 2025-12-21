'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  slug: string;
  isPremium: boolean;
  isUnlocked: boolean;
};

export function PostTouchpoints({ slug, isPremium, isUnlocked }: Props) {
  useEffect(() => {
    trackEvent('post_view', { slug, is_premium: isPremium, is_unlocked: isUnlocked });
    if (isPremium && !isUnlocked) {
      trackEvent('paywall_view', { slug });
    }
  }, [isPremium, isUnlocked, slug]);

  return null;
}

