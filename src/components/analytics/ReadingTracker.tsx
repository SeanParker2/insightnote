'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReadingTrackerProps {
  postId: string;
}

export function ReadingTracker({ postId }: ReadingTrackerProps) {
  const supabase = createClient();
  const startTime = useRef<number>(Date.now());
  const reported = useRef(false);

  useEffect(() => {
    startTime.current = Date.now();
    reported.current = false;

    async function reportReading(duration: number, percentage: number) {
      if (reported.current) return;
      reported.current = true;

      try {
        await fetch('/api/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_id: postId,
            read_duration_seconds: Math.round(duration / 1000),
            read_percentage: Math.round(percentage),
          }),
        });
      } catch {
        // Non-critical
      }
    }

    function handleScroll() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return 100;
      const scrolled = window.scrollY / scrollHeight;
      return Math.min(scrolled * 100, 100);
    }

    let scrollPct = 0;
    const onScroll = () => {
      scrollPct = handleScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Report on page leave
    const onBeforeUnload = () => {
      const duration = Date.now() - startTime.current;
      reportReading(duration, scrollPct);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // Also report after 30 seconds of reading
    const timer = setTimeout(() => {
      const duration = Date.now() - startTime.current;
      reportReading(duration, Math.max(scrollPct, 50));
    }, 30_000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timer);
      // Report on component unmount (navigation)
      const duration = Date.now() - startTime.current;
      if (duration > 3000) {
        reportReading(duration, scrollPct);
      }
    };
  }, [postId, supabase]);

  return null;
}
