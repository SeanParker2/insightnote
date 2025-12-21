export type TrackEventPayload = Record<string, unknown>;

export async function trackEvent(eventName: string, payload: TrackEventPayload = {}) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({ event_name: eventName, payload });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/events', blob);
      return;
    }
  } catch {}

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {}
}

