'use client';

import { useEffect, useState } from 'react';

export function UnreadBadge({ type }: { type: 'alerts' | 'briefing' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchCount() {
      try {
        const endpoint = type === 'alerts'
          ? '/api/alerts?unread=true&limit=1'
          : '/api/briefing';

        const res = await fetch(endpoint);
        if (!res.ok || !active) return;

        const data = await res.json();
        if (type === 'alerts') {
          setCount(data.data?.length ?? 0);
        } else {
          // Briefing: check if today's briefing exists and is unread
          setCount(data.data && !data.data.is_read ? 1 : 0);
        }
      } catch {
        // Non-critical
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 60_000); // Check every minute

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [type]);

  if (count === 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
      {count > 99 ? '99+' : count}
    </span>
  );
}
