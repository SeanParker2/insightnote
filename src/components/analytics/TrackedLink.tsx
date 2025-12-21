'use client';

import { forwardRef } from 'react';
import Link, { type LinkProps } from 'next/link';
import { trackEvent, type TrackEventPayload } from '@/lib/analytics';

type Props = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: string;
    eventPayload?: TrackEventPayload;
  };

export const TrackedLink = forwardRef<HTMLAnchorElement, Props>(function TrackedLink(
  { eventName, eventPayload, onClick, ...props },
  ref,
) {
  return (
    <Link
      {...props}
      ref={ref}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        trackEvent(eventName, eventPayload ?? {});
      }}
    />
  );
});

